/**
 * Global Concurrency Limiter (Semaphore)
 * Prevents WORKER_LIMIT / BOOT_ERROR by capping in-flight requests globally.
 * REDUCED to 12 to prevent Overpass API overload (was 40, caused 504 timeouts)
 */

const MAX_CONCURRENT = 12;

let inFlight = 0;
const queue: Array<() => void> = [];

export async function withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  // Wait for a slot if we're at capacity
  if (inFlight >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => {
      queue.push(resolve);
    });
  }

  inFlight++;
  try {
    return await fn();
  } finally {
    inFlight--;
    // Release next queued request
    const next = queue.shift();
    if (next) next();
  }
}

export function getCurrentInFlight(): number {
  return inFlight;
}

export function getQueueLength(): number {
  return queue.length;
}

// Legacy exports for backward compatibility
export const acquireFetchSlot = async (): Promise<void> => {
  if (inFlight >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => {
      queue.push(resolve);
    });
  }
  inFlight++;
};

export const releaseFetchSlot = (): void => {
  inFlight--;
  const next = queue.shift();
  if (next) next();
};
