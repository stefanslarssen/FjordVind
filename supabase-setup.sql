-- ============================================
-- LUSEVOKTEREN KOMPLETT DATABASE SETUP
-- Kjør denne i Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('røkter', 'driftsleder', 'admin')),
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 1b. EMAIL VERIFICATION TOKENS
-- ============================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_verification_user ON email_verification_tokens(user_id);

-- ============================================
-- 1c. PASSWORD RESET TOKENS
-- ============================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_user ON password_reset_tokens(user_id);

-- ============================================
-- 2. MERDS
-- ============================================
CREATE TABLE IF NOT EXISTS merds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merd_id TEXT UNIQUE NOT NULL,
  lokalitet TEXT NOT NULL,
  lokalitetsnummer TEXT,
  navn TEXT NOT NULL,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  capacity_tonnes DECIMAL(10, 2),
  current_generation TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. SAMPLES
-- ============================================
CREATE TABLE IF NOT EXISTS samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sample_id TEXT UNIQUE NOT NULL,
  merd_id UUID NOT NULL REFERENCES merds(id) ON DELETE CASCADE,
  røkter_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  dato DATE NOT NULL,
  tidspunkt TIME,
  antall_fisk INTEGER NOT NULL CHECK (antall_fisk > 0),
  temperatur DECIMAL(4, 1),
  notat TEXT,
  voice_note_url TEXT,
  synced BOOLEAN DEFAULT false,
  synced_at TIMESTAMPTZ,
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. FISH_OBSERVATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS fish_observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fish_id TEXT NOT NULL,
  sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  voksne_hunnlus INTEGER NOT NULL DEFAULT 0 CHECK (voksne_hunnlus >= 0),
  bevegelige_lus INTEGER NOT NULL DEFAULT 0 CHECK (bevegelige_lus >= 0),
  fastsittende_lus INTEGER NOT NULL DEFAULT 0 CHECK (fastsittende_lus >= 0),
  skottelus INTEGER DEFAULT 0 CHECK (skottelus >= 0),
  bilde_url TEXT,
  bilde_local_path TEXT,
  notat TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sample_id, fish_id)
);

-- ============================================
-- 5. COMPLIANCE_LOG
-- ============================================
CREATE TABLE IF NOT EXISTS compliance_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merd_id UUID NOT NULL REFERENCES merds(id) ON DELETE CASCADE,
  behandling_type TEXT NOT NULL CHECK (behandling_type IN (
    'termisk', 'mekanisk', 'medikamentell', 'rensefisk', 'ferskvann', 'laser', 'annet'
  )),
  behandling_dato DATE NOT NULL,
  utført_av UUID REFERENCES users(id),
  leverandør TEXT,
  varighet_timer DECIMAL(4, 1),
  effektivitet_prosent DECIMAL(5, 2),
  antall_fisk_behandlet INTEGER,
  dødelighet_prosent DECIMAL(5, 2),
  kostnader_nok DECIMAL(12, 2),
  notat TEXT,
  dokumentasjon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. PREDICTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merd_id UUID REFERENCES merds(id) ON DELETE CASCADE,
  prediction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  target_date DATE NOT NULL,
  days_ahead INTEGER NOT NULL,
  current_lice DECIMAL(4,2),
  predicted_lice DECIMAL(4,2) NOT NULL,
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.70,
  probability_exceed_limit DECIMAL(3,2),
  risk_level VARCHAR(10) CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  recommended_action VARCHAR(50),
  model_version VARCHAR(20) DEFAULT 'v1.0',
  factors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. ALERTS
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merd_id UUID REFERENCES merds(id) ON DELETE CASCADE,
  locality VARCHAR(100),
  alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN (
    'LICE_CRITICAL', 'LICE_WARNING', 'LICE_PREDICTION', 'MORTALITY_HIGH',
    'OXYGEN_LOW', 'TEMPERATURE_HIGH', 'TREATMENT_DUE', 'SYSTEM_ERROR',
    'DAILY_SUMMARY', 'WEEKLY_REPORT'
  )),
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('CRITICAL', 'WARNING', 'INFO')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  recommended_action TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. TREATMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS treatments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merd_id UUID NOT NULL REFERENCES merds(id) ON DELETE CASCADE,
  treatment_type VARCHAR(50) NOT NULL CHECK (treatment_type IN (
    'THERMOLICER', 'HYDROLICER', 'OPTILICER', 'LUSESKJORT', 'RENSEFISK',
    'MEDIKAMENTELL', 'FERSKVANN', 'LASER', 'ANNET'
  )),
  status VARCHAR(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN (
    'PLANNED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
  )),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  completed_date DATE,
  lice_before DECIMAL(4,2),
  lice_after DECIMAL(4,2),
  effectiveness_percent DECIMAL(5,2),
  fish_count_before INTEGER,
  mortality_during INTEGER DEFAULT 0,
  mortality_percent DECIMAL(5,2),
  cost_nok DECIMAL(12,2),
  duration_hours DECIMAL(4,1),
  provider VARCHAR(100),
  boat_name VARCHAR(100),
  crew_count INTEGER,
  weather_conditions VARCHAR(100),
  notes TEXT,
  recommendation_source VARCHAR(20) CHECK (recommendation_source IN ('AI', 'MANUAL', 'SCHEDULED')),
  urgency VARCHAR(20) CHECK (urgency IN ('IMMEDIATE', 'HIGH', 'MEDIUM', 'LOW')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. ENVIRONMENT_READINGS
-- ============================================
CREATE TABLE IF NOT EXISTS environment_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merd_id UUID REFERENCES merds(id) ON DELETE CASCADE,
  locality VARCHAR(100),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  temperature_celsius DECIMAL(4,2),
  oxygen_percent DECIMAL(5,2),
  oxygen_mg_l DECIMAL(5,2),
  salinity_ppt DECIMAL(4,2),
  ph DECIMAL(3,2),
  ammonia_mg_l DECIMAL(5,3),
  current_speed_cm_s DECIMAL(5,2),
  depth_meters DECIMAL(4,1) DEFAULT 5.0,
  sensor_id VARCHAR(50),
  data_source VARCHAR(30) CHECK (data_source IN ('SENSOR', 'MANUAL', 'API', 'ESTIMATED')),
  is_anomaly BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. RISK_SCORES
-- ============================================
CREATE TABLE IF NOT EXISTS risk_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merd_id UUID REFERENCES merds(id) ON DELETE CASCADE,
  locality VARCHAR(100),
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  lice_score INTEGER CHECK (lice_score >= 0 AND lice_score <= 100),
  mortality_score INTEGER CHECK (mortality_score >= 0 AND mortality_score <= 100),
  environment_score INTEGER CHECK (environment_score >= 0 AND environment_score <= 100),
  treatment_score INTEGER CHECK (treatment_score >= 0 AND treatment_score <= 100),
  risk_level VARCHAR(20) CHECK (risk_level IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
  factors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_samples_merd ON samples(merd_id);
CREATE INDEX IF NOT EXISTS idx_samples_dato ON samples(dato DESC);
CREATE INDEX IF NOT EXISTS idx_fish_observations_sample ON fish_observations(sample_id);
CREATE INDEX IF NOT EXISTS idx_predictions_merd ON predictions(merd_id);
CREATE INDEX IF NOT EXISTS idx_alerts_merd ON alerts(merd_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_treatments_merd ON treatments(merd_id);
CREATE INDEX IF NOT EXISTS idx_treatments_scheduled ON treatments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_environment_merd ON environment_readings(merd_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_merd ON risk_scores(merd_id);

-- ============================================
-- TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMPANIES TABLE (for multi-tenant isolation)
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  org_number TEXT UNIQUE,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add company_id to tables for isolation
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE merds ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_merds_company_id ON merds(company_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE merds ENABLE ROW LEVEL SECURITY;
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE fish_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE environment_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECURE RLS POLICIES (Company Isolation)
-- ============================================

-- Helper function to get current user's company
CREATE OR REPLACE FUNCTION get_current_company_id() RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_company_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_id() RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_setting('app.current_user_role', true) = 'admin';
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- COMPANIES: Users can only see their own company
CREATE POLICY "company_isolation" ON companies FOR ALL
  USING (id = get_current_company_id() OR is_admin())
  WITH CHECK (id = get_current_company_id() OR is_admin());

-- USERS: Users see only same-company users (or self)
CREATE POLICY "user_company_isolation" ON users FOR SELECT
  USING (
    id = get_current_user_id()
    OR company_id = get_current_company_id()
    OR is_admin()
  );

CREATE POLICY "user_update_self" ON users FOR UPDATE
  USING (id = get_current_user_id() OR is_admin())
  WITH CHECK (id = get_current_user_id() OR is_admin());

-- MERDS: Users see only their company's merds (or public demo data)
CREATE POLICY "merd_company_isolation" ON merds FOR SELECT
  USING (
    company_id IS NULL
    OR company_id = get_current_company_id()
    OR is_admin()
  );

CREATE POLICY "merd_company_write" ON merds FOR INSERT
  WITH CHECK (company_id = get_current_company_id() OR is_admin());

CREATE POLICY "merd_company_update" ON merds FOR UPDATE
  USING (company_id = get_current_company_id() OR is_admin())
  WITH CHECK (company_id = get_current_company_id() OR is_admin());

CREATE POLICY "merd_company_delete" ON merds FOR DELETE
  USING (company_id = get_current_company_id() OR is_admin());

-- SAMPLES: Users see only samples from their company's merds
CREATE POLICY "sample_company_isolation" ON samples FOR SELECT
  USING (
    merd_id IN (
      SELECT id FROM merds
      WHERE company_id IS NULL OR company_id = get_current_company_id()
    )
    OR is_admin()
  );

CREATE POLICY "sample_company_write" ON samples FOR INSERT
  WITH CHECK (
    merd_id IN (SELECT id FROM merds WHERE company_id = get_current_company_id())
    OR is_admin()
  );

CREATE POLICY "sample_company_update" ON samples FOR UPDATE
  USING (
    merd_id IN (SELECT id FROM merds WHERE company_id = get_current_company_id())
    OR is_admin()
  );

CREATE POLICY "sample_company_delete" ON samples FOR DELETE
  USING (
    merd_id IN (SELECT id FROM merds WHERE company_id = get_current_company_id())
    OR is_admin()
  );

-- FISH_OBSERVATIONS: Follow sample isolation
CREATE POLICY "fish_obs_company_isolation" ON fish_observations FOR ALL
  USING (
    sample_id IN (
      SELECT s.id FROM samples s
      JOIN merds m ON s.merd_id = m.id
      WHERE m.company_id IS NULL OR m.company_id = get_current_company_id()
    )
    OR is_admin()
  );

-- COMPLIANCE_LOG: Company isolation via merd
CREATE POLICY "compliance_company_isolation" ON compliance_log FOR ALL
  USING (
    merd_id IN (
      SELECT id FROM merds
      WHERE company_id IS NULL OR company_id = get_current_company_id()
    )
    OR is_admin()
  );

-- PREDICTIONS: Company isolation via merd
CREATE POLICY "predictions_company_isolation" ON predictions FOR ALL
  USING (
    merd_id IN (
      SELECT id FROM merds
      WHERE company_id IS NULL OR company_id = get_current_company_id()
    )
    OR is_admin()
  );

-- ALERTS: Company isolation via merd
CREATE POLICY "alerts_company_isolation" ON alerts FOR ALL
  USING (
    merd_id IN (
      SELECT id FROM merds
      WHERE company_id IS NULL OR company_id = get_current_company_id()
    )
    OR is_admin()
  );

-- TREATMENTS: Company isolation via merd
CREATE POLICY "treatments_company_isolation" ON treatments FOR ALL
  USING (
    merd_id IN (
      SELECT id FROM merds
      WHERE company_id IS NULL OR company_id = get_current_company_id()
    )
    OR is_admin()
  );

-- ENVIRONMENT_READINGS: Company isolation via merd
CREATE POLICY "environment_company_isolation" ON environment_readings FOR ALL
  USING (
    merd_id IN (
      SELECT id FROM merds
      WHERE company_id IS NULL OR company_id = get_current_company_id()
    )
    OR is_admin()
  );

-- RISK_SCORES: Company isolation via merd
CREATE POLICY "risk_scores_company_isolation" ON risk_scores FOR ALL
  USING (
    merd_id IN (
      SELECT id FROM merds
      WHERE company_id IS NULL OR company_id = get_current_company_id()
    )
    OR is_admin()
  );

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Users
INSERT INTO users (id, email, full_name, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ola.nordmann@fjordvind.no', 'Ola Nordmann', 'røkter'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'kari.hansen@fjordvind.no', 'Kari Hansen', 'røkter'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'per.olsen@fjordvind.no', 'Per Olsen', 'driftsleder')
ON CONFLICT (email) DO NOTHING;

-- Merds
INSERT INTO merds (id, merd_id, lokalitet, lokalitetsnummer, navn, latitude, longitude) VALUES
  ('11111111-1111-1111-1111-111111111111', 'NF-A1', 'Nordfjorden', '12345', 'Merd A1', 61.9054, 5.0892),
  ('22222222-2222-2222-2222-222222222222', 'NF-A2', 'Nordfjorden', '12345', 'Merd A2', 61.9064, 5.0912),
  ('33333333-3333-3333-3333-333333333333', 'NF-B1', 'Nordfjorden', '12345', 'Merd B1', 61.9044, 5.0872),
  ('44444444-4444-4444-4444-444444444444', 'HF-M1', 'Hardangerfjorden', '67890', 'Merd M1', 60.0783, 6.5494),
  ('55555555-5555-5555-5555-555555555555', 'HF-M2', 'Hardangerfjorden', '67890', 'Merd M2', 60.0793, 6.5514)
ON CONFLICT (merd_id) DO NOTHING;

-- Predictions
INSERT INTO predictions (merd_id, target_date, days_ahead, current_lice, predicted_lice, confidence, probability_exceed_limit, risk_level, recommended_action) VALUES
  ('11111111-1111-1111-1111-111111111111', CURRENT_DATE + INTERVAL '7 days', 7, 0.42, 0.58, 0.85, 0.78, 'HIGH', 'SCHEDULE_TREATMENT'),
  ('22222222-2222-2222-2222-222222222222', CURRENT_DATE + INTERVAL '7 days', 7, 0.35, 0.45, 0.80, 0.45, 'MEDIUM', 'MONITOR'),
  ('33333333-3333-3333-3333-333333333333', CURRENT_DATE + INTERVAL '7 days', 7, 0.22, 0.28, 0.82, 0.15, 'LOW', 'NO_ACTION'),
  ('44444444-4444-4444-4444-444444444444', CURRENT_DATE + INTERVAL '7 days', 7, 0.38, 0.52, 0.78, 0.65, 'MEDIUM', 'SCHEDULE_TREATMENT');

-- Risk scores
INSERT INTO risk_scores (merd_id, locality, overall_score, lice_score, mortality_score, environment_score, treatment_score, risk_level) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Nordfjorden', 65, 75, 40, 85, 60, 'HIGH'),
  ('22222222-2222-2222-2222-222222222222', 'Nordfjorden', 45, 55, 35, 90, 40, 'MODERATE'),
  ('33333333-3333-3333-3333-333333333333', 'Nordfjorden', 25, 30, 30, 88, 20, 'LOW'),
  ('44444444-4444-4444-4444-444444444444', 'Hardangerfjorden', 55, 60, 45, 75, 50, 'MODERATE'),
  ('55555555-5555-5555-5555-555555555555', 'Hardangerfjorden', 30, 35, 40, 78, 25, 'LOW');

-- Environment readings
INSERT INTO environment_readings (merd_id, locality, temperature_celsius, oxygen_percent, salinity_ppt, ph, data_source) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Nordfjorden', 8.2, 92, 34.2, 7.8, 'SENSOR'),
  ('22222222-2222-2222-2222-222222222222', 'Nordfjorden', 8.1, 94, 34.1, 7.9, 'SENSOR'),
  ('44444444-4444-4444-4444-444444444444', 'Hardangerfjorden', 7.8, 89, 33.8, 8.0, 'SENSOR');

SELECT 'Database setup complete!' as status;
