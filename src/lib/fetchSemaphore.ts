/**
 * Global Concurrency Limiter (Semaphore)
 * Prevents WORKER_LIMIT / BOOT_ERROR by capping in-flight requests globally.
 * Even with high batch sizes, we never exceed MAX_CONCURRENT requests at once.
 */

const MAX_CONCURRENT = 30; // Very aggressive for maximum parallelism

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
