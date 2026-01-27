/**
 * FjordVind Lusevokteren - Caching Utility
 *
 * Supports both in-memory and Redis caching.
 * Falls back to memory cache if Redis is not available.
 * Uses a simple TTL-based strategy.
 */

const { API_CONFIG } = require('../config/constants');
const logger = require('./logger');

// Redis client (lazy-loaded)
let redisClient = null;
let redisConnected = false;

// In-memory cache store (fallback)
const memoryCache = new Map();

// Cache stats for monitoring
const cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
};

// Redis configuration
const REDIS_CONFIG = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  keyPrefix: process.env.REDIS_PREFIX || 'lusevokteren:',
  connectTimeout: 5000,
  maxRetriesPerRequest: 3,
};

/**
 * Initialize Redis connection (called on first use or manually)
 */
async function initRedis() {
  if (redisClient) return redisConnected;

  // Only attempt Redis if REDIS_URL is set
  if (!process.env.REDIS_URL) {
    logger.info('Redis URL not configured, using memory cache');
    return false;
  }

  try {
    // Dynamically import ioredis to avoid issues if not installed
    const Redis = require('ioredis');

    redisClient = new Redis(REDIS_CONFIG.url, {
      connectTimeout: REDIS_CONFIG.connectTimeout,
      maxRetriesPerRequest: REDIS_CONFIG.maxRetriesPerRequest,
      retryStrategy(times) {
        if (times > 3) {
          logger.warn('Redis connection failed after 3 retries, using memory cache');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      redisConnected = true;
      logger.info('Redis cache connected');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis error', { error: err.message });
      redisConnected = false;
    });

    redisClient.on('close', () => {
      redisConnected = false;
      logger.warn('Redis connection closed');
    });

    await redisClient.connect();
    return redisConnected;
  } catch (err) {
    logger.warn('Redis not available, using memory cache', { error: err.message });
    redisClient = null;
    return false;
  }
}

/**
 * Get the Redis key with prefix
 */
function redisKey(key) {
  return REDIS_CONFIG.keyPrefix + key;
}

/**
 * Check if Redis is available and connected
 */
function isRedisAvailable() {
  return !!(redisClient && redisConnected);
}

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
 * Hent verdi fra cache (sync version for memory cache)
 * @param {string} key - Cache-nøkkel
 * @returns {any|null} - Cachet verdi eller null
 */
function get(key) {
  // For sync calls, only use memory cache
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
 * Hent verdi fra cache (async version with Redis support)
 * @param {string} key - Cache-nøkkel
 * @returns {Promise<any|null>} - Cachet verdi eller null
 */
async function getAsync(key) {
  // Try Redis first
  if (isRedisAvailable()) {
    try {
      const value = await redisClient.get(redisKey(key));
      if (value) {
        cacheStats.hits++;
        return JSON.parse(value);
      }
      cacheStats.misses++;
      return null;
    } catch (err) {
      logger.warn('Redis get failed, falling back to memory', { key, error: err.message });
    }
  }

  // Fallback to memory cache
  return get(key);
}

/**
 * Lagre verdi i cache (sync version for memory cache)
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
 * Lagre verdi i cache (async version with Redis support)
 * @param {string} key - Cache-nøkkel
 * @param {any} value - Verdi å cache
 * @param {number} ttlMs - Time-to-live i millisekunder (default: 5 minutter)
 */
async function setAsync(key, value, ttlMs = API_CONFIG.CACHE_DURATION) {
  // Always set in memory for fast access
  set(key, value, ttlMs);

  // Also set in Redis for persistence and sharing
  if (isRedisAvailable()) {
    try {
      const ttlSeconds = Math.ceil(ttlMs / 1000);
      await redisClient.setex(redisKey(key), ttlSeconds, JSON.stringify(value));
    } catch (err) {
      logger.warn('Redis set failed', { key, error: err.message });
    }
  }
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
 * Slett verdi fra cache (sync version for memory cache)
 * @param {string} key - Cache-nøkkel
 * @returns {boolean} - true hvis nøkkelen ble slettet
 */
function del(key) {
  const existed = memoryCache.has(key);
  const deleted = memoryCache.delete(key);
  if (deleted) cacheStats.deletes++;
  return existed;
}

/**
 * Slett verdi fra cache (async version with Redis support)
 * @param {string} key - Cache-nøkkel
 * @returns {Promise<boolean>} - true hvis nøkkelen ble slettet
 */
async function delAsync(key) {
  const memoryDeleted = del(key);

  if (isRedisAvailable()) {
    try {
      await redisClient.del(redisKey(key));
    } catch (err) {
      logger.warn('Redis del failed', { key, error: err.message });
    }
  }

  return memoryDeleted;
}

// Alias for del (for kompatibilitet med standard Map API)
const deleteKey = del;

/**
 * Slett alle entries som matcher et pattern (sync version)
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
 * Slett alle entries som matcher et pattern (async version with Redis)
 * @param {string} pattern - Pattern å matche (støtter * som wildcard)
 */
async function delPatternAsync(pattern) {
  const memoryDeleted = delPattern(pattern);

  if (isRedisAvailable()) {
    try {
      const redisPattern = REDIS_CONFIG.keyPrefix + pattern.replace(/\*/g, '*');
      const keys = await redisClient.keys(redisPattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (err) {
      logger.warn('Redis delPattern failed', { pattern, error: err.message });
    }
  }

  return memoryDeleted;
}

/**
 * Tøm hele cachen (sync version)
 */
function clear() {
  const size = memoryCache.size;
  memoryCache.clear();
  cacheStats.deletes += size;
  return size;
}

/**
 * Tøm hele cachen (async version with Redis)
 */
async function clearAsync() {
  const memoryCleared = clear();

  if (isRedisAvailable()) {
    try {
      const pattern = REDIS_CONFIG.keyPrefix + '*';
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (err) {
      logger.warn('Redis clear failed', { error: err.message });
    }
  }

  return memoryCleared;
}

/**
 * Hent cache-statistikk (sync version)
 */
function getStats() {
  const hitRate = cacheStats.hits + cacheStats.misses > 0
    ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(2)
    : 0;

  return {
    ...cacheStats,
    hitRate: `${hitRate}%`,
    size: memoryCache.size,
    type: isRedisAvailable() ? 'redis+memory' : 'memory',
    redisConnected: isRedisAvailable(),
  };
}

/**
 * Hent cache-statistikk (async version with Redis info)
 */
async function getStatsAsync() {
  const baseStats = getStats();

  if (isRedisAvailable()) {
    try {
      const info = await redisClient.info('memory');
      const keyCount = await redisClient.dbsize();
      const usedMemoryMatch = info.match(/used_memory_human:(\S+)/);

      return {
        ...baseStats,
        redis: {
          connected: true,
          keys: keyCount,
          memory: usedMemoryMatch ? usedMemoryMatch[1] : 'unknown',
        },
      };
    } catch (err) {
      logger.warn('Failed to get Redis stats', { error: err.message });
    }
  }

  return baseStats;
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
 * Uses Redis when available for distributed caching
 * @param {string} key - Cache-nøkkel
 * @param {Function} fn - Async funksjon å cache
 * @param {number} ttlMs - Time-to-live
 */
async function cached(key, fn, ttlMs = API_CONFIG.CACHE_DURATION) {
  // Try to get from cache (Redis if available, memory otherwise)
  const cachedValue = await getAsync(key);
  if (cachedValue !== null) {
    return cachedValue;
  }

  const result = await fn();
  await setAsync(key, result, ttlMs);
  return result;
}

/**
 * Hent verdi fra cache, eller sett den hvis den ikke finnes
 * Uses Redis when available for distributed caching
 * @param {string} key - Cache-nøkkel
 * @param {Function} fetchFn - Funksjon som henter verdien hvis ikke cachet
 * @param {number} ttlMs - Time-to-live i millisekunder
 * @returns {Promise<any>} - Cachet eller hentet verdi
 */
async function getOrSet(key, fetchFn, ttlMs = API_CONFIG.CACHE_DURATION) {
  // Try to get from cache (Redis if available, memory otherwise)
  const cachedValue = await getAsync(key);
  if (cachedValue !== null) {
    return cachedValue;
  }

  const result = await fetchFn();
  await setAsync(key, result, ttlMs);
  return result;
}

/**
 * Gracefully close Redis connection
 */
async function close() {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      redisConnected = false;
      logger.info('Redis connection closed');
    } catch (err) {
      logger.warn('Error closing Redis connection', { error: err.message });
    }
  }
}

module.exports = {
  // Sync methods (memory cache only)
  get,
  set,
  has,
  del,
  delete: deleteKey,  // Alias for kompatibilitet
  delPattern,
  deletePattern: delPattern,  // Alias
  clear,
  getStats,

  // Async methods (Redis with memory fallback)
  getAsync,
  setAsync,
  delAsync,
  delPatternAsync,
  clearAsync,
  getStatsAsync,

  // High-level caching functions
  getOrSet,
  cacheMiddleware,
  cached,

  // Redis management
  initRedis,
  isRedisAvailable,
  close,
};
