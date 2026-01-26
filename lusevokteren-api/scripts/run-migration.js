#!/usr/bin/env node
/**
 * Run database migrations
 * Usage: node scripts/run-migration.js [migration-file]
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'lusevokteren',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runMigration(migrationFile) {
  const client = await pool.connect();

  try {
    console.log(`\n📦 Running migration: ${migrationFile}\n`);

    // Read SQL file
    const sqlPath = path.resolve(migrationFile);
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration file not found: ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolons but handle functions/triggers carefully
    // For simplicity, we'll run the whole file as one transaction
    await client.query('BEGIN');

    try {
      await client.query(sql);
      await client.query('COMMIT');
      console.log('✅ Migration completed successfully!\n');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

  } finally {
    client.release();
    await pool.end();
  }
}

async function runAllMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found.');
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }

  console.log(`Found ${files.length} migration(s):\n`);
  files.forEach(f => console.log(`  - ${f}`));

  for (const file of files) {
    await runMigration(path.join(migrationsDir, file));
  }
}

// Main
const migrationArg = process.argv[2];

if (migrationArg) {
  runMigration(migrationArg).catch(err => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  });
} else {
  runAllMigrations().catch(err => {
    console.error('❌ Migrations failed:', err.message);
    process.exit(1);
  });
}
