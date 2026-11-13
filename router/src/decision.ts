export interface Stats {
  requests: number;
  errors: number;
  p95Seconds: number | null;
}

export interface Slo {
  maxErrorRatePercent: number;
  maxErrorRateIncreasePercentVsStable: number;
  maxP95Seconds: number;
  maxP95RatioVsStable: number;
  minP95SecondsForRatioCheck: number;
}

export interface Evaluation {
  enoughSamples: boolean;
  violations: string[];
  canaryErrorRate: number;
  stableErrorRate: number | null;
}

// Con menos muestras, el p95 equivale casi a la petición más lenta
const MIN_SAMPLES_FOR_LATENCY = 20;
const MIN_STABLE_SAMPLES = 20;

export function errorRatePercent(s: Stats): number {
  return s.requests > 0 ? (s.errors / s.requests) * 100 : 0;
}

// p95 a partir de buckets acumulados de un histograma (devuelve el límite superior del bucket)
export function p95FromBuckets(
  buckets: Array<{ le: number; count: number }>
): number | null {
  if (buckets.length === 0) return null;
  const ordenados = [...buckets].sort((a, b) => a.le - b.le);
  const total = ordenados[ordenados.length - 1].count;
  if (total === 0) return null;
  const objetivo = total * 0.95;
  for (const b of ordenados) {
    if (b.count >= objetivo) return b.le;
  }
  return null;
}

export function evaluate(
  canary: Stats,
  stable: Stats,
  minCanaryRequests: number,
  minErrorCountToAbort: number,
  slo: Slo
): Evaluation {
  const violations: string[] = [];
  const canaryRate = errorRatePercent(canary);
  const stableEnough = stable.requests >= MIN_STABLE_SAMPLES;
  const stableRate = stableEnough ? errorRatePercent(stable) : null;

  if (canary.errors >= minErrorCountToAbort) {
    if (canaryRate > slo.maxErrorRatePercent) {
      violations.push(
        `tasa de errores del canary ${canaryRate.toFixed(1)}% > ${slo.maxErrorRatePercent}%`
      );
    }
    if (
      stableRate !== null &&
      canaryRate - stableRate > slo.maxErrorRateIncreasePercentVsStable
    ) {
      violations.push(
        `errores del canary ${canaryRate.toFixed(1)}% superan a stable (${stableRate.toFixed(1)}%) en más de ${slo.maxErrorRateIncreasePercentVsStable} puntos`
      );
    }
  }

  if (canary.requests >= MIN_SAMPLES_FOR_LATENCY && canary.p95Seconds !== null) {
    if (canary.p95Seconds > slo.maxP95Seconds) {
      violations.push(
        `p95 del canary ${canary.p95Seconds}s > ${slo.maxP95Seconds}s`
      );
    } else if (
      stableEnough &&
      stable.p95Seconds !== null &&
      canary.p95Seconds > slo.minP95SecondsForRatioCheck &&
      canary.p95Seconds > stable.p95Seconds * slo.maxP95RatioVsStable
    ) {
      violations.push(
        `p95 del canary ${canary.p95Seconds}s supera ${slo.maxP95RatioVsStable}x el de stable (${stable.p95Seconds}s)`
      );
    }
  }

  return {
    enoughSamples: canary.requests >= minCanaryRequests,
    violations,
    canaryErrorRate: canaryRate,
    stableErrorRate: stableRate,
  };
}