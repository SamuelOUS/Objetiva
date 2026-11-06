import { Router, Request, Response, NextFunction } from "express";

// Estado en memoria: se reinicia si el servicio se duerme o se redespliega
const estado = { errorRate: 0, latencyMs: 0 };

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
  res.json(estado);
});

faultAdminRouter.post("/admin/fault", (req, res) => {
  const { errorRate, latencyMs } = req.body ?? {};

  if (typeof errorRate !== "number" || errorRate < 0 || errorRate > 1) {
    res.status(400).json({ error: "errorRate debe ser un número entre 0 y 1" });
    return;
  }
  if (typeof latencyMs !== "number" || latencyMs < 0 || latencyMs > 5000) {
    res.status(400).json({ error: "latencyMs debe ser un número entre 0 y 5000" });
    return;
  }

  estado.errorRate = errorRate;
  estado.latencyMs = latencyMs;
  res.json(estado);
});

export async function faultMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.path === "/metrics" || req.path === "/health") {
    next();
    return;
  }

  if (estado.latencyMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, estado.latencyMs));
  }

  if (estado.errorRate > 0 && Math.random() < estado.errorRate) {
    res.status(500).json({ error: "Falla inyectada (canary)" });
    return;
  }

  next();
}