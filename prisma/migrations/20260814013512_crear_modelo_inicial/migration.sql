-- CreateEnum
CREATE TYPE "EstadoObjetivo" AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADO');

-- CreateTable
CREATE TABLE "Categoria" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Objetivo" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "estado" "EstadoObjetivo" NOT NULL DEFAULT 'PENDIENTE',
    "categoriaId" INTEGER NOT NULL,

    CONSTRAINT "Objetivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarea" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "completada" BOOLEAN NOT NULL DEFAULT false,
    "fechaLimite" TIMESTAMP(3),
    "objetivoId" INTEGER NOT NULL,

    CONSTRAINT "Tarea_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Objetivo" ADD CONSTRAINT "Objetivo_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_objetivoId_fkey" FOREIGN KEY ("objetivoId") REFERENCES "Objetivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
