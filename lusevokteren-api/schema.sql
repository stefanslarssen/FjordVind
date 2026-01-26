-- Database schema for FjordVind/Lusevokteren
-- Run this in PostgreSQL to create the tables

-- Tabell: companies (Selskaper)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  org_number VARCHAR(20) UNIQUE,
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabell: user_localities (Brukerens egne anlegg)
CREATE TABLE IF NOT EXISTS user_localities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  locality_no INTEGER UNIQUE NOT NULL,  -- Fra BarentsWatch
  name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  municipality VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabell: merds (Merder)
CREATE TABLE IF NOT EXISTS merds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locality_id UUID REFERENCES user_localities(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  volume_m3 INTEGER,
  fish_count INTEGER,
  is_fallow BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabell: lice_counts (Lusetellinger - legacy)
CREATE TABLE IF NOT EXISTS lice_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merd_id UUID REFERENCES merds(id) ON DELETE CASCADE,
  count_date DATE NOT NULL,
  week_number INTEGER,
  year INTEGER,
  adult_female_lice DECIMAL(5, 3),
  mobile_lice DECIMAL(5, 3),
  stationary_lice DECIMAL(5, 3),
  fish_counted INTEGER,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabell: users (Brukere/Røktere)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabell: samples (Tellinger/Prøver)
CREATE TABLE IF NOT EXISTS samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id VARCHAR(50) UNIQUE NOT NULL,
  merd_id UUID REFERENCES merds(id) ON DELETE CASCADE,
  røkter_id UUID REFERENCES users(id),
  dato DATE NOT NULL,
  tidspunkt TIME,
  antall_fisk INTEGER NOT NULL,
  temperatur DECIMAL(4, 1),
  dodfisk INTEGER DEFAULT 0,
  notat TEXT,
  synced BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabell: fish_observations (Fiskeobservasjoner per telling)
CREATE TABLE IF NOT EXISTS fish_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fish_id VARCHAR(20) NOT NULL,
  sample_id UUID REFERENCES samples(id) ON DELETE CASCADE,
  voksne_hunnlus INTEGER DEFAULT 0,
  bevegelige_lus INTEGER DEFAULT 0,
  fastsittende_lus INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabell: mortality_records (Dødlighetsregistreringer)
CREATE TABLE IF NOT EXISTS mortality_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merd_id UUID REFERENCES merds(id) ON DELETE CASCADE NOT NULL,
  record_date DATE NOT NULL,

  -- Laks dødelighet
  salmon_dead INTEGER DEFAULT 0,
  salmon_cause VARCHAR(100),
  salmon_notes TEXT,

  -- Leppefisk dødelighet
  cleaner_fish_dead INTEGER DEFAULT 0,
  cleaner_fish_type VARCHAR(50), -- 'rognkjeks', 'berggylt', 'grønngylt', 'blandet'
  cleaner_fish_cause VARCHAR(100),

  -- Grunnlag/kategori
  mortality_category VARCHAR(50) DEFAULT 'normal', -- 'normal', 'behandling', 'sykdom', 'håndtering', 'predator', 'miljø', 'annet'

  -- Metadata
  registered_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Unik per merd per dag
  UNIQUE(merd_id, record_date)
);

-- Tabell: mortality_causes (Årsaker lookup)
CREATE TABLE IF NOT EXISTS mortality_causes (
  id SERIAL PRIMARY KEY,
  cause_name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Seed data for årsaker (kun hvis tabellen er tom)
INSERT INTO mortality_causes (cause_name, category)
SELECT * FROM (VALUES
  -- Normal dødelighet
  ('Naturlig dødelighet', 'normal'),
  ('Ukjent årsak', 'normal'),

  -- Behandling
  ('Avlusning - mekanisk', 'behandling'),
  ('Avlusning - termisk', 'behandling'),
  ('Avlusning - medisinsk', 'behandling'),
  ('Ferskvannsbehandling', 'behandling'),
  ('Vaksinering', 'behandling'),

  -- Sykdom
  ('PD (Pancreas Disease)', 'sykdom'),
  ('ILA (Infeksiøs lakseanemi)', 'sykdom'),
  ('CMS (Hjertesprekk)', 'sykdom'),
  ('AGD (Amøbegjellesykdom)', 'sykdom'),
  ('Vintersår', 'sykdom'),
  ('Bakteriell infeksjon', 'sykdom'),
  ('Parasitter', 'sykdom'),

  -- Håndtering
  ('Trenging', 'håndtering'),
  ('Sortering', 'håndtering'),
  ('Transport', 'håndtering'),
  ('Notskifte', 'håndtering'),

  -- Predator
  ('Sel', 'predator'),
  ('Oter', 'predator'),
  ('Fugl', 'predator'),

  -- Miljø
  ('Algeoppblomstring', 'miljø'),
  ('Manet', 'miljø'),
  ('Oksygenmangel', 'miljø'),
  ('Temperaturstress', 'miljø'),

  -- Annet
  ('Rømming (gjenfanget død)', 'annet'),
  ('Annet', 'annet')
) AS v(cause_name, category)
WHERE NOT EXISTS (SELECT 1 FROM mortality_causes LIMIT 1);

-- Indeks for mortality_records
CREATE INDEX IF NOT EXISTS idx_mortality_record_date ON mortality_records(record_date);
CREATE INDEX IF NOT EXISTS idx_mortality_merd_date ON mortality_records(merd_id, record_date);

-- Tabell: alerts (Varsler)
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merd_id UUID REFERENCES merds(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL, -- 'LICE_THRESHOLD', 'LICE_INCREASING', 'TREATMENT_DUE', 'MORTALITY_HIGH', 'REPORT_MISSING'
  severity VARCHAR(20) NOT NULL DEFAULT 'INFO', -- 'INFO', 'WARNING', 'CRITICAL'
  title VARCHAR(255) NOT NULL,
  message TEXT,
  recommended_action TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id)
);

-- Indeks for alerts
CREATE INDEX IF NOT EXISTS idx_alerts_merd ON alerts(merd_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read) WHERE is_read = false;

-- Tabell: predictions (Luseprediksjoner)
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merd_id UUID REFERENCES merds(id) ON DELETE CASCADE,
  locality_name VARCHAR(255),
  current_lice DECIMAL(5, 3),
  predicted_lice DECIMAL(5, 3),
  confidence DECIMAL(3, 2), -- 0.00 to 1.00
  probability_exceed_limit DECIMAL(3, 2),
  risk_level VARCHAR(20) DEFAULT 'LOW', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  recommended_action TEXT,
  model_version VARCHAR(20) DEFAULT 'v1.0',
  days_ahead INTEGER DEFAULT 14,
  target_date DATE,
  prediction_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabell: treatments (Behandlinger)
CREATE TABLE IF NOT EXISTS treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merd_id UUID REFERENCES merds(id) ON DELETE CASCADE,
  locality_name VARCHAR(255),
  treatment_type VARCHAR(100) NOT NULL, -- 'Hydrogenperoksid', 'Termisk', 'Mekanisk', 'Rensefisk', 'Ferskvann', 'Imidakloprid'
  status VARCHAR(50) DEFAULT 'planlagt', -- 'planlagt', 'pågår', 'fullført', 'kansellert'
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  completed_date DATE,
  lice_before DECIMAL(5, 3),
  lice_after DECIMAL(5, 3),
  effectiveness_percent DECIMAL(5, 2),
  mortality_percent DECIMAL(5, 2),
  cost_nok DECIMAL(12, 2),
  duration_hours DECIMAL(5, 2),
  provider VARCHAR(255),
  boat_name VARCHAR(255),
  notes TEXT,
  recommendation_source VARCHAR(100), -- 'AI', 'Veterinær', 'Driftsleder'
  urgency VARCHAR(20) DEFAULT 'normal', -- 'lav', 'normal', 'høy', 'kritisk'
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabell: environment_readings (Miljømålinger)
CREATE TABLE IF NOT EXISTS environment_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merd_id UUID REFERENCES merds(id) ON DELETE CASCADE,
  locality_name VARCHAR(255),
  reading_timestamp TIMESTAMP DEFAULT NOW(),
  temperature_celsius DECIMAL(4, 2),
  oxygen_percent DECIMAL(5, 2),
  oxygen_mg_l DECIMAL(5, 2),
  salinity_ppt DECIMAL(5, 2),
  ph DECIMAL(4, 2),
  ammonia_mg_l DECIMAL(6, 4),
  current_speed_cm_s DECIMAL(5, 2),
  current_direction INTEGER, -- degrees 0-360
  depth_m DECIMAL(5, 1),
  visibility_m DECIMAL(4, 1),
  algae_level VARCHAR(20), -- 'none', 'low', 'medium', 'high', 'bloom'
  data_source VARCHAR(50) DEFAULT 'sensor', -- 'sensor', 'manual', 'api', 'estimated'
  is_anomaly BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabell: risk_scores (Risikovurderinger)
CREATE TABLE IF NOT EXISTS risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merd_id UUID REFERENCES merds(id) ON DELETE CASCADE,
  locality_name VARCHAR(255),
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  lice_score INTEGER CHECK (lice_score >= 0 AND lice_score <= 100),
  mortality_score INTEGER CHECK (mortality_score >= 0 AND mortality_score <= 100),
  environment_score INTEGER CHECK (environment_score >= 0 AND environment_score <= 100),
  treatment_score INTEGER CHECK (treatment_score >= 0 AND treatment_score <= 100),
  risk_level VARCHAR(20) DEFAULT 'LOW', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  risk_factors TEXT[], -- Array of contributing factors
  recommendations TEXT[],
  calculated_at TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabell: alert_preferences (Varslingsinnstillinger)
CREATE TABLE IF NOT EXISTS alert_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT true,
  email_address VARCHAR(255),
  phone_number VARCHAR(20),
  lice_threshold_warning DECIMAL(5, 3) DEFAULT 0.3,
  lice_threshold_critical DECIMAL(5, 3) DEFAULT 0.5,
  mortality_threshold_daily DECIMAL(5, 2) DEFAULT 0.5,
  temperature_min DECIMAL(4, 2) DEFAULT 4.0,
  temperature_max DECIMAL(4, 2) DEFAULT 18.0,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabell: scheduled_reports (Planlagte rapporter)
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL, -- 'lus', 'miljo', 'behandling', 'foring', 'biomasse', 'dodelighet'
  frequency VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'biweekly', 'monthly'
  day_of_week INTEGER, -- 0-6 for weekly
  day_of_month INTEGER, -- 1-31 for monthly
  time_of_day TIME DEFAULT '08:00',
  email_recipients TEXT[],
  include_charts BOOLEAN DEFAULT true,
  include_raw_data BOOLEAN DEFAULT false,
  localities INTEGER[], -- locality_no array
  is_active BOOLEAN DEFAULT true,
  last_sent TIMESTAMP,
  next_scheduled TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabell: feeding_records (Fôringsregistreringer)
CREATE TABLE IF NOT EXISTS feeding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merd_id UUID REFERENCES merds(id) ON DELETE CASCADE,
  locality_name VARCHAR(255),
  feeding_date DATE NOT NULL,
  feed_type VARCHAR(100), -- 'Standard', 'Høyenergi', 'Medisinfôr', 'Starter'
  amount_kg DECIMAL(10, 2) NOT NULL,
  planned_amount_kg DECIMAL(10, 2),
  feed_conversion_ratio DECIMAL(4, 2),
  water_temperature DECIMAL(4, 2),
  appetite_score INTEGER CHECK (appetite_score >= 1 AND appetite_score <= 5),
  notes TEXT,
  registered_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabell: feed_storage (Fôrlager)
CREATE TABLE IF NOT EXISTS feed_storage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locality_id UUID REFERENCES user_localities(id) ON DELETE CASCADE,
  silo_name VARCHAR(100),
  feed_type VARCHAR(100),
  current_amount_kg DECIMAL(12, 2) DEFAULT 0,
  capacity_kg DECIMAL(12, 2),
  last_delivery_date DATE,
  last_delivery_amount_kg DECIMAL(12, 2),
  reorder_threshold_kg DECIMAL(12, 2),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indekser for nye tabeller
CREATE INDEX IF NOT EXISTS idx_predictions_merd ON predictions(merd_id);
CREATE INDEX IF NOT EXISTS idx_predictions_date ON predictions(target_date);
CREATE INDEX IF NOT EXISTS idx_predictions_risk ON predictions(risk_level);

CREATE INDEX IF NOT EXISTS idx_treatments_merd ON treatments(merd_id);
CREATE INDEX IF NOT EXISTS idx_treatments_date ON treatments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_treatments_status ON treatments(status);

CREATE INDEX IF NOT EXISTS idx_environment_merd ON environment_readings(merd_id);
CREATE INDEX IF NOT EXISTS idx_environment_timestamp ON environment_readings(reading_timestamp);

CREATE INDEX IF NOT EXISTS idx_risk_scores_merd ON risk_scores(merd_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_level ON risk_scores(risk_level);

CREATE INDEX IF NOT EXISTS idx_feeding_merd ON feeding_records(merd_id);
CREATE INDEX IF NOT EXISTS idx_feeding_date ON feeding_records(feeding_date);

-- Indekser for bedre ytelse
CREATE INDEX IF NOT EXISTS idx_user_localities_company ON user_localities(company_id);
CREATE INDEX IF NOT EXISTS idx_user_localities_locality_no ON user_localities(locality_no);
CREATE INDEX IF NOT EXISTS idx_merds_locality ON merds(locality_id);
CREATE INDEX IF NOT EXISTS idx_lice_counts_merd ON lice_counts(merd_id);
CREATE INDEX IF NOT EXISTS idx_lice_counts_date ON lice_counts(count_date);
CREATE INDEX IF NOT EXISTS idx_lice_counts_week_year ON lice_counts(year, week_number);
CREATE INDEX IF NOT EXISTS idx_samples_merd ON samples(merd_id);
CREATE INDEX IF NOT EXISTS idx_samples_dato ON samples(dato);
CREATE INDEX IF NOT EXISTS idx_fish_observations_sample ON fish_observations(sample_id);
CREATE INDEX IF NOT EXISTS idx_mortality_merd ON mortality_records(merd_id);
CREATE INDEX IF NOT EXISTS idx_mortality_dato ON mortality_records(record_date);
