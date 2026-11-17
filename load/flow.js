import http from "k6/http";
import { check } from "k6";
import { Rate, Trend } from "k6/metrics";

const profile = JSON.parse(open("./profile.json"));

const functionalErrors = new Rate("functional_errors");
const requestLatency = new Trend("request_latency_ms", true);

const baseUrl = (__ENV.BASE_URL || "").replace(/\/$/, "");
const endpoint = __ENV.ENDPOINT || "/api/v3/tareas";

if (!baseUrl) {
  throw new Error("Debes indicar BASE_URL mediante -e BASE_URL=...");
}

export const options = {
  scenarios: {
    reproducible_load: {
      executor: "constant-arrival-rate",
      rate: profile.rate,
      timeUnit: "1s",
      duration: `${profile.durationSeconds}s`,
      preAllocatedVUs: profile.preAllocatedVUs,
      maxVUs: profile.maxVUs,
      gracefulStop: "20s"
    }
  },
  tags: {
    experiment: __ENV.EXPERIMENT || "healthy",
    round: __ENV.ROUND || "baseline"
  },
  thresholds: {
    // Si k6 no sostuvo la carga, la ejecución no es comparable.
    dropped_iterations: ["count==0"]
  }
};

function validResponse(response) {
  if (response.status !== 200) return false;

  try {
    // Contrato esperado de GET /api/v3/tareas.
    return Array.isArray(response.json());
  } catch {
    return false;
  }
}

export function setup() {
  const response = http.get(`${baseUrl}${endpoint}`, {
    headers: { "x-canary": "true" },
    timeout: "15s",
    tags: { name: "preflight" }
  });

  if (!validResponse(response)) {
    throw new Error(
      `Preflight falló: HTTP ${response.status}. ` +
      "Comprueba la URL, el endpoint y su respuesta JSON."
    );
  }

  return {
    runId: `${__ENV.EXPERIMENT || "healthy"}-${Date.now()}`
  };
}

export default function (data) {
  const response = http.get(`${baseUrl}${endpoint}`, {
    headers: {
      "x-canary": "true",
      "x-trace-id": `${data.runId}-${__VU}-${__ITER}`
    },
    timeout: "15s",
    tags: {
      name: "GET tareas"
    }
  });

  const valid = validResponse(response);

  check(response, {
    "HTTP 200 con arreglo JSON": () => valid
  });

  functionalErrors.add(!valid);
  requestLatency.add(response.timings.duration);
}