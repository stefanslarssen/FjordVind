-- Authentication and Security Migration
-- Adds password authentication and company isolation

-- Ensure update_updated_at_column function exists (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. COMPANIES TABLE (for multi-tenant isolation)
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  org_number TEXT UNIQUE,  -- Norwegian organization number (9 digits)
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE companies IS 'Oppdrettsselskaper/bedrifter for multi-tenant isolering';
COMMENT ON COLUMN companies.org_number IS 'Norsk organisasjonsnummer (9 siffer)';

-- Create index for org_number lookups
CREATE INDEX IF NOT EXISTS idx_companies_org_number ON companies(org_number);

-- ============================================
-- 2. ADD AUTH COLUMNS TO USERS
-- ============================================

-- Add password_hash column (for local authentication)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add company_id for multi-tenant isolation
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Add last_login tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Add failed_login_attempts for security
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- 3. USER_LOCALITIES (link users/companies to BarentsWatch localities)
-- ============================================
CREATE TABLE IF NOT EXISTS user_localities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  locality_no INTEGER NOT NULL,  -- BarentsWatch locality number
  name TEXT NOT NULL,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  municipality TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, locality_no)
);

COMMENT ON TABLE user_localities IS 'Kobler bedrifter til deres BarentsWatch-lokaliteter';

CREATE INDEX IF NOT EXISTS idx_user_localities_company ON user_localities(company_id);
CREATE INDEX IF NOT EXISTS idx_user_localities_locality_no ON user_localities(locality_no);

-- ============================================
-- 4. ADD COMPANY_ID TO MERDS (for data isolation)
-- ============================================
ALTER TABLE merds ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_merds_company_id ON merds(company_id);

-- ============================================
-- 5. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on relevant tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_localities ENABLE ROW LEVEL SECURITY;

-- Companies: Users can only see their own company
CREATE POLICY "Users can view own company" ON companies
  FOR SELECT
  USING (
    id IN (SELECT company_id FROM users WHERE id = current_setting('app.current_user_id', true)::uuid)
    OR current_setting('app.current_user_role', true) = 'admin'
  );

-- User localities: Users can only see their company's localities
CREATE POLICY "Users can view own company localities" ON user_localities
  FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = current_setting('app.current_user_id', true)::uuid)
    OR current_setting('app.current_user_role', true) = 'admin'
  );

-- Users: Users can only see users from same company
CREATE POLICY "Users can view same company users" ON users
  FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = current_setting('app.current_user_id', true)::uuid)
    OR current_setting('app.current_user_role', true) = 'admin'
    OR id = current_setting('app.current_user_id', true)::uuid  -- Can always see self
  );

-- Merds: Users can only see their company's merds
CREATE POLICY "Users can view own company merds" ON merds
  FOR SELECT
  USING (
    company_id IS NULL  -- Public merds (demo data)
    OR company_id IN (SELECT company_id FROM users WHERE id = current_setting('app.current_user_id', true)::uuid)
    OR current_setting('app.current_user_role', true) = 'admin'
  );

-- Samples: Users can only see samples from their company's merds
CREATE POLICY "Users can view own company samples" ON samples
  FOR SELECT
  USING (
    merd_id IN (
      SELECT m.id FROM merds m
      WHERE m.company_id IS NULL
      OR m.company_id IN (SELECT company_id FROM users WHERE id = current_setting('app.current_user_id', true)::uuid)
    )
    OR current_setting('app.current_user_role', true) = 'admin'
  );

-- ============================================
-- 6. AUDIT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,  -- 'login', 'logout', 'create', 'update', 'delete'
  resource_type TEXT,    -- 'sample', 'merd', 'treatment', etc.
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE audit_log IS 'Revisjonslogg for sikkerhet og compliance';

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================
-- 7. SESSION TOKENS TABLE (for token blacklisting on logout)
-- ============================================
CREATE TABLE IF NOT EXISTS revoked_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_hash TEXT NOT NULL,  -- SHA256 hash of the token
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  revoked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL  -- When the token would have expired anyway
);

COMMENT ON TABLE revoked_tokens IS 'Tilbakekalte JWT-tokens for sikker utlogging';

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_hash ON revoked_tokens(token_hash);

-- Clean up expired revoked tokens (can be run periodically)
CREATE OR REPLACE FUNCTION cleanup_revoked_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM revoked_tokens WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_localities_updated_at
  BEFORE UPDATE ON user_localities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
