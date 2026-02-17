// Tests for cache utility

const cache = require('../utils/cache');

describe('Cache Utility', () => {
  beforeEach(() => {
    cache.clear();
  });

  describe('set and get', () => {
    it('stores and retrieves values', () => {
      cache.set('test-key', { data: 'test-value' });
      const result = cache.get('test-key');
      expect(result).toEqual({ data: 'test-value' });
    });

    it('returns null for non-existent keys', () => {
      const result = cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('stores primitive values', () => {
      cache.set('string-key', 'hello');
      cache.set('number-key', 42);
      cache.set('boolean-key', true);

      expect(cache.get('string-key')).toBe('hello');
      expect(cache.get('number-key')).toBe(42);
      expect(cache.get('boolean-key')).toBe(true);
    });

    it('stores complex objects', () => {
      const complexObj = {
        nested: {
          array: [1, 2, 3],
          obj: { key: 'value' }
        }
      };
      cache.set('complex-key', complexObj);
      expect(cache.get('complex-key')).toEqual(complexObj);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('respects TTL and expires entries', async () => {
      cache.set('expire-key', 'value', 100); // 100ms TTL

      expect(cache.get('expire-key')).toBe('value');

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(cache.get('expire-key')).toBeNull();
    });

    it('uses default TTL when not specified', () => {
      cache.set('default-ttl', 'value');
      expect(cache.get('default-ttl')).toBe('value');
    });
  });

  describe('has', () => {
    it('returns true for existing keys', () => {
      cache.set('exists', 'value');
      expect(cache.has('exists')).toBe(true);
    });

    it('returns false for non-existent keys', () => {
      expect(cache.has('does-not-exist')).toBe(false);
    });

    it('returns false for expired keys', async () => {
      cache.set('will-expire', 'value', 50);
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(cache.has('will-expire')).toBe(false);
    });
  });

  describe('delete', () => {
    it('removes entries', () => {
      cache.set('to-delete', 'value');
      expect(cache.get('to-delete')).toBe('value');

      const deleted = cache.delete('to-delete');
      expect(deleted).toBe(true);
      expect(cache.get('to-delete')).toBeNull();
    });

    it('returns false when deleting non-existent key', () => {
      const deleted = cache.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      const cleared = cache.clear();
      expect(cleared).toBe(3);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });

    it('returns 0 when cache is empty', () => {
      const cleared = cache.clear();
      expect(cleared).toBe(0);
    });
  });

  describe('deletePattern', () => {
    it('deletes entries matching pattern', () => {
      cache.set('user:1', { id: 1 });
      cache.set('user:2', { id: 2 });
      cache.set('product:1', { id: 1 });

      // Use wildcard pattern to match 'user:*'
      const deleted = cache.deletePattern('user:*');
      expect(deleted).toBe(2);
      expect(cache.get('user:1')).toBeNull();
      expect(cache.get('user:2')).toBeNull();
      expect(cache.get('product:1')).toEqual({ id: 1 });
    });

    it('returns 0 when no matches', () => {
      cache.set('key1', 'value1');
      const deleted = cache.deletePattern('nonexistent:*');
      expect(deleted).toBe(0);
    });
  });

  describe('getStats', () => {
    it('returns cache statistics', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // Hit
      cache.get('key2'); // Miss

      const stats = cache.getStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
    });

    it('tracks hits and misses', () => {
      // Start fresh
      cache.clear();
      cache.set('key', 'value');

      // Record hits and misses
      cache.get('key'); // Hit
      cache.get('key'); // Hit
      cache.get('nonexistent'); // Miss

      const stats = cache.getStats();
      // Note: Stats accumulate across test runs, so just verify structure
      expect(stats.hits).toBeGreaterThanOrEqual(2);
      expect(stats.misses).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getOrSet', () => {
    it('returns cached value if exists', async () => {
      cache.set('existing', 'cached-value');

      const fetchFn = jest.fn().mockResolvedValue('fetched-value');
      const result = await cache.getOrSet('existing', fetchFn);

      expect(result).toBe('cached-value');
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('calls fetch function and caches result if not exists', async () => {
      const fetchFn = jest.fn().mockResolvedValue('fetched-value');
      const result = await cache.getOrSet('new-key', fetchFn);

      expect(result).toBe('fetched-value');
      expect(fetchFn).toHaveBeenCalled();
      expect(cache.get('new-key')).toBe('fetched-value');
    });

    it('respects TTL for new entries', async () => {
      const fetchFn = jest.fn().mockResolvedValue('value');
      await cache.getOrSet('ttl-key', fetchFn, 50);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.get('ttl-key')).toBeNull();
    });
  });

  describe('cached', () => {
    it('caches function result', async () => {
      const expensiveFn = jest.fn().mockResolvedValue('computed');

      const result1 = await cache.cached('computation', expensiveFn);
      const result2 = await cache.cached('computation', expensiveFn);

      expect(result1).toBe('computed');
      expect(result2).toBe('computed');
      expect(expensiveFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('cacheMiddleware', () => {
    it('creates middleware function', () => {
      const middleware = cache.cacheMiddleware(60000);
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3);
    });

    it('skips non-GET requests', () => {
      const middleware = cache.cacheMiddleware();
      const req = { method: 'POST', originalUrl: '/api/test' };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});

describe('Cache Async Methods', () => {
  beforeEach(() => {
    cache.clear();
  });

  describe('getAsync/setAsync', () => {
    it('works with memory cache when Redis unavailable', async () => {
      await cache.setAsync('async-key', { data: 'value' });
      const result = await cache.getAsync('async-key');
      expect(result).toEqual({ data: 'value' });
    });

    it('returns null for missing keys', async () => {
      const result = await cache.getAsync('missing');
      expect(result).toBeNull();
    });
  });

  describe('delAsync', () => {
    it('deletes keys asynchronously', async () => {
      await cache.setAsync('del-key', 'value');
      await cache.delAsync('del-key');
      expect(await cache.getAsync('del-key')).toBeNull();
    });
  });

  describe('clearAsync', () => {
    it('clears cache asynchronously', async () => {
      await cache.setAsync('key1', 'v1');
      await cache.setAsync('key2', 'v2');

      const cleared = await cache.clearAsync();
      expect(cleared).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getStatsAsync', () => {
    it('returns stats asynchronously', async () => {
      const stats = await cache.getStatsAsync();
      expect(stats).toHaveProperty('type');
      expect(stats).toHaveProperty('redisConnected');
    });
  });
});

describe('Redis Functions', () => {
  describe('isRedisAvailable', () => {
    it('returns false when Redis not configured', () => {
      expect(cache.isRedisAvailable()).toBe(false);
    });
  });

  describe('initRedis', () => {
    it('returns false when REDIS_URL not set', async () => {
      const result = await cache.initRedis();
      expect(result).toBe(false);
    });
  });

  describe('close', () => {
    it('handles close gracefully when not connected', async () => {
      await expect(cache.close()).resolves.not.toThrow();
    });
  });
});
