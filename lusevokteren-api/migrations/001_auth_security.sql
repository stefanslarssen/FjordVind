-- Migration: Auth & Security
-- Adds authentication columns and security features
-- Run: psql -U postgres -d lusevokteren -f migrations/001_auth_security.sql

-- =============================================
-- 1. ADD AUTH COLUMNS TO USERS TABLE
-- =============================================

-- Add password_hash column (for bcrypt hashed passwords)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add role column (admin, driftsleder, røkter, viewer)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'røkter';

-- Add full_name column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Add is_active column for soft delete
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add last_login tracking
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Add updated_at column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- =============================================
-- 2. AUDIT LOG TABLE (Security tracking)
-- =============================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,           -- 'login', 'logout', 'create', 'update', 'delete', 'export', 'failed_login'
  resource_type VARCHAR(100),             -- 'sample', 'treatment', 'user', 'merd', etc.
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  details JSONB,                          -- Additional context
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log(resource_type, resource_id);

-- =============================================
-- 3. REVOKED TOKENS TABLE (For logout/security)
-- =============================================

CREATE TABLE IF NOT EXISTS revoked_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash VARCHAR(64) NOT NULL,        -- SHA256 hash of token
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  revoked_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,          -- When token would naturally expire
  reason VARCHAR(100)                     -- 'logout', 'password_change', 'admin_revoke'
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_revoked_token_hash ON revoked_tokens(token_hash);

-- Auto-cleanup of expired tokens (can be run periodically)
-- DELETE FROM revoked_tokens WHERE expires_at < NOW();

-- =============================================
-- 4. USER SESSIONS TABLE (Optional - for tracking active sessions)
-- =============================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  device_info TEXT,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash);

-- =============================================
-- 5. ADD COMPANY_ID TO TABLES FOR MULTI-TENANCY
-- =============================================

-- Add company_id to merds (via locality)
-- Already linked through user_localities.company_id

-- Add company_id directly to samples for faster queries
ALTER TABLE samples
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Add company_id to treatments
ALTER TABLE treatments
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Add company_id to alerts
ALTER TABLE alerts
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Add company_id to mortality_records
ALTER TABLE mortality_records
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- =============================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================
-- Note: Enable RLS on tables and create policies
-- This ensures users can only see their company's data

-- Enable RLS on key tables
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortality_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_localities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their company's samples
DROP POLICY IF EXISTS samples_company_policy ON samples;
CREATE POLICY samples_company_policy ON samples
  FOR ALL
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

-- Policy: Users can only see their company's treatments
DROP POLICY IF EXISTS treatments_company_policy ON treatments;
CREATE POLICY treatments_company_policy ON treatments
  FOR ALL
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

-- Policy: Users can only see their company's alerts
DROP POLICY IF EXISTS alerts_company_policy ON alerts;
CREATE POLICY alerts_company_policy ON alerts
  FOR ALL
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

-- Policy: Users can only see their company's mortality records
DROP POLICY IF EXISTS mortality_company_policy ON mortality_records;
CREATE POLICY mortality_company_policy ON mortality_records
  FOR ALL
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

-- Policy: Users can only see their company's localities
DROP POLICY IF EXISTS localities_company_policy ON user_localities;
CREATE POLICY localities_company_policy ON user_localities
  FOR ALL
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

-- =============================================
-- 7. INDEXES FOR AUTH PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

-- =============================================
-- 8. TRIGGER FOR UPDATED_AT
-- =============================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 9. CREATE DEFAULT ADMIN USER (Optional)
-- =============================================
-- Uncomment and modify to create initial admin user
-- Password should be hashed with bcrypt before inserting

-- INSERT INTO users (email, password_hash, full_name, role, is_active)
-- VALUES (
--   'admin@fjordvind.no',
--   '$2a$12$...hashed_password...',  -- bcrypt hash of password
--   'System Admin',
--   'admin',
--   true
-- ) ON CONFLICT (email) DO NOTHING;

-- =============================================
-- DONE
-- =============================================
-- Migration complete. Run this with:
-- psql -U postgres -d lusevokteren -f migrations/001_auth_security.sql
