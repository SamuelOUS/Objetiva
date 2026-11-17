import express, { Router } from "express";
import { randomUUID } from "node:crypto";
import client from "prom-client";

import categoriaRoutes from "./routes/categoria.routes.js";
import objetivoRoutes from "./routes/objetivo.routes.js";
import tareaRoutes from "./routes/tarea.routes.js";

import { enriquecerConEntidades } from "./middlewares/enriquecer.midleware.js";
import { crearRouterV3 } from "./v3/v3.router.js";
import {
  faultAdminRouter,
  faultMiddleware,
} from "./v3/fault.js";
import { flowRouter } from "./chaos/flow.js";

const app = express();

const APP_VERSION = process.env.APP_VERSION ?? "dev";
const TRACK = process.env.TRACK ?? "stable";
const ENRICH_ENABLED = process.env.ENRICH_ENABLED === "true";

const register = new client.Registry();

client.collectDefaultMetrics({ register });

register.setDefaultLabels({
  track: TRACK,
  app_version: APP_VERSION,
});

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duración de las peticiones HTTP en segundos",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
});

register.registerMetric(httpRequestDuration);

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total de peticiones HTTP",
  labelNames: ["method", "route", "status_code"],
});

register.registerMetric(httpRequestsTotal);

app.use(express.json());

app.use((_req, res, next) => {
  res.setHeader("X-App-Version", APP_VERSION);
  res.setHeader("X-Track", TRACK);
  next();
});

app.use((req, res, next) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationSec =
      Number(process.hrtime.bigint() - start) / 1e9;

    const route = req.route?.path
      ? `${req.baseUrl}${req.route.path}`
      : req.path;

    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    httpRequestDuration.observe(labels, durationSec);
    httpRequestsTotal.inc(labels);
  });

  next();
});

app.use((req, res, next) => {
  const supplied = req.header("x-trace-id");

  const traceId =
    supplied && /^[a-zA-Z0-9._-]{1,128}$/.test(supplied)
      ? supplied
      : randomUUID();

  res.locals.traceId = traceId;
  res.setHeader("x-trace-id", traceId);

  next();
});

if (
  TRACK === "canary" &&
  process.env.CHAOS_ENABLED === "true"
) {
  app.use(faultAdminRouter);
  app.use(faultMiddleware);
}

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.get("/", (_req, res) => {
  res.json({
    message: "API Objetiva funcionando",
    version: APP_VERSION,
    track: TRACK,
  });
});

app.get("/health/live", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/demo", flowRouter);

const v2 = Router();

if (ENRICH_ENABLED) {
  v2.use(enriquecerConEntidades);
}

v2.use("/categorias", categoriaRoutes);
v2.use("/objetivos", objetivoRoutes);
v2.use("/tareas", tareaRoutes);

app.use("/api/v2", v2);
app.use("/api/v3", crearRouterV3(register));

app.use("/categorias", categoriaRoutes);
app.use("/objetivos", objetivoRoutes);
app.use("/tareas", tareaRoutes);

export default app;