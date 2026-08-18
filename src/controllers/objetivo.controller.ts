import type { Request, Response } from "express";

import { prisma } from "../lib/prisma.js";

import { 

    crearObjetivo,
    obtenerObjetivos,
    obtenerObjetivosPorId,
    actualizarObjetivo,
    eliminarObjetivo
}

from "../services/objetivo.service.js";

export async function crearObjetivoController(
  req: Request,
  res: Response
) {
  try {
    const {
      titulo,
      descripcion,
      fechaInicio,
      fechaFin,
      categoriaId,
    } = req.body;

    if (!titulo || typeof titulo !== "string") {
      return res.status(400).json({
        error: "El título es obligatorio",
      });
    }

    if (!fechaInicio || Number.isNaN(Date.parse(fechaInicio))) {
      return res.status(400).json({
        error: "La fecha de inicio es obligatoria y debe ser válida",
      });
    }

    if (
      fechaFin !== undefined &&
      Number.isNaN(Date.parse(fechaFin))
    ) {
      return res.status(400).json({
        error: "La fecha de fin debe ser válida",
      });
    }

    if (
      !Number.isInteger(categoriaId) ||
      categoriaId <= 0
    ) {
      return res.status(400).json({
        error: "El categoriaId debe ser un número entero positivo",
      });
    }

    const objetivo = await crearObjetivo({
      titulo,
      descripcion,
      fechaInicio: new Date(fechaInicio),
      fechaFin: fechaFin ? new Date(fechaFin) : undefined,
      categoriaId,
    });

    return res.status(201).json(objetivo);
  } catch (error: unknown) {

    console.error(error);

    return res.status(500).json({
      error: "Error interno del servidor",
    });
  }
}

/*------------------------------------------------------------------------------------- */

export async function obtenerObjetivosController(
  _req: Request,
  res: Response
) {
  try {
    const objetivos = await obtenerObjetivos();

    return res.status(200).json(objetivos);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Error interno del servidor",
    });
  }
}

/*------------------------------------------------------------------------------------- */

export async function obtenerObjetivoPorIdController(
  req: Request,
  res: Response
) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "El ID debe ser un número entero positivo",
      });
    }

    const objetivo = await obtenerObjetivosPorId(id);

    if (!objetivo) {
      return res.status(404).json({
        error: "Objetivo no encontrada",
      });
    }

    return res.status(200).json(objetivo);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Error interno del servidor",
    });
  }
}

/*------------------------------------------------------------------------------------- */

export async function actualizarObjetivoController(
  req: Request,
  res: Response
) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "El ID debe ser un número entero positivo",
      });
    }

    const {
      titulo,
      descripcion,
      fechaInicio,
      fechaFin,
      categoriaId,
    } = req.body;

    if (titulo !== undefined && typeof titulo !== "string") {
      return res.status(400).json({
        error: "El título debe ser un texto",
      });
    }

    if (descripcion !== undefined && typeof descripcion !== "string") {
      return res.status(400).json({
        error: "La descripción debe ser un texto",
      });
    }

    let fechaInicioDate: Date | undefined;

    if (fechaInicio !== undefined) {
      fechaInicioDate = new Date(fechaInicio);

      if (isNaN(fechaInicioDate.getTime())) {
        return res.status(400).json({
          error: "La fecha de inicio no es válida",
        });
      }
    }

    let fechaFinDate: Date | undefined;

    if (fechaFin !== undefined) {
      fechaFinDate = new Date(fechaFin);

      if (isNaN(fechaFinDate.getTime())) {
        return res.status(400).json({
          error: "La fecha de fin no es válida",
        });
      }
    }

    let categoriaIdNumber: number | undefined;

    if (categoriaId !== undefined) {
      categoriaIdNumber = Number(categoriaId);

      if (
        !Number.isInteger(categoriaIdNumber) ||
        categoriaIdNumber <= 0
      ) {
        return res.status(400).json({
          error: "El categoriaId debe ser un número entero positivo",
        });
      }

      const categoria = await prisma.categoria.findUnique({
        where: {
          id: categoriaIdNumber,
        },
      });

      if (!categoria) {
        return res.status(400).json({
          error: `La categoría con ID ${categoriaIdNumber} no existe`,
        });
      }
    }

    const objetivo = await actualizarObjetivo(id, {
      titulo,
      descripcion,
      fechaInicio: fechaInicioDate,
      fechaFin: fechaFinDate,
      categoriaId: categoriaIdNumber,
    });

    return res.status(200).json(objetivo);
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        error: "Objetivo no encontrado",
      });
    }

    console.error(error);

    return res.status(500).json({
      error: "Error interno del servidor",
    });
  }
}


/*------------------------------------------------------------------------------------- */

export async function eliminarObjetivoController(
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
    await eliminarObjetivo(id);

    return res.status(204).send();
  } catch (error) {
    console.error(error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        error: "Objetivo no encontrado",
      });
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2003"
    ) {
      return res.status(409).json({
        error: "No se puede eliminar el objetivo porque tiene tareas asociadas",
      });
    }

    return res.status(500).json({
      error: "Error interno del servidor",
    });
  }
}