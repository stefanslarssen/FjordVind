/**
 * Database Context Middleware
 * Sets user context for RLS policies on each authenticated request.
 */

const pool = require('../config/database');

/**
 * Middleware to attach database query functions with user context.
 * Must be used AFTER auth middleware (req.user must be set).
 */
function dbContextMiddleware(req, res, next) {
  // Skip if no authenticated user
  if (!req.user) {
    req.dbQuery = (text, params) => pool.query(text, params);
    return next();
  }

  const userContext = {
    id: req.user.id,
    role: req.user.role,
    company_id: req.user.company_id || null
  };

  // Attach context-aware query function to request
  req.dbQuery = async (text, params) => {
    return pool.queryWithContext(text, params, userContext);
  };

  // Attach transaction function with context
  req.dbTransaction = async (callback) => {
    return pool.transactionWithContext(callback, userContext);
  };

  // Also attach user context for direct access
  req.userContext = userContext;

  next();
}

module.exports = dbContextMiddleware;
