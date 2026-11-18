import { setTimeout as delay } from "node:timers/promises";

export const POOL_CAPACITY = 4;

const permits = new Set<symbol>();

type Release = () => void;

function allocate(label: string): Release {
  const permit = Symbol(label);
  permits.add(permit);

  // Set.delete permite liberar varias veces sin alterar otros permisos.
  return () => {
    permits.delete(permit);
  };
}

export function poolState() {
  return {
    capacity: POOL_CAPACITY,
    usedSlots: permits.size,
    availableSlots: POOL_CAPACITY - permits.size,
  };
}

export function tryAcquirePermit(): Release | null {
  if (permits.size >= POOL_CAPACITY) {
    return null;
  }

  return allocate("dependency-request");
}

export function reservePermits(count: number): Release | null {
  if (
    !Number.isInteger(count) ||
    count < 0 ||
    count > POOL_CAPACITY
  ) {
    throw new Error("Cantidad de permisos inválida");
  }

  if (permits.size + count > POOL_CAPACITY) {
    return null;
  }

  const releases = Array.from(
    { length: count },
    () => allocate("chaos-reservation")
  );

  return () => {
    releases.forEach((release) => release());
  };
}

export async function acquirePermit(
  waitMs: number,
  signal: AbortSignal
): Promise<Release> {
  if (!Number.isFinite(waitMs) || waitMs < 0 || waitMs > 10000) {
    throw new Error("Tiempo de espera inválido");
  }

  const deadline = performance.now() + waitMs;

  while (true) {
    signal.throwIfAborted();

    const release = tryAcquirePermit();

    if (release) {
      return release;
    }

    const remaining = deadline - performance.now();

    if (remaining <= 0) {
      throw new Error("DEPENDENCY_POOL_EXHAUSTED");
    }

    await delay(
      Math.min(25, remaining),
      undefined,
      { signal }
    );
  }
}