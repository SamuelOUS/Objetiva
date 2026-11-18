import http from "k6/http";
import { check } from "k6";
import { Rate, Trend } from "k6/metrics";

const profile = JSON.parse(open("./profile.json"));

const functionalErrors = new Rate("functional_errors");
const degradedResponses = new Rate("degraded_responses");
const requestLatency = new Trend("request_latency_ms", true);

const CACHE_MAX_AGE_MS = 300000;

const baseUrl = (__ENV.BASE_URL || "").replace(/\/$/, "");
const endpoint = __ENV.ENDPOINT || "/demo/flujo";

if (!baseUrl) {
  throw new Error(
    "Debes indicar BASE_URL mediante -e BASE_URL=..."
  );
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
      gracefulStop: "20s",
    },
  },
  tags: {
    experiment: __ENV.EXPERIMENT || "healthy",
    round: __ENV.ROUND || "baseline",
  },
  thresholds: {
    dropped_iterations: ["count==0"],
  },
};

function inspectResponse(response) {
  const invalid = { valid: false, degraded: false };

  if (response.status !== 200) return invalid;

  try {
    const body = response.json();

    if (!Array.isArray(body)) return invalid;

    if (endpoint !== "/demo/flujo") {
      return { valid: true, degraded: false };
    }

    if (body.length !== 1) return invalid;

    const item = body[0];

    const hasEntities =
      typeof item.traceId === "string" &&
      item.localTask?.id !== undefined &&
      item.dependencyTask?.id !== undefined;

    if (!hasEntities) return invalid;

    if (item.degraded === false) {
      return { valid: true, degraded: false };
    }

    if (item.degraded === true) {
      const metadata = item.degradation;

      const validCache =
        metadata?.source === "cache" &&
        Number.isFinite(metadata.cacheAgeMs) &&
        metadata.cacheAgeMs >= 0 &&
        metadata.cacheAgeMs <= CACHE_MAX_AGE_MS &&
        (
          metadata.reason === "DEPENDENCY_TIMEOUT" ||
          metadata.reason === "DEPENDENCY_FAILURE"
        );

      return {
        valid: validCache,
        degraded: true,
      };
    }

    return invalid;
  } catch {
    return invalid;
  }
}

export function setup() {
  const response = http.get(`${baseUrl}${endpoint}`, {
    headers: {
      "x-canary": "true",
    },
    timeout: "15s",
    tags: {
      name: "preflight",
    },
  });

  if (!inspectResponse(response).valid) {
    throw new Error(
      `Preflight falló: HTTP ${response.status}. ` +
      "Comprueba la configuración y los datos del flujo."
    );
  }

  return {
    runId: `${__ENV.EXPERIMENT || "healthy"}-${Date.now()}`,
  };
}

export default function (data) {
  const response = http.get(`${baseUrl}${endpoint}`, {
    headers: {
      "x-canary": "true",
      "x-trace-id": `${data.runId}-${__VU}-${__ITER}`,
    },
    timeout: "15s",
    tags: {
      name: `GET ${endpoint}`,
    },
  });

  const result = inspectResponse(response);

  check(response, {
    "Respuesta funcional válida": () => result.valid,
  });

  functionalErrors.add(!result.valid);
  degradedResponses.add(result.degraded);
  requestLatency.add(response.timings.duration);
}