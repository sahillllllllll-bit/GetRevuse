/**
 * cacheService.js
 * Simple in-memory cache with TTL (Time To Live)
 * Prevents repetitive Brevo API calls and DB queries
 *
 * Usage:
 *   cache.set('key', data, 60)        // cache for 60 seconds
 *   cache.get('key')                  // returns data or null
 *   cache.del('key')                  // invalidate manually
 *   cache.delByPrefix('analytics:')   // invalidate group
 */

class CacheService {
  constructor() {
    this.store  = new Map();
    this.timers = new Map();

    // Auto-cleanup expired entries every 5 minutes
    setInterval(() => this._cleanup(), 5 * 60 * 1000);
  }

  // ── Set value with TTL in seconds ───────────────────────────
  set(key, value, ttlSeconds = 300) {
    // Clear existing timer if key exists
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });

    // Auto-delete after TTL
    const timer = setTimeout(() => {
      this.store.delete(key);
      this.timers.delete(key);
    }, ttlSeconds * 1000);

    // Allow Node.js to exit even if timer is pending
    if (timer.unref) timer.unref();
    this.timers.set(key, timer);

    return value;
  }

  // ── Get value (returns null if expired/missing) ──────────────
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.timers.delete(key);
      return null;
    }

    return entry.value;
  }

  // ── Check if key exists and is valid ────────────────────────
  has(key) {
    return this.get(key) !== null;
  }

  // ── Delete single key ────────────────────────────────────────
  del(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    return this.store.delete(key);
  }

  // ── Delete all keys matching prefix ─────────────────────────
  delByPrefix(prefix) {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.del(key);
        count++;
      }
    }
    return count;
  }

  // ── Get or fetch pattern (cache-aside) ──────────────────────
  // If cache miss → call fetchFn → cache result → return
  async getOrFetch(key, fetchFn, ttlSeconds = 300) {
    const cached = this.get(key);
    if (cached !== null) {
      return { data: cached, fromCache: true };
    }

    const fresh = await fetchFn();
    this.set(key, fresh, ttlSeconds);
    return { data: fresh, fromCache: false };
  }

  // ── Cache stats (for debugging) ──────────────────────────────
  stats() {
    return {
      keys:    this.store.size,
      entries: Array.from(this.store.keys()),
    };
  }

  // ── Cleanup expired entries ──────────────────────────────────
  _cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        this.timers.delete(key);
      }
    }
  }
}

// ─── Singleton — shared across whole app ──────────────────────
const cache = new CacheService();

// ─── TTL constants ────────────────────────────────────────────
const TTL = {
  BREVO_STATS:      5  * 60,  // 5 min  — Brevo API (rate limited)
  CAMPAIGN_STATS:   2  * 60,  // 2 min  — campaign overview
  CUSTOMER_LIST:    3  * 60,  // 3 min  — customer list
  DASHBOARD_STATS:  1  * 60,  // 1 min  — dashboard summary
  USER_CREDITS:     30,        // 30 sec — credits (changes often)
};

module.exports = { cache, TTL };