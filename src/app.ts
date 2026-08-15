import express from "express";
import categoriaRoutes from "./routes/categoria.routes.js";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "API Objetiva funcionando",
  });
});

app.use("/categorias", categoriaRoutes);

export default app;