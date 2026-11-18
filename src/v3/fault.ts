import { Router, Request, Response, NextFunction } from "express";
import { setTimeout as delay } from "node:timers/promises";

import {
  POOL_CAPACITY,
  poolState,
  reservePermits,
} from "../chaos/pool.js";

const TARGET_PATH = "/demo/flujo";
const MAX_DURATION_SECONDS = 120;

type FaultState = {
  experimentId: string;
  errorRate: number;
  latencyMs: number;
  resourceSlots: number;
  startedAt: number;
  expiresAt: number;
};

function emptyState(): FaultState {
  return {
    experimentId: "",
    errorRate: 0,
    latencyMs: 0,
    resourceSlots: 0,
    startedAt: 0,
    expiresAt: 0,
  };
}

let state = emptyState();
let expirationTimer: ReturnType<typeof setTimeout> | undefined;
let releaseReservation: (() => void) | null = null;
let pendingActivation = false;
let generation = 0;

function resetFault(reason: string): void {
  const experimentId = state.experimentId;
  generation += 1;

  if (expirationTimer) {
    clearTimeout(expirationTimer);
    expirationTimer = undefined;
  }

  releaseReservation?.();
  releaseReservation = null;
  state = emptyState();

  console.log(JSON.stringify({
    event: "chaos.reverted",
    experimentId,
    reason,
    pool: poolState(),
    timestamp: new Date().toISOString(),
  }));
}

function currentState() {
  if (state.expiresAt > 0 && Date.now() >= state.expiresAt) {
    resetFault("expired");
  }

  return {
    ...state,
    pool: poolState(),
  };
}

export function getFaultState() {
  return currentState();
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
    location: process.env.FAULT_LOCATION ?? "incoming",
    pendingActivation,
  });
});

faultAdminRouter.delete("/admin/fault", (_req, res) => {
  resetFault("manual");
  res.json(currentState());
});

faultAdminRouter.post("/admin/fault", async (req, res) => {
  const {
    experimentId,
    errorRate,
    latencyMs,
    resourceSlots = 0,
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
    Number.isInteger(resourceSlots) &&
    resourceSlots >= 0 &&
    resourceSlots <= POOL_CAPACITY &&
    Number.isInteger(durationSeconds) &&
    durationSeconds >= 1 &&
    durationSeconds <= MAX_DURATION_SECONDS;

  if (!valid) {
    res.status(400).json({
      error:
        "Parámetros inválidos: errorRate [0,1], latencyMs [0,5000], " +
        "resourceSlots entero [0,4], durationSeconds entero [1,120] " +
        "y experimentId válido requeridos.",
    });
    return;
  }

  if (currentState().expiresAt > 0 || pendingActivation) {
    res.status(409).json({
      error: "Ya existe un experimento activo o en activación",
    });
    return;
  }

  pendingActivation = true;
  const activationGeneration = generation;

  try {
    // Esperar brevemente a que terminen llamadas que ya tenían permisos.
    const deadline = performance.now() + 3000;
    let release = reservePermits(resourceSlots);

    while (release === null && performance.now() < deadline) {
      await delay(25);

      if (generation !== activationGeneration) {
        res.status(409).json({ error: "Activación cancelada" });
        return;
      }

      release = reservePermits(resourceSlots);
    }

    if (release === null) {
      res.status(409).json({
        error: "No se pudieron reservar los permisos",
        pool: poolState(),
      });
      return;
    }

    if (generation !== activationGeneration) {
      release();
      res.status(409).json({ error: "Activación cancelada" });
      return;
    }

    releaseReservation = release;

    const startedAt = Date.now();

    state = {
      experimentId,
      errorRate,
      latencyMs,
      resourceSlots,
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
      ...currentState(),
      timestamp: new Date().toISOString(),
    }));

    res.json(currentState());
  } finally {
    pendingActivation = false;
  }
});

export async function faultMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (process.env.FAULT_LOCATION === "outgoing") {
    next();
    return;
  }

  if (req.method !== "GET" || req.path !== TARGET_PATH) {
    next();
    return;
  }

  const snapshot = currentState();

  if (!snapshot.expiresAt) {
    next();
    return;
  }

  if (snapshot.latencyMs > 0) {
    await delay(snapshot.latencyMs);
  }

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