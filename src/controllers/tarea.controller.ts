import { Request, Response } from "express";
import { crearTarea } from "../services/tarea.service.js";

export async function crearTareaController(
  req: Request,
  res: Response
) {
  const { titulo, descripcion, fechaLimite, objetivoId } = req.body;

  if (!titulo) {
    return res.status(400).json({
      error: "El título es obligatorio",
    });
  }

  if (typeof titulo !== "string") {
    return res.status(400).json({
      error: "El título debe ser un texto",
    });
  }

  if (descripcion !== undefined && typeof descripcion !== "string") {
    return res.status(400).json({
      error: "La descripción debe ser un texto",
    });
  }

  let fechaLimiteDate: Date | undefined;

  if (fechaLimite !== undefined) {
    fechaLimiteDate = new Date(fechaLimite);

    if (Number.isNaN(fechaLimiteDate.getTime())) {
      return res.status(400).json({
        error: "La fecha límite no es válida",
      });
    }
  }

  if (!Number.isInteger(objetivoId) || objetivoId <= 0) {
    return res.status(400).json({
      error: "El objetivoId debe ser un entero positivo",
    });
  }

  try {
    const tarea = await crearTarea({
      titulo,
      descripcion,
      fechaLimite: fechaLimiteDate,
      objetivoId,
    });

    return res.status(201).json(tarea);
  } catch (error) {
    console.error(error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2003"
    ) {
      return res.status(404).json({
        error: "El objetivo indicado no existe",
      });
    }

    return res.status(500).json({
      error: "Error interno del servidor",
    });
  }
}