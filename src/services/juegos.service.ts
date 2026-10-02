const JUEGOS_API_URL = "http://34.10.12.227/juegos";

interface JuegosResponse {
  juegos: unknown[];
}

export async function obtenerJuegoAleatorio(
  traceId?: string
): Promise<unknown | { error: string } | null> {
  try {
    console.log(`[trace:${traceId}] Consultando API de juegos...`);
    const headers: Record<string, string> = {};
    if (traceId) headers["x-trace-id"] = traceId;

    const response = await fetch(JUEGOS_API_URL, {
      headers,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(`[trace:${traceId}] API de juegos respondió con status ${response.status}`);
      return { error: `API de juegos no disponible (status ${response.status})` };
    }

    const body: unknown = await response.json();
    const juegos = (body as JuegosResponse)?.juegos;

    if (!Array.isArray(juegos)) {
      console.error(`[trace:${traceId}] API de juegos devolvió un formato inesperado`);
      return { error: "Formato de respuesta inesperado de la API de juegos" };
    }

    if (juegos.length === 0) {
      console.warn(`[trace:${traceId}] API de juegos no tiene entidades disponibles`);
      return { error: "No hay juegos disponibles en este momento" };
    }

    console.log(`[trace:${traceId}] Juego obtenido de API compañero 2`);
    return juegos[Math.floor(Math.random() * juegos.length)];
  } catch (error) {
    console.error(`[trace:${traceId}] Error consultando API de juegos:`, error);
    return { error: "No se pudo conectar con la API de juegos" };
  }
}