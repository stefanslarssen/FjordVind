/**
 * Database Configuration for FjordVind/FjordVind
 * Supports both PostgreSQL (production) and SQLite (desktop/development)
 */
require('dotenv').config();

const DB_TYPE = process.env.DB_TYPE || 'postgres';

let pool;

if (DB_TYPE === 'sqlite') {
  // Use SQLite for desktop/standalone deployment
  console.log('Using SQLite database');
  pool = require('./database-sqlite');
} else {
  // Use PostgreSQL for production/cloud deployment
  const { Pool } = require('pg');
  console.log('Using PostgreSQL database');

  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'fjordvind',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  // Test database connection
  pool.on('connect', () => {
    console.log('PostgreSQL database connected');
  });

  pool.on('error', (err) => {
    console.error('Database error:', err);
  });
}

/**
 * Execute a query with user context for RLS policies.
 * Sets app.current_user_id and app.current_user_role before the query.
 * @param {string} queryText - SQL query
 * @param {Array} params - Query parameters
 * @param {Object} userContext - User context { id, role, company_id }
 * @returns {Promise<Object>} Query result
 */
async function queryWithContext(queryText, params = [], userContext = null) {
  if (DB_TYPE === 'sqlite' || !userContext) {
    // SQLite doesn't support session variables, use regular query
    return pool.query(queryText, params);
  }

  const client = await pool.connect();
  try {
    // Set session variables for RLS policies
    await client.query(`
      SET LOCAL app.current_user_id = '${userContext.id}';
      SET LOCAL app.current_user_role = '${userContext.role}';
      SET LOCAL app.current_company_id = '${userContext.company_id || ''}';
    `);

    // Execute the actual query
    const result = await client.query(queryText, params);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Execute multiple queries in a transaction with user context.
 * @param {Function} callback - Async function receiving the client
 * @param {Object} userContext - User context { id, role, company_id }
 * @returns {Promise<any>} Transaction result
 */
async function transactionWithContext(callback, userContext = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (DB_TYPE !== 'sqlite' && userContext) {
      // Set session variables for RLS policies
      await client.query(`
        SET LOCAL app.current_user_id = '${userContext.id}';
        SET LOCAL app.current_user_role = '${userContext.role}';
        SET LOCAL app.current_company_id = '${userContext.company_id || ''}';
      `);
    }

    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = pool;
module.exports.queryWithContext = queryWithContext;
module.exports.transactionWithContext = transactionWithContext;
