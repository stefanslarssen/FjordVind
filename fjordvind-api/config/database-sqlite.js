/**
 * SQLite Database Configuration for FjordVind Desktop
 * Alternative to PostgreSQL for standalone desktop deployment
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database path
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'fjordvind.db');

// Ensure data directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

/**
 * Initialize database schema
 */
function initializeSchema() {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'bruker',
      company_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Companies table
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      org_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Locations table
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company_id TEXT REFERENCES companies(id),
      locality_no INTEGER,
      latitude REAL,
      longitude REAL,
      municipality TEXT,
      county TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Merds (cages) table
    CREATE TABLE IF NOT EXISTS merds (
      id TEXT PRIMARY KEY,
      location_id TEXT REFERENCES locations(id),
      name TEXT NOT NULL,
      fish_count INTEGER DEFAULT 0,
      fish_weight_kg REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Samples (lice counts) table
    CREATE TABLE IF NOT EXISTS samples (
      id TEXT PRIMARY KEY,
      location_id TEXT REFERENCES locations(id),
      merd_id TEXT REFERENCES merds(id),
      user_id TEXT REFERENCES users(id),
      sample_date DATE NOT NULL,
      fish_counted INTEGER DEFAULT 0,
      adult_female_lice REAL DEFAULT 0,
      mobile_lice REAL DEFAULT 0,
      stationary_lice REAL DEFAULT 0,
      caligus_lice REAL DEFAULT 0,
      sea_temperature REAL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Treatments table
    CREATE TABLE IF NOT EXISTS treatments (
      id TEXT PRIMARY KEY,
      location_id TEXT REFERENCES locations(id),
      merd_id TEXT REFERENCES merds(id),
      user_id TEXT REFERENCES users(id),
      treatment_date DATE NOT NULL,
      treatment_type TEXT NOT NULL,
      method TEXT,
      product TEXT,
      dosage TEXT,
      duration_minutes INTEGER,
      efficacy_percent REAL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Alerts table
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      location_id TEXT REFERENCES locations(id),
      user_id TEXT REFERENCES users(id),
      alert_type TEXT NOT NULL,
      severity TEXT DEFAULT 'info',
      title TEXT NOT NULL,
      message TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Mortality records table
    CREATE TABLE IF NOT EXISTS mortality (
      id TEXT PRIMARY KEY,
      location_id TEXT REFERENCES locations(id),
      merd_id TEXT REFERENCES merds(id),
      record_date DATE NOT NULL,
      count INTEGER DEFAULT 0,
      cause TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Environment data table
    CREATE TABLE IF NOT EXISTS environment_data (
      id TEXT PRIMARY KEY,
      location_id TEXT REFERENCES locations(id),
      record_date DATETIME NOT NULL,
      temperature REAL,
      salinity REAL,
      oxygen_level REAL,
      ph REAL,
      current_speed REAL,
      wave_height REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Feeding records table
    CREATE TABLE IF NOT EXISTS feeding (
      id TEXT PRIMARY KEY,
      location_id TEXT REFERENCES locations(id),
      merd_id TEXT REFERENCES merds(id),
      feed_date DATE NOT NULL,
      feed_type TEXT,
      amount_kg REAL DEFAULT 0,
      feeding_time TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- User alert preferences
    CREATE TABLE IF NOT EXISTS alert_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      alert_type TEXT NOT NULL,
      email_enabled INTEGER DEFAULT 1,
      push_enabled INTEGER DEFAULT 0,
      sms_enabled INTEGER DEFAULT 0,
      threshold_value REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, alert_type)
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_samples_location ON samples(location_id);
    CREATE INDEX IF NOT EXISTS idx_samples_date ON samples(sample_date);
    CREATE INDEX IF NOT EXISTS idx_treatments_location ON treatments(location_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read) WHERE is_read = 0;
  `);

  console.log('SQLite database schema initialized');
}

/**
 * PostgreSQL-compatible query wrapper
 * Adapts pg Pool interface to better-sqlite3
 */
const pool = {
  /**
   * Execute a query with parameters
   * Converts PostgreSQL $1, $2 placeholders to SQLite ? placeholders
   */
  query: async (text, params = []) => {
    // Convert PostgreSQL-style parameters ($1, $2) to SQLite-style (?)
    let sqliteText = text;
    let paramIndex = 1;
    while (sqliteText.includes(`$${paramIndex}`)) {
      sqliteText = sqliteText.replace(`$${paramIndex}`, '?');
      paramIndex++;
    }

    // Handle some PostgreSQL-specific syntax
    sqliteText = sqliteText
      .replace(/RETURNING \*/gi, '')
      .replace(/::text/gi, '')
      .replace(/::integer/gi, '')
      .replace(/::timestamp/gi, '')
      .replace(/NOW\(\)/gi, "datetime('now')")
      .replace(/CURRENT_TIMESTAMP/gi, "datetime('now')")
      .replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
      .replace(/BOOLEAN/gi, 'INTEGER')
      .replace(/TEXT\[\]/gi, 'TEXT');

    try {
      // Determine if it's a SELECT or modification
      const isSelect = sqliteText.trim().toUpperCase().startsWith('SELECT');
      const isInsert = sqliteText.trim().toUpperCase().startsWith('INSERT');

      if (isSelect) {
        const stmt = db.prepare(sqliteText);
        const rows = stmt.all(...params);
        return { rows, rowCount: rows.length };
      } else {
        const stmt = db.prepare(sqliteText);
        const result = stmt.run(...params);

        // For INSERT, try to return the inserted row
        if (isInsert && result.lastInsertRowid) {
          // Try to get the inserted row
          const tableName = sqliteText.match(/INSERT INTO (\w+)/i)?.[1];
          if (tableName) {
            try {
              const selectStmt = db.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`);
              const insertedRow = selectStmt.get(result.lastInsertRowid);
              return { rows: insertedRow ? [insertedRow] : [], rowCount: result.changes };
            } catch {
              // Fallback if rowid doesn't work
            }
          }
        }

        return { rows: [], rowCount: result.changes };
      }
    } catch (error) {
      console.error('SQLite query error:', error.message);
      console.error('Query:', sqliteText);
      console.error('Params:', params);
      throw error;
    }
  },

  /**
   * Get a client (for transactions)
   */
  connect: async () => {
    return {
      query: pool.query,
      release: () => {},
    };
  },

  /**
   * End the pool (no-op for SQLite)
   */
  end: async () => {
    db.close();
  },
};

// Initialize schema on first load
initializeSchema();

// Seed with demo data if empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
  seedDemoData();
}

/**
 * Seed demo data for first-time use
 */
function seedDemoData() {
  const bcrypt = require('bcryptjs');

  console.log('Seeding demo data...');

  // Create demo company
  const companyId = 'comp-1';
  db.prepare(`
    INSERT INTO companies (id, name, org_number)
    VALUES (?, ?, ?)
  `).run(companyId, 'FjordVind Demo AS', '123456789');

  // Create demo users
  const users = [
    { id: 'user-1', email: 'admin@fjordvind.no', password: 'admin123', name: 'Admin Bruker', role: 'admin' },
    { id: 'user-2', email: 'leder@fjordvind.no', password: 'leder123', name: 'Ole Dansen', role: 'driftsleder' },
    { id: 'user-3', email: 'rokter@fjordvind.no', password: 'rokter123', name: 'Kari Hansen', role: 'rokter' },
  ];

  for (const user of users) {
    const hash = bcrypt.hashSync(user.password, 10);
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, company_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user.id, user.email, hash, user.name, user.role, companyId);
  }

  // Create demo locations
  const locations = [
    { id: 'loc-1', name: 'Nordfjord Anlegg', lat: 61.9, lng: 5.1, municipality: 'Stryn' },
    { id: 'loc-2', name: 'Sognefjord Anlegg', lat: 61.2, lng: 6.5, municipality: 'Vik' },
    { id: 'loc-3', name: 'Hardangerfjord Anlegg', lat: 60.1, lng: 6.2, municipality: 'Ullensvang' },
  ];

  for (const loc of locations) {
    db.prepare(`
      INSERT INTO locations (id, name, company_id, latitude, longitude, municipality)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(loc.id, loc.name, companyId, loc.lat, loc.lng, loc.municipality);

    // Create merds for each location
    for (let i = 1; i <= 6; i++) {
      const merdId = `${loc.id}-merd-${i}`;
      db.prepare(`
        INSERT INTO merds (id, location_id, name, fish_count, fish_weight_kg)
        VALUES (?, ?, ?, ?, ?)
      `).run(merdId, loc.id, `Merd ${i}`, 50000 + Math.floor(Math.random() * 30000), 3.5 + Math.random() * 2);
    }
  }

  // Create demo samples for the past 4 weeks
  const now = new Date();
  for (const loc of locations) {
    for (let week = 0; week < 4; week++) {
      const sampleDate = new Date(now);
      sampleDate.setDate(sampleDate.getDate() - (week * 7));
      const dateStr = sampleDate.toISOString().split('T')[0];

      for (let merd = 1; merd <= 6; merd++) {
        const sampleId = `sample-${loc.id}-w${week}-m${merd}`;
        const merdId = `${loc.id}-merd-${merd}`;

        db.prepare(`
          INSERT INTO samples (id, location_id, merd_id, user_id, sample_date, fish_counted, adult_female_lice, mobile_lice, stationary_lice, sea_temperature)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          sampleId,
          loc.id,
          merdId,
          'user-2',
          dateStr,
          20,
          Math.random() * 0.3,
          Math.random() * 0.5,
          Math.random() * 0.2,
          8 + Math.random() * 4
        );
      }
    }
  }

  console.log('Demo data seeded successfully');
}

module.exports = pool;
