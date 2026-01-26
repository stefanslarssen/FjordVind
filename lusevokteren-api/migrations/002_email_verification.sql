-- Migration: Email Verification & Password Reset
-- Adds tables and columns for email verification and password reset tokens

-- =============================================
-- 1. ADD EMAIL VERIFICATION COLUMNS TO USERS
-- =============================================

-- Add email_verified column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Add email_verified_at column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;

-- =============================================
-- 2. EMAIL VERIFICATION TOKENS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_verification_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_verification_user ON email_verification_tokens(user_id);

-- =============================================
-- 3. PASSWORD RESET TOKENS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_user ON password_reset_tokens(user_id);

-- =============================================
-- 4. CLEANUP FUNCTION FOR EXPIRED TOKENS
-- =============================================

-- Function to clean up expired tokens (can be run via cron or pg_cron)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  -- Delete expired verification tokens
  DELETE FROM email_verification_tokens
  WHERE expires_at < NOW() AND used_at IS NULL;

  -- Delete expired reset tokens
  DELETE FROM password_reset_tokens
  WHERE expires_at < NOW() AND used_at IS NULL;

  -- Delete used tokens older than 7 days
  DELETE FROM email_verification_tokens
  WHERE used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days';

  DELETE FROM password_reset_tokens
  WHERE used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DONE
-- =============================================
-- Run with: node scripts/run-migration.js migrations/002_email_verification.sql
