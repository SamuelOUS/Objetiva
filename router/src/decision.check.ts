import assert from "node:assert/strict";
import { evaluate, p95FromBuckets, type Slo } from "./decision.js";

const slo: Slo = {
  maxErrorRatePercent: 5,
  maxErrorRateIncreasePercentVsStable: 2,
  maxP95Seconds: 1.5,
  maxP95RatioVsStable: 2,
  minP95SecondsForRatioCheck: 0.5,
};
const stable = { requests: 200, errors: 0, p95Seconds: 0.1 };

// 1. Canary sano
let r = evaluate({ requests: 100, errors: 0, p95Seconds: 0.3 }, stable, 30, 2, slo);
assert.equal(r.violations.length, 0);
assert.equal(r.enoughSamples, true);

// 2. Muchos errores: debe violar
r = evaluate({ requests: 100, errors: 20, p95Seconds: 0.3 }, stable, 30, 2, slo);
assert.ok(r.violations.length > 0);

// 3. Un solo error suelto: no debe violar
r = evaluate({ requests: 20, errors: 1, p95Seconds: 0.3 }, stable, 30, 2, slo);
assert.equal(r.violations.length, 0);

// 4. Pocas muestras: no hay suficientes para decidir
r = evaluate({ requests: 5, errors: 0, p95Seconds: null }, stable, 30, 2, slo);
assert.equal(r.enoughSamples, false);
assert.equal(r.violations.length, 0);

// 5. Latencia alta absoluta: debe violar
r = evaluate({ requests: 100, errors: 0, p95Seconds: 2 }, stable, 30, 2, slo);
assert.ok(r.violations.length > 0);

// 6. Percentil p95 desde buckets acumulados
const p95 = p95FromBuckets([
  { le: 0.1, count: 50 },
  { le: 0.5, count: 95 },
  { le: 1, count: 100 },
  { le: Infinity, count: 100 },
]);
assert.equal(p95, 0.5);

console.log("OK: 6 comprobaciones de la lógica de decisión");