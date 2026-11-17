import { Router } from "express";
import { setTimeout as delay } from "node:timers/promises";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { getFaultState } from "../v3/fault.js";

export const flowRouter = Router();

flowRouter.get("/flujo", async (_req, res) => {
  const dependencyUrl = process.env.DEPENDENCY_URL;
  const traceId = String(res.locals.traceId ?? randomUUID());
  const startedAt = Date.now();

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

    // Límite de seguridad inicial, idéntico en ambas rondas.
    const signal = AbortSignal.timeout(10000);

    console.log(JSON.stringify({
      event: "dependency.started",
      traceId,
      experimentId: fault?.experimentId ?? "",
      latencyMs: fault?.latencyMs ?? 0,
      timestamp: new Date().toISOString(),
    }));

    // El retraso pertenece al adaptador de la llamada saliente.
    if (fault && fault.latencyMs > 0) {
      await delay(fault.latencyMs, undefined, { signal });
    }

    const response = await fetch(dependencyUrl, {
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
      typeof dependencyTasks[0] !== "object" ||
      dependencyTasks[0] === null ||
      !("id" in dependencyTasks[0])
    ) {
      throw new Error(
        "La dependencia no devolvió una tarea válida"
      );
    }

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
      timestamp: new Date().toISOString(),
    }));
  }
});