// utils/cache.ts
const PREFIX = 'lishniy_cache_v1_';

export interface CacheEnvelope<T> {
  data: T;
  cachedAt: number;
}

export function setCache<T>(key: string, data: T): void {
  try {
    const payload: CacheEnvelope<T> = {
      data,
      cachedAt: Date.now()
    };
    localStorage.setItem(PREFIX + key, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to set cache:', error);
  }
}

export function getCache<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    const age = Date.now() - parsed.cachedAt;

    if (age > ttlMs) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

// TTL constants (in milliseconds)
export const TTL = {
  ENTRIES_LIST: 15 * 24 * 60 * 60 * 1000, // 15 days
  ENTRY_DETAIL: 15 * 24 * 60 * 60 * 1000, // 15 days
  VOTE_HISTORY: 15 * 24 * 60 * 60 * 1000, // 15 days
  ACTIVE_VOTE: 5 * 60 * 1000, // 5 minutes
} as const;

// Cache keys
export const CACHE_KEYS = {
  ENTRIES_ALL: 'entries_all',
  TOTAL_COUNT: 'total_count', // Add this
  ENTRY: (id: string) => `entry_${id}`,
  VOTE_HISTORY: 'vote_history',
  ACTIVE_VOTE: 'active_vote',
} as const;

// Dev-only: clear all caches
export function clearAllCaches(): void {
  if (process.env.NODE_ENV === 'development') {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  }
}