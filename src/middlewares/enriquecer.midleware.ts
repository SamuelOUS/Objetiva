import { Request, Response, NextFunction } from "express";
import { obtenerMascotaAleatoria } from "../services/mascotas.service.js";
import { obtenerJuegoAleatorio } from "../services/juegos.service.js";
import { guardarRespuestaComoBlob } from "../services/objectStorage.service.js";

export function enriquecerConEntidades(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) => {
    Promise.all([
      obtenerMascotaAleatoria(res.locals.traceId),
      obtenerJuegoAleatorio(res.locals.traceId),
    ])
      .then(([mascota, juego]) => {
        let respuestaFinal: unknown;

        if (Array.isArray(body)) {
          respuestaFinal = body.map((item) => ({
            ...(item as object),
            mascotaCompanero1: mascota,
            juegoCompanero2: juego,
          }));
        } else if (body && typeof body === "object") {
          respuestaFinal = {
            ...(body as object),
            mascotaCompanero1: mascota,
            juegoCompanero2: juego,
          };
        } else {
          respuestaFinal = body;
        }

        guardarRespuestaComoBlob(respuestaFinal, res.locals.traceId).catch(() => {});

        originalJson(respuestaFinal);
      })
      .catch((error) => {
        console.error(`[trace:${res.locals.traceId}] Error al obtener entidades:`, error);
        originalJson(body);
      });
    return res;
  }) as typeof res.json;

  next();
}