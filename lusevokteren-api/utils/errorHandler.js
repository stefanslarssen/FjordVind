// Standardized error handling for FjordVind API

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.timestamp = new Date().toISOString()
  }
}

/**
 * Common error types
 */
const ErrorTypes = {
  VALIDATION_ERROR: { statusCode: 400, code: 'VALIDATION_ERROR' },
  NOT_FOUND: { statusCode: 404, code: 'NOT_FOUND' },
  UNAUTHORIZED: { statusCode: 401, code: 'UNAUTHORIZED' },
  FORBIDDEN: { statusCode: 403, code: 'FORBIDDEN' },
  CONFLICT: { statusCode: 409, code: 'CONFLICT' },
  RATE_LIMITED: { statusCode: 429, code: 'RATE_LIMITED' },
  DATABASE_ERROR: { statusCode: 500, code: 'DATABASE_ERROR' },
  EXTERNAL_SERVICE_ERROR: { statusCode: 502, code: 'EXTERNAL_SERVICE_ERROR' },
  INTERNAL_ERROR: { statusCode: 500, code: 'INTERNAL_ERROR' }
}

/**
 * Create a validation error
 * @param {string[]} errors - Array of validation error messages
 * @returns {ApiError}
 */
function validationError(errors) {
  return new ApiError(
    'Valideringsfeil',
    ErrorTypes.VALIDATION_ERROR.statusCode,
    ErrorTypes.VALIDATION_ERROR.code,
    { errors }
  )
}

/**
 * Create a not found error
 * @param {string} resource - Resource type that was not found
 * @param {string} [identifier] - Optional identifier
 * @returns {ApiError}
 */
function notFoundError(resource, identifier = null) {
  const message = identifier
    ? `${resource} med ID '${identifier}' ble ikke funnet`
    : `${resource} ble ikke funnet`
  return new ApiError(
    message,
    ErrorTypes.NOT_FOUND.statusCode,
    ErrorTypes.NOT_FOUND.code
  )
}

/**
 * Create an unauthorized error
 * @param {string} [message] - Custom message
 * @returns {ApiError}
 */
function unauthorizedError(message = 'Autentisering kreves') {
  return new ApiError(
    message,
    ErrorTypes.UNAUTHORIZED.statusCode,
    ErrorTypes.UNAUTHORIZED.code
  )
}

/**
 * Create a forbidden error
 * @param {string} [message] - Custom message
 * @returns {ApiError}
 */
function forbiddenError(message = 'Du har ikke tilgang til denne ressursen') {
  return new ApiError(
    message,
    ErrorTypes.FORBIDDEN.statusCode,
    ErrorTypes.FORBIDDEN.code
  )
}

/**
 * Create a database error
 * @param {Error} originalError - The original database error
 * @returns {ApiError}
 */
function databaseError(originalError) {
  console.error('Database error:', originalError)

  // Parse common PostgreSQL errors
  let message = 'En databasefeil oppstod'
  let details = null

  if (originalError.code === '23505') {
    // Unique violation
    message = 'En post med disse verdiene eksisterer allerede'
    details = { constraint: originalError.constraint }
  } else if (originalError.code === '23503') {
    // Foreign key violation
    message = 'Referansen til en relatert post er ugyldig'
    details = { constraint: originalError.constraint }
  } else if (originalError.code === '23502') {
    // Not null violation
    message = 'Et påkrevd felt mangler'
    details = { column: originalError.column }
  } else if (originalError.code === '42P01') {
    // Table does not exist
    message = 'Databasetabell mangler. Kontakt administrator.'
  } else if (originalError.code === 'ECONNREFUSED') {
    message = 'Kan ikke koble til databasen'
  }

  return new ApiError(
    message,
    ErrorTypes.DATABASE_ERROR.statusCode,
    ErrorTypes.DATABASE_ERROR.code,
    details
  )
}

/**
 * Create an external service error
 * @param {string} serviceName - Name of the external service
 * @param {Error} [originalError] - The original error
 * @returns {ApiError}
 */
function externalServiceError(serviceName, originalError = null) {
  console.error(`External service error (${serviceName}):`, originalError)
  return new ApiError(
    `Feil ved kommunikasjon med ${serviceName}`,
    ErrorTypes.EXTERNAL_SERVICE_ERROR.statusCode,
    ErrorTypes.EXTERNAL_SERVICE_ERROR.code,
    { service: serviceName }
  )
}

/**
 * Format error response
 * @param {Error|ApiError} error - Error to format
 * @returns {Object} Formatted error response
 */
function formatErrorResponse(error) {
  if (error instanceof ApiError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: error.timestamp
      }
    }
  }

  // Generic error
  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'En uventet feil oppstod',
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Express error handler middleware
 * @param {Error} err - Error object
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
function errorHandler(err, req, res, next) {
  // Log error
  console.error(`[${new Date().toISOString()}] Error:`, {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })

  // Determine status code
  const statusCode = err instanceof ApiError ? err.statusCode : 500

  // Send response
  res.status(statusCode).json(formatErrorResponse(err))
}

/**
 * Async handler wrapper to catch errors
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Log and handle database query errors with fallback
 * @param {Error} error - Database error
 * @param {string} operation - Description of the operation
 * @param {*} fallbackData - Data to return on error
 * @returns {Object} Result with data and error flag
 */
function handleQueryError(error, operation, fallbackData = null) {
  console.error(`Database error during ${operation}:`, error.message)

  return {
    data: fallbackData,
    error: true,
    message: error.message
  }
}

module.exports = {
  ApiError,
  ErrorTypes,
  validationError,
  notFoundError,
  unauthorizedError,
  forbiddenError,
  databaseError,
  externalServiceError,
  formatErrorResponse,
  errorHandler,
  asyncHandler,
  handleQueryError
}
