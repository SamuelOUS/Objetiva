import express, { Router } from "express";
import { randomUUID } from "node:crypto";
import categoriaRoutes from "./routes/categoria.routes.js";
import objetivoRoutes from "./routes/objetivo.routes.js";
import tareaRoutes from "./routes/tarea.routes.js";
import client from "prom-client"
import { enriquecerConEntidades } from "./middlewares/enriquecer.midleware.js";

const app = express();

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duración de las peticiones HTTP en segundos",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});
register.registerMetric(httpRequestDuration);

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total de peticiones HTTP",
  labelNames: ["method", "route", "status_code"],
});
register.registerMetric(httpRequestsTotal);

app.use(express.json());

//-------------------------------------------------------------------

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
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

//-------------------------------------------------------------------

app.use((req, res, next) => {
  const traceId = req.header("x-trace-id") ?? randomUUID();
  res.locals.traceId = traceId;
  res.setHeader("x-trace-id", traceId);
  next();
});

//-------------------------------------------------------------------

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

//-------------------------------------------------------------------

app.get("/", (_req, res) => {
  res.json({ message: "API Objetiva funcionando" });
});

//-------------------------------------------------------------------

const v2 = Router();
v2.use(enriquecerConEntidades);
v2.use("/categorias", categoriaRoutes);
v2.use("/objetivos", objetivoRoutes);
v2.use("/tareas", tareaRoutes);

app.use("/api/v2", v2);

app.use("/categorias", categoriaRoutes);
app.use("/objetivos", objetivoRoutes);
app.use("/tareas", tareaRoutes);

export default app;