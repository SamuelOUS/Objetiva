const JUEGOS_API_URL = "http://34.10.12.227/juegos";

export async function obtenerJuegoAleatorio(traceId?: string): Promise<unknown | null> {
  try {
    const headers: Record<string, string> = {};
    if (traceId) headers["x-trace-id"] = traceId;

    const response = await fetch(JUEGOS_API_URL, { headers, signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;

    const juegos = await response.json();
    if (!Array.isArray(juegos) || juegos.length === 0) return null;

    return juegos[Math.floor(Math.random() * juegos.length)];
  } catch (error) {
    console.error("Error consultando API de juegos:", error);
    return null;
  }
}