const MASCOTAS_API_URL = "http://ae7646e6cf2b74912906f40f9a30539d-032ee795ec92fbaf.elb.us-east-2.amazonaws.com/pets";

export interface Owner {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
}

export interface Mascota {
  id: string;
  nombre: string;
  especie: string;
  raza: string;
  edad: number;
  ownerId: string;
  owner: Owner;
}

export async function obtenerMascotaAleatoria(
  traceId?: string
): Promise<Mascota | { error: string } | null> {
  try {
    console.log(`[trace:${traceId}] Consultando API de mascotas...`);
    const headers: Record<string, string> = {};
    if (traceId) headers["x-trace-id"] = traceId;

    const response = await fetch(MASCOTAS_API_URL, {
      headers,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(`[trace:${traceId}] API de mascotas respondió con status ${response.status}`);
      return { error: `API de mascotas no disponible (status ${response.status})` };
    }

    const mascotas: unknown = await response.json();

    if (!Array.isArray(mascotas)) {
      console.error(`[trace:${traceId}] API de mascotas devolvió un formato inesperado`);
      return { error: "Formato de respuesta inesperado de la API de mascotas" };
    }

    if (mascotas.length === 0) {
      console.warn(`[trace:${traceId}] API de mascotas no tiene entidades disponibles`);
      return { error: "No hay mascotas disponibles en este momento" };
    }

    console.log(`[trace:${traceId}] Mascota obtenida de API compañero 1`);
    return mascotas[Math.floor(Math.random() * mascotas.length)] as Mascota;
  } catch (error) {
    console.error(`[trace:${traceId}] Error consultando API de mascotas:`, error);
    return { error: "No se pudo conectar con la API de mascotas" };
  }
}