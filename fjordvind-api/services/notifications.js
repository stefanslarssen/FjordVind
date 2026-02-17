/**
 * Notification Service for FjordVind Lusevokteren
 *
 * Handles sending notifications via:
 * - Email (using email service)
 * - Web Push (using web-push library)
 * - SMS (future: Twilio integration)
 *
 * Notification types:
 * - LICE_CRITICAL: Lusenivå over grenseverdi
 * - LICE_WARNING: Lusenivå nærmer seg grensen
 * - TREATMENT_DUE: Behandling planlagt
 * - PREDICTION_ALERT: AI-prediksjon viser høy risiko
 * - DAILY_SUMMARY: Daglig oppsummering
 */

const pool = require('../config/database');
const logger = require('../utils/logger');
const emailService = require('./email');

// Web Push configuration
const webPush = require('web-push');
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@fjordvind.no';

// Configure web-push if VAPID keys are set
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  logger.info('Web Push configured with VAPID keys');
} else {
  logger.warn('Web Push not configured - VAPID keys missing');
}

// Notification templates
const TEMPLATES = {
  LICE_CRITICAL: {
    title: 'KRITISK: Lusenivå over grensen',
    priority: 'high',
    category: 'alert'
  },
  LICE_WARNING: {
    title: 'ADVARSEL: Lusenivå nærmer seg grensen',
    priority: 'medium',
    category: 'warning'
  },
  TREATMENT_DUE: {
    title: 'Behandling planlagt',
    priority: 'medium',
    category: 'reminder'
  },
  PREDICTION_ALERT: {
    title: 'Prediksjon: Høy risiko forventet',
    priority: 'high',
    category: 'prediction'
  },
  DAILY_SUMMARY: {
    title: 'Daglig oppsummering',
    priority: 'low',
    category: 'summary'
  }
};

/**
 * Save a push subscription for a user
 */
async function savePushSubscription(userId, subscription) {
  try {
    // Check if subscription already exists
    const existing = await pool.query(
      `SELECT id FROM push_subscriptions
       WHERE user_id = $1 AND endpoint = $2`,
      [userId, subscription.endpoint]
    );

    if (existing.rows.length > 0) {
      // Update existing
      await pool.query(
        `UPDATE push_subscriptions
         SET keys = $1, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(subscription.keys), existing.rows[0].id]
      );
    } else {
      // Insert new
      await pool.query(
        `INSERT INTO push_subscriptions (user_id, endpoint, keys)
         VALUES ($1, $2, $3)`,
        [userId, subscription.endpoint, JSON.stringify(subscription.keys)]
      );
    }

    logger.info('Push subscription saved', { userId });
    return { success: true };
  } catch (error) {
    logger.error('Failed to save push subscription', { userId, error: error.message });
    throw error;
  }
}

/**
 * Remove a push subscription
 */
async function removePushSubscription(userId, endpoint) {
  try {
    await pool.query(
      `DELETE FROM push_subscriptions
       WHERE user_id = $1 AND endpoint = $2`,
      [userId, endpoint]
    );

    logger.info('Push subscription removed', { userId });
    return { success: true };
  } catch (error) {
    logger.error('Failed to remove push subscription', { error: error.message });
    throw error;
  }
}

/**
 * Get all push subscriptions for a user
 */
async function getUserSubscriptions(userId) {
  const { rows } = await pool.query(
    `SELECT endpoint, keys FROM push_subscriptions WHERE user_id = $1`,
    [userId]
  );

  return rows.map(row => ({
    endpoint: row.endpoint,
    keys: typeof row.keys === 'string' ? JSON.parse(row.keys) : row.keys
  }));
}

/**
 * Send a web push notification to a user
 */
async function sendWebPush(userId, notification) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    logger.debug('Web Push skipped - not configured');
    return { sent: 0, failed: 0 };
  }

  try {
    const subscriptions = await getUserSubscriptions(userId);

    if (subscriptions.length === 0) {
      logger.debug('No push subscriptions for user', { userId });
      return { sent: 0, failed: 0 };
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: notification.tag || 'lusevokteren',
      data: {
        url: notification.url || '/',
        ...notification.data
      }
    });

    let sent = 0;
    let failed = 0;

    for (const subscription of subscriptions) {
      try {
        await webPush.sendNotification(subscription, payload);
        sent++;
      } catch (error) {
        failed++;
        // If subscription is expired, remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await removePushSubscription(userId, subscription.endpoint);
          logger.debug('Removed expired push subscription', { userId });
        } else {
          logger.error('Push notification failed', { userId, error: error.message });
        }
      }
    }

    logger.info('Web push notifications sent', { userId, sent, failed });
    return { sent, failed };
  } catch (error) {
    logger.error('Failed to send web push', { userId, error: error.message });
    return { sent: 0, failed: 1 };
  }
}

/**
 * Send an email notification
 */
async function sendEmailNotification(userId, notification) {
  try {
    // Get user email
    const { rows } = await pool.query(
      `SELECT email, full_name FROM users WHERE id = $1`,
      [userId]
    );

    if (rows.length === 0) {
      logger.warn('User not found for email notification', { userId });
      return { success: false, reason: 'user_not_found' };
    }

    const user = rows[0];

    // Build email content
    const subject = `[Lusevokteren] ${notification.title}`;
    const text = `
Hei ${user.full_name || 'der'},

${notification.body}

${notification.details ? '\nDetaljer:\n' + notification.details : ''}

${notification.action ? `\nAnbefalt handling: ${notification.action}` : ''}

---
Denne e-posten ble sendt automatisk fra FjordVind Lusevokteren.
For å endre varslingsinnstillinger, gå til: ${process.env.APP_URL || 'http://localhost:5173'}/innstillinger
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${notification.priority === 'high' ? '#dc2626' : '#0066cc'}; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 25px; border-radius: 0 0 8px 8px; }
    .alert-box { background: ${notification.priority === 'high' ? '#fef2f2' : '#f0f9ff'}; border: 1px solid ${notification.priority === 'high' ? '#fca5a5' : '#bfdbfe'}; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .action { background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${notification.title}</h1>
    </div>
    <div class="content">
      <p>Hei ${user.full_name || 'der'},</p>
      <div class="alert-box">
        <p>${notification.body}</p>
        ${notification.details ? `<p><strong>Detaljer:</strong><br>${notification.details.replace(/\n/g, '<br>')}</p>` : ''}
      </div>
      ${notification.action ? `<p><strong>Anbefalt handling:</strong> ${notification.action}</p>` : ''}
      ${notification.url ? `<a href="${notification.url}" class="action">Se i Lusevokteren</a>` : ''}
    </div>
    <div class="footer">
      <p>Denne e-posten ble sendt automatisk fra FjordVind Lusevokteren.</p>
      <p><a href="${process.env.APP_URL || 'http://localhost:5173'}/innstillinger">Endre varslingsinnstillinger</a></p>
    </div>
  </div>
</body>
</html>
    `.trim();

    await emailService.sendEmail({
      to: user.email,
      subject,
      text,
      html
    });

    logger.info('Email notification sent', { userId, email: user.email });
    return { success: true };
  } catch (error) {
    logger.error('Failed to send email notification', { userId, error: error.message });
    return { success: false, reason: error.message };
  }
}

/**
 * Create and store an alert in the database
 */
async function createAlert(data) {
  try {
    const {
      merdId,
      locality,
      alertType,
      severity,
      title,
      message,
      recommendedAction,
      data: alertData
    } = data;

    const { rows } = await pool.query(`
      INSERT INTO alerts (
        merd_id, locality, alert_type, severity,
        title, message, recommended_action, data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      merdId || null,
      locality || null,
      alertType,
      severity,
      title,
      message,
      recommendedAction || null,
      alertData ? JSON.stringify(alertData) : null
    ]);

    logger.info('Alert created', { alertId: rows[0].id, alertType, severity });
    return { id: rows[0].id };
  } catch (error) {
    logger.error('Failed to create alert', { error: error.message });
    throw error;
  }
}

/**
 * Send notification to all users with matching preferences
 */
async function sendNotificationToMatchingUsers(notification, filter = {}) {
  try {
    // Build query based on filter
    let whereClause = 'WHERE u.is_active = true';
    const params = [];

    if (filter.companyId) {
      params.push(filter.companyId);
      whereClause += ` AND u.company_id = $${params.length}`;
    }

    if (filter.role) {
      params.push(filter.role);
      whereClause += ` AND u.role = $${params.length}`;
    }

    // Get users with their notification preferences
    const { rows: users } = await pool.query(`
      SELECT
        u.id,
        u.email,
        u.full_name,
        COALESCE(ap.email_enabled, true) as email_enabled,
        COALESCE(ap.push_enabled, true) as push_enabled,
        COALESCE(ap.alert_types, '[]'::jsonb) as alert_types
      FROM users u
      LEFT JOIN alert_preferences ap ON u.id = ap.user_id
      ${whereClause}
    `, params);

    const results = {
      total: users.length,
      emailSent: 0,
      pushSent: 0,
      skipped: 0
    };

    for (const user of users) {
      // Check if user wants this type of notification
      const alertTypes = Array.isArray(user.alert_types) ? user.alert_types : [];
      const wantsThisType = alertTypes.length === 0 || alertTypes.includes(notification.type);

      if (!wantsThisType) {
        results.skipped++;
        continue;
      }

      // Send email if enabled
      if (user.email_enabled) {
        const emailResult = await sendEmailNotification(user.id, notification);
        if (emailResult.success) results.emailSent++;
      }

      // Send push if enabled
      if (user.push_enabled) {
        const pushResult = await sendWebPush(user.id, notification);
        results.pushSent += pushResult.sent;
      }
    }

    logger.info('Notifications sent to matching users', results);
    return results;
  } catch (error) {
    logger.error('Failed to send notifications', { error: error.message });
    throw error;
  }
}

/**
 * Send lice critical alert
 */
async function sendLiceCriticalAlert(merdName, locality, currentLice, limit) {
  const notification = {
    type: 'LICE_CRITICAL',
    title: TEMPLATES.LICE_CRITICAL.title,
    body: `Merd "${merdName}" i ${locality} har lusenivå ${currentLice.toFixed(2)} - over grensen på ${limit}!`,
    details: `Lusenivå: ${currentLice.toFixed(2)}\nGrenseverdi: ${limit}\nLokalitet: ${locality}`,
    action: 'Planlegg behandling umiddelbart',
    priority: 'high',
    url: '/alerts'
  };

  // Create alert in database
  await createAlert({
    locality,
    alertType: 'LICE_CRITICAL',
    severity: 'CRITICAL',
    title: notification.title,
    message: notification.body,
    recommendedAction: notification.action,
    data: { merdName, currentLice, limit }
  });

  // Send to matching users
  return sendNotificationToMatchingUsers(notification);
}

/**
 * Send prediction alert
 */
async function sendPredictionAlert(predictions) {
  const criticalPredictions = predictions.filter(p => p.riskLevel === 'CRITICAL');

  if (criticalPredictions.length === 0) return;

  const notification = {
    type: 'PREDICTION_ALERT',
    title: TEMPLATES.PREDICTION_ALERT.title,
    body: `${criticalPredictions.length} merd(er) forventes å overskride lusegrensen innen 7 dager`,
    details: criticalPredictions.map(p =>
      `- ${p.merdName || 'Ukjent'}: ${p.predictedLice.toFixed(2)} (${Math.round(p.probabilityExceedLimit * 100)}% sannsynlighet)`
    ).join('\n'),
    action: 'Vurder forebyggende behandling',
    priority: 'high',
    url: '/predictions'
  };

  // Create alert
  await createAlert({
    alertType: 'LICE_PREDICTION',
    severity: 'WARNING',
    title: notification.title,
    message: notification.body,
    recommendedAction: notification.action,
    data: { predictions: criticalPredictions.map(p => ({ merdName: p.merdName, predictedLice: p.predictedLice })) }
  });

  return sendNotificationToMatchingUsers(notification);
}

/**
 * Get VAPID public key for client-side push subscription
 */
function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY || null;
}

module.exports = {
  savePushSubscription,
  removePushSubscription,
  getUserSubscriptions,
  sendWebPush,
  sendEmailNotification,
  createAlert,
  sendNotificationToMatchingUsers,
  sendLiceCriticalAlert,
  sendPredictionAlert,
  getVapidPublicKey,
  TEMPLATES
};
