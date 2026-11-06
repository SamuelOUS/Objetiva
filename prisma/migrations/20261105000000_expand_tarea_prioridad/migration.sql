-- Expand (fase 1 de Expand/Contract): solo se agrega, no se borra ni renombra nada.
-- api/v2 sigue funcionando sin conocer esta columna.
CREATE TYPE "Prioridad" AS ENUM ('BAJA', 'MEDIA', 'ALTA');

ALTER TABLE "Tarea" ADD COLUMN "prioridad" "Prioridad" DEFAULT 'MEDIA';