import type { Request, Response } from "express";

import { 
  crearCategoria, 
  obtenerCategorias, 
  obtenerCategoriaPorId,
  actualizarCategoria

} from "../services/categoria.service.js";

import { Prisma } from "../generated/prisma/client.js";



/*------------------------------------------------------------------------------------- */


export async function crearCategoriaController(
  req: Request,
  res: Response
) {
  try {
    const { nombre, descripcion } = req.body;

    if (!nombre || typeof nombre !== "string") {
      return res.status(400).json({
        error: "El nombre es obligatorio",
      });
    }

    const categoria = await crearCategoria({
      nombre,
      descripcion,
    });

    return res.status(201).json(categoria);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Error interno del servidor",
    });
  }
}

/*------------------------------------------------------------------------------------- */

export async function obtenerCategoriasController(
  _req: Request,
  res: Response
) {
  try {
    const categorias = await obtenerCategorias();

    return res.status(200).json(categorias);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Error interno del servidor",
    });
  }
}

/*------------------------------------------------------------------------------------- */

export async function obtenerCategoriaPorIdController(
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

    const categoria = await obtenerCategoriaPorId(id);

    if (!categoria) {
      return res.status(404).json({
        error: "Categoría no encontrada",
      });
    }

    return res.status(200).json(categoria);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Error interno del servidor",
    });
  }
}

/*------------------------------------------------------------------------------------- */

export async function actualizarCategoriaController(
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

    const { nombre, descripcion } = req.body;

    if (nombre !== undefined && typeof nombre !== "string") {
      return res.status(400).json({
        error: "El nombre debe ser un texto",
      });
    }

    if (descripcion !== undefined && typeof descripcion !== "string") {
      return res.status(400).json({
        error: "La descripción debe ser un texto",
      });
    }

    const categoria = await actualizarCategoria(id, {
      nombre,
      descripcion,
    });

    return res.status(200).json(categoria);
  } 
  
  catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        error: "Categoría no encontrada",
      });
    }

    console.error(error);

    return res.status(500).json({
      error: "Error interno del servidor",
    });
}
}