import { prisma } from "../lib/prisma.js";

interface CrearTareaData {
  titulo: string;
  descripcion?: string;
  fechaLimite?: Date;
  objetivoId: number;
}


interface ActualizarTareaData {
  titulo: string;
  descripcion?: string;
  fechaLimite?: Date;
  completada?: boolean;
  objetivoId: number;
}

interface ConsultarTareasDataQuery {
  completada?: boolean;
  objetivoId?: number;
}

export async function crearTarea(data: CrearTareaData) {
  return prisma.tarea.create({
    data: {
      titulo: data.titulo,
      descripcion: data.descripcion,
      fechaLimite: data.fechaLimite,
      objetivoId: data.objetivoId,
    },
  });
}

/*------------------------------------------------------------------------------------- */

export async function obtenerTareas() {
  return prisma.tarea.findMany({
    include: {
      objetivo: true,
    },
    orderBy: {
      id: "asc",
    },
  });
}


/*------------------------------------------------------------------------------------- */

export async function obtenerTareaPorId(id: number) {
  return prisma.tarea.findUnique({
    where: {
      id,
    },
    include: {
      objetivo: true,
    },
  });
}

/*------------------------------------------------------------------------------------- */


export async function actualizarTarea(
  id: number,
  data: ActualizarTareaData
) {
  return prisma.tarea.update({
    where: {
      id,
    },
    data: {
      titulo: data.titulo,
      descripcion: data.descripcion,
      fechaLimite: data.fechaLimite,
      completada: data.completada,
      objetivoId: data.objetivoId,
    },
  });
}

/*------------------------------------------------------------------------------------- */

export async function eliminarTarea(id: number) {
  return prisma.tarea.delete({
    where: {
      id,
    },
  });
}

/*------------------------------------------------------------------------------------- */

export async function consultarTareasQuery(data: ConsultarTareasDataQuery) {
  return prisma.tarea.findMany({
    where: {
      ...(data.completada !== undefined && {
        completada: data.completada,
      }),

      ...(data.objetivoId !== undefined && {
        objetivoId: data.objetivoId,
      }),
    },
    include: {
      objetivo: true,
    },
    orderBy: {
      id: "asc",
    },
  });
}