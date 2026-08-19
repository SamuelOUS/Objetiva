import http from "node:http";
import type { Express } from "express";

export async function queryRequest(
  app: Express,
  path: string,
  body?: unknown
) {
  const server = app.listen(0);

  const address = server.address();

  if (!address || typeof address === "string") {
    server.close();
    throw new Error("No se pudo obtener el puerto del servidor");
  }

  const port = address.port;

  return new Promise<{
    status: number;
    body: any;
  }>((resolve, reject) => {
    const req = http.request(
      {
        hostname: "localhost",
        port,
        path,
        method: "QUERY",
        headers: {
          "Content-Type": "application/json",
        },
      },
      (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          server.close();

          let parsedBody: any = {};

          if (data) {
            try {
              parsedBody = JSON.parse(data);
            } catch {
              parsedBody = data;
            }
          }

          resolve({
            status: res.statusCode ?? 0,
            body: parsedBody,
          });
        });
      }
    );

    req.on("error", (error) => {
      server.close();
      reject(error);
    });

    if (body !== undefined) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}