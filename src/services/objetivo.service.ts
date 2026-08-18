import { EstadoObjetivo } from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";

interface CrearObjetivoData {
  titulo: string;
  descripcion?: string;
  fechaInicio: Date;
  fechaFin?: Date;
  categoriaId: number;
}

interface ActualizarObjetivoData {
  titulo?: string;
  descripcion?: string;
  fechaInicio?: Date;
  fechaFin?: Date;
  categoriaId?: number;

}

interface ConsultarObjetivosQueryData {
  estado?: EstadoObjetivo;
  categoriaId?: number;
}

/*------------------------------------------------------------------------------------- */

export async function crearObjetivo(data: CrearObjetivoData) {
  return prisma.objetivo.create({
    data: {
      titulo: data.titulo,
      descripcion: data.descripcion,
      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin,
      categoriaId: data.categoriaId,
    },
  });
}

/*------------------------------------------------------------------------------------- */

export async function obtenerObjetivos() {
  return prisma.objetivo.findMany({
    include:{
        categoria: true,
    },
    orderBy: {
      id: "asc",
    },
  });
}

/*------------------------------------------------------------------------------------- */

export async function obtenerObjetivosPorId(id: number) {
  return prisma.objetivo.findUnique({
    where: {
      id,
    },
  });
}

/*------------------------------------------------------------------------------------- */

export async function actualizarObjetivo(
  id: number,
  data: ActualizarObjetivoData
) {
  return prisma.objetivo.update({
    where: {
      id,
    },
    data,
  });
}

/*------------------------------------------------------------------------------------- */

export async function eliminarObjetivo(id: number) {
    return prisma.objetivo.delete({
        where: {
            id,
        },
    });
}

/*------------------------------------------------------------------------------------- */

export async function consultarObjetivosQuery(
  data: ConsultarObjetivosQueryData
) {
  return prisma.objetivo.findMany({
    where: {
      ...(data.estado !== undefined && {
        estado: data.estado,
      }),

      ...(data.categoriaId !== undefined && {
        categoriaId: data.categoriaId,
      }),
    },
    include: {
      categoria: true,
    },
    orderBy: {
      id: "asc",
    },
  });
}