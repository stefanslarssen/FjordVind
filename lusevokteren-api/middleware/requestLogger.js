// Request logging middleware for FjordVind Lusevokteren
const logger = require('../utils/logger');
const { getRequestId } = require('./requestId');

/**
 * Request logging middleware
 * Logs incoming requests and their completion time
 * Includes request ID for tracing
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();
  const requestId = getRequestId(req);

  // Log request start (debug level)
  logger.debug('Request started', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress
  });

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    // Add requestId to log context
    const logContext = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id
    };

    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', logContext);
    } else {
      logger.logRequest(req, res, duration);
    }
  });

  next();
}

/**
 * Error logging middleware
 * Must be added after all routes
 * Includes request ID for error tracing
 */
function errorLogger(err, req, res, next) {
  const requestId = getRequestId(req);

  logger.error('Unhandled error', {
    requestId,
    error: err.message,
    code: err.code,
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
 * Returns appropriate error response with request ID
 */
function errorHandler(err, req, res, next) {
  // Already sent response
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const requestId = getRequestId(req);

  // Build error response
  const response = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: isProduction && statusCode === 500 ? 'Intern serverfeil' : err.message,
      requestId
    }
  };

  // Add details if present (e.g., validation errors)
  if (err.details) {
    response.error.details = err.details;
  }

  // Add timestamp
  response.error.timestamp = err.timestamp || new Date().toISOString();

  // Add stack trace in development
  if (!isProduction) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = {
  requestLogger,
  errorLogger,
  errorHandler
};
