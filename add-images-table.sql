-- ============================================
-- IMAGES TABLE - Kjør dette i Supabase SQL Editor
-- for å legge til bildestøtte
-- ============================================

-- Images table for fish observations, samples, treatments
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

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_images_sample ON images(sample_id);
CREATE INDEX IF NOT EXISTS idx_images_observation ON images(observation_id);
CREATE INDEX IF NOT EXISTS idx_images_treatment ON images(treatment_id);

-- Enable Row Level Security
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Company isolation via sample/treatment
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
    OR sample_id IS NULL AND treatment_id IS NULL  -- Allow orphan images
  );

-- ============================================
-- SUPABASE STORAGE BUCKET (kjør i Dashboard)
-- ============================================
-- 1. Gå til Storage i Supabase Dashboard
-- 2. Klikk "New bucket"
-- 3. Navn: "images"
-- 4. Public bucket: Ja (for enkel tilgang til bilder)
-- 5. Allowed MIME types: image/jpeg, image/png, image/gif, image/webp
-- 6. Max file size: 10MB

SELECT 'Images table created!' as status;
