-- ============================================
-- NOTIFICATIONS MIGRATION
-- Adds tables for push subscriptions and alert preferences
-- ============================================

-- ============================================
-- 1. PUSH SUBSCRIPTIONS
-- Stores Web Push API subscriptions for users
-- ============================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,  -- {p256dh, auth}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

COMMENT ON TABLE push_subscriptions IS 'Web Push API-abonnementer for push-varsler';

-- ============================================
-- 2. ALERT PREFERENCES
-- User preferences for which alerts to receive
-- ============================================
CREATE TABLE IF NOT EXISTS alert_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  -- Alert types to receive (empty = all)
  alert_types JSONB DEFAULT '[]'::jsonb,
  -- Minimum severity to notify (INFO, WARNING, CRITICAL)
  min_severity TEXT DEFAULT 'WARNING' CHECK (min_severity IN ('INFO', 'WARNING', 'CRITICAL')),
  -- Quiet hours (no notifications)
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  -- Daily summary preference
  daily_summary_enabled BOOLEAN DEFAULT true,
  daily_summary_time TIME DEFAULT '07:00',
  -- Weekly report preference
  weekly_report_enabled BOOLEAN DEFAULT true,
  weekly_report_day INTEGER DEFAULT 1 CHECK (weekly_report_day BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE alert_preferences IS 'Brukerpreferanser for varsler';

-- ============================================
-- 3. NOTIFICATION LOG
-- Track sent notifications for analytics
-- ============================================
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  alert_id UUID REFERENCES alerts(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'push', 'sms', 'in_app')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent ON notification_log(sent_at DESC);

COMMENT ON TABLE notification_log IS 'Logg over sendte varsler for analyse';

-- ============================================
-- 4. TRIGGERS
-- ============================================
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_preferences_updated_at
  BEFORE UPDATE ON alert_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. DEFAULT ALERT PREFERENCES FOR EXISTING USERS
-- ============================================
INSERT INTO alert_preferences (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM alert_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
SELECT 'Notifications tables created' as status;
