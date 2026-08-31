import { logger } from './logger';

/**
 * 1. Closure Concept - Memoization Cache
 * This function returns another function that maintains access to the `cache` Map
 * even after `memoize` has finished executing. This encapsulates state securely.
 */
export function memoize<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  ttlMs = 60000
): (...args: Args) => Promise<T> {
  const cache = new Map<string, { value: T; expiresAt: number }>();

  return async (...args: Args): Promise<T> => {
    const key = JSON.stringify(args);
    const now = Date.now();
    const cached = cache.get(key);

    if (cached && cached.expiresAt > now) {
      logger.debug(`Closure Cache Hit for arguments: ${key}`);
      return cached.value;
    }

    const result = await fn(...args);
    cache.set(key, { value: result, expiresAt: now + ttlMs });
    return result;
  };
}

/**
 * 2. Hoisting Concept - Declarative Function
 * Because of hoisting, declarative functions like this can be called *before*
 * their definition in the code, unlike variable-assigned arrow functions.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}
