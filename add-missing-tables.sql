-- ============================================
-- MANGLENDE TABELLER - Kjør dette i Supabase SQL Editor
-- Legger til: mortality, images, dodfisk-kolonne
-- ============================================

-- 1. Legg til dodfisk-kolonne i samples (hvis den ikke finnes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'samples' AND column_name = 'dodfisk'
  ) THEN
    ALTER TABLE samples ADD COLUMN dodfisk INTEGER DEFAULT 0 CHECK (dodfisk >= 0);
  END IF;
END $$;

-- 2. MORTALITY / DØDELIGHET tabell
CREATE TABLE IF NOT EXISTS mortality (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merd_id UUID NOT NULL REFERENCES merds(id) ON DELETE CASCADE,
  dato DATE NOT NULL,
  antall_dod INTEGER NOT NULL CHECK (antall_dod >= 0),
  arsak TEXT CHECK (arsak IN (
    'ukjent', 'sykdom', 'behandling', 'håndtering', 'predator',
    'oksygenmangel', 'temperatur', 'algeoppblomstring', 'annet'
  )),
  notat TEXT,
  registrert_av UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mortality_merd ON mortality(merd_id);
CREATE INDEX IF NOT EXISTS idx_mortality_dato ON mortality(dato DESC);

-- 3. IMAGES tabell
CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL,
  original_name TEXT,
  mimetype TEXT NOT NULL,
  size_bytes INTEGER,
  url TEXT NOT NULL,
  sample_id UUID REFERENCES samples(id) ON DELETE CASCADE,
  observation_id UUID REFERENCES fish_observations(id) ON DELETE CASCADE,
  treatment_id UUID REFERENCES treatments(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_images_sample ON images(sample_id);
CREATE INDEX IF NOT EXISTS idx_images_observation ON images(observation_id);
CREATE INDEX IF NOT EXISTS idx_images_treatment ON images(treatment_id);

-- 4. Enable Row Level Security
ALTER TABLE mortality ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Mortality: Company isolation via merd
DROP POLICY IF EXISTS "mortality_company_isolation" ON mortality;
CREATE POLICY "mortality_company_isolation" ON mortality FOR ALL
  USING (
    merd_id IN (
      SELECT id FROM merds
      WHERE company_id IS NULL OR company_id = get_current_company_id()
    )
    OR is_admin()
  );

-- Images: Company isolation via sample/treatment
DROP POLICY IF EXISTS "images_company_isolation" ON images;
CREATE POLICY "images_company_isolation" ON images FOR ALL
  USING (
    sample_id IN (
      SELECT s.id FROM samples s
      JOIN merds m ON s.merd_id = m.id
      WHERE m.company_id IS NULL OR m.company_id = get_current_company_id()
    )
    OR treatment_id IN (
      SELECT t.id FROM treatments t
      JOIN merds m ON t.merd_id = m.id
      WHERE m.company_id IS NULL OR m.company_id = get_current_company_id()
    )
    OR is_admin()
    OR (sample_id IS NULL AND treatment_id IS NULL)  -- Allow orphan images
  );

-- 6. Updated_at trigger for mortality
DROP TRIGGER IF EXISTS set_mortality_updated_at ON mortality;
CREATE TRIGGER set_mortality_updated_at
  BEFORE UPDATE ON mortality
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

SELECT 'Missing tables added successfully!' as status;

-- ============================================
-- SUPABASE STORAGE BUCKET
-- ============================================
-- Husk å opprette Storage bucket i Supabase Dashboard:
-- 1. Gå til Storage → New bucket
-- 2. Navn: "images"
-- 3. Public: Ja
-- 4. Allowed MIME: image/jpeg, image/png, image/gif, image/webp
-- 5. Max size: 10MB
