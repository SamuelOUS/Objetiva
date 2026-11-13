import http from "node:http";
import httpProxy from "http-proxy";
import client from "prom-client";
import { createController } from "./controller.js";

type Track = "stable" | "canary";

const PORT = Number(process.env.PORT) || 10000;
const STABLE_URL = process.env.STABLE_URL;
const CANARY_URL = process.env.CANARY_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!STABLE_URL || !CANARY_URL) {
  console.error("Faltan las variables STABLE_URL y CANARY_URL");
  process.exit(1);
}

function limitar(n: number): number {
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
}

// Peso del canary en memoria (0-100). CANARY_WEIGHT es solo el valor inicial.
let canaryWeight = limitar(Number(process.env.CANARY_WEIGHT ?? 0));

// ---------- Métricas del router, por track ----------
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const peticiones = new client.Counter({
  name: "router_requests_total",
  help: "Peticiones enrutadas, por track y código de estado",
  labelNames: ["track", "status_code"],
  registers: [register],
});

const duracion = new client.Histogram({
  name: "router_request_duration_seconds",
  help: "Duración de las peticiones enrutadas, por track",
  labelNames: ["track"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
  registers: [register],
});

const pesoGauge = new client.Gauge({
  name: "router_canary_weight_percent",
  help: "Porcentaje actual de tráfico enviado al canary",
  registers: [register],
});
pesoGauge.set(canaryWeight);

const controller = createController({
  register,
  port: PORT,
  stableUrl: STABLE_URL,
  canaryUrl: CANARY_URL,
  getWeight: () => canaryWeight,
  setWeight: (percent: number) => {
    canaryWeight = percent;
    pesoGauge.set(percent);
    console.log(`[router] canaryWeight = ${percent}%`);
  },
});

// ---------- Proxy ----------
const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  xfwd: true,
  proxyTimeout: 90000,
  timeout: 90000,
});

proxy.on("error", (_err, _req, res) => {
  if (res instanceof http.ServerResponse && !res.headersSent) {
    res.writeHead(502, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Backend no disponible" }));
  }
});

// ---------- Utilidades ----------
function json(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function leerJson(req: http.IncomingMessage): Promise<any> {
  const partes: Buffer[] = [];
  for await (const parte of req) partes.push(parte as Buffer);
  try {
    return JSON.parse(Buffer.concat(partes).toString() || "{}");
  } catch {
    return null;
  }
}

function elegirTrack(req: http.IncomingMessage): Track {
  if (req.headers["x-canary"] === "true") return "canary";
  return Math.random() * 100 < canaryWeight ? "canary" : "stable";
}

async function manejarPeso(req: http.IncomingMessage, res: http.ServerResponse) {
  if (!ADMIN_TOKEN || req.headers["x-admin-token"] !== ADMIN_TOKEN) {
    json(res, 404, { error: "No encontrado" });
    return;
  }

  if (req.method === "GET") {
    json(res, 200, { canaryWeight });
    return;
  }

  if (req.method === "POST") {
    const body = await leerJson(req);
    const peso = body?.canaryWeight;
    if (typeof peso !== "number" || peso < 0 || peso > 100) {
      json(res, 400, { error: "canaryWeight debe ser un número entre 0 y 100" });
      return;
    }
    canaryWeight = peso;
    pesoGauge.set(peso);
    console.log(`[router] canaryWeight = ${peso}%`);
    json(res, 200, { canaryWeight });
    return;
  }

  json(res, 405, { error: "Método no permitido" });
}

async function manejarRollout(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  path: string
) {
  if (!ADMIN_TOKEN || req.headers["x-admin-token"] !== ADMIN_TOKEN) {

    console.log("[admin-debug]", {
  tokenConfigured: Boolean(ADMIN_TOKEN),
  headerReceived: Boolean(req.headers["x-admin-token"]),
  tokenMatches: req.headers["x-admin-token"] === ADMIN_TOKEN
});
    json(res, 404, { error: "No encontrado" });
    return;
  }

  if (path === "/admin/rollout/status" && req.method === "GET") {
    json(res, 200, controller.status());
    return;
  }

  if (path === "/admin/rollout/start" && req.method === "POST") {
    try {
      controller.start();
      json(res, 202, controller.status());
    } catch (e) {
      json(res, 409, { error: (e as Error).message });
    }
    return;
  }

  if (path === "/admin/rollout/abort" && req.method === "POST") {
    controller.abort("abortado manualmente");
    json(res, 200, controller.status());
    return;
  }

  json(res, 404, { error: "No encontrado" });
}

// ---------- Servidor ----------
const server = http.createServer(async (req, res) => {
  const url = req.url ?? "/";
  const path = url.split("?")[0];

  if (path === "/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }

  if (path === "/metrics") {
    res.writeHead(200, { "content-type": register.contentType });
    res.end(await register.metrics());
    return;
  }

  if (path.startsWith("/admin/rollout/")) {
    await manejarRollout(req, res, path);
    return;
  }

  if (path === "/admin/weight") {
    await manejarPeso(req, res);
    return;
  }

  let track: Track;
  const directo = path.match(/^\/api\/v([23])(\/|$)/);

  if (directo) {
    // Acceso directo para pruebas: v2 -> stable, v3 -> canary
    track = directo[1] === "2" ? "stable" : "canary";
  } else if (path === "/api" || path.startsWith("/api/")) {
    // Ruta pública neutra: el router decide y reescribe
    track = elegirTrack(req);
    req.url = url.replace(/^\/api/, track === "stable" ? "/api/v2" : "/api/v3");
  } else {
    json(res, 404, { error: "Ruta no encontrada en el router" });
    return;
  }

  const inicio = process.hrtime.bigint();
  res.setHeader("X-Routed-To", track);
  res.on("finish", () => {
    const seg = Number(process.hrtime.bigint() - inicio) / 1e9;
    peticiones.inc({ track, status_code: String(res.statusCode) });
    duracion.observe({ track }, seg);
  });

  proxy.web(req, res, { target: track === "stable" ? STABLE_URL : CANARY_URL });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[router] escuchando en el puerto ${PORT}, canaryWeight=${canaryWeight}%`);
});