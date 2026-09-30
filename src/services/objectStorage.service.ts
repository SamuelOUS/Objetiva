import { BlobServiceClient } from "@azure/storage-blob";
import { randomUUID } from "node:crypto";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = "objetiva-adjuntos";

let blobServiceClient: BlobServiceClient | null = null;

function getClient(): BlobServiceClient | null {
  if (!connectionString) return null;
  if (!blobServiceClient) {
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }
  return blobServiceClient;
}

export async function guardarRespuestaComoBlob(
  data: unknown,
  traceId?: string
): Promise<string | null> {
  const client = getClient();
  if (!client) {
    console.error("AZURE_STORAGE_CONNECTION_STRING no está definida");
    return null;
  }

  try {
    const containerClient = client.getContainerClient(CONTAINER_NAME);
    const nombreArchivo = `respuestas/${traceId ?? randomUUID()}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(nombreArchivo);

    const contenido = JSON.stringify(data, null, 2);
    await blockBlobClient.upload(contenido, Buffer.byteLength(contenido), {
      blobHTTPHeaders: { blobContentType: "application/json" },
    });

    return blockBlobClient.url;
  } catch (error) {
    console.error("Error guardando respuesta en Object Storage:", error);
    return null;
  }
}