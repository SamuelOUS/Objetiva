import { Request, Response } from "express";

import {

    crearTarea,
    obtenerTareas,
    obtenerTareaPorId,
    actualizarTarea


 } 

 from "../services/tarea.service.js";

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


/*------------------------------------------------------------------------------------- */

export async function obtenerTareasController(
  _req: Request,
  res: Response
) {
  try {
    const tareas = await obtenerTareas();

    return res.status(200).json(tareas);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Error interno del servidor",
    });
  }
}


/*------------------------------------------------------------------------------------- */

export async function obtenerTareaPorIdController(
  req: Request,
  res: Response
) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "El ID debe ser un entero positivo",
    });
  }

  try {
    const tarea = await obtenerTareaPorId(id);

    if (!tarea) {
      return res.status(404).json({
        error: "Tarea no encontrada",
      });
    }

    return res.status(200).json(tarea);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Error interno del servidor",
    });
  }
}


/*------------------------------------------------------------------------------------- */

export async function actualizarTareaController(
  req: Request,
  res: Response
) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "El ID debe ser un entero positivo",
    });
  }

  const {
    titulo,
    descripcion,
    fechaLimite,
    completada,
    objetivoId,
  } = req.body;

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

  if (completada !== undefined && typeof completada !== "boolean") {
    return res.status(400).json({
      error: "Completada debe ser un booleano",
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
    const tarea = await actualizarTarea(id, {
      titulo,
      descripcion,
      fechaLimite: fechaLimiteDate,
      completada,
      objetivoId,
    });

    return res.status(200).json(tarea);
  } catch (error) {
    console.error(error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        error: "Tarea no encontrada",
      });
    }

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