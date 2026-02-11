-- Lusevokteren Database Schema v3
-- Nye tabeller for prediksjoner, varsler, behandlinger og miljødata
-- Basert på ØyVind Analytics spesifikasjoner

-- ============================================
-- 1. PREDICTIONS (Luseprediksjon)
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

COMMENT ON TABLE predictions IS 'AI-drevne prediksjoner for lusenivå per merd';
COMMENT ON COLUMN predictions.days_ahead IS 'Antall dager frem i tid (7 eller 14)';
COMMENT ON COLUMN predictions.probability_exceed_limit IS 'Sannsynlighet for å overskride 0.5 grensen';
COMMENT ON COLUMN predictions.factors IS 'JSON med faktorer brukt i prediksjonen';

-- ============================================
-- 2. ALERTS (Varsler)
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merd_id UUID REFERENCES merds(id) ON DELETE CASCADE,
  locality VARCHAR(100),
  alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN (
    'LICE_CRITICAL',
    'LICE_WARNING',
    'LICE_PREDICTION',
    'MORTALITY_HIGH',
    'OXYGEN_LOW',
    'TEMPERATURE_HIGH',
    'TREATMENT_DUE',
    'SYSTEM_ERROR',
    'DAILY_SUMMARY',
    'WEEKLY_REPORT'
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

COMMENT ON TABLE alerts IS 'Varsler og notifikasjoner for driftsledere';
COMMENT ON COLUMN alerts.severity IS 'Kritisk (SMS+email), Warning (email), Info (in-app)';

-- ============================================
-- 3. TREATMENTS (Utvidet behandlingsmodul)
-- ============================================
CREATE TABLE IF NOT EXISTS treatments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merd_id UUID NOT NULL REFERENCES merds(id) ON DELETE CASCADE,
  treatment_type VARCHAR(50) NOT NULL CHECK (treatment_type IN (
    'THERMOLICER',
    'HYDROLICER',
    'OPTILICER',
    'LUSESKJORT',
    'RENSEFISK',
    'MEDIKAMENTELL',
    'FERSKVANN',
    'LASER',
    'ANNET'
  )),
  status VARCHAR(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN (
    'PLANNED',
    'CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
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

COMMENT ON TABLE treatments IS 'Behandlingsplanlegging og -historikk med effektivitetssporing';
COMMENT ON COLUMN treatments.recommendation_source IS 'Om behandlingen ble anbefalt av AI eller manuelt planlagt';

-- ============================================
-- 4. ENVIRONMENT_READINGS (Miljødata)
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

COMMENT ON TABLE environment_readings IS 'Sanntids miljøparametere fra sensorer og manuelle målinger';

-- ============================================
-- 5. ALERT_PREFERENCES (Brukerpreferanser for varsler)
-- ============================================
CREATE TABLE IF NOT EXISTS alert_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type VARCHAR(30) NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT true,
  threshold_value DECIMAL(6,3),
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, alert_type)
);

COMMENT ON TABLE alert_preferences IS 'Brukerpreferanser for varsling per varseltype';

-- ============================================
-- 6. RISK_SCORES (Aggregert risikoscore)
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

COMMENT ON TABLE risk_scores IS 'Beregnet risikoscore for merder og lokaliteter';

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_predictions_merd ON predictions(merd_id);
CREATE INDEX IF NOT EXISTS idx_predictions_target_date ON predictions(target_date);
CREATE INDEX IF NOT EXISTS idx_alerts_merd ON alerts(merd_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_treatments_merd ON treatments(merd_id);
CREATE INDEX IF NOT EXISTS idx_treatments_scheduled ON treatments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_treatments_status ON treatments(status);
CREATE INDEX IF NOT EXISTS idx_environment_merd ON environment_readings(merd_id);
CREATE INDEX IF NOT EXISTS idx_environment_timestamp ON environment_readings(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_risk_scores_merd ON risk_scores(merd_id);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_treatments_updated_at
  BEFORE UPDATE ON treatments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_preferences_updated_at
  BEFORE UPDATE ON alert_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE environment_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;

-- Policies (open for MVP)
CREATE POLICY "Allow all on predictions" ON predictions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on alerts" ON alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on treatments" ON treatments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on environment_readings" ON environment_readings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on alert_preferences" ON alert_preferences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on risk_scores" ON risk_scores FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- VIEWS
-- ============================================

-- Aktive varsler
CREATE OR REPLACE VIEW active_alerts AS
SELECT
  a.*,
  m.navn as merd_name,
  m.lokalitet
FROM alerts a
LEFT JOIN merds m ON a.merd_id = m.id
WHERE a.resolved_at IS NULL
ORDER BY
  CASE a.severity
    WHEN 'CRITICAL' THEN 1
    WHEN 'WARNING' THEN 2
    ELSE 3
  END,
  a.created_at DESC;

-- Kommende behandlinger
CREATE OR REPLACE VIEW upcoming_treatments AS
SELECT
  t.*,
  m.navn as merd_name,
  m.lokalitet,
  p.predicted_lice,
  p.risk_level as prediction_risk
FROM treatments t
JOIN merds m ON t.merd_id = m.id
LEFT JOIN predictions p ON p.merd_id = t.merd_id
  AND p.target_date = t.scheduled_date
WHERE t.status IN ('PLANNED', 'CONFIRMED')
  AND t.scheduled_date >= CURRENT_DATE
ORDER BY t.scheduled_date;

-- Siste miljødata per merd
CREATE OR REPLACE VIEW latest_environment AS
SELECT DISTINCT ON (merd_id)
  *
FROM environment_readings
ORDER BY merd_id, timestamp DESC;

-- ============================================
-- SAMPLE DATA FOR DEMO
-- ============================================

-- Sett inn noen varsler for demo
INSERT INTO alerts (merd_id, locality, alert_type, severity, title, message, recommended_action) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Nordfjorden', 'LICE_WARNING', 'WARNING',
   'Lusenivå nærmer seg grensen',
   'Merd A1 har 0.42 voksne hunnlus per fisk. Prediksjon viser 78% sannsynlighet for å overskride 0.5 grensen innen 7 dager.',
   'Vurder å planlegge behandling innen 5 dager'),
  ('22222222-2222-2222-2222-222222222222', 'Nordfjorden', 'LICE_PREDICTION', 'WARNING',
   'Prediktert lusestigning',
   'Merd A2 forventes å nå 0.55 voksne hunnlus innen 14 dager basert på nåværende trend.',
   'Overvåk utviklingen og forbered eventuell behandling'),
  ('44444444-4444-4444-4444-444444444444', 'Hardangerfjorden', 'TREATMENT_DUE', 'INFO',
   'Behandling planlagt',
   'Thermolicer-behandling er planlagt for Merd M1 den 30. januar.',
   'Bekreft ressurser og værforhold');

-- Sett inn prediksjoner
INSERT INTO predictions (merd_id, target_date, days_ahead, current_lice, predicted_lice, confidence, probability_exceed_limit, risk_level, recommended_action) VALUES
  ('11111111-1111-1111-1111-111111111111', CURRENT_DATE + INTERVAL '7 days', 7, 0.42, 0.58, 0.85, 0.78, 'HIGH', 'SCHEDULE_TREATMENT'),
  ('11111111-1111-1111-1111-111111111111', CURRENT_DATE + INTERVAL '14 days', 14, 0.42, 0.72, 0.70, 0.92, 'CRITICAL', 'IMMEDIATE_TREATMENT'),
  ('22222222-2222-2222-2222-222222222222', CURRENT_DATE + INTERVAL '7 days', 7, 0.35, 0.45, 0.80, 0.45, 'MEDIUM', 'MONITOR'),
  ('33333333-3333-3333-3333-333333333333', CURRENT_DATE + INTERVAL '7 days', 7, 0.22, 0.28, 0.82, 0.15, 'LOW', 'NO_ACTION'),
  ('44444444-4444-4444-4444-444444444444', CURRENT_DATE + INTERVAL '7 days', 7, 0.38, 0.52, 0.78, 0.65, 'MEDIUM', 'SCHEDULE_TREATMENT');

-- Sett inn planlagte behandlinger
INSERT INTO treatments (merd_id, treatment_type, status, scheduled_date, lice_before, recommendation_source, urgency, notes) VALUES
  ('11111111-1111-1111-1111-111111111111', 'THERMOLICER', 'PLANNED', CURRENT_DATE + INTERVAL '5 days', 0.42, 'AI', 'HIGH', 'Anbefalt basert på AI-prediksjon'),
  ('22222222-2222-2222-2222-222222222222', 'HYDROLICER', 'PLANNED', CURRENT_DATE + INTERVAL '10 days', 0.35, 'AI', 'MEDIUM', 'Forebyggende behandling'),
  ('44444444-4444-4444-4444-444444444444', 'THERMOLICER', 'CONFIRMED', CURRENT_DATE + INTERVAL '3 days', 0.38, 'MANUAL', 'HIGH', 'Bekreftet av driftsleder');

-- Sett inn miljødata
INSERT INTO environment_readings (merd_id, locality, temperature_celsius, oxygen_percent, salinity_ppt, ph, data_source) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Nordfjorden', 8.2, 92, 34.2, 7.8, 'SENSOR'),
  ('22222222-2222-2222-2222-222222222222', 'Nordfjorden', 8.1, 94, 34.1, 7.9, 'SENSOR'),
  ('33333333-3333-3333-3333-333333333333', 'Nordfjorden', 8.3, 91, 34.3, 7.8, 'SENSOR'),
  ('44444444-4444-4444-4444-444444444444', 'Hardangerfjorden', 7.8, 89, 33.8, 8.0, 'SENSOR'),
  ('55555555-5555-5555-5555-555555555555', 'Hardangerfjorden', 7.9, 88, 33.9, 8.1, 'SENSOR');

-- Sett inn risikoscore
INSERT INTO risk_scores (merd_id, locality, overall_score, lice_score, mortality_score, environment_score, treatment_score, risk_level) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Nordfjorden', 65, 75, 40, 85, 60, 'HIGH'),
  ('22222222-2222-2222-2222-222222222222', 'Nordfjorden', 45, 55, 35, 90, 40, 'MODERATE'),
  ('33333333-3333-3333-3333-333333333333', 'Nordfjorden', 25, 30, 30, 88, 20, 'LOW'),
  ('44444444-4444-4444-4444-444444444444', 'Hardangerfjorden', 55, 60, 45, 75, 50, 'MODERATE'),
  ('55555555-5555-5555-5555-555555555555', 'Hardangerfjorden', 30, 35, 40, 78, 25, 'LOW');
