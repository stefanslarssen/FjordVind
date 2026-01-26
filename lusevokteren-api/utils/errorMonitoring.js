// Error Monitoring - Sentry-ready configuration
// Install Sentry when ready: npm install @sentry/node
// Then set SENTRY_DSN in your environment

const logger = require('./logger');

// Check if Sentry is configured
const SENTRY_DSN = process.env.SENTRY_DSN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

let Sentry = null;

/**
 * Initialize error monitoring
 * Call this early in your application startup
 */
function init(app) {
  if (SENTRY_DSN) {
    try {
      // Dynamic import - only loads if Sentry is installed
      Sentry = require('@sentry/node');

      Sentry.init({
        dsn: SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.npm_package_version || '1.0.0',

        // Performance monitoring
        tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,

        // Filter sensitive data
        beforeSend(event) {
          // Remove sensitive headers
          if (event.request && event.request.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
          }

          // Remove sensitive data from request body
          if (event.request && event.request.data) {
            const sensitiveFields = ['password', 'password_hash', 'token', 'secret', 'api_key'];
            sensitiveFields.forEach(field => {
              if (typeof event.request.data === 'object' && event.request.data[field]) {
                event.request.data[field] = '[REDACTED]';
              }
            });
          }

          return event;
        },

        // Ignore certain errors
        ignoreErrors: [
          'ECONNRESET',
          'ECONNREFUSED',
          'ETIMEDOUT',
          'Request aborted',
        ],
      });

      // Add Sentry request handler as first middleware
      if (app) {
        app.use(Sentry.Handlers.requestHandler());
      }

      logger.info('Sentry error monitoring initialized');
      return true;
    } catch (error) {
      logger.warn('Sentry not installed. Run: npm install @sentry/node', { error: error.message });
      return false;
    }
  } else {
    if (IS_PRODUCTION) {
      logger.warn('SENTRY_DSN not configured - error monitoring disabled');
    }
    return false;
  }
}

/**
 * Get Sentry error handler middleware
 * Use this after all routes but before your own error handler
 */
function getErrorHandler() {
  if (Sentry) {
    return Sentry.Handlers.errorHandler();
  }
  // Return no-op middleware if Sentry not configured
  return (err, req, res, next) => next(err);
}

/**
 * Capture an exception manually
 */
function captureException(error, context = {}) {
  if (Sentry) {
    Sentry.withScope((scope) => {
      // Add extra context
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  }

  // Always log the error
  logger.error('Exception captured', {
    error: error.message,
    stack: error.stack,
    ...context,
  });
}

/**
 * Capture a message manually
 */
function captureMessage(message, level = 'info', context = {}) {
  if (Sentry) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureMessage(message, level);
    });
  }

  logger[level] || logger.info(message, context);
}

/**
 * Set user context for error tracking
 */
function setUser(user) {
  if (Sentry && user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      company_id: user.company_id,
    });
  }
}

/**
 * Clear user context
 */
function clearUser() {
  if (Sentry) {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
function addBreadcrumb(category, message, data = {}, level = 'info') {
  if (Sentry) {
    Sentry.addBreadcrumb({
      category,
      message,
      data,
      level,
    });
  }
}

/**
 * Create a transaction for performance monitoring
 */
function startTransaction(name, op) {
  if (Sentry) {
    return Sentry.startTransaction({ name, op });
  }
  // Return mock transaction if Sentry not available
  return {
    finish: () => {},
    setStatus: () => {},
    startChild: () => ({ finish: () => {} }),
  };
}

module.exports = {
  init,
  getErrorHandler,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  startTransaction,
  isConfigured: () => !!Sentry,
};
