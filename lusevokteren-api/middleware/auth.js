// Authentication middleware for FjordVind/Lusevokteren
const jwt = require('jsonwebtoken');

// JWT secret - MUST be set in environment variables for production
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION_use_a_long_random_string';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Warn if using default secret
if (JWT_SECRET === 'CHANGE_THIS_IN_PRODUCTION_use_a_long_random_string') {
  console.warn('⚠️  WARNING: Using default JWT_SECRET. Set JWT_SECRET environment variable for production!');
}

// Demo users for development/testing fallback (disable in production)
const DEMO_MODE = process.env.NODE_ENV !== 'production';
const DEMO_USERS = {
  'demo_token_admin': { id: 'demo-1', email: 'admin@fjordvind.no', full_name: 'Admin Bruker', role: 'admin', company_id: 'demo-company' },
  'demo_token_leder': { id: 'demo-2', email: 'leder@fjordvind.no', full_name: 'Ole Dansen', role: 'driftsleder', company_id: 'demo-company' },
  'demo_token_rokter': { id: 'demo-3', email: 'rokter@fjordvind.no', full_name: 'Kari Hansen', role: 'røkter', company_id: 'demo-company' },
};

/**
 * Generate JWT token for a user
 * @param {Object} user - User object with id, email, role, company_id
 * @returns {string} JWT token
 */
function generateToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    company_id: user.company_id,
    full_name: user.full_name
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null if invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Extract user from token
 * @param {string} token - JWT token or demo token
 * @returns {Object|null} User object or null
 */
function extractUserFromToken(token) {
  // Check for demo tokens (only in non-production)
  if (DEMO_MODE && token.startsWith('demo_token_')) {
    return DEMO_USERS[token] || null;
  }

  // Verify JWT
  const decoded = verifyToken(token);
  if (!decoded) return null;

  return {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role,
    company_id: decoded.company_id,
    full_name: decoded.full_name
  };
}

/**
 * Optional auth middleware - extracts user from token if provided
 * Allows requests to proceed without authentication
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  req.user = extractUserFromToken(token);
  next();
}

/**
 * Required auth middleware - returns 401 if not authenticated
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autentisering påkrevd', code: 'AUTH_REQUIRED' });
  }

  const token = authHeader.split(' ')[1];
  const user = extractUserFromToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Ugyldig eller utløpt token', code: 'INVALID_TOKEN' });
  }

  req.user = user;
  next();
}

/**
 * Role-based access middleware
 * @param {...string} roles - Allowed roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autentisering påkrevd', code: 'AUTH_REQUIRED' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Utilstrekkelige rettigheter',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
}

/**
 * Company isolation middleware - ensures user can only access their company's data
 * Must be used after requireAuth
 */
function requireCompanyAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Autentisering påkrevd', code: 'AUTH_REQUIRED' });
  }

  // Admin can access all companies
  if (req.user.role === 'admin') {
    return next();
  }

  // Get company_id from request (query, params, or body)
  const requestedCompanyId = req.query.company_id || req.params.company_id || req.body?.company_id;

  // If no company specified, filter will be applied in route handler
  if (!requestedCompanyId) {
    return next();
  }

  // Check if user belongs to the requested company
  if (req.user.company_id !== requestedCompanyId) {
    return res.status(403).json({
      error: 'Ingen tilgang til denne bedriftens data',
      code: 'COMPANY_ACCESS_DENIED'
    });
  }

  next();
}

module.exports = {
  JWT_SECRET,
  DEMO_USERS,
  DEMO_MODE,
  generateToken,
  verifyToken,
  extractUserFromToken,
  optionalAuth,
  requireAuth,
  requireRole,
  requireCompanyAccess
};
