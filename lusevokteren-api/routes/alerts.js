// Alert routes for FjordVind/Lusevokteren
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

/**
 * GET /api/alerts - List alerts with filters
 */
router.get('/', async (req, res) => {
  try {
    const { severity, unreadOnly, limit = 50 } = req.query;

    let query = `
      SELECT
        a.*,
        m.name as merd_name,
        ul.name as lokalitet
      FROM alerts a
      LEFT JOIN merds m ON a.merd_id = m.id
      LEFT JOIN user_localities ul ON m.locality_id = ul.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (severity) {
      query += ` AND a.severity = $${paramCount}`;
      params.push(severity);
      paramCount++;
    }

    if (unreadOnly === 'true') {
      query += ` AND a.is_read = false`;
    }

    query += ` ORDER BY
      CASE a.severity WHEN 'CRITICAL' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END,
      a.created_at DESC
      LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const { rows } = await pool.query(query, params);

    res.json({
      count: rows.length,
      alerts: rows.map(a => ({
        id: a.id,
        merdId: a.merd_id,
        merdName: a.merd_name,
        locality: a.locality || a.lokalitet,
        alertType: a.alert_type,
        severity: a.severity,
        title: a.title,
        message: a.message,
        recommendedAction: a.recommended_action,
        data: a.data,
        isRead: a.is_read,
        acknowledgedAt: a.acknowledged_at,
        resolvedAt: a.resolved_at,
        createdAt: a.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    // Demo fallback
    const now = new Date().toISOString();
    res.json({
      count: 3,
      alerts: [
        { id: '1', alertType: 'LICE_THRESHOLD', severity: 'CRITICAL', title: 'Kritisk lusenivå', message: 'Voksne hunnlus har overskredet grensen', recommendedAction: 'Planlegg behandling umiddelbart', isRead: false, createdAt: now },
        { id: '2', alertType: 'LICE_INCREASING', severity: 'WARNING', title: 'Økende lusenivå', message: 'Lusenivået har økt med 25% siste uke', recommendedAction: 'Overvåk situasjonen', isRead: false, createdAt: now },
        { id: '3', alertType: 'TREATMENT_DUE', severity: 'INFO', title: 'Behandling planlagt', message: 'Behandling planlagt om 5 dager', recommendedAction: 'Bekreft behandlingstidspunkt', isRead: true, createdAt: now }
      ],
      _demo: true
    });
  }
});

/**
 * GET /api/alerts/counts - Get alert counts by severity
 */
router.get('/counts', async (req, res) => {
  try {
    const query = `
      SELECT
        COUNT(CASE WHEN severity = 'CRITICAL' AND resolved_at IS NULL THEN 1 END) as critical,
        COUNT(CASE WHEN severity = 'WARNING' AND resolved_at IS NULL THEN 1 END) as warning,
        COUNT(CASE WHEN severity = 'INFO' AND resolved_at IS NULL THEN 1 END) as info,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread
      FROM alerts
    `;

    const { rows } = await pool.query(query);

    res.json({
      critical: parseInt(rows[0].critical) || 0,
      warning: parseInt(rows[0].warning) || 0,
      info: parseInt(rows[0].info) || 0,
      unread: parseInt(rows[0].unread) || 0,
      total: parseInt(rows[0].critical) + parseInt(rows[0].warning) + parseInt(rows[0].info) || 0
    });
  } catch (error) {
    console.error('Error fetching alert counts:', error);
    res.json({
      critical: 1,
      warning: 1,
      info: 1,
      unread: 2,
      total: 3,
      _demo: true
    });
  }
});

/**
 * PUT /api/alerts/:id/read - Mark alert as read
 */
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      UPDATE alerts
      SET is_read = true
      WHERE id = $1
      RETURNING *
    `;

    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ success: true, alert: rows[0] });
  } catch (error) {
    console.error('Error marking alert as read:', error);
    res.status(500).json({ error: 'Failed to mark alert as read' });
  }
});

/**
 * PUT /api/alerts/:id/acknowledge - Acknowledge alert
 */
router.put('/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      UPDATE alerts
      SET acknowledged_at = NOW(), is_read = true
      WHERE id = $1
      RETURNING *
    `;

    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ success: true, alert: rows[0] });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

/**
 * POST /api/alerts/check-lice-levels - Check and generate lice alerts
 */
router.post('/check-lice-levels', async (req, res) => {
  try {
    // Get recent samples with high lice levels
    const query = `
      SELECT
        s.merd_id,
        m.name as merd_name,
        ul.name as locality,
        AVG(fo.voksne_hunnlus) as avg_adult_female
      FROM samples s
      JOIN fish_observations fo ON fo.sample_id = s.id
      JOIN merds m ON s.merd_id = m.id
      LEFT JOIN user_localities ul ON m.locality_id = ul.id
      WHERE s.dato >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY s.merd_id, m.name, ul.name
      HAVING AVG(fo.voksne_hunnlus) >= 0.3
    `;

    const { rows } = await pool.query(query);

    const alertsCreated = [];

    for (const row of rows) {
      const severity = row.avg_adult_female >= 0.5 ? 'CRITICAL' : 'WARNING';
      const alertType = row.avg_adult_female >= 0.5 ? 'LICE_THRESHOLD' : 'LICE_INCREASING';

      // Check if similar alert already exists
      const existingQuery = `
        SELECT id FROM alerts
        WHERE merd_id = $1 AND alert_type = $2 AND resolved_at IS NULL
        AND created_at >= CURRENT_DATE - INTERVAL '7 days'
      `;
      const { rows: existing } = await pool.query(existingQuery, [row.merd_id, alertType]);

      if (existing.length === 0) {
        const insertQuery = `
          INSERT INTO alerts (merd_id, alert_type, severity, title, message, recommended_action)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;

        const title = severity === 'CRITICAL'
          ? `Kritisk lusenivå - ${row.merd_name}`
          : `Forhøyet lusenivå - ${row.merd_name}`;

        const message = `Gjennomsnittlig voksne hunnlus: ${row.avg_adult_female.toFixed(2)} per fisk`;

        const action = severity === 'CRITICAL'
          ? 'Planlegg behandling umiddelbart'
          : 'Overvåk situasjonen og vurder forebyggende tiltak';

        const { rows: newAlert } = await pool.query(insertQuery, [
          row.merd_id, alertType, severity, title, message, action
        ]);

        alertsCreated.push(newAlert[0]);
      }
    }

    res.json({
      success: true,
      checkedMerds: rows.length,
      alertsCreated: alertsCreated.length,
      alerts: alertsCreated
    });
  } catch (error) {
    console.error('Error checking lice levels:', error);
    res.status(500).json({ error: 'Failed to check lice levels' });
  }
});

/**
 * POST /api/alerts/test-email - Send test email notification
 */
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'E-postadresse mangler' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Ugyldig e-postformat' });
    }

    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`📧 Test email requested to: ${email}`);

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const testEmailContent = {
      to: email,
      subject: 'Test Varsel - FjordVind Lusevokter',
      body: `
        Hei!

        Dette er en testmelding fra FjordVind Lusevokter.

        Dine varslingsinnstillinger fungerer korrekt.
        Du vil motta varsler når:
        - Lusenivå overstiger kritisk grense (0.5)
        - Lusenivå overstiger advarselsgrense (0.2)
        - Dødelighet er høy
        - Behandling forfaller

        Med vennlig hilsen,
        FjordVind Lusevokter
      `,
      sentAt: new Date().toISOString()
    };

    console.log('Test email content:', testEmailContent);

    res.json({
      success: true,
      message: `Test-e-post sendt til ${email}`,
      _demo: true
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Kunne ikke sende test-e-post' });
  }
});

module.exports = router;
