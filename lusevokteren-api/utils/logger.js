// Structured logging for FjordVind Lusevokteren
const winston = require('winston');
const path = require('path');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const LOG_LEVEL = process.env.LOG_LEVEL || (IS_PRODUCTION ? 'info' : 'debug');

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

// JSON format for production/file logging
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports = [
  // Console output (always)
  new winston.transports.Console({
    format: IS_PRODUCTION ? jsonFormat : consoleFormat
  })
];

// Add file transport in production
if (IS_PRODUCTION) {
  const logsDir = process.env.LOGS_DIR || path.join(__dirname, '..', 'logs');

  transports.push(
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: {
    service: 'lusevokteren-api',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports
});

// Add request logging helper
logger.logRequest = (req, res, duration) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  };

  if (res.statusCode >= 500) {
    logger.error('Request failed', logData);
  } else if (res.statusCode >= 400) {
    logger.warn('Client error', logData);
  } else {
    logger.info('Request completed', logData);
  }
};

// Add security event logging
logger.logSecurityEvent = (event, details) => {
  logger.warn('Security event', {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Add audit logging for important actions
logger.logAudit = (action, userId, resourceType, resourceId, details = {}) => {
  logger.info('Audit', {
    action,
    userId,
    resourceType,
    resourceId,
    ...details,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;
