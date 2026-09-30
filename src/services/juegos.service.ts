const JUEGOS_API_URL = "http://34.10.12.227/juegos";

export async function obtenerJuegoAleatorio(traceId?: string): Promise<unknown | null> {
  const headers: Record<string, string> = {};
  if (traceId) headers["x-trace-id"] = traceId;

  const response = await fetch(JUEGOS_API_URL, { headers });
  if (!response.ok) return null;

  const juegos = await response.json();
  if (!Array.isArray(juegos) || juegos.length === 0) return null;

  return juegos[Math.floor(Math.random() * juegos.length)];
}