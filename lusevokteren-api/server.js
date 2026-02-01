// FjordVind / Lusevokteren API Server
// Main entry point - all routes are modularized in ./routes/

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

// Logging
const logger = require('./utils/logger');
const { requestLogger, errorLogger, errorHandler } = require('./middleware/requestLogger');
const { requestIdMiddleware } = require('./middleware/requestId');

// Error Monitoring (Sentry-ready)
const errorMonitoring = require('./utils/errorMonitoring');

// Input Sanitization
const { sanitizeMiddleware } = require('./utils/sanitizer');

// API Documentation (Swagger)
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

// Database pool
const pool = require('./config/database');

// Caching
const cache = require('./utils/cache');

// Metrics
const metrics = require('./utils/metrics');

// Route modules
const routes = require('./routes');

// Monitoring routes
const monitoringRoutes = require('./routes/monitoring');

// Uploads directory (for static serving)
const { uploadsDir } = require('./routes/uploads');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Initialize error monitoring (Sentry) - must be early
errorMonitoring.init(app);

// =============================================
// SECURITY MIDDLEWARE
// =============================================

// Helmet: Security headers
app.use(helmet({
  contentSecurityPolicy: IS_PRODUCTION ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

// Compression: Gzip responses
app.use(compression());

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PRODUCTION ? 100 : 1000,
  message: { error: 'For mange forespørsler. Prøv igjen senere.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PRODUCTION ? 10 : 100,
  message: { error: 'For mange innloggingsforsøk. Prøv igjen om 15 minutter.', code: 'AUTH_RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(requestIdMiddleware);  // Add unique request ID for tracing
app.use(generalLimiter);
app.use(metrics.metricsMiddleware());
app.use(requestLogger);

logger.info('Server starting', { port: PORT, env: process.env.NODE_ENV || 'development' });

// =============================================
// MIDDLEWARE
// =============================================

// CORS with credentials support for httpOnly cookies
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());  // Parse cookies for auth
app.use(sanitizeMiddleware({ stripHtml: true, normalizeWhitespace: true }));
app.use('/uploads', express.static(uploadsDir));

// Authentication middleware
const { optionalAuth } = require('./middleware/auth');
app.use(optionalAuth);

// Database context middleware (sets user context for RLS policies)
const dbContextMiddleware = require('./middleware/dbContext');
app.use(dbContextMiddleware);

// =============================================
// ROUTE MODULES
// =============================================

// Core routes
app.use('/api/auth', authLimiter, routes.auth);
app.use('/api/samples', routes.samples);
app.use('/api/treatments', routes.treatments);
app.use('/api/alerts', routes.alerts);
app.use('/api/mortality', routes.mortality);
app.use('/api/environment', routes.environment);
app.use('/api/locations', routes.locations);
app.use('/api/merds', routes.merds);

// Statistics and dashboard
app.use('/api/stats', routes.stats);
app.use('/api/dashboard', routes.dashboard);
app.use('/api/predictions', routes.predictions);
app.use('/api/risk-scores', routes.predictions); // Alias for /risk-scores endpoint

// External data sources
app.use('/api/barentswatch', routes.barentswatch);
app.use('/api/locality-boundaries', (req, res, next) => {
  req.url = '/locality-boundaries' + req.url;
  routes.barentswatch(req, res, next);
});
app.use('/api/locality-polygons', (req, res, next) => {
  req.url = '/locality-polygons';
  routes.zones(req, res, next);
});
app.use('/api/nearby-farms', (req, res, next) => {
  req.url = '/nearby-farms' + req.url;
  routes.barentswatch(req, res, next);
});

// Companies and localities
app.use('/api/companies', routes.companies);
app.use('/api/user-localities', (req, res, next) => {
  req.url = '/user-localities' + req.url;
  routes.companies(req, res, next);
});

// Zones (disease zones, protected areas)
app.use('/api/disease-zones', (req, res, next) => {
  req.url = '/disease-zones';
  routes.zones(req, res, next);
});
app.use('/api/protected-areas', (req, res, next) => {
  req.url = '/protected-areas';
  routes.zones(req, res, next);
});
app.use('/api/zones', routes.zones);

// Notifications (alerts, push, SMS)
app.use('/api/alert-preferences', (req, res, next) => {
  req.url = '/alert-preferences' + req.url;
  routes.notifications(req, res, next);
});
app.use('/api/push', (req, res, next) => {
  req.url = '/push' + req.url;
  routes.notifications(req, res, next);
});
app.use('/api/sms', (req, res, next) => {
  req.url = '/sms' + req.url;
  routes.notifications(req, res, next);
});

// Uploads (images)
app.use('/api/upload', routes.uploads);
app.use('/api/images', routes.uploads);

// Weather
app.use('/api/weather', routes.weather);

// Reports
app.use('/api/reports', routes.reports);

// Support
app.use('/api/support', routes.support);

// Feeding (alias for dashboard feeding endpoint)
app.use('/api/feeding', (req, res, next) => {
  req.url = '/feeding' + req.url;
  routes.dashboard(req, res, next);
});

// =============================================
// API DOCUMENTATION
// =============================================

try {
  const swaggerDocument = YAML.load(path.join(__dirname, 'docs', 'openapi.yaml'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Lusevokteren API Docs'
  }));
  logger.info('API documentation available at /api/docs');
} catch (err) {
  logger.warn('Could not load API documentation', { error: err.message });
}

// =============================================
// MONITORING ENDPOINTS
// =============================================

// Comprehensive health checks, metrics, and status
app.use('/monitoring', monitoringRoutes);

// Legacy health check (redirect to new monitoring endpoint)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Lusevokteren API is running' });
});

// =============================================
// UTILITY ENDPOINTS
// =============================================

// Cache statistics
app.get('/api/cache/stats', (req, res) => {
  res.json(cache.getStats());
});

// Clear cache (admin)
app.delete('/api/cache', (req, res) => {
  const cleared = cache.clear();
  res.json({ message: `Cleared ${cleared} cache entries` });
});

// Lice counts (legacy endpoint)
app.get('/api/lice-counts', (req, res, next) => {
  req.url = '/lice-counts';
  routes.stats(req, res, next);
});

// =============================================
// ERROR HANDLING
// =============================================

app.use(errorMonitoring.getErrorHandler());
app.use(errorLogger);
app.use(errorHandler);

// =============================================
// SERVER STARTUP
// =============================================

const server = app.listen(PORT, '0.0.0.0', async () => {
  logger.info('Server started', {
    port: PORT,
    env: process.env.NODE_ENV || 'development',
    endpoints: {
      stats: '/api/stats',
      samples: '/api/samples',
      auth: '/api/auth',
      locations: '/api/locations',
      dashboard: '/api/dashboard',
      barentswatch: '/api/barentswatch'
    }
  });

  // Pre-cache company data in background
  logger.info('Pre-caching company data...');
  const { getAquacultureCompanies } = require('./services/fiskeridirektoratet');
  getAquacultureCompanies()
    .then(() => logger.info('Company data cached and ready'))
    .catch(err => logger.error('Failed to pre-cache company data', { error: err.message }));

  // Start prediction scheduler (generates daily predictions)
  if (process.env.ENABLE_PREDICTION_SCHEDULER !== 'false') {
    const predictionScheduler = require('./jobs/predictionScheduler');
    predictionScheduler.start();
  }
});

// =============================================
// GRACEFUL SHUTDOWN
// =============================================

let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`${signal} received, starting graceful shutdown...`);

  // Stop prediction scheduler
  try {
    const predictionScheduler = require('./jobs/predictionScheduler');
    predictionScheduler.stop();
  } catch (err) {
    // Scheduler may not be loaded
  }

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      await pool.end();
      logger.info('Database pool closed');
      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', { error: err.message });
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});
