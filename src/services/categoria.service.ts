import { prisma } from "../lib/prisma.js";

interface CrearCategoriaData {
  nombre: string;
  descripcion?: string;
}

export async function crearCategoria(data: CrearCategoriaData) {
  return prisma.categoria.create({
    data: {
      nombre: data.nombre,
      descripcion: data.descripcion,
    },
  });
}

export async function obtenerCategorias() {
  return prisma.categoria.findMany({
    orderBy: {
      id: "asc",
    },
  });
}