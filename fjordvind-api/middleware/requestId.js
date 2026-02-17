// Request ID middleware for FjordVind Lusevokteren
// Adds unique request ID for tracing and debugging

const crypto = require('crypto');

/**
 * Generate a unique request ID
 * Format: timestamp-random (e.g., "1706803200000-abc123def456")
 */
function generateRequestId() {
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString('hex');
  return `${timestamp}-${random}`;
}

/**
 * Request ID middleware
 * Adds unique ID to each request for tracing through logs and error reports
 *
 * Sets:
 * - req.requestId: The unique request ID
 * - res.setHeader('X-Request-ID'): Response header with the ID
 *
 * Accepts existing X-Request-ID header from clients (for distributed tracing)
 */
function requestIdMiddleware(req, res, next) {
  // Accept existing request ID from client (for distributed tracing)
  // or generate a new one
  const existingId = req.headers['x-request-id'];
  const requestId = existingId && isValidRequestId(existingId)
    ? existingId
    : generateRequestId();

  // Attach to request object
  req.requestId = requestId;

  // Add to response headers
  res.setHeader('X-Request-ID', requestId);

  next();
}

/**
 * Validate an incoming request ID (prevent injection)
 * Only allows alphanumeric characters, hyphens, and underscores
 */
function isValidRequestId(id) {
  if (typeof id !== 'string') return false;
  if (id.length > 64) return false;
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * Get current request ID from request object
 * Falls back to 'unknown' if not set
 */
function getRequestId(req) {
  return req?.requestId || 'unknown';
}

module.exports = {
  requestIdMiddleware,
  generateRequestId,
  getRequestId
};
