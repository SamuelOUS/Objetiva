import type { Request, Response } from "express";
import { crearCategoria, obtenerCategorias } from "../services/categoria.service.js";




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