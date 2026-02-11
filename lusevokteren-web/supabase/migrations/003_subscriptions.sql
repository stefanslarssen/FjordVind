-- =====================================================
-- FjordVind Subscriptions Table
-- For Stripe integration
-- =====================================================

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  organization_id UUID REFERENCES organizations(id),

  -- Stripe IDs
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,

  -- Plan info
  plan_id TEXT NOT NULL DEFAULT 'free', -- 'free', 'basic', 'professional', 'enterprise'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'trialing', 'past_due', 'canceled', 'unpaid'

  -- Billing period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,

  -- Payment tracking
  last_payment_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Only system (service role) can insert/update subscriptions
-- This ensures subscriptions are only modified via webhooks

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS subscription_updated_at ON subscriptions;
CREATE TRIGGER subscription_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_subscription_updated_at();

-- =====================================================
-- Plan limits table (for feature gating)
-- =====================================================

CREATE TABLE IF NOT EXISTS plan_limits (
  plan_id TEXT PRIMARY KEY,
  max_locations INTEGER,
  max_users INTEGER,
  max_merds_per_location INTEGER,
  history_months INTEGER,
  has_predictions BOOLEAN DEFAULT FALSE,
  has_neighbor_comparison BOOLEAN DEFAULT FALSE,
  has_api_access BOOLEAN DEFAULT FALSE,
  has_sms_alerts BOOLEAN DEFAULT FALSE,
  has_priority_support BOOLEAN DEFAULT FALSE
);

-- Insert default plan limits
INSERT INTO plan_limits (plan_id, max_locations, max_users, max_merds_per_location, history_months, has_predictions, has_neighbor_comparison, has_api_access, has_sms_alerts, has_priority_support)
VALUES
  ('free', 1, 1, 2, 1, false, false, false, false, false),
  ('basic', 2, 3, 10, 12, false, false, false, false, false),
  ('professional', 10, 10, 50, 36, true, true, true, true, true),
  ('enterprise', -1, -1, -1, -1, true, true, true, true, true)
ON CONFLICT (plan_id) DO NOTHING;

-- =====================================================
-- Helper function to check plan limits
-- =====================================================

CREATE OR REPLACE FUNCTION check_plan_limit(
  p_user_id UUID,
  p_limit_type TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_plan_id TEXT;
  v_limit INTEGER;
BEGIN
  -- Get user's plan
  SELECT plan_id INTO v_plan_id
  FROM subscriptions
  WHERE user_id = p_user_id;

  -- Default to free if no subscription
  IF v_plan_id IS NULL THEN
    v_plan_id := 'free';
  END IF;

  -- Get the limit
  EXECUTE format('SELECT %I FROM plan_limits WHERE plan_id = $1', p_limit_type)
  INTO v_limit
  USING v_plan_id;

  RETURN COALESCE(v_limit, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FERDIG!
-- Neste: Deploy Supabase Edge Functions og sett opp Stripe
-- =====================================================
