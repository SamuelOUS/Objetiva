import { readFileSync } from "node:fs";
import type { Registry } from "prom-client";
import { evaluate, p95FromBuckets, type Slo, type Stats } from "./decision.js";

type Track = "stable" | "canary";
type Status = "idle" | "warming" | "running" | "paused" | "completed" | "aborted";

interface Stage {
  name: string;
  weight: number;
  bakeSeconds: number;
  minCanaryRequests: number;
  trafficMode: "header" | "split";
}

interface Config {
  evaluationIntervalSeconds: number;
  stages: Stage[];
  slo: Slo;
  decision: {
    minErrorCountToAbort: number;
    violationsToAbort: number;
    maxExtensions: number;
  };
  load: { concurrency: number; delayMs: number; paths: string[] };
}

interface TrackSnap {
  requests: number;
  errors: number;
  buckets: Map<number, number>;
}
type Snap = Record<Track, TrackSnap>;

export interface ControllerDeps {
  register: Registry;
  port: number;
  stableUrl: string;
  canaryUrl: string;
  getWeight: () => number;
  setWeight: (percent: number) => void;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function loadConfig(): Config {
  const texto = readFileSync(
    new URL("./rollout.config.json", import.meta.url),
    "utf8"
  ).replace(/^\uFEFF/, "");
  return JSON.parse(texto) as Config;
}

function snapVacio(): Snap {
  return {
    stable: { requests: 0, errors: 0, buckets: new Map() },
    canary: { requests: 0, errors: 0, buckets: new Map() },
  };
}

// Lee los contadores del router: errores = respuestas 5xx; latencia = buckets del histograma
async function tomarSnapshot(register: Registry): Promise<Snap> {
  const snap = snapVacio();
  const metricas: any[] = await register.getMetricsAsJSON();
  for (const m of metricas) {
    if (m.name === "router_requests_total") {
      for (const v of m.values) {
        const t = v.labels?.track;
        if (t !== "stable" && t !== "canary") continue;
        snap[t as Track].requests += v.value;
        if (String(v.labels.status_code).startsWith("5")) {
          snap[t as Track].errors += v.value;
        }
      }
    } else if (m.name === "router_request_duration_seconds") {
      for (const v of m.values) {
        const t = v.labels?.track;
        if (t !== "stable" && t !== "canary") continue;
        if (v.labels.le === undefined) continue; // _sum y _count no tienen "le"
        const le = v.labels.le === "+Inf" ? Infinity : Number(v.labels.le);
        const b = snap[t as Track].buckets;
        b.set(le, (b.get(le) ?? 0) + v.value);
      }
    }
  }
  return snap;
}

function estadisticas(ahora: TrackSnap, base: TrackSnap): Stats {
  const buckets = [...ahora.buckets.entries()].map(([le, count]) => ({
    le,
    count: count - (base.buckets.get(le) ?? 0),
  }));
  return {
    requests: ahora.requests - base.requests,
    errors: ahora.errors - base.errors,
    p95Seconds: p95FromBuckets(buckets),
  };
}

function formatear(s: Stats) {
  return {
    requests: s.requests,
    errors: s.errors,
    p95Seconds:
      s.p95Seconds !== null && Number.isFinite(s.p95Seconds) ? s.p95Seconds : null,
  };
}

export function createController(deps: ControllerDeps) {
  const config = loadConfig();
  // LOAD_PATHS permite probar en local rutas que no dependen de la base de datos
  const paths = process.env.LOAD_PATHS
    ? process.env.LOAD_PATHS.split(",").map((p) => p.trim()).filter(Boolean)
    : config.load.paths;

  let runId = 0;
  let loadId = 0;

  const state = {
    status: "idle" as Status,
    stageIndex: -1,
    stage: "",
    stageElapsedSeconds: 0,
    stageBakeSeconds: 0,
    startedAt: null as string | null,
    abortReason: null as string | null,
    lastEvaluation: null as unknown,
    log: [] as string[],
  };

  function log(msg: string) {
    state.log.push(`${new Date().toISOString().slice(11, 19)} ${msg}`);
    if (state.log.length > 100) state.log.shift();
    console.log(`[rollout] ${msg}`);
  }

  // ---------- Generador de carga (solo GET, no escribe en la base) ----------
  function detenerCarga() {
    loadId++;
  }

  async function trabajador(miCarga: number, stage: Stage) {
    let n = 0;
    while (loadId === miCarga) {
      const ruta = paths[n % paths.length];
      n++;
      const headers: Record<string, string> = {};
      // Etapa 0: la mitad de las peticiones lleva la cabecera y va al canary; el resto va a stable
      if (stage.trafficMode === "header" && n % 2 === 0) headers["x-canary"] = "true";
      try {
        const r = await fetch(`http://127.0.0.1:${deps.port}${ruta}`, {
          headers,
          signal: AbortSignal.timeout(30000),
        });
        await r.arrayBuffer();
      } catch {
        /* los fallos ya quedan contados en las métricas del router */
      }
      await sleep(config.load.delayMs);
    }
  }

  function iniciarCarga(stage: Stage) {
    const miCarga = ++loadId;
    for (let w = 0; w < config.load.concurrency; w++) {
      void trabajador(miCarga, stage);
    }
  }

  // ---------- Calentamiento de los servicios gratuitos ----------
  async function calentar(url: string) {
    try {
      const r = await fetch(`${url}/`, { signal: AbortSignal.timeout(120000) });
      await r.arrayBuffer();
      log(`  ${url} respondió ${r.status}`);
    } catch (e) {
      log(`  ${url} no respondió al calentar: ${(e as Error).message}`);
    }
  }

  // ---------- Abortar: peso a 0 y carga detenida ----------
  function abort(motivo: string) {
    runId++; // cancela el recorrido en curso
    detenerCarga();
    deps.setWeight(0);
    state.status = "aborted";
    state.abortReason = motivo;
    log(`ABORTADO: ${motivo}. Tráfico al canary: 0%`);
  }

  // ---------- Una etapa: carga, mediciones cada N s y decisión ----------
  async function ejecutarEtapa(id: number, stage: Stage): Promise<boolean> {
    const d = config.decision;
    const intervalo = config.evaluationIntervalSeconds;
    const base = await tomarSnapshot(deps.register);
    iniciarCarga(stage);

    let transcurrido = 0;
    let permitido = stage.bakeSeconds;
    let extensiones = 0;
    let seguidas = 0;
    state.stageBakeSeconds = permitido;

    while (true) {
      await sleep(intervalo * 1000);
      if (id !== runId) return false;
      transcurrido += intervalo;
      state.stageElapsedSeconds = transcurrido;
      if (state.status === "paused") state.status = "running";

      const ahora = await tomarSnapshot(deps.register);
      const canary = estadisticas(ahora.canary, base.canary);
      const stable = estadisticas(ahora.stable, base.stable);
      const ev = evaluate(
        canary,
        stable,
        stage.minCanaryRequests,
        d.minErrorCountToAbort,
        config.slo
      );
      state.lastEvaluation = {
        canary: formatear(canary),
        stable: formatear(stable),
        violations: ev.violations,
        enoughSamples: ev.enoughSamples,
        canaryErrorRate: Number(ev.canaryErrorRate.toFixed(2)),
        stableErrorRate:
          ev.stableErrorRate === null ? null : Number(ev.stableErrorRate.toFixed(2)),
      };

      if (ev.violations.length > 0) {
        seguidas++;
        log(`Violación ${seguidas}/${d.violationsToAbort}: ${ev.violations.join("; ")}`);
        if (seguidas >= d.violationsToAbort) {
          abort(ev.violations.join("; "));
          return false;
        }
        continue;
      }
      seguidas = 0;

      if (transcurrido < permitido) continue;

      if (ev.enoughSamples) {
        log(
          `Etapa superada: ${canary.requests} peticiones al canary, ${canary.errors} errores`
        );
        return true;
      }
      if (extensiones >= d.maxExtensions) {
        abort(
          `muestras insuficientes (${canary.requests} < ${stage.minCanaryRequests}) tras ${extensiones} extensiones`
        );
        return false;
      }
      extensiones++;
      permitido += stage.bakeSeconds;
      state.stageBakeSeconds = permitido;
      state.status = "paused";
      log(
        `Pausa: solo ${canary.requests}/${stage.minCanaryRequests} peticiones al canary; se extiende el horneado (${extensiones}/${d.maxExtensions})`
      );
    }
  }

  async function recorrer(id: number) {
    try {
      state.status = "warming";
      log("Calentando servicios (pueden estar dormidos)...");
      await Promise.all([calentar(deps.stableUrl), calentar(deps.canaryUrl)]);

      for (let i = 0; i < config.stages.length; i++) {
        if (id !== runId) return;
        const stage = config.stages[i];
        state.stageIndex = i;
        state.stage = stage.name;
        state.stageElapsedSeconds = 0;
        state.status = "running";
        deps.setWeight(stage.weight);
        log(
          `Etapa ${i}: ${stage.name}, peso ${stage.weight}% (${stage.trafficMode}), horneado ${stage.bakeSeconds}s`
        );
        const ok = await ejecutarEtapa(id, stage);
        if (!ok) return;
      }
      detenerCarga();
      state.status = "completed";
      log("Promoción completada: el canary atiende el 100% del tráfico");
    } catch (e) {
      abort(`error interno: ${(e as Error).message}`);
    }
  }

  return {
    start() {
      if (["warming", "running", "paused"].includes(state.status)) {
        throw new Error("Ya hay un despliegue en curso");
      }
      state.stageIndex = -1;
      state.stage = "";
      state.stageElapsedSeconds = 0;
      state.abortReason = null;
      state.lastEvaluation = null;
      state.log = [];
      state.startedAt = new Date().toISOString();
      const id = ++runId;
      void recorrer(id);
    },
    abort,
    status() {
      return {
        status: state.status,
        stage: state.stage,
        stageIndex: state.stageIndex,
        totalStages: config.stages.length,
        stageElapsedSeconds: state.stageElapsedSeconds,
        stageBakeSeconds: state.stageBakeSeconds,
        weight: deps.getWeight(),
        startedAt: state.startedAt,
        abortReason: state.abortReason,
        lastEvaluation: state.lastEvaluation,
        plan: { stages: config.stages, slo: config.slo, decision: config.decision },
        log: state.log.slice(-40),
      };
    },
  };
}