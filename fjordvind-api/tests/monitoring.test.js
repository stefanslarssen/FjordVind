const request = require('supertest');
const express = require('express');

// Mock dependencies
jest.mock('../config/database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [{ ping: 1 }] }),
}));

jest.mock('../utils/cache', () => ({
  getStats: jest.fn().mockReturnValue({
    size: 10,
    hitRate: '85%',
  }),
}));

jest.mock('../utils/bruteForce', () => ({
  getStats: jest.fn().mockReturnValue({
    activeLocks: 2,
    trackedAccounts: 5,
  }),
}));

jest.mock('../utils/metrics', () => ({
  getMetrics: jest.fn().mockReturnValue({
    timestamp: new Date().toISOString(),
    uptime: 3600,
    requests: {
      total: 1000,
      success: 950,
      error: 50,
      rate: 1.5,
      errorRate: 5,
    },
    responseTime: {
      avg: 45,
      p50: 30,
      p95: 150,
      p99: 300,
      max: 500,
    },
    database: {
      avgQueryTime: 10,
      p95QueryTime: 25,
      errors: 2,
    },
    auth: {
      attempts: 100,
      success: 95,
      failures: 5,
      successRate: '95.0',
    },
    cache: {
      hits: 500,
      misses: 100,
      hitRate: '83.3',
    },
    errors: {
      '4xx': 40,
      '5xx': 10,
      database: 2,
      external: 3,
    },
    activeConnections: 5,
    system: {
      uptime: 3600,
      nodeVersion: 'v18.0.0',
      platform: 'linux',
      hostname: 'test-host',
      memory: {
        heapUsed: 50,
        heapTotal: 100,
        external: 5,
        rss: 120,
        systemTotal: 8000,
        systemFree: 4000,
      },
      cpu: {
        user: 1000,
        system: 500,
        loadAvg: ['0.50', '0.75', '1.00'],
        cores: 4,
      },
    },
  }),
  getPrometheusMetrics: jest.fn().mockReturnValue(`# HELP lusevokteren_requests_total Total number of HTTP requests
# TYPE lusevokteren_requests_total counter
lusevokteren_requests_total 1000

# HELP lusevokteren_uptime_seconds Application uptime in seconds
# TYPE lusevokteren_uptime_seconds gauge
lusevokteren_uptime_seconds 3600
`),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const monitoringRoutes = require('../routes/monitoring');

describe('Monitoring Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/monitoring', monitoringRoutes);
  });

  describe('GET /monitoring/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/monitoring/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /monitoring/health/live', () => {
    it('should return liveness status with uptime', async () => {
      const res = await request(app).get('/monitoring/health/live');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.uptime).toBeDefined();
      expect(typeof res.body.uptime).toBe('number');
    });
  });

  describe('GET /monitoring/health/ready', () => {
    it('should return readiness status with checks', async () => {
      const res = await request(app).get('/monitoring/health/ready');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.checks).toBeDefined();
      expect(res.body.checks.database).toBe(true);
      expect(res.body.checks.cache).toBe(true);
    });

    it('should return 503 when database is not ready', async () => {
      const pool = require('../config/database');
      pool.query.mockRejectedValueOnce(new Error('Connection refused'));

      const res = await request(app).get('/monitoring/health/ready');

      expect(res.status).toBe(503);
      expect(res.body.status).toBe('not_ready');
      expect(res.body.checks.database).toBe(false);
    });
  });

  describe('GET /monitoring/health/detailed', () => {
    it('should return detailed health information', async () => {
      const res = await request(app).get('/monitoring/health/detailed');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.uptime).toBeDefined();
      expect(res.body.components).toBeDefined();
      expect(res.body.components.database).toBeDefined();
      expect(res.body.components.cache).toBeDefined();
      expect(res.body.components.memory).toBeDefined();
      expect(res.body.components.security).toBeDefined();
    });

    it('should report degraded status on database failure', async () => {
      const pool = require('../config/database');
      pool.query.mockRejectedValueOnce(new Error('Connection timeout'));

      const res = await request(app).get('/monitoring/health/detailed');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('degraded');
      expect(res.body.components.database.status).toBe('unhealthy');
    });
  });

  describe('GET /monitoring/metrics', () => {
    it('should return JSON metrics', async () => {
      const res = await request(app).get('/monitoring/metrics');

      expect(res.status).toBe(200);
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.requests).toBeDefined();
      expect(res.body.responseTime).toBeDefined();
      expect(res.body.system).toBeDefined();
    });
  });

  describe('GET /monitoring/metrics/prometheus', () => {
    it('should return Prometheus format metrics', async () => {
      const res = await request(app).get('/monitoring/metrics/prometheus');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/plain/);
      expect(res.text).toContain('lusevokteren_requests_total');
      expect(res.text).toContain('lusevokteren_uptime_seconds');
    });
  });

  describe('GET /monitoring/status', () => {
    it('should return status page data', async () => {
      const res = await request(app).get('/monitoring/status');

      expect(res.status).toBe(200);
      expect(res.body.service).toBe('Lusevokteren API');
      expect(res.body.status).toBeDefined();
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.metrics).toBeDefined();
      expect(res.body.incidents).toBeDefined();
    });

    it('should report degraded status on high error rate', async () => {
      const metrics = require('../utils/metrics');
      metrics.getMetrics.mockReturnValueOnce({
        timestamp: new Date().toISOString(),
        uptime: 3600,
        requests: {
          total: 1000,
          success: 900,
          error: 100,
          rate: 1.5,
          errorRate: 10, // High error rate
        },
        responseTime: {
          avg: 45,
          p50: 30,
          p95: 150,
          p99: 300,
          max: 500,
        },
        system: {
          memory: { heapUsed: 50 },
        },
      });

      const res = await request(app).get('/monitoring/status');

      expect(res.body.status).toBe('degraded');
      expect(res.body.incidents.length).toBeGreaterThan(0);
      expect(res.body.incidents.some(i => i.type === 'high_error_rate')).toBe(true);
    });

    it('should report degraded status on slow responses', async () => {
      const metrics = require('../utils/metrics');
      metrics.getMetrics.mockReturnValueOnce({
        timestamp: new Date().toISOString(),
        uptime: 3600,
        requests: {
          total: 1000,
          success: 950,
          error: 50,
          rate: 1.5,
          errorRate: 2,
        },
        responseTime: {
          avg: 500,
          p50: 300,
          p95: 1500, // Slow responses
          p99: 2000,
          max: 3000,
        },
        system: {
          memory: { heapUsed: 50 },
        },
      });

      const res = await request(app).get('/monitoring/status');

      expect(res.body.status).toBe('degraded');
      expect(res.body.incidents.some(i => i.type === 'slow_responses')).toBe(true);
    });
  });
});

describe('Metrics Module', () => {
  // Test the actual metrics module (not mocked)
  beforeEach(() => {
    jest.resetModules();
  });

  it('should export required functions', () => {
    jest.unmock('../utils/metrics');
    const actualMetrics = jest.requireActual('../utils/metrics');

    expect(typeof actualMetrics.recordRequest).toBe('function');
    expect(typeof actualMetrics.recordAuthAttempt).toBe('function');
    expect(typeof actualMetrics.recordDbQuery).toBe('function');
    expect(typeof actualMetrics.getMetrics).toBe('function');
    expect(typeof actualMetrics.getPrometheusMetrics).toBe('function');
    expect(typeof actualMetrics.metricsMiddleware).toBe('function');
  });

  it('should track requests correctly', () => {
    jest.unmock('../utils/metrics');
    const actualMetrics = jest.requireActual('../utils/metrics');

    actualMetrics.recordRequest(200, 50);
    actualMetrics.recordRequest(404, 20);
    actualMetrics.recordRequest(500, 100);

    const stats = actualMetrics.getMetrics();
    expect(stats.requests.total).toBeGreaterThanOrEqual(3);
    expect(stats.requests.error).toBeGreaterThanOrEqual(2);
  });

  it('should track auth attempts', () => {
    jest.unmock('../utils/metrics');
    const actualMetrics = jest.requireActual('../utils/metrics');

    actualMetrics.recordAuthAttempt(true);
    actualMetrics.recordAuthAttempt(false);

    const stats = actualMetrics.getMetrics();
    expect(stats.auth.attempts).toBeGreaterThanOrEqual(2);
    expect(stats.auth.success).toBeGreaterThanOrEqual(1);
    expect(stats.auth.failures).toBeGreaterThanOrEqual(1);
  });

  it('should generate Prometheus format', () => {
    jest.unmock('../utils/metrics');
    const actualMetrics = jest.requireActual('../utils/metrics');

    const prometheus = actualMetrics.getPrometheusMetrics();

    expect(prometheus).toContain('# HELP');
    expect(prometheus).toContain('# TYPE');
    expect(prometheus).toContain('lusevokteren_requests_total');
    expect(prometheus).toContain('lusevokteren_uptime_seconds');
  });

  it('should provide metrics middleware', () => {
    jest.unmock('../utils/metrics');
    const actualMetrics = jest.requireActual('../utils/metrics');

    const middleware = actualMetrics.metricsMiddleware();
    expect(typeof middleware).toBe('function');
    expect(middleware.length).toBe(3); // req, res, next
  });
});
