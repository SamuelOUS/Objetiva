import { prisma } from "../lib/prisma.js";

interface CrearCategoriaData {
  nombre: string;
  descripcion?: string;

}

interface ActualizarCategoriaData {
  nombre?: string;
  descripcion?: string;
}

/*------------------------------------------------------------------------------------- */

export async function crearCategoria(data: CrearCategoriaData) {
  return prisma.categoria.create({
    data: {
      nombre: data.nombre,
      descripcion: data.descripcion,
    },
  });
}

/*------------------------------------------------------------------------------------- */

export async function obtenerCategorias() {
  return prisma.categoria.findMany({
    orderBy: {
      id: "asc",
    },
  });
}

/*------------------------------------------------------------------------------------- */

export async function obtenerCategoriaPorId(id: number) {
  return prisma.categoria.findUnique({
    where: {
      id,
    },
  });
}

/*------------------------------------------------------------------------------------- */

export async function actualizarCategoria(
  id: number,
  data: ActualizarCategoriaData
) {
  return prisma.categoria.update({
    where: {
      id,
    },
    data,
  });
}