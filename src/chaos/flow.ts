import { Router } from "express";
import { setTimeout as delay } from "node:timers/promises";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { getFaultState } from "../v3/fault.js";

export const flowRouter = Router();

const DEPENDENCY_TIMEOUT_MS = 350;
const SAFETY_TIMEOUT_MS = 10000;
const CACHE_MAX_AGE_MS = 300000;

type CachedTask = {
  task: Record<string, unknown>;
  storedAt: number;
};

// Caché local al proceso. Usar una instancia durante los experimentos.
let cachedTask: CachedTask | null = null;

function validTask(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value
  );
}

flowRouter.get("/flujo", async (_req, res) => {
  const dependencyUrl = process.env.DEPENDENCY_URL;
  const traceId = String(res.locals.traceId ?? randomUUID());
  const startedAt = Date.now();

  const resilienceEnabled =
    process.env.RESILIENCE_ENABLED === "true";

  res.setHeader("x-trace-id", traceId);

  if (
    !dependencyUrl ||
    process.env.FAULT_LOCATION !== "outgoing"
  ) {
    res.status(503).json({
      error: "Configurar DEPENDENCY_URL y FAULT_LOCATION=outgoing",
      traceId,
    });
    return;
  }

  try {
    const localTask = await prisma.tarea.findFirst({
      orderBy: { id: "asc" },
    });

    if (!localTask) {
      res.status(503).json({
        error: "Falta una tarea sintética en canary",
        traceId,
      });
      return;
    }

    const inject =
      process.env.CHAOS_ENABLED === "true" &&
      process.env.TRACK === "canary";

    const fault = inject ? getFaultState() : null;

    // La primera consulta llena la caché con el límite de seguridad.
    // Después, el modo protegido aplica el timeout corto.
    const timeoutMs =
      resilienceEnabled && cachedTask !== null
        ? DEPENDENCY_TIMEOUT_MS
        : SAFETY_TIMEOUT_MS;

    const signal = AbortSignal.timeout(timeoutMs);

    console.log(JSON.stringify({
      event: "dependency.started",
      traceId,
      experimentId: fault?.experimentId ?? "",
      latencyMs: fault?.latencyMs ?? 0,
      timeoutMs,
      resilienceEnabled,
      timestamp: new Date().toISOString(),
    }));

    try {
      // La cancelación cubre tanto el retraso artificial
      // como la petición HTTP y la lectura de su respuesta.
      if (fault && fault.latencyMs > 0) {
        await delay(fault.latencyMs, undefined, { signal });
      }

      const activeFault = inject ? getFaultState() : null;

      const simulateUnavailable =
        activeFault !== null &&
        activeFault.expiresAt > 0 &&
        Math.random() < activeFault.errorRate;

      if (simulateUnavailable) {
        console.log(JSON.stringify({
          event: "dependency.synthetic_response",
          traceId,
          experimentId: activeFault?.experimentId ?? "",
          status: 503,
          timestamp: new Date().toISOString(),
        }));
      }

      const response = simulateUnavailable
        ? new Response(
            JSON.stringify({
              error: "Indisponibilidad sintética de dependencia",
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            }
          )
        : await fetch(dependencyUrl, {
        headers: {
          "x-trace-id": traceId,
        },
        signal,
      });

      if (!response.ok) {
        throw new Error(
          `Dependencia respondió HTTP ${response.status}`
        );
      }

      const dependencyTasks: unknown = await response.json();

      if (
        !Array.isArray(dependencyTasks) ||
        dependencyTasks.length === 0 ||
        !validTask(dependencyTasks[0])
      ) {
        throw new Error(
          "La dependencia no devolvió una tarea válida"
        );
      }

      cachedTask = {
        task: dependencyTasks[0],
        storedAt: Date.now(),
      };

      console.log(JSON.stringify({
        event: "dependency.completed",
        traceId,
        experimentId: fault?.experimentId ?? "",
        timestamp: new Date().toISOString(),
      }));

      res.json([
        {
          traceId,
          service: process.env.SERVICE_NAME ?? "objetiva-canary",
          localTask,
          dependencyTask: dependencyTasks[0],
          degraded: false,
        },
      ]);
    } catch (error) {
      const snapshot = cachedTask;

      const cacheAgeMs =
        snapshot === null
          ? Infinity
          : Date.now() - snapshot.storedAt;

      const canUseCache =
        resilienceEnabled &&
        snapshot !== null &&
        cacheAgeMs >= 0 &&
        cacheAgeMs <= CACHE_MAX_AGE_MS;

      if (!canUseCache || snapshot === null) {
        throw error;
      }

      const reason = signal.aborted
        ? "DEPENDENCY_TIMEOUT"
        : "DEPENDENCY_FAILURE";

      console.log(JSON.stringify({
        event: "dependency.fallback",
        traceId,
        experimentId: fault?.experimentId ?? "",
        reason,
        cacheAgeMs,
        timeoutMs,
        timestamp: new Date().toISOString(),
      }));

      res.json([
        {
          traceId,
          service: process.env.SERVICE_NAME ?? "objetiva-canary",
          localTask,
          dependencyTask: snapshot.task,
          degraded: true,
          degradation: {
            reason,
            source: "cache",
            cacheAgeMs,
            cachedAt: new Date(snapshot.storedAt).toISOString(),
          },
        },
      ]);
    }
  } catch (error) {
    console.error(JSON.stringify({
      event: "flow.failed",
      traceId,
      message:
        error instanceof Error
          ? error.message
          : "Error desconocido",
      timestamp: new Date().toISOString(),
    }));

    res.status(502).json({
      error: "No se pudo completar el flujo",
      traceId,
    });
  } finally {
    console.log(JSON.stringify({
      event: "flow.completed",
      traceId,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
      resilienceEnabled,
      timestamp: new Date().toISOString(),
    }));
  }
});