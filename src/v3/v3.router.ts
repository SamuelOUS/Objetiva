import { Router } from "express";
import client from "prom-client";
import { prisma } from "../lib/prisma.js";
import categoriaRoutes from "../routes/categoria.routes.js";
import objetivoRoutes from "../routes/objetivo.routes.js";
import tareaRoutes from "../routes/tarea.routes.js";

const PRIORIDADES = ["BAJA", "MEDIA", "ALTA"] as const;
type Prioridad = (typeof PRIORIDADES)[number];

function esPrioridad(valor: unknown): valor is Prioridad {
  return (
    typeof valor === "string" &&
    (PRIORIDADES as readonly string[]).includes(valor)
  );
}

export function crearRouterV3(register: client.Registry) {
  // Métrica de negocio propia del dominio
  const tareasCreadas = new client.Counter({
    name: "tareas_creadas_total",
    help: "Tareas creadas en api/v3, por prioridad",
    labelNames: ["prioridad"],
  });
  register.registerMetric(tareasCreadas);

  const v3 = Router();
  
    // Ruta de diagnóstico: confirma qué versión y track atienden
  v3.get("/", (_req, res) => {
    res.json({
      api: "v3",
      version: process.env.APP_VERSION ?? "dev",
      track: process.env.TRACK ?? "stable",
    });
  });

  // GET /api/v3/tareas?prioridad=ALTA
  v3.get("/tareas", async (req, res, next) => {
    const { prioridad } = req.query;

    if (prioridad === undefined) {
      next();
      return;
    }

    if (!esPrioridad(prioridad)) {
      res.status(400).json({ error: "La prioridad debe ser BAJA, MEDIA o ALTA" });
      return;
    }

    try {
      const tareas = await prisma.tarea.findMany({
        where: { prioridad },
        include: { objetivo: true },
        orderBy: { id: "asc" },
      });
      res.status(200).json(tareas);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // POST /api/v3/tareas  (acepta prioridad opcional)
  v3.post("/tareas", async (req, res) => {
    const { titulo, descripcion, fechaLimite, objetivoId, prioridad } = req.body;

    if (!titulo || typeof titulo !== "string") {
      res.status(400).json({ error: "El título es obligatorio y debe ser un texto" });
      return;
    }

    if (descripcion !== undefined && typeof descripcion !== "string") {
      res.status(400).json({ error: "La descripción debe ser un texto" });
      return;
    }

    let fechaLimiteDate: Date | undefined;
    if (fechaLimite !== undefined) {
      fechaLimiteDate = new Date(fechaLimite);
      if (Number.isNaN(fechaLimiteDate.getTime())) {
        res.status(400).json({ error: "La fecha límite no es válida" });
        return;
      }
    }

    if (!Number.isInteger(objetivoId) || objetivoId <= 0) {
      res.status(400).json({ error: "El objetivoId debe ser un entero positivo" });
      return;
    }

    if (prioridad !== undefined && !esPrioridad(prioridad)) {
      res.status(400).json({ error: "La prioridad debe ser BAJA, MEDIA o ALTA" });
      return;
    }

    try {
      const tarea = await prisma.tarea.create({
        data: {
          titulo,
          descripcion,
          fechaLimite: fechaLimiteDate,
          objetivoId,
          ...(prioridad !== undefined && { prioridad }),
        },
      });
      tareasCreadas.inc({ prioridad: tarea.prioridad ?? "MEDIA" });
      res.status(201).json(tarea);
    } catch (error) {
      console.error(error);
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2003"
      ) {
        res.status(404).json({ error: "El objetivo indicado no existe" });
        return;
      }
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Todo lo demás se hereda de las rutas existentes
  v3.use("/categorias", categoriaRoutes);
  v3.use("/objetivos", objetivoRoutes);
  v3.use("/tareas", tareaRoutes);

  return v3;
}