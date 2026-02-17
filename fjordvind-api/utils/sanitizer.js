/**
 * Input Sanitization Utilities
 * Protects against XSS, SQL injection, and other input-based attacks
 */

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return str;

  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  return str.replace(/[&<>"'`=\/]/g, char => htmlEscapes[char]);
}

/**
 * Strip HTML tags completely
 */
function stripHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Remove potentially dangerous characters for SQL
 * Note: Always use parameterized queries - this is a secondary defense
 */
function sanitizeSql(str) {
  if (typeof str !== 'string') return str;

  // Remove null bytes and other problematic characters
  return str
    .replace(/\x00/g, '')       // Null bytes
    .replace(/[\x08\x09\x1a]/g, '');  // Backspace, tab, substitute
}

/**
 * Sanitize string for safe use in filenames
 */
function sanitizeFilename(str) {
  if (typeof str !== 'string') return str;

  return str
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')  // Remove invalid filename chars
    .replace(/\.{2,}/g, '.')                  // No double dots
    .replace(/^\.+|\.+$/g, '')                // No leading/trailing dots
    .substring(0, 255);                        // Max filename length
}

/**
 * Sanitize URL to prevent open redirects and javascript: URLs
 */
function sanitizeUrl(url) {
  if (typeof url !== 'string') return '';

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  if (dangerousProtocols.some(proto => trimmed.startsWith(proto))) {
    return '';
  }

  // Allow relative URLs and http(s)
  if (trimmed.startsWith('/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return url.trim();
  }

  // Add https:// to URLs without protocol
  if (trimmed.includes('.') && !trimmed.includes(' ')) {
    return 'https://' + url.trim();
  }

  return '';
}

/**
 * Trim and normalize whitespace in string
 */
function normalizeWhitespace(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Sanitize an object's string values recursively
 */
function sanitizeObject(obj, options = {}) {
  const {
    escapeHtml: shouldEscapeHtml = false,
    stripHtml: shouldStripHtml = true,
    normalizeWhitespace: shouldNormalize = true,
    maxDepth = 10
  } = options;

  function sanitizeValue(value, depth = 0) {
    if (depth > maxDepth) return value;

    if (typeof value === 'string') {
      let result = value;

      if (shouldNormalize) {
        result = normalizeWhitespace(result);
      }

      if (shouldStripHtml) {
        result = stripHtml(result);
      } else if (shouldEscapeHtml) {
        result = escapeHtml(result);
      }

      result = sanitizeSql(result);

      return result;
    }

    if (Array.isArray(value)) {
      return value.map(item => sanitizeValue(item, depth + 1));
    }

    if (value !== null && typeof value === 'object') {
      const sanitized = {};
      for (const [key, val] of Object.entries(value)) {
        // Sanitize keys too
        const sanitizedKey = sanitizeValue(key, depth + 1);
        sanitized[sanitizedKey] = sanitizeValue(val, depth + 1);
      }
      return sanitized;
    }

    return value;
  }

  return sanitizeValue(obj);
}

/**
 * Validate and sanitize email address
 */
function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';

  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  const trimmed = email.trim().toLowerCase();

  if (!emailRegex.test(trimmed)) {
    return '';
  }

  return trimmed;
}

/**
 * Validate and sanitize Norwegian phone number
 */
function sanitizeNorwegianPhone(phone) {
  if (typeof phone !== 'string') return '';

  // Remove all non-digits except leading +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Norwegian mobile: 8 digits starting with 4 or 9
  // With country code: +47 followed by 8 digits
  const patterns = [
    /^\+47[49]\d{7}$/,  // +47 format
    /^0047[49]\d{7}$/,  // 0047 format
    /^[49]\d{7}$/       // 8-digit format
  ];

  if (patterns.some(p => p.test(cleaned))) {
    // Normalize to +47 format
    if (cleaned.startsWith('+47')) return cleaned;
    if (cleaned.startsWith('0047')) return '+47' + cleaned.slice(4);
    return '+47' + cleaned;
  }

  return '';
}

/**
 * Sanitize Norwegian organization number (9 digits)
 */
function sanitizeOrgNumber(orgNum) {
  if (typeof orgNum !== 'string') return '';

  const cleaned = orgNum.replace(/\D/g, '');

  if (cleaned.length === 9) {
    return cleaned;
  }

  return '';
}

/**
 * Validate UUID format
 */
function isValidUuid(str) {
  if (typeof str !== 'string') return false;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Sanitize UUID - returns empty string if invalid
 */
function sanitizeUuid(str) {
  if (isValidUuid(str)) return str.toLowerCase();
  return '';
}

/**
 * Validate and constrain numeric value
 */
function sanitizeNumber(value, { min = -Infinity, max = Infinity, decimals = null } = {}) {
  const num = parseFloat(value);

  if (isNaN(num)) return null;

  let result = Math.max(min, Math.min(max, num));

  if (decimals !== null) {
    result = parseFloat(result.toFixed(decimals));
  }

  return result;
}

/**
 * Sanitize integer
 */
function sanitizeInteger(value, { min = -Infinity, max = Infinity } = {}) {
  const num = parseInt(value, 10);

  if (isNaN(num)) return null;

  return Math.max(min, Math.min(max, num));
}

/**
 * Sanitize date string (ISO format)
 */
function sanitizeDate(dateStr) {
  if (!dateStr) return null;

  const date = new Date(dateStr);

  if (isNaN(date.getTime())) return null;

  return date.toISOString().split('T')[0];
}

/**
 * Sanitize datetime string (ISO format)
 */
function sanitizeDateTime(dateStr) {
  if (!dateStr) return null;

  const date = new Date(dateStr);

  if (isNaN(date.getTime())) return null;

  return date.toISOString();
}

/**
 * Express middleware to sanitize request body
 */
function sanitizeBodyMiddleware(options = {}) {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body, options);
    }
    next();
  };
}

/**
 * Express middleware to sanitize query parameters
 */
function sanitizeQueryMiddleware(options = {}) {
  return (req, res, next) => {
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query, options);
    }
    next();
  };
}

/**
 * Combined sanitization middleware
 */
function sanitizeMiddleware(options = {}) {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body, options);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query, options);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params, options);
    }
    next();
  };
}

module.exports = {
  // String sanitizers
  escapeHtml,
  stripHtml,
  sanitizeSql,
  sanitizeFilename,
  sanitizeUrl,
  normalizeWhitespace,

  // Object sanitizer
  sanitizeObject,

  // Specific format sanitizers
  sanitizeEmail,
  sanitizeNorwegianPhone,
  sanitizeOrgNumber,
  sanitizeUuid,
  isValidUuid,
  sanitizeNumber,
  sanitizeInteger,
  sanitizeDate,
  sanitizeDateTime,

  // Middleware
  sanitizeBodyMiddleware,
  sanitizeQueryMiddleware,
  sanitizeMiddleware,
};
