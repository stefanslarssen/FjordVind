// Authentication middleware for FjordVind/Lusevokteren
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');

// ============================================================
// SIKKERHETSKONFIGURASJON
// ============================================================

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test';

// JWT secret - PÅKREVD i produksjon
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Valider JWT_SECRET ved oppstart
if (!JWT_SECRET) {
  if (IS_PRODUCTION) {
    console.error('❌ KRITISK FEIL: JWT_SECRET er ikke satt! Serveren kan ikke starte i produksjonsmodus uten JWT_SECRET.');
    process.exit(1);
  } else if (!IS_TEST) {
    console.warn('⚠️  ADVARSEL: JWT_SECRET er ikke satt. Bruker usikker standard for utvikling.');
  }
}

// Bruk fallback kun i utvikling/test
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'DEV_ONLY_NOT_FOR_PRODUCTION_' + Date.now();

// Valider JWT_SECRET styrke i produksjon
if (IS_PRODUCTION && JWT_SECRET && JWT_SECRET.length < 32) {
  console.error('❌ KRITISK FEIL: JWT_SECRET må være minst 32 tegn i produksjon.');
  process.exit(1);
}

// Cookie configuration
const COOKIE_NAME = 'auth_token';

const COOKIE_OPTIONS = {
  httpOnly: true,                              // Forhindrer JS-tilgang (XSS-beskyttelse)
  secure: IS_PRODUCTION,                       // Kun HTTPS i produksjon
  sameSite: IS_PRODUCTION ? 'strict' : 'lax', // CSRF-beskyttelse
  maxAge: 7 * 24 * 60 * 60 * 1000,            // 7 dager
  path: '/'
};

// ============================================================
// DEMO-MODUS (kun for utvikling med eksplisitt aktivering)
// ============================================================

// Demo-modus må eksplisitt aktiveres OG være i utviklingsmodus
const DEMO_MODE = process.env.DEMO_MODE === 'true' && !IS_PRODUCTION;

if (DEMO_MODE) {
  console.warn('⚠️  DEMO-MODUS AKTIVERT - Kun for utvikling!');
}

const DEMO_USERS = DEMO_MODE ? {
  'demo_token_admin': { id: 'demo-1', email: 'admin@fjordvind.no', full_name: 'Admin Bruker', role: 'admin', company_id: 'demo-company' },
  'demo_token_leder': { id: 'demo-2', email: 'leder@fjordvind.no', full_name: 'Ole Dansen', role: 'driftsleder', company_id: 'demo-company' },
  'demo_token_rokter': { id: 'demo-3', email: 'rokter@fjordvind.no', full_name: 'Kari Hansen', role: 'røkter', company_id: 'demo-company' },
} : {};

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
    full_name: user.full_name,
    iat: Math.floor(Date.now() / 1000)  // Issued at timestamp
  };

  return jwt.sign(payload, EFFECTIVE_JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null if invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, EFFECTIVE_JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Check if a token has been revoked
 * @param {string} token - JWT token
 * @returns {Promise<boolean>} True if revoked
 */
async function isTokenRevoked(token) {
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await pool.query(
      'SELECT 1 FROM revoked_tokens WHERE token_hash = $1 AND expires_at > NOW() LIMIT 1',
      [tokenHash]
    );
    return result.rows.length > 0;
  } catch (error) {
    // If we can't check (DB error), allow the token for availability
    // In production, you might want to be stricter
    console.warn('Token revocation check failed:', error.message);
    return false;
  }
}

/**
 * Extract user from token (sync version - does not check revocation)
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
 * Extract and validate user from token (async version - checks revocation)
 * @param {string} token - JWT token or demo token
 * @returns {Promise<Object|null>} User object or null
 */
async function extractUserFromTokenAsync(token) {
  // Check for demo tokens (only in non-production)
  if (DEMO_MODE && token.startsWith('demo_token_')) {
    return DEMO_USERS[token] || null;
  }

  // Verify JWT
  const decoded = verifyToken(token);
  if (!decoded) return null;

  // Check if token is revoked
  const revoked = await isTokenRevoked(token);
  if (revoked) return null;

  return {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role,
    company_id: decoded.company_id,
    full_name: decoded.full_name
  };
}

/**
 * Set auth cookie on response
 * @param {Object} res - Express response object
 * @param {string} token - JWT token
 */
function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
}

/**
 * Clear auth cookie on response
 * @param {Object} res - Express response object
 */
function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'strict' : 'lax',
    path: '/'
  });
}

/**
 * Extract token from request (checks both cookie and Authorization header)
 * Cookie takes priority over header for better security
 * @param {Object} req - Express request object
 * @returns {string|null} Token or null
 */
function extractToken(req) {
  // First, check httpOnly cookie (more secure)
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }

  // Fallback to Authorization header (for backwards compatibility and API clients)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return null;
}

/**
 * Optional auth middleware - extracts user from token if provided
 * Allows requests to proceed without authentication
 * Note: Uses sync version (no revocation check) for performance
 */
function optionalAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  req.user = extractUserFromToken(token);
  next();
}

/**
 * Required auth middleware - returns 401 if not authenticated
 * Checks for revoked tokens in database
 */
async function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Autentisering påkrevd', code: 'AUTH_REQUIRED' });
  }

  try {
    const user = await extractUserFromTokenAsync(token);

    if (!user) {
      return res.status(401).json({ error: 'Ugyldig, utløpt eller tilbakekalt token', code: 'INVALID_TOKEN' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(500).json({ error: 'Autentiseringsfeil', code: 'AUTH_ERROR' });
  }
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
  JWT_SECRET: EFFECTIVE_JWT_SECRET,  // Eksporterer effektiv secret
  DEMO_USERS,
  DEMO_MODE,
  COOKIE_NAME,
  COOKIE_OPTIONS,
  IS_PRODUCTION,
  generateToken,
  verifyToken,
  extractUserFromToken,
  extractToken,
  setAuthCookie,
  clearAuthCookie,
  optionalAuth,
  requireAuth,
  requireRole,
  requireCompanyAccess
};
