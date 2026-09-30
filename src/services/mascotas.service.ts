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

export async function obtenerMascotaAleatoria(traceId?: string): Promise<Mascota | null> {
  try {
    const headers: Record<string, string> = {};
    if (traceId) headers["x-trace-id"] = traceId;

    const response = await fetch(MASCOTAS_API_URL, { headers, signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;

    const mascotas: Mascota[] = await response.json();
    if (mascotas.length === 0) return null;

    return mascotas[Math.floor(Math.random() * mascotas.length)];
  } catch (error) {
    console.error("Error consultando API de mascotas:", error);
    return null;
  }
}