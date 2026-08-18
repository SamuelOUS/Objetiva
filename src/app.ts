import express from "express";
import categoriaRoutes from "./routes/categoria.routes.js";
import objetivoRoutes from "./routes/objetivo.routes.js";
import tareaRoutes from "./routes/tarea.routes.js";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "API Objetiva funcionando",
  });
});

app.use("/categorias", categoriaRoutes);
app.use("/objetivos", objetivoRoutes);
app.use("/tareas", tareaRoutes);

export default app;