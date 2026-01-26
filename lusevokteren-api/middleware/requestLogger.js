// Request logging middleware for FjordVind Lusevokteren
const logger = require('../utils/logger');

/**
 * Request logging middleware
 * Logs incoming requests and their completion time
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Log request start (debug level)
  logger.debug('Request started', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress
  });

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.logRequest(req, res, duration);
  });

  next();
}

/**
 * Error logging middleware
 * Must be added after all routes
 */
function errorLogger(err, req, res, next) {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.id
  });

  // Pass to next error handler
  next(err);
}

/**
 * Global error handler
 * Returns appropriate error response
 */
function errorHandler(err, req, res, next) {
  // Already sent response
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    error: isProduction && statusCode === 500 ? 'Intern serverfeil' : err.message,
    code: err.code || 'INTERNAL_ERROR',
    ...(isProduction ? {} : { stack: err.stack })
  });
}

module.exports = {
  requestLogger,
  errorLogger,
  errorHandler
};
