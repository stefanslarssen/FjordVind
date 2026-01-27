/**
 * FjordVind Lusevokteren - Caching Utility
 *
 * In-memory cache med støtte for Redis når tilgjengelig.
 * Bruker en enkel TTL-basert strategi.
 */

const { API_CONFIG } = require('../config/constants');

// In-memory cache store
const memoryCache = new Map();

// Cache stats for monitoring
const cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
};

/**
 * Sjekk om en cache-entry har utløpt
 */
function isExpired(entry) {
  return entry.expiresAt && Date.now() > entry.expiresAt;
}

/**
 * Rens utløpte entries fra cache (kjøres periodisk)
 */
function cleanExpired() {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt && now > entry.expiresAt) {
      memoryCache.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[Cache] Cleaned ${cleaned} expired entries`);
  }
}

// Kjør cleanup hvert 5. minutt
setInterval(cleanExpired, 5 * 60 * 1000);

/**
 * Hent verdi fra cache
 * @param {string} key - Cache-nøkkel
 * @returns {any|null} - Cachet verdi eller null
 */
function get(key) {
  const entry = memoryCache.get(key);

  if (!entry) {
    cacheStats.misses++;
    return null;
  }

  if (isExpired(entry)) {
    memoryCache.delete(key);
    cacheStats.misses++;
    return null;
  }

  cacheStats.hits++;
  return entry.value;
}

/**
 * Lagre verdi i cache
 * @param {string} key - Cache-nøkkel
 * @param {any} value - Verdi å cache
 * @param {number} ttlMs - Time-to-live i millisekunder (default: 5 minutter)
 */
function set(key, value, ttlMs = API_CONFIG.CACHE_DURATION) {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
    createdAt: Date.now(),
  });
  cacheStats.sets++;
}

/**
 * Sjekk om en nøkkel finnes i cache (og ikke er utløpt)
 * @param {string} key - Cache-nøkkel
 * @returns {boolean} - true hvis nøkkelen finnes og ikke er utløpt
 */
function has(key) {
  const entry = memoryCache.get(key);
  if (!entry) return false;
  if (isExpired(entry)) {
    memoryCache.delete(key);
    return false;
  }
  return true;
}

/**
 * Slett verdi fra cache
 * @param {string} key - Cache-nøkkel
 * @returns {boolean} - true hvis nøkkelen ble slettet
 */
function del(key) {
  const existed = memoryCache.has(key);
  const deleted = memoryCache.delete(key);
  if (deleted) cacheStats.deletes++;
  return existed;
}

// Alias for del (for kompatibilitet med standard Map API)
const deleteKey = del;

/**
 * Slett alle entries som matcher et pattern
 * @param {string} pattern - Pattern å matche (støtter * som wildcard)
 */
function delPattern(pattern) {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  let deleted = 0;

  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
      deleted++;
    }
  }

  cacheStats.deletes += deleted;
  return deleted;
}

/**
 * Tøm hele cachen
 */
function clear() {
  const size = memoryCache.size;
  memoryCache.clear();
  cacheStats.deletes += size;
  return size;
}

/**
 * Hent cache-statistikk
 */
function getStats() {
  const hitRate = cacheStats.hits + cacheStats.misses > 0
    ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(2)
    : 0;

  return {
    ...cacheStats,
    hitRate: `${hitRate}%`,
    size: memoryCache.size,
    type: 'memory',
  };
}

/**
 * Cache middleware for Express
 * Cacher GET-responses basert på URL
 */
function cacheMiddleware(ttlMs = API_CONFIG.CACHE_DURATION) {
  return (req, res, next) => {
    // Kun cache GET-requests
    if (req.method !== 'GET') {
      return next();
    }

    // Bygg cache-nøkkel fra URL og query params
    const cacheKey = `route:${req.originalUrl}`;

    // Sjekk om vi har cachet svar
    const cached = get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Overstyr res.json for å cache responsen
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Kun cache vellykkede responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        set(cacheKey, body, ttlMs);
      }
      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

/**
 * Wrapper for å cache en async funksjon
 * @param {string} key - Cache-nøkkel
 * @param {Function} fn - Async funksjon å cache
 * @param {number} ttlMs - Time-to-live
 */
async function cached(key, fn, ttlMs = API_CONFIG.CACHE_DURATION) {
  const cachedValue = get(key);
  if (cachedValue !== null) {
    return cachedValue;
  }

  const result = await fn();
  set(key, result, ttlMs);
  return result;
}

/**
 * Hent verdi fra cache, eller sett den hvis den ikke finnes
 * @param {string} key - Cache-nøkkel
 * @param {Function} fetchFn - Funksjon som henter verdien hvis ikke cachet
 * @param {number} ttlMs - Time-to-live i millisekunder
 * @returns {Promise<any>} - Cachet eller hentet verdi
 */
async function getOrSet(key, fetchFn, ttlMs = API_CONFIG.CACHE_DURATION) {
  const cachedValue = get(key);
  if (cachedValue !== null) {
    return cachedValue;
  }

  const result = await fetchFn();
  set(key, result, ttlMs);
  return result;
}

module.exports = {
  get,
  set,
  has,
  del,
  delete: deleteKey,  // Alias for kompatibilitet
  delPattern,
  deletePattern: delPattern,  // Alias
  clear,
  getStats,
  getOrSet,
  cacheMiddleware,
  cached,
};
