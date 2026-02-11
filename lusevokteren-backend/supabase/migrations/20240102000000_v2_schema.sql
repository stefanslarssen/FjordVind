-- Lusevokteren Database Schema v2
-- Detaljert skjema for lusetelling med individuelle fiskeobservasjoner

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS (røktere og driftsledere)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('røkter', 'driftsleder', 'admin')),
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Brukere: røktere som teller lus og driftsledere som overvåker';
COMMENT ON COLUMN users.role IS 'Brukerrolle: røkter, driftsleder, eller admin';

-- ============================================
-- 2. MERDS (informasjon om merder)
-- ============================================
CREATE TABLE merds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merd_id TEXT UNIQUE NOT NULL,           -- Ekstern ID (f.eks. "NF-A12")
  lokalitet TEXT NOT NULL,                 -- Lokasjonsnavn (f.eks. "Nordfjorden")
  lokalitetsnummer TEXT,                   -- Mattilsynets lokalitetsnummer
  navn TEXT NOT NULL,                      -- Merdnavn (f.eks. "Merd A12")
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  capacity_tonnes DECIMAL(10, 2),          -- Kapasitet i tonn
  current_generation TEXT,                 -- Nåværende generasjon fisk
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE merds IS 'Merder/oppdrettsenheter med lokasjonsinformasjon';
COMMENT ON COLUMN merds.merd_id IS 'Unik ekstern identifikator for merden';
COMMENT ON COLUMN merds.lokalitetsnummer IS 'Mattilsynets offisielle lokalitetsnummer';

-- ============================================
-- 3. SAMPLES (telledata/prøvetakinger)
-- ============================================
CREATE TABLE samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sample_id TEXT UNIQUE NOT NULL,          -- Ekstern sample-ID for sync
  merd_id UUID NOT NULL REFERENCES merds(id) ON DELETE CASCADE,
  røkter_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  dato DATE NOT NULL,
  tidspunkt TIME,
  antall_fisk INTEGER NOT NULL CHECK (antall_fisk > 0),
  temperatur DECIMAL(4, 1),                -- Vanntemperatur
  notat TEXT,
  voice_note_url TEXT,                     -- URL til lydopptak
  synced BOOLEAN DEFAULT false,
  synced_at TIMESTAMPTZ,
  device_id TEXT,                          -- Enhet som registrerte sample
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE samples IS 'Prøvetakinger/tellesesjoner utført av røktere';
COMMENT ON COLUMN samples.synced IS 'Om dataen er synkronisert fra mobil til sky';
COMMENT ON COLUMN samples.antall_fisk IS 'Totalt antall fisk undersøkt i denne prøven';

-- ============================================
-- 4. FISH_OBSERVATIONS (individuelle fiskeobservasjoner)
-- ============================================
CREATE TABLE fish_observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fish_id TEXT NOT NULL,                   -- Sekvensiell ID innen sample (1, 2, 3...)
  sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  voksne_hunnlus INTEGER NOT NULL DEFAULT 0 CHECK (voksne_hunnlus >= 0),
  bevegelige_lus INTEGER NOT NULL DEFAULT 0 CHECK (bevegelige_lus >= 0),
  fastsittende_lus INTEGER NOT NULL DEFAULT 0 CHECK (fastsittende_lus >= 0),
  skottelus INTEGER DEFAULT 0 CHECK (skottelus >= 0),
  bilde_url TEXT,                          -- URL til bilde av fisken
  bilde_local_path TEXT,                   -- Lokal sti (før sync)
  notat TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sample_id, fish_id)
);

COMMENT ON TABLE fish_observations IS 'Individuelle observasjoner per fisk i en prøve';
COMMENT ON COLUMN fish_observations.voksne_hunnlus IS 'Antall voksne hunnlus (kritisk for grenseverdi)';
COMMENT ON COLUMN fish_observations.bevegelige_lus IS 'Antall bevegelige lus (chalimus + preadult)';
COMMENT ON COLUMN fish_observations.fastsittende_lus IS 'Antall fastsittende lus';

-- ============================================
-- 5. COMPLIANCE_LOG (behandlingslogg)
-- ============================================
CREATE TABLE compliance_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merd_id UUID NOT NULL REFERENCES merds(id) ON DELETE CASCADE,
  behandling_type TEXT NOT NULL CHECK (behandling_type IN (
    'termisk',           -- Thermolicer, Optilicer
    'mekanisk',          -- Hydrolicer, FLS
    'medikamentell',     -- Slice, Alphamax, etc.
    'rensefisk',         -- Utsett av rensefisk
    'ferskvann',         -- Ferskvannbehandling
    'laser',             -- Stingray
    'annet'
  )),
  behandling_dato DATE NOT NULL,
  utført_av UUID REFERENCES users(id),
  leverandør TEXT,
  varighet_timer DECIMAL(4, 1),
  effektivitet_prosent DECIMAL(5, 2),      -- Estimert reduksjon
  antall_fisk_behandlet INTEGER,
  dødelighet_prosent DECIMAL(5, 2),
  kostnader_nok DECIMAL(12, 2),
  notat TEXT,
  dokumentasjon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE compliance_log IS 'Logg over lusbehandlinger for å spore 6-behandlingsgrensen';
COMMENT ON COLUMN compliance_log.behandling_type IS 'Type behandling utført';

-- ============================================
-- AGGREGATED VIEW: Sample summaries
-- ============================================
CREATE VIEW sample_summaries AS
SELECT 
  s.id AS sample_id,
  s.sample_id AS external_sample_id,
  s.dato,
  s.antall_fisk,
  m.merd_id AS external_merd_id,
  m.lokalitet,
  m.navn AS merd_navn,
  u.full_name AS røkter_navn,
  COUNT(fo.id) AS observasjoner_registrert,
  SUM(fo.voksne_hunnlus) AS total_voksne_hunnlus,
  SUM(fo.bevegelige_lus) AS total_bevegelige_lus,
  SUM(fo.fastsittende_lus) AS total_fastsittende_lus,
  CASE 
    WHEN s.antall_fisk > 0 THEN 
      ROUND(SUM(fo.voksne_hunnlus)::DECIMAL / s.antall_fisk, 3)
    ELSE 0 
  END AS snitt_voksne_hunnlus,
  CASE 
    WHEN s.antall_fisk > 0 THEN 
      ROUND((SUM(fo.voksne_hunnlus) + SUM(fo.bevegelige_lus) + SUM(fo.fastsittende_lus))::DECIMAL / s.antall_fisk, 3)
    ELSE 0 
  END AS snitt_total_lus,
  s.synced,
  s.created_at
FROM samples s
JOIN merds m ON s.merd_id = m.id
JOIN users u ON s.røkter_id = u.id
LEFT JOIN fish_observations fo ON fo.sample_id = s.id
GROUP BY s.id, m.id, u.id;

COMMENT ON VIEW sample_summaries IS 'Aggregert oversikt over prøvetakinger med lusegjennomsnitt';

-- ============================================
-- VIEW: Compliance status per merd
-- ============================================
CREATE VIEW merd_compliance_status AS
SELECT 
  m.id AS merd_id,
  m.merd_id AS external_merd_id,
  m.lokalitet,
  m.navn,
  COUNT(cl.id) AS antall_behandlinger_siste_12_mnd,
  6 - COUNT(cl.id) AS gjenværende_behandlinger,
  CASE 
    WHEN COUNT(cl.id) >= 6 THEN 'OVER_GRENSE'
    WHEN COUNT(cl.id) >= 5 THEN 'KRITISK'
    WHEN COUNT(cl.id) >= 4 THEN 'ADVARSEL'
    ELSE 'OK'
  END AS compliance_status,
  MAX(cl.behandling_dato) AS siste_behandling
FROM merds m
LEFT JOIN compliance_log cl ON cl.merd_id = m.id 
  AND cl.behandling_dato >= CURRENT_DATE - INTERVAL '12 months'
WHERE m.is_active = true
GROUP BY m.id;

COMMENT ON VIEW merd_compliance_status IS 'Behandlingsstatus per merd mot 6-behandlingsgrensen';

-- ============================================
-- VIEW: Latest lice counts per merd
-- ============================================
CREATE VIEW merd_latest_counts AS
SELECT DISTINCT ON (m.id)
  m.id AS merd_id,
  m.merd_id AS external_merd_id,
  m.lokalitet,
  m.navn,
  ss.dato AS siste_telling_dato,
  ss.snitt_voksne_hunnlus,
  ss.snitt_total_lus,
  CASE 
    WHEN ss.snitt_voksne_hunnlus >= 0.10 THEN 'FARE'
    WHEN ss.snitt_voksne_hunnlus >= 0.08 THEN 'ADVARSEL'
    ELSE 'OK'
  END AS lusestatus
FROM merds m
LEFT JOIN sample_summaries ss ON ss.sample_id IN (
  SELECT s2.id FROM samples s2 WHERE s2.merd_id = m.id ORDER BY s2.dato DESC LIMIT 1
)
WHERE m.is_active = true
ORDER BY m.id, ss.dato DESC NULLS LAST;

COMMENT ON VIEW merd_latest_counts IS 'Siste lusetelling per merd med statusindikator';

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_samples_merd ON samples(merd_id);
CREATE INDEX idx_samples_dato ON samples(dato DESC);
CREATE INDEX idx_samples_røkter ON samples(røkter_id);
CREATE INDEX idx_samples_synced ON samples(synced) WHERE synced = false;
CREATE INDEX idx_fish_observations_sample ON fish_observations(sample_id);
CREATE INDEX idx_compliance_log_merd ON compliance_log(merd_id);
CREATE INDEX idx_compliance_log_dato ON compliance_log(behandling_dato DESC);
CREATE INDEX idx_merds_lokalitet ON merds(lokalitet);

-- ============================================
-- TRIGGERS: updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merds_updated_at
  BEFORE UPDATE ON merds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_samples_updated_at
  BEFORE UPDATE ON samples FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_log_updated_at
  BEFORE UPDATE ON compliance_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE merds ENABLE ROW LEVEL SECURITY;
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE fish_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_log ENABLE ROW LEVEL SECURITY;

-- Policies for MVP (open access - restrict in production)
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on merds" ON merds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on samples" ON samples FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on fish_observations" ON fish_observations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on compliance_log" ON compliance_log FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Users
INSERT INTO users (id, email, full_name, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ola.nordmann@example.com', 'Ola Nordmann', 'røkter'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'kari.hansen@example.com', 'Kari Hansen', 'røkter'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'per.olsen@example.com', 'Per Olsen', 'driftsleder');

-- Merds
INSERT INTO merds (id, merd_id, lokalitet, lokalitetsnummer, navn) VALUES
  ('11111111-1111-1111-1111-111111111111', 'NF-A1', 'Nordfjorden', '12345', 'Merd A1'),
  ('22222222-2222-2222-2222-222222222222', 'NF-A2', 'Nordfjorden', '12345', 'Merd A2'),
  ('33333333-3333-3333-3333-333333333333', 'NF-B1', 'Nordfjorden', '12345', 'Merd B1'),
  ('44444444-4444-4444-4444-444444444444', 'HF-M1', 'Hardangerfjorden', '67890', 'Merd M1'),
  ('55555555-5555-5555-5555-555555555555', 'HF-M2', 'Hardangerfjorden', '67890', 'Merd M2');

-- Sample with fish observations
INSERT INTO samples (id, sample_id, merd_id, røkter_id, dato, antall_fisk, synced) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'SAMPLE-001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', CURRENT_DATE, 20, true);

INSERT INTO fish_observations (fish_id, sample_id, voksne_hunnlus, bevegelige_lus, fastsittende_lus) VALUES
  ('1', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 0, 2, 1),
  ('2', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1, 1, 0),
  ('3', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 0, 0, 1),
  ('4', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 2, 3, 2),
  ('5', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 0, 1, 0);

-- Compliance log
INSERT INTO compliance_log (merd_id, behandling_type, behandling_dato, utført_av, notat) VALUES
  ('11111111-1111-1111-1111-111111111111', 'termisk', CURRENT_DATE - INTERVAL '30 days', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Thermolicer-behandling'),
  ('11111111-1111-1111-1111-111111111111', 'mekanisk', CURRENT_DATE - INTERVAL '90 days', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Hydrolicer-behandling');
