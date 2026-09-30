import { Request, Response, NextFunction } from "express";
import { obtenerMascotaAleatoria } from "../services/mascotas.service.js";
import { obtenerJuegoAleatorio } from "../services/juegos.service.js";

export function enriquecerConEntidades(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) => {
    Promise.all([
      obtenerMascotaAleatoria(res.locals.traceId),
      obtenerJuegoAleatorio(res.locals.traceId),
    ])
      .then(([mascota, juego]) => {
        const base = Array.isArray(body) ? { data: body } : (body as object);
        originalJson({
          ...base,
          mascotaCompanero1: mascota,
          juegoCompanero2: juego,
        });
      })
      .catch((error) => {
        console.error("Error al obtener entidades:", error);
        originalJson(body);
      });
    return res;
  }) as typeof res.json;

  next();
}