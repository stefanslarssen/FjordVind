/**
 * Application Metrics Module for FjordVind Lusevokteren
 *
 * Collects and exposes metrics for monitoring.
 * Compatible with Prometheus/Grafana when needed.
 */

const os = require('os');

// Metric storage
const metrics = {
  // Counters
  requestsTotal: 0,
  requestsSuccess: 0,
  requestsError: 0,
  authAttempts: 0,
  authSuccess: 0,
  authFailures: 0,

  // Gauges (current values)
  activeConnections: 0,

  // Histograms (response times in ms)
  responseTimes: [],
  dbQueryTimes: [],

  // Error tracking
  errors: {
    '4xx': 0,
    '5xx': 0,
    database: 0,
    external: 0,
  },

  // Cache metrics
  cache: {
    hits: 0,
    misses: 0,
  },

  // Timestamps
  startTime: Date.now(),
  lastReset: Date.now(),
};

// Configuration
const config = {
  // Keep last N response times for percentile calculations
  maxHistogramSize: 1000,

  // Reset interval (for rate calculations) - 1 minute
  rateWindow: 60 * 1000,
};

// Rate tracking
let rateWindow = {
  requests: 0,
  errors: 0,
  startTime: Date.now(),
};

/**
 * Record an HTTP request
 */
function recordRequest(statusCode, durationMs) {
  metrics.requestsTotal++;
  rateWindow.requests++;

  if (statusCode >= 200 && statusCode < 400) {
    metrics.requestsSuccess++;
  } else {
    metrics.requestsError++;
    rateWindow.errors++;

    if (statusCode >= 400 && statusCode < 500) {
      metrics.errors['4xx']++;
    } else if (statusCode >= 500) {
      metrics.errors['5xx']++;
    }
  }

  // Record response time
  metrics.responseTimes.push(durationMs);
  if (metrics.responseTimes.length > config.maxHistogramSize) {
    metrics.responseTimes.shift();
  }
}

/**
 * Record authentication attempt
 */
function recordAuthAttempt(success) {
  metrics.authAttempts++;
  if (success) {
    metrics.authSuccess++;
  } else {
    metrics.authFailures++;
  }
}

/**
 * Record database query time
 */
function recordDbQuery(durationMs) {
  metrics.dbQueryTimes.push(durationMs);
  if (metrics.dbQueryTimes.length > config.maxHistogramSize) {
    metrics.dbQueryTimes.shift();
  }
}

/**
 * Record database error
 */
function recordDbError() {
  metrics.errors.database++;
}

/**
 * Record external API error
 */
function recordExternalError() {
  metrics.errors.external++;
}

/**
 * Record cache hit/miss
 */
function recordCacheHit() {
  metrics.cache.hits++;
}

function recordCacheMiss() {
  metrics.cache.misses++;
}

/**
 * Update active connections gauge
 */
function setActiveConnections(count) {
  metrics.activeConnections = count;
}

/**
 * Calculate percentile from array
 */
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculate average
 */
function average(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Get current request rate (requests per second)
 */
function getRequestRate() {
  const elapsed = (Date.now() - rateWindow.startTime) / 1000;
  return elapsed > 0 ? (rateWindow.requests / elapsed).toFixed(2) : 0;
}

/**
 * Get error rate (percentage)
 */
function getErrorRate() {
  if (rateWindow.requests === 0) return 0;
  return ((rateWindow.errors / rateWindow.requests) * 100).toFixed(2);
}

/**
 * Reset rate window (call periodically)
 */
function resetRateWindow() {
  rateWindow = {
    requests: 0,
    errors: 0,
    startTime: Date.now(),
  };
}

// Reset rate window periodically
setInterval(resetRateWindow, config.rateWindow);

/**
 * Get system metrics
 */
function getSystemMetrics() {
  const used = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return {
    uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
    nodeVersion: process.version,
    platform: os.platform(),
    hostname: os.hostname(),
    memory: {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      external: Math.round(used.external / 1024 / 1024),
      rss: Math.round(used.rss / 1024 / 1024),
      systemTotal: Math.round(os.totalmem() / 1024 / 1024),
      systemFree: Math.round(os.freemem() / 1024 / 1024),
    },
    cpu: {
      user: Math.round(cpuUsage.user / 1000),
      system: Math.round(cpuUsage.system / 1000),
      loadAvg: os.loadavg().map(l => l.toFixed(2)),
      cores: os.cpus().length,
    },
  };
}

/**
 * Get all metrics for monitoring dashboard
 */
function getMetrics() {
  const system = getSystemMetrics();

  return {
    timestamp: new Date().toISOString(),
    uptime: system.uptime,

    // Request metrics
    requests: {
      total: metrics.requestsTotal,
      success: metrics.requestsSuccess,
      error: metrics.requestsError,
      rate: parseFloat(getRequestRate()),
      errorRate: parseFloat(getErrorRate()),
    },

    // Response time metrics
    responseTime: {
      avg: Math.round(average(metrics.responseTimes)),
      p50: Math.round(percentile(metrics.responseTimes, 50)),
      p95: Math.round(percentile(metrics.responseTimes, 95)),
      p99: Math.round(percentile(metrics.responseTimes, 99)),
      max: Math.max(...metrics.responseTimes, 0),
    },

    // Database metrics
    database: {
      avgQueryTime: Math.round(average(metrics.dbQueryTimes)),
      p95QueryTime: Math.round(percentile(metrics.dbQueryTimes, 95)),
      errors: metrics.errors.database,
    },

    // Authentication metrics
    auth: {
      attempts: metrics.authAttempts,
      success: metrics.authSuccess,
      failures: metrics.authFailures,
      successRate: metrics.authAttempts > 0
        ? ((metrics.authSuccess / metrics.authAttempts) * 100).toFixed(1)
        : 100,
    },

    // Cache metrics
    cache: {
      hits: metrics.cache.hits,
      misses: metrics.cache.misses,
      hitRate: (metrics.cache.hits + metrics.cache.misses) > 0
        ? ((metrics.cache.hits / (metrics.cache.hits + metrics.cache.misses)) * 100).toFixed(1)
        : 0,
    },

    // Error breakdown
    errors: metrics.errors,

    // Active connections
    activeConnections: metrics.activeConnections,

    // System metrics
    system,
  };
}

/**
 * Get metrics in Prometheus format
 */
function getPrometheusMetrics() {
  const m = getMetrics();
  const lines = [
    '# HELP lusevokteren_requests_total Total number of HTTP requests',
    '# TYPE lusevokteren_requests_total counter',
    `lusevokteren_requests_total ${m.requests.total}`,
    '',
    '# HELP lusevokteren_requests_success_total Successful HTTP requests',
    '# TYPE lusevokteren_requests_success_total counter',
    `lusevokteren_requests_success_total ${m.requests.success}`,
    '',
    '# HELP lusevokteren_requests_error_total Failed HTTP requests',
    '# TYPE lusevokteren_requests_error_total counter',
    `lusevokteren_requests_error_total ${m.requests.error}`,
    '',
    '# HELP lusevokteren_response_time_ms Response time in milliseconds',
    '# TYPE lusevokteren_response_time_ms summary',
    `lusevokteren_response_time_ms{quantile="0.5"} ${m.responseTime.p50}`,
    `lusevokteren_response_time_ms{quantile="0.95"} ${m.responseTime.p95}`,
    `lusevokteren_response_time_ms{quantile="0.99"} ${m.responseTime.p99}`,
    '',
    '# HELP lusevokteren_auth_attempts_total Authentication attempts',
    '# TYPE lusevokteren_auth_attempts_total counter',
    `lusevokteren_auth_attempts_total{result="success"} ${m.auth.success}`,
    `lusevokteren_auth_attempts_total{result="failure"} ${m.auth.failures}`,
    '',
    '# HELP lusevokteren_cache_operations_total Cache operations',
    '# TYPE lusevokteren_cache_operations_total counter',
    `lusevokteren_cache_operations_total{result="hit"} ${m.cache.hits}`,
    `lusevokteren_cache_operations_total{result="miss"} ${m.cache.misses}`,
    '',
    '# HELP lusevokteren_memory_heap_bytes Heap memory usage in bytes',
    '# TYPE lusevokteren_memory_heap_bytes gauge',
    `lusevokteren_memory_heap_bytes ${m.system.memory.heapUsed * 1024 * 1024}`,
    '',
    '# HELP lusevokteren_uptime_seconds Application uptime in seconds',
    '# TYPE lusevokteren_uptime_seconds gauge',
    `lusevokteren_uptime_seconds ${m.uptime}`,
    '',
  ];

  return lines.join('\n');
}

/**
 * Express middleware for automatic request tracking
 */
function metricsMiddleware() {
  return (req, res, next) => {
    const start = Date.now();

    // Track active connections
    metrics.activeConnections++;

    res.on('finish', () => {
      const duration = Date.now() - start;
      recordRequest(res.statusCode, duration);
      metrics.activeConnections--;
    });

    next();
  };
}

module.exports = {
  recordRequest,
  recordAuthAttempt,
  recordDbQuery,
  recordDbError,
  recordExternalError,
  recordCacheHit,
  recordCacheMiss,
  setActiveConnections,
  getMetrics,
  getPrometheusMetrics,
  metricsMiddleware,
};
