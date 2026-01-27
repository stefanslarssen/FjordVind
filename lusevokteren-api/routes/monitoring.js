/**
 * Monitoring Routes for FjordVind Lusevokteren
 *
 * Provides health checks, metrics, and status endpoints for operations.
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const cache = require('../utils/cache');
const metrics = require('../utils/metrics');
const bruteForce = require('../utils/bruteForce');
const logger = require('../utils/logger');

// Simple health check (for load balancers)
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Liveness probe (is the app running?)
router.get('/health/live', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
  });
});

// Readiness probe (is the app ready to receive traffic?)
router.get('/health/ready', async (req, res) => {
  const checks = {
    database: false,
    cache: true, // In-memory cache is always ready
  };

  try {
    // Check database connection
    const result = await pool.query('SELECT 1 as ping');
    checks.database = result.rows.length > 0;
  } catch (error) {
    logger.error('Health check: Database not ready', { error: error.message });
  }

  const isReady = Object.values(checks).every(Boolean);

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Detailed health check (for monitoring dashboards)
router.get('/health/detailed', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    components: {},
  };

  // Check database
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const latency = Date.now() - start;

    health.components.database = {
      status: 'healthy',
      latency: `${latency}ms`,
    };
  } catch (error) {
    health.status = 'degraded';
    health.components.database = {
      status: 'unhealthy',
      error: error.message,
    };
  }

  // Check cache
  try {
    const cacheStats = cache.getStats();
    health.components.cache = {
      status: 'healthy',
      entries: cacheStats.size || 0,
      hitRate: cacheStats.hitRate || 'N/A',
    };
  } catch (error) {
    health.components.cache = {
      status: 'unknown',
      error: error.message,
    };
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  health.components.memory = {
    status: memUsage.heapUsed < 500 * 1024 * 1024 ? 'healthy' : 'warning',
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
  };

  // Brute force protection stats
  const bfStats = bruteForce.getStats();
  health.components.security = {
    status: 'healthy',
    lockedAccounts: bfStats.activeLocks,
  };

  res.json(health);
});

// Metrics endpoint (JSON format)
router.get('/metrics', (req, res) => {
  try {
    const appMetrics = metrics.getMetrics();
    res.json(appMetrics);
  } catch (error) {
    logger.error('Failed to get metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

// Prometheus metrics endpoint
router.get('/metrics/prometheus', (req, res) => {
  try {
    const prometheusMetrics = metrics.getPrometheusMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(prometheusMetrics);
  } catch (error) {
    logger.error('Failed to get Prometheus metrics', { error: error.message });
    res.status(500).send('# Error collecting metrics');
  }
});

// Status page data (for custom dashboards)
router.get('/status', async (req, res) => {
  const status = {
    service: 'Lusevokteren API',
    status: 'operational',
    timestamp: new Date().toISOString(),
    metrics: {},
    incidents: [],
  };

  try {
    const appMetrics = metrics.getMetrics();

    status.metrics = {
      requestsPerSecond: appMetrics.requests.rate,
      errorRate: `${appMetrics.requests.errorRate}%`,
      avgResponseTime: `${appMetrics.responseTime.avg}ms`,
      p95ResponseTime: `${appMetrics.responseTime.p95}ms`,
      uptime: formatUptime(appMetrics.uptime),
      memoryUsage: `${appMetrics.system.memory.heapUsed}MB`,
    };

    // Check for issues
    if (appMetrics.requests.errorRate > 5) {
      status.status = 'degraded';
      status.incidents.push({
        type: 'high_error_rate',
        message: 'Error rate is elevated',
        value: `${appMetrics.requests.errorRate}%`,
      });
    }

    if (appMetrics.responseTime.p95 > 1000) {
      status.status = 'degraded';
      status.incidents.push({
        type: 'slow_responses',
        message: 'Response times are elevated',
        value: `${appMetrics.responseTime.p95}ms (p95)`,
      });
    }

    if (appMetrics.system.memory.heapUsed > 400) {
      status.incidents.push({
        type: 'high_memory',
        message: 'Memory usage is high',
        value: `${appMetrics.system.memory.heapUsed}MB`,
      });
    }

  } catch (error) {
    status.status = 'unknown';
    status.error = 'Failed to collect metrics';
  }

  res.json(status);
});

// Debug endpoint (only in development)
if (process.env.NODE_ENV !== 'production') {
  router.get('/debug', (req, res) => {
    res.json({
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      pid: process.pid,
      cwd: process.cwd(),
      env: {
        PORT: process.env.PORT,
        DB_HOST: process.env.DB_HOST,
        DEMO_MODE: process.env.DEMO_MODE,
        LOG_LEVEL: process.env.LOG_LEVEL,
        // Sensitive values hidden
        JWT_SECRET: process.env.JWT_SECRET ? '[SET]' : '[NOT SET]',
        DB_PASSWORD: process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]',
        SENTRY_DSN: process.env.SENTRY_DSN ? '[SET]' : '[NOT SET]',
      },
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    });
  });
}

// Helper: Format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}

module.exports = router;
