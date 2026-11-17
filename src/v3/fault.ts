import { Router, Request, Response, NextFunction } from "express";

const TARGET_PATH = "/api/v3/tareas";
const MAX_DURATION_SECONDS = 120;

type FaultState = {
  experimentId: string;
  errorRate: number;
  latencyMs: number;
  startedAt: number;
  expiresAt: number;
};

function emptyState(): FaultState {
  return {
    experimentId: "",
    errorRate: 0,
    latencyMs: 0,
    startedAt: 0,
    expiresAt: 0,
  };
}

let state = emptyState();
let expirationTimer: ReturnType<typeof setTimeout> | undefined;

function resetFault(reason: string): void {
  const experimentId = state.experimentId;

  if (expirationTimer) {
    clearTimeout(expirationTimer);
    expirationTimer = undefined;
  }

  state = emptyState();

  console.log(JSON.stringify({
    event: "chaos.reverted",
    experimentId,
    reason,
    timestamp: new Date().toISOString(),
  }));
}

function currentState(): FaultState {
  // Respaldo si el event loop demoró la ejecución del temporizador.
  if (state.expiresAt > 0 && Date.now() >= state.expiresAt) {
    resetFault("expired");
  }

  return { ...state };
}

export const faultAdminRouter = Router();

faultAdminRouter.use("/admin/fault", (req, res, next) => {
  const token = process.env.FAULT_TOKEN;

  if (!token || req.header("x-admin-token") !== token) {
    res.status(404).json({ error: "No encontrado" });
    return;
  }

  next();
});

faultAdminRouter.get("/admin/fault", (_req, res) => {
  res.json({
    ...currentState(),
    target: `GET ${TARGET_PATH}`,
  });
});

faultAdminRouter.delete("/admin/fault", (_req, res) => {
  resetFault("manual");
  res.json(currentState());
});

faultAdminRouter.post("/admin/fault", (req, res) => {
  const {
    experimentId,
    errorRate,
    latencyMs,
    durationSeconds,
  } = req.body ?? {};

  const valid =
    typeof experimentId === "string" &&
    /^[a-zA-Z0-9._-]{1,80}$/.test(experimentId) &&
    Number.isFinite(errorRate) &&
    errorRate >= 0 &&
    errorRate <= 1 &&
    Number.isFinite(latencyMs) &&
    latencyMs >= 0 &&
    latencyMs <= 5000 &&
    Number.isInteger(durationSeconds) &&
    durationSeconds >= 1 &&
    durationSeconds <= MAX_DURATION_SECONDS;

  if (!valid) {
    res.status(400).json({
      error:
        "Se requieren experimentId válido, errorRate [0,1], " +
        "latencyMs [0,5000] y durationSeconds entero [1,120]",
    });
    return;
  }

  if (currentState().expiresAt > 0) {
    res.status(409).json({
      error: "Ya existe un experimento activo. Revierte antes de iniciar otro.",
    });
    return;
  }

  const startedAt = Date.now();

  state = {
    experimentId,
    errorRate,
    latencyMs,
    startedAt,
    expiresAt: startedAt + durationSeconds * 1000,
  };

  expirationTimer = setTimeout(
    () => resetFault("expired"),
    durationSeconds * 1000
  );

  expirationTimer.unref();

  console.log(JSON.stringify({
    event: "chaos.activated",
    ...state,
    target: `GET ${TARGET_PATH}`,
    timestamp: new Date().toISOString(),
  }));

  res.json(currentState());
});

export async function faultMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (req.method !== "GET" || req.path !== TARGET_PATH) {
    next();
    return;
  }

  const snapshot = currentState();

  if (!snapshot.expiresAt) {
    next();
    return;
  }

  console.log(JSON.stringify({
    event: "chaos.request",
    experimentId: snapshot.experimentId,
    traceId: res.locals.traceId ?? req.header("x-trace-id"),
    latencyMs: snapshot.latencyMs,
    errorRate: snapshot.errorRate,
    timestamp: new Date().toISOString(),
  }));

  if (snapshot.latencyMs > 0) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, snapshot.latencyMs);
    });
  }

  // No producir un nuevo error si el fallo expiró o fue revertido.
  const active = currentState();

  if (
    active.expiresAt > 0 &&
    active.startedAt === snapshot.startedAt &&
    active.experimentId === snapshot.experimentId &&
    Math.random() < active.errorRate
  ) {
    res.status(503).json({
      error: "Indisponibilidad sintética",
      experimentId: active.experimentId,
    });
    return;
  }

  next();
}