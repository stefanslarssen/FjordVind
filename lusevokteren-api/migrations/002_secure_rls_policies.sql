-- ============================================
-- SECURE RLS POLICIES MIGRATION
-- Replaces "ALLOW ALL" policies with company isolation
-- Run this on existing databases to upgrade security
-- ============================================

-- ============================================
-- 1. ADD COMPANIES TABLE IF NOT EXISTS
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

-- ============================================
-- 2. ADD COMPANY_ID TO TABLES
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE merds ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_merds_company_id ON merds(company_id);

-- ============================================
-- 3. DROP OLD "ALLOW ALL" POLICIES
-- ============================================
DROP POLICY IF EXISTS "Allow all on users" ON users;
DROP POLICY IF EXISTS "Allow all on merds" ON merds;
DROP POLICY IF EXISTS "Allow all on samples" ON samples;
DROP POLICY IF EXISTS "Allow all on fish_observations" ON fish_observations;
DROP POLICY IF EXISTS "Allow all on compliance_log" ON compliance_log;
DROP POLICY IF EXISTS "Allow all on predictions" ON predictions;
DROP POLICY IF EXISTS "Allow all on alerts" ON alerts;
DROP POLICY IF EXISTS "Allow all on treatments" ON treatments;
DROP POLICY IF EXISTS "Allow all on environment_readings" ON environment_readings;
DROP POLICY IF EXISTS "Allow all on risk_scores" ON risk_scores;

-- ============================================
-- 4. CREATE HELPER FUNCTIONS
-- ============================================
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

-- ============================================
-- 5. ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
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

-- ============================================
-- 6. CREATE NEW SECURE POLICIES
-- ============================================

-- COMPANIES
DROP POLICY IF EXISTS "company_isolation" ON companies;
CREATE POLICY "company_isolation" ON companies FOR ALL
  USING (id = get_current_company_id() OR is_admin())
  WITH CHECK (id = get_current_company_id() OR is_admin());

-- USERS
DROP POLICY IF EXISTS "user_company_isolation" ON users;
CREATE POLICY "user_company_isolation" ON users FOR SELECT
  USING (
    id = get_current_user_id()
    OR company_id = get_current_company_id()
    OR is_admin()
  );

DROP POLICY IF EXISTS "user_update_self" ON users;
CREATE POLICY "user_update_self" ON users FOR UPDATE
  USING (id = get_current_user_id() OR is_admin())
  WITH CHECK (id = get_current_user_id() OR is_admin());

-- MERDS
DROP POLICY IF EXISTS "merd_company_isolation" ON merds;
CREATE POLICY "merd_company_isolation" ON merds FOR SELECT
  USING (
    company_id IS NULL
    OR company_id = get_current_company_id()
    OR is_admin()
  );

DROP POLICY IF EXISTS "merd_company_write" ON merds;
CREATE POLICY "merd_company_write" ON merds FOR INSERT
  WITH CHECK (company_id = get_current_company_id() OR is_admin());

DROP POLICY IF EXISTS "merd_company_update" ON merds;
CREATE POLICY "merd_company_update" ON merds FOR UPDATE
  USING (company_id = get_current_company_id() OR is_admin())
  WITH CHECK (company_id = get_current_company_id() OR is_admin());

DROP POLICY IF EXISTS "merd_company_delete" ON merds;
CREATE POLICY "merd_company_delete" ON merds FOR DELETE
  USING (company_id = get_current_company_id() OR is_admin());

-- SAMPLES
DROP POLICY IF EXISTS "sample_company_isolation" ON samples;
CREATE POLICY "sample_company_isolation" ON samples FOR SELECT
  USING (
    merd_id IN (
      SELECT id FROM merds
      WHERE company_id IS NULL OR company_id = get_current_company_id()
    )
    OR is_admin()
  );

DROP POLICY IF EXISTS "sample_company_write" ON samples;
CREATE POLICY "sample_company_write" ON samples FOR INSERT
  WITH CHECK (
    merd_id IN (SELECT id FROM merds WHERE company_id = get_current_company_id())
    OR is_admin()
  );

DROP POLICY IF EXISTS "sample_company_update" ON samples;
CREATE POLICY "sample_company_update" ON samples FOR UPDATE
  USING (
    merd_id IN (SELECT id FROM merds WHERE company_id = get_current_company_id())
    OR is_admin()
  );

DROP POLICY IF EXISTS "sample_company_delete" ON samples;
CREATE POLICY "sample_company_delete" ON samples FOR DELETE
  USING (
    merd_id IN (SELECT id FROM merds WHERE company_id = get_current_company_id())
    OR is_admin()
  );

-- FISH_OBSERVATIONS
DROP POLICY IF EXISTS "fish_obs_company_isolation" ON fish_observations;
CREATE POLICY "fish_obs_company_isolation" ON fish_observations FOR ALL
  USING (
    sample_id IN (
      SELECT s.id FROM samples s
      JOIN merds m ON s.merd_id = m.id
      WHERE m.company_id IS NULL OR m.company_id = get_current_company_id()
    )
    OR is_admin()
  );

-- COMPLIANCE_LOG
DROP POLICY IF EXISTS "compliance_company_isolation" ON compliance_log;
CREATE POLICY "compliance_company_isolation" ON compliance_log FOR ALL
  USING (
    merd_id IN (
      SELECT id FROM merds
      WHERE company_id IS NULL OR company_id = get_current_company_id()
    )
    OR is_admin()
  );

-- PREDICTIONS
DROP POLICY IF EXISTS "predictions_company_isolation" ON predictions;
CREATE POLICY "predictions_company_isolation" ON predictions FOR ALL
  USING (
    merd_id IN (
      SELECT id FROM merds
      WHERE company_id IS NULL OR company_id = get_current_company_id()
    )
    OR is_admin()
  );

-- ALERTS
DROP POLICY IF EXISTS "alerts_company_isolation" ON alerts;
CREATE POLICY "alerts_company_isolation" ON alerts FOR ALL
  USING (
    merd_id IN (
      SELECT id FROM merds
      WHERE company_id IS NULL OR company_id = get_current_company_id()
    )
    OR is_admin()
  );

-- TREATMENTS
DROP POLICY IF EXISTS "treatments_company_isolation" ON treatments;
CREATE POLICY "treatments_company_isolation" ON treatments FOR ALL
  USING (
    merd_id IN (
      SELECT id FROM merds
      WHERE company_id IS NULL OR company_id = get_current_company_id()
    )
    OR is_admin()
  );

-- ENVIRONMENT_READINGS
DROP POLICY IF EXISTS "environment_company_isolation" ON environment_readings;
CREATE POLICY "environment_company_isolation" ON environment_readings FOR ALL
  USING (
    merd_id IN (
      SELECT id FROM merds
      WHERE company_id IS NULL OR company_id = get_current_company_id()
    )
    OR is_admin()
  );

-- RISK_SCORES
DROP POLICY IF EXISTS "risk_scores_company_isolation" ON risk_scores;
CREATE POLICY "risk_scores_company_isolation" ON risk_scores FOR ALL
  USING (
    merd_id IN (
      SELECT id FROM merds
      WHERE company_id IS NULL OR company_id = get_current_company_id()
    )
    OR is_admin()
  );

-- ============================================
-- 7. AUDIT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
SELECT 'RLS policies upgraded to secure company isolation' as status;
