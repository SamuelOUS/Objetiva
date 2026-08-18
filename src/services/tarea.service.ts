import { prisma } from "../lib/prisma.js";

interface CrearTareaData {
  titulo: string;
  descripcion?: string;
  fechaLimite?: Date;
  objetivoId: number;
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