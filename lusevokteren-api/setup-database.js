// Database setup script for FjordVind/Lusevokteren
// Run with: node setup-database.js

require('dotenv').config()
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'lusevokteren',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
})

async function setupDatabase() {
  const client = await pool.connect()

  try {
    console.log('Starting database setup...\n')

    // Read and execute schema.sql
    console.log('1. Creating tables from schema.sql...')
    const schemaPath = path.join(__dirname, 'schema.sql')
    const schemaSql = fs.readFileSync(schemaPath, 'utf8')
    await client.query(schemaSql)
    console.log('   Tables created successfully!\n')

    // Check which tables exist
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    console.log('2. Existing tables:')
    tablesResult.rows.forEach(row => console.log(`   - ${row.table_name}`))
    console.log('')

    // Add seed data for predictions
    console.log('3. Adding seed data for predictions...')
    await client.query(`
      INSERT INTO predictions (locality_name, current_lice, predicted_lice, confidence, probability_exceed_limit, risk_level, recommended_action, days_ahead, target_date)
      SELECT * FROM (VALUES
        ('Fjordheim', 0.18, 0.32, 0.85, 0.45, 'MEDIUM', 'Overvåk lusenivåer nøye. Vurder rensefisk eller forebyggende tiltak.', 14, CURRENT_DATE + 14),
        ('Havbruk Nord', 0.42, 0.58, 0.78, 0.72, 'HIGH', 'Planlegg behandling innen 7 dager. Kontakt veterinær.', 14, CURRENT_DATE + 14),
        ('Kystlaks AS', 0.08, 0.15, 0.92, 0.12, 'LOW', 'Fortsett normal overvåking.', 14, CURRENT_DATE + 14),
        ('Vestfjord Akva', 0.55, 0.78, 0.71, 0.88, 'CRITICAL', 'Umiddelbar handling kreves! Behandling må gjennomføres snarest.', 14, CURRENT_DATE + 14),
        ('Nordland Sjømat', 0.25, 0.38, 0.82, 0.52, 'MEDIUM', 'Økende trend. Forbered behandlingsplan.', 14, CURRENT_DATE + 14)
      ) AS v(locality_name, current_lice, predicted_lice, confidence, probability_exceed_limit, risk_level, recommended_action, days_ahead, target_date)
      WHERE NOT EXISTS (SELECT 1 FROM predictions LIMIT 1)
    `)
    console.log('   Predictions seed data added!\n')

    // Add seed data for treatments
    console.log('4. Adding seed data for treatments...')
    await client.query(`
      INSERT INTO treatments (locality_name, treatment_type, status, scheduled_date, lice_before, effectiveness_percent, urgency, notes, recommendation_source)
      SELECT * FROM (VALUES
        ('Fjordheim', 'Rensefisk', 'fullført', CURRENT_DATE - 30, 0.35, 65.0, 'normal', '500 rognkjeks tilsatt', 'Veterinær'),
        ('Havbruk Nord', 'Termisk', 'planlagt', CURRENT_DATE + 3, 0.42, NULL, 'høy', 'Optilice båt bestilt', 'AI'),
        ('Kystlaks AS', 'Hydrogenperoksid', 'fullført', CURRENT_DATE - 14, 0.28, 82.0, 'normal', 'God effekt, lav dødelighet', 'Driftsleder'),
        ('Vestfjord Akva', 'Mekanisk', 'pågår', CURRENT_DATE, 0.55, NULL, 'kritisk', 'FLS behandling startet kl 06:00', 'Veterinær'),
        ('Nordland Sjømat', 'Ferskvann', 'planlagt', CURRENT_DATE + 7, 0.38, NULL, 'normal', 'Brønnbåt reservert', 'AI')
      ) AS v(locality_name, treatment_type, status, scheduled_date, lice_before, effectiveness_percent, urgency, notes, recommendation_source)
      WHERE NOT EXISTS (SELECT 1 FROM treatments LIMIT 1)
    `)
    console.log('   Treatments seed data added!\n')

    // Add seed data for environment_readings
    console.log('5. Adding seed data for environment readings...')
    await client.query(`
      INSERT INTO environment_readings (locality_name, temperature_celsius, oxygen_percent, oxygen_mg_l, salinity_ppt, ph, current_speed_cm_s, depth_m, algae_level, data_source)
      SELECT * FROM (VALUES
        ('Fjordheim', 12.5, 95.2, 8.4, 33.5, 7.9, 15.2, 10.0, 'none', 'sensor'),
        ('Havbruk Nord', 11.8, 88.5, 7.8, 34.1, 8.0, 22.5, 15.0, 'low', 'sensor'),
        ('Kystlaks AS', 13.2, 92.0, 8.1, 32.8, 7.8, 18.0, 12.0, 'none', 'sensor'),
        ('Vestfjord Akva', 10.5, 78.5, 6.9, 34.5, 8.1, 8.5, 20.0, 'medium', 'sensor'),
        ('Nordland Sjømat', 14.1, 91.5, 8.0, 33.0, 7.7, 25.0, 8.0, 'none', 'sensor')
      ) AS v(locality_name, temperature_celsius, oxygen_percent, oxygen_mg_l, salinity_ppt, ph, current_speed_cm_s, depth_m, algae_level, data_source)
      WHERE NOT EXISTS (SELECT 1 FROM environment_readings LIMIT 1)
    `)
    console.log('   Environment readings seed data added!\n')

    // Add seed data for risk_scores
    console.log('6. Adding seed data for risk scores...')
    await client.query(`
      INSERT INTO risk_scores (locality_name, overall_score, lice_score, mortality_score, environment_score, treatment_score, risk_level, risk_factors, recommendations)
      SELECT * FROM (VALUES
        ('Fjordheim', 45, 55, 30, 40, 50, 'MEDIUM', ARRAY['Moderat lusenivå', 'Økende trend siste 2 uker'], ARRAY['Vurder forebyggende tiltak', 'Øk tellefrekvens']),
        ('Havbruk Nord', 72, 85, 45, 65, 80, 'HIGH', ARRAY['Høyt lusenivå', 'Nærhet til andre anlegg', 'Lav strømhastighet'], ARRAY['Planlegg behandling', 'Kontakt veterinær', 'Vurder rensefisk']),
        ('Kystlaks AS', 22, 20, 15, 25, 30, 'LOW', ARRAY['Stabilt lavt lusenivå'], ARRAY['Fortsett nåværende strategi']),
        ('Vestfjord Akva', 88, 95, 70, 85, 90, 'CRITICAL', ARRAY['Kritisk lusenivå', 'Høy dødelighet', 'Dårlige miljøforhold'], ARRAY['Umiddelbar behandling', 'Varsle Mattilsynet', 'Reduser biomasse']),
        ('Nordland Sjømat', 52, 60, 35, 50, 55, 'MEDIUM', ARRAY['Moderat lusenivå', 'Sesongmessig økning'], ARRAY['Forbered behandlingsplan', 'Overvåk nabolokaliteter'])
      ) AS v(locality_name, overall_score, lice_score, mortality_score, environment_score, treatment_score, risk_level, risk_factors, recommendations)
      WHERE NOT EXISTS (SELECT 1 FROM risk_scores LIMIT 1)
    `)
    console.log('   Risk scores seed data added!\n')

    // Add seed data for alerts
    console.log('7. Adding seed data for alerts...')
    await client.query(`
      INSERT INTO alerts (alert_type, severity, title, message, recommended_action, is_read)
      SELECT * FROM (VALUES
        ('LICE_THRESHOLD', 'CRITICAL', 'Kritisk lusenivå - Vestfjord Akva', 'Voksne hunnlus har passert 0.5 grensen med 0.55 lus per fisk.', 'Iverksett behandling umiddelbart. Kontakt veterinær.', false),
        ('LICE_INCREASING', 'WARNING', 'Økende lusetrend - Havbruk Nord', 'Lusenivået har økt 35% de siste 14 dagene.', 'Planlegg forebyggende tiltak eller behandling.', false),
        ('TREATMENT_DUE', 'INFO', 'Planlagt behandling - Nordland Sjømat', 'Ferskvannsbehandling planlagt om 7 dager.', 'Bekreft brønnbåt-reservasjon.', false),
        ('MORTALITY_HIGH', 'WARNING', 'Forhøyet dødelighet - Vestfjord Akva', 'Dødelighet siste 7 dager er 0.8%, over terskel på 0.5%.', 'Undersøk årsak. Vurder veterinærkontroll.', true),
        ('REPORT_MISSING', 'INFO', 'Manglende lusetelling - Fjordheim', 'Det er 8 dager siden forrige lusetelling.', 'Gjennomfør telling innen 48 timer.', false)
      ) AS v(alert_type, severity, title, message, recommended_action, is_read)
      WHERE NOT EXISTS (SELECT 1 FROM alerts LIMIT 1)
    `)
    console.log('   Alerts seed data added!\n')

    // Add seed data for feeding
    console.log('8. Adding seed data for feeding records...')
    await client.query(`
      INSERT INTO feeding_records (locality_name, feeding_date, feed_type, amount_kg, planned_amount_kg, feed_conversion_ratio, water_temperature, appetite_score, notes)
      SELECT * FROM (VALUES
        ('Fjordheim', CURRENT_DATE, 'Standard', 2500.0, 2800.0, 1.15, 12.5, 4, 'God appetitt'),
        ('Havbruk Nord', CURRENT_DATE, 'Høyenergi', 3200.0, 3500.0, 1.22, 11.8, 3, 'Noe redusert appetitt pga behandling'),
        ('Kystlaks AS', CURRENT_DATE, 'Standard', 1800.0, 1800.0, 1.08, 13.2, 5, 'Utmerket appetitt'),
        ('Fjordheim', CURRENT_DATE - 1, 'Standard', 2650.0, 2800.0, 1.12, 12.3, 4, NULL),
        ('Havbruk Nord', CURRENT_DATE - 1, 'Høyenergi', 3100.0, 3500.0, 1.20, 11.5, 4, NULL)
      ) AS v(locality_name, feeding_date, feed_type, amount_kg, planned_amount_kg, feed_conversion_ratio, water_temperature, appetite_score, notes)
      WHERE NOT EXISTS (SELECT 1 FROM feeding_records LIMIT 1)
    `)
    console.log('   Feeding records seed data added!\n')

    // Verify data counts
    console.log('9. Verifying data:')
    const counts = await Promise.all([
      client.query('SELECT COUNT(*) FROM predictions'),
      client.query('SELECT COUNT(*) FROM treatments'),
      client.query('SELECT COUNT(*) FROM environment_readings'),
      client.query('SELECT COUNT(*) FROM risk_scores'),
      client.query('SELECT COUNT(*) FROM alerts'),
      client.query('SELECT COUNT(*) FROM feeding_records'),
      client.query('SELECT COUNT(*) FROM mortality_causes')
    ])

    console.log(`   - Predictions: ${counts[0].rows[0].count}`)
    console.log(`   - Treatments: ${counts[1].rows[0].count}`)
    console.log(`   - Environment readings: ${counts[2].rows[0].count}`)
    console.log(`   - Risk scores: ${counts[3].rows[0].count}`)
    console.log(`   - Alerts: ${counts[4].rows[0].count}`)
    console.log(`   - Feeding records: ${counts[5].rows[0].count}`)
    console.log(`   - Mortality causes: ${counts[6].rows[0].count}`)

    console.log('\nDatabase setup completed successfully!')

  } catch (error) {
    console.error('Error during database setup:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

setupDatabase().catch(console.error)
