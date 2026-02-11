// Notifications Routes (Alert Preferences, Push, SMS)

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const notificationService = require('../services/notifications');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

// ========== VAPID KEY ==========

// Get VAPID public key for push subscription
// Accessible via /api/push/vapid-public-key
router.get('/push/vapid-public-key', (req, res) => {
  const key = notificationService.getVapidPublicKey();
  if (key) {
    res.json({ publicKey: key });
  } else {
    res.status(503).json({ error: 'Push-varsler ikke konfigurert' });
  }
});

// ========== ALERT PREFERENCES ==========

// Save alert preferences
router.post('/alert-preferences', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      emailEnabled,
      pushEnabled,
      smsEnabled,
      alertTypes,
      minSeverity,
      quietHoursStart,
      quietHoursEnd,
      dailySummaryEnabled,
      dailySummaryTime,
      weeklyReportEnabled,
      weeklyReportDay
    } = req.body;

    // Upsert preferences
    await pool.query(`
      INSERT INTO alert_preferences (
        user_id, email_enabled, push_enabled, sms_enabled,
        alert_types, min_severity, quiet_hours_start, quiet_hours_end,
        daily_summary_enabled, daily_summary_time,
        weekly_report_enabled, weekly_report_day
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (user_id) DO UPDATE SET
        email_enabled = EXCLUDED.email_enabled,
        push_enabled = EXCLUDED.push_enabled,
        sms_enabled = EXCLUDED.sms_enabled,
        alert_types = EXCLUDED.alert_types,
        min_severity = EXCLUDED.min_severity,
        quiet_hours_start = EXCLUDED.quiet_hours_start,
        quiet_hours_end = EXCLUDED.quiet_hours_end,
        daily_summary_enabled = EXCLUDED.daily_summary_enabled,
        daily_summary_time = EXCLUDED.daily_summary_time,
        weekly_report_enabled = EXCLUDED.weekly_report_enabled,
        weekly_report_day = EXCLUDED.weekly_report_day,
        updated_at = NOW()
    `, [
      userId,
      emailEnabled ?? true,
      pushEnabled ?? true,
      smsEnabled ?? false,
      JSON.stringify(alertTypes || []),
      minSeverity || 'WARNING',
      quietHoursStart || null,
      quietHoursEnd || null,
      dailySummaryEnabled ?? true,
      dailySummaryTime || '07:00',
      weeklyReportEnabled ?? true,
      weeklyReportDay ?? 1
    ]);

    logger.info('Alert preferences saved', { userId });

    res.json({
      success: true,
      message: 'Varslingsinnstillinger lagret'
    });
  } catch (error) {
    logger.error('Error saving alert preferences', { error: error.message });
    res.status(500).json({ error: 'Kunne ikke lagre varslingsinnstillinger' });
  }
});

// Get alert preferences
router.get('/alert-preferences', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { rows } = await pool.query(
      `SELECT * FROM alert_preferences WHERE user_id = $1`,
      [userId]
    );

    if (rows.length === 0) {
      // Return defaults
      return res.json({
        emailEnabled: true,
        pushEnabled: true,
        smsEnabled: false,
        alertTypes: [],
        minSeverity: 'WARNING',
        quietHoursStart: null,
        quietHoursEnd: null,
        dailySummaryEnabled: true,
        dailySummaryTime: '07:00',
        weeklyReportEnabled: true,
        weeklyReportDay: 1
      });
    }

    const prefs = rows[0];
    res.json({
      emailEnabled: prefs.email_enabled,
      pushEnabled: prefs.push_enabled,
      smsEnabled: prefs.sms_enabled,
      alertTypes: prefs.alert_types,
      minSeverity: prefs.min_severity,
      quietHoursStart: prefs.quiet_hours_start,
      quietHoursEnd: prefs.quiet_hours_end,
      dailySummaryEnabled: prefs.daily_summary_enabled,
      dailySummaryTime: prefs.daily_summary_time,
      weeklyReportEnabled: prefs.weekly_report_enabled,
      weeklyReportDay: prefs.weekly_report_day
    });
  } catch (error) {
    logger.error('Error fetching alert preferences', { error: error.message });
    res.status(500).json({ error: 'Kunne ikke hente varslingsinnstillinger' });
  }
});

// ========== PUSH NOTIFICATIONS ==========

// Subscribe to push notifications
router.post('/push/subscribe', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Ugyldig subscription' });
    }

    await notificationService.savePushSubscription(userId, subscription);

    res.json({
      success: true,
      message: 'Push-varsler aktivert'
    });
  } catch (error) {
    logger.error('Error subscribing to push', { error: error.message });
    res.status(500).json({ error: 'Kunne ikke aktivere push-varsler' });
  }
});

// Unsubscribe from push notifications
router.post('/push/unsubscribe', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint er påkrevd' });
    }

    await notificationService.removePushSubscription(userId, endpoint);

    res.json({
      success: true,
      message: 'Push-varsler deaktivert'
    });
  } catch (error) {
    logger.error('Error unsubscribing from push', { error: error.message });
    res.status(500).json({ error: 'Kunne ikke deaktivere push-varsler' });
  }
});

// Send push notification (admin only)
router.post('/push/send', requireAuth, async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Kun administratorer kan sende push-varsler' });
    }

    const { title, body, url, userId, tag } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Tittel og melding er påkrevd' });
    }

    const notification = { title, body, url, tag };

    if (userId) {
      // Send to specific user
      const result = await notificationService.sendWebPush(userId, notification);
      res.json({
        success: true,
        ...result,
        message: `Push sendt til ${result.sent} enheter`
      });
    } else {
      // Send to all users
      const result = await notificationService.sendNotificationToMatchingUsers(notification);
      res.json({
        success: true,
        ...result,
        message: `Push sendt til ${result.pushSent} enheter`
      });
    }
  } catch (error) {
    logger.error('Error sending push', { error: error.message });
    res.status(500).json({ error: 'Kunne ikke sende push-varsler' });
  }
});

// Get push subscription status
router.get('/push/status', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const subscriptions = await notificationService.getUserSubscriptions(userId);

    res.json({
      isSubscribed: subscriptions.length > 0,
      subscriptionCount: subscriptions.length
    });
  } catch (error) {
    logger.error('Error checking push status', { error: error.message });
    res.status(500).json({ error: 'Kunne ikke sjekke push-status' });
  }
});

// Send test push notification
router.post('/push/test', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await notificationService.sendWebPush(userId, {
      title: 'Test fra Lusevokteren',
      body: 'Dette er en test-varsling. Push-varsler fungerer!',
      tag: 'test'
    });

    if (result.sent > 0) {
      res.json({ success: true, message: 'Test-varsling sendt!' });
    } else {
      res.json({ success: false, message: 'Ingen push-abonnementer funnet' });
    }
  } catch (error) {
    logger.error('Error sending test push', { error: error.message });
    res.status(500).json({ error: 'Kunne ikke sende test-varsling' });
  }
});

// ========== SMS NOTIFICATIONS ==========
// Note: SMS requires Twilio integration. These are placeholder endpoints.

// Update phone number for SMS
router.post('/sms/phone', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { phoneNumber } = req.body;

    // Validate Norwegian phone number format
    if (phoneNumber && !/^(\+47)?[49]\d{7}$/.test(phoneNumber.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Ugyldig norsk telefonnummer' });
    }

    // Normalize to +47 format
    const normalizedPhone = phoneNumber
      ? phoneNumber.replace(/\s/g, '').replace(/^(\d{8})$/, '+47$1')
      : null;

    await pool.query(
      `UPDATE users SET phone = $1, updated_at = NOW() WHERE id = $2`,
      [normalizedPhone, userId]
    );

    logger.info('Phone number updated', { userId });

    res.json({
      success: true,
      phoneNumber: normalizedPhone,
      message: 'Telefonnummer oppdatert'
    });
  } catch (error) {
    logger.error('Error updating phone number', { error: error.message });
    res.status(500).json({ error: 'Kunne ikke oppdatere telefonnummer' });
  }
});

// SMS status - check if Twilio is configured
router.get('/sms/status', (req, res) => {
  const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

  res.json({
    enabled: twilioConfigured,
    provider: twilioConfigured ? 'twilio' : null,
    message: twilioConfigured
      ? 'SMS-varsler er aktivert'
      : 'SMS-varsler er ikke konfigurert. Legg til TWILIO_ACCOUNT_SID og TWILIO_AUTH_TOKEN i miljøvariabler.'
  });
});

// Send test SMS (placeholder - requires Twilio)
router.post('/sms/test', requireAuth, async (req, res) => {
  try {
    const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

    if (!twilioConfigured) {
      return res.status(503).json({
        success: false,
        error: 'SMS er ikke konfigurert. Legg til Twilio-credentials.'
      });
    }

    // TODO: Implement actual Twilio SMS sending
    // const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await twilio.messages.create({ ... });

    res.json({
      success: false,
      message: 'SMS-funksjonalitet er under utvikling'
    });
  } catch (error) {
    logger.error('Error sending test SMS', { error: error.message });
    res.status(500).json({ error: 'Kunne ikke sende test-SMS' });
  }
});

module.exports = router;
