-- =====================================================
-- FjordVind RLS (Row Level Security) Setup
-- =====================================================
-- Kjør denne SQL-filen i Supabase Dashboard -> SQL Editor
-- =====================================================

-- =====================================================
-- STEG 1: Opprett organisations-tabell
-- =====================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_number TEXT UNIQUE,  -- Organisasjonsnummer
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEG 2: Opprett kobling mellom brukere og organisasjoner
-- =====================================================

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- =====================================================
-- STEG 3: Legg til organization_id på eksisterende tabeller
-- =====================================================

-- Merder
ALTER TABLE merds
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Samples
ALTER TABLE samples
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Alerts
ALTER TABLE alerts
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Predictions
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Treatments
ALTER TABLE treatments
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Risk scores
ALTER TABLE risk_scores
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Environment readings
ALTER TABLE environment_readings
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Locations
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Mortality records (hvis den finnes)
ALTER TABLE mortality_records
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Lice counts (hvis den finnes)
ALTER TABLE lice_counts
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- =====================================================
-- STEG 4: Hjelpefunksjon for å sjekke organisasjonstilgang
-- =====================================================

CREATE OR REPLACE FUNCTION auth.user_organization_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(organization_id)
  FROM organization_members
  WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Sjekk om bruker har tilgang til en spesifikk organisasjon
CREATE OR REPLACE FUNCTION auth.has_organization_access(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
    AND organization_id = org_id
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Sjekk om bruker er admin eller owner i organisasjonen
CREATE OR REPLACE FUNCTION auth.is_organization_admin(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
    AND organization_id = org_id
    AND role IN ('owner', 'admin')
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =====================================================
-- STEG 5: Aktiver RLS på alle tabeller
-- =====================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE merds ENABLE ROW LEVEL SECURITY;
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE environment_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEG 6: RLS Policies for organizations
-- =====================================================

-- Brukere kan se organisasjoner de er medlem av
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- Bare owners kan oppdatere organisasjonen
CREATE POLICY "Owners can update organization"
  ON organizations FOR UPDATE
  USING (auth.is_organization_admin(id));

-- =====================================================
-- STEG 7: RLS Policies for organization_members
-- =====================================================

-- Brukere kan se medlemmer i sine organisasjoner
CREATE POLICY "Users can view members in their orgs"
  ON organization_members FOR SELECT
  USING (organization_id IN (SELECT unnest(auth.user_organization_ids())));

-- Admins kan legge til medlemmer
CREATE POLICY "Admins can add members"
  ON organization_members FOR INSERT
  WITH CHECK (auth.is_organization_admin(organization_id));

-- Admins kan fjerne medlemmer
CREATE POLICY "Admins can remove members"
  ON organization_members FOR DELETE
  USING (auth.is_organization_admin(organization_id));

-- =====================================================
-- STEG 8: RLS Policies for merds
-- =====================================================

CREATE POLICY "Users can view merds in their org"
  ON merds FOR SELECT
  USING (organization_id IN (SELECT unnest(auth.user_organization_ids())));

CREATE POLICY "Users can insert merds in their org"
  ON merds FOR INSERT
  WITH CHECK (organization_id IN (SELECT unnest(auth.user_organization_ids())));

CREATE POLICY "Users can update merds in their org"
  ON merds FOR UPDATE
  USING (organization_id IN (SELECT unnest(auth.user_organization_ids())));

CREATE POLICY "Admins can delete merds"
  ON merds FOR DELETE
  USING (auth.is_organization_admin(organization_id));

-- =====================================================
-- STEG 9: RLS Policies for samples
-- =====================================================

CREATE POLICY "Users can view samples in their org"
  ON samples FOR SELECT
  USING (organization_id IN (SELECT unnest(auth.user_organization_ids())));

CREATE POLICY "Users can insert samples in their org"
  ON samples FOR INSERT
  WITH CHECK (organization_id IN (SELECT unnest(auth.user_organization_ids())));

CREATE POLICY "Users can update samples in their org"
  ON samples FOR UPDATE
  USING (organization_id IN (SELECT unnest(auth.user_organization_ids())));

CREATE POLICY "Users can delete samples in their org"
  ON samples FOR DELETE
  USING (organization_id IN (SELECT unnest(auth.user_organization_ids())));

-- =====================================================
-- STEG 10: RLS Policies for alerts
-- =====================================================

CREATE POLICY "Users can view alerts in their org"
  ON alerts FOR SELECT
  USING (organization_id IN (SELECT unnest(auth.user_organization_ids())));

CREATE POLICY "Users can update alerts in their org"
  ON alerts FOR UPDATE
  USING (organization_id IN (SELECT unnest(auth.user_organization_ids())));

-- =====================================================
-- STEG 11: RLS Policies for predictions
-- =====================================================

CREATE POLICY "Users can view predictions in their org"
  ON predictions FOR SELECT
  USING (organization_id IN (SELECT unnest(auth.user_organization_ids())));

-- =====================================================
-- STEG 12: RLS Policies for treatments
-- =====================================================

CREATE POLICY "Users can view treatments in their org"
  ON treatments FOR SELECT
  USING (organization_id IN (SELECT unnest(auth.user_organization_ids())));

CREATE POLICY "Users can insert treatments in their org"
  ON treatments FOR INSERT
  WITH CHECK (organization_id IN (SELECT unnest(auth.user_organization_ids())));

CREATE POLICY "Users can update treatments in their org"
  ON treatments FOR UPDATE
  USING (organization_id IN (SELECT unnest(auth.user_organization_ids())));

-- =====================================================
-- STEG 13: RLS Policies for risk_scores
-- =====================================================

CREATE POLICY "Users can view risk_scores in their org"
  ON risk_scores FOR SELECT
  USING (organization_id IN (SELECT unnest(auth.user_organization_ids())));

-- =====================================================
-- STEG 14: RLS Policies for environment_readings
-- =====================================================

CREATE POLICY "Users can view environment_readings in their org"
  ON environment_readings FOR SELECT
  USING (organization_id IN (SELECT unnest(auth.user_organization_ids())));

CREATE POLICY "Users can insert environment_readings in their org"
  ON environment_readings FOR INSERT
  WITH CHECK (organization_id IN (SELECT unnest(auth.user_organization_ids())));

CREATE POLICY "Users can delete environment_readings in their org"
  ON environment_readings FOR DELETE
  USING (organization_id IN (SELECT unnest(auth.user_organization_ids())));

-- =====================================================
-- STEG 15: RLS Policies for locations
-- =====================================================

CREATE POLICY "Users can view locations in their org"
  ON locations FOR SELECT
  USING (organization_id IN (SELECT unnest(auth.user_organization_ids())));

CREATE POLICY "Users can insert locations in their org"
  ON locations FOR INSERT
  WITH CHECK (organization_id IN (SELECT unnest(auth.user_organization_ids())));

CREATE POLICY "Users can update locations in their org"
  ON locations FOR UPDATE
  USING (organization_id IN (SELECT unnest(auth.user_organization_ids())));

CREATE POLICY "Admins can delete locations"
  ON locations FOR DELETE
  USING (auth.is_organization_admin(organization_id));

-- =====================================================
-- STEG 16: Indekser for ytelse
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_merds_org ON merds(organization_id);
CREATE INDEX IF NOT EXISTS idx_samples_org ON samples(organization_id);
CREATE INDEX IF NOT EXISTS idx_alerts_org ON alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_org ON locations(organization_id);

-- =====================================================
-- STEG 17: Trigger for automatisk organisasjons-tildeling ved registrering
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  company_name TEXT;
  org_num TEXT;
BEGIN
  -- Hent firma-info fra user metadata
  company_name := NEW.raw_user_meta_data->>'company_name';
  org_num := NEW.raw_user_meta_data->>'org_number';

  -- Hvis bruker oppga firmanavn, opprett ny organisasjon
  IF company_name IS NOT NULL AND company_name != '' THEN
    INSERT INTO organizations (name, org_number)
    VALUES (company_name, org_num)
    RETURNING id INTO new_org_id;

    -- Gjør brukeren til owner av organisasjonen
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (new_org_id, NEW.id, 'owner');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Koble trigger til auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- FERDIG!
-- =====================================================
-- Neste steg: Oppdater frontend-koden til å inkludere
-- organization_id når data opprettes.
-- =====================================================
