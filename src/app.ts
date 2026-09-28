import express, { Router } from "express";
import { randomUUID } from "node:crypto";
import categoriaRoutes from "./routes/categoria.routes.js";
import objetivoRoutes from "./routes/objetivo.routes.js";
import tareaRoutes from "./routes/tarea.routes.js";

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  const traceId = req.header("x-trace-id") ?? randomUUID();
  res.locals.traceId = traceId;
  res.setHeader("x-trace-id", traceId);
  next();
});

app.get("/", (_req, res) => {
  res.json({ message: "API Objetiva funcionando" });
});

const v2 = Router();
v2.use("/categorias", categoriaRoutes);
v2.use("/objetivos", objetivoRoutes);
v2.use("/tareas", tareaRoutes);

app.use("/api/v2", v2);

app.use("/categorias", categoriaRoutes);
app.use("/objetivos", objetivoRoutes);
app.use("/tareas", tareaRoutes);

export default app;