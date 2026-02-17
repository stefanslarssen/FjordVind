// Treatment routes for FjordVind/Lusevokteren
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { validateDate, validateUUID } = require('../utils/validation');
const { databaseError } = require('../utils/errorHandler');

// Demo predictions for recommendations fallback
const DEMO_PREDICTIONS = [
  { id: '1', merdName: 'Havbruk Nord', locality: 'Havbruk Nord', currentLice: 0.42, predictedLice: 0.58, probabilityExceedLimit: 0.72, riskLevel: 'HIGH', recommendedAction: 'SCHEDULE_TREATMENT' },
  { id: '2', merdName: 'Vestfjord Akva', locality: 'Vestfjord Akva', currentLice: 0.55, predictedLice: 0.78, probabilityExceedLimit: 0.88, riskLevel: 'CRITICAL', recommendedAction: 'IMMEDIATE_TREATMENT' },
];

/**
 * GET /api/treatments - List treatments with filters
 */
router.get('/', async (req, res) => {
  try {
    const { merdId, status, upcoming } = req.query;

    let query = `
      SELECT
        t.*,
        COALESCE(m.name, t.locality_name) as merd_name,
        t.locality_name as lokalitet
      FROM treatments t
      LEFT JOIN merds m ON t.merd_id = m.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (merdId) {
      query += ` AND t.merd_id = $${paramCount}`;
      params.push(merdId);
      paramCount++;
    }

    if (status) {
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (upcoming === 'true') {
      query += ` AND t.scheduled_date >= CURRENT_DATE AND t.status IN ('planlagt', 'pågår')`;
    }

    query += ' ORDER BY t.scheduled_date ASC';

    const { rows } = await pool.query(query, params);

    res.json({
      count: rows.length,
      treatments: rows.map(t => ({
        id: t.id,
        merdId: t.merd_id,
        merdName: t.merd_name || t.locality_name,
        locality: t.lokalitet || t.locality_name,
        treatmentType: t.treatment_type,
        status: t.status,
        scheduledDate: t.scheduled_date,
        scheduledTime: t.scheduled_time,
        completedDate: t.completed_date,
        liceBefore: parseFloat(t.lice_before) || null,
        liceAfter: parseFloat(t.lice_after) || null,
        effectivenessPercent: parseFloat(t.effectiveness_percent) || null,
        mortalityPercent: parseFloat(t.mortality_percent) || null,
        costNok: parseFloat(t.cost_nok) || null,
        durationHours: parseFloat(t.duration_hours) || null,
        provider: t.provider,
        boatName: t.boat_name,
        notes: t.notes,
        recommendationSource: t.recommendation_source,
        urgency: t.urgency,
        createdAt: t.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching treatments:', error);
    // Demo fallback
    res.json({
      count: 3,
      treatments: [
        { id: '1', locality: 'Havbruk Nord', treatmentType: 'Termisk', status: 'planlagt', scheduledDate: new Date(Date.now() + 3*24*60*60*1000).toISOString().split('T')[0], urgency: 'høy', notes: 'Optilice båt bestilt', recommendationSource: 'AI' },
        { id: '2', locality: 'Vestfjord Akva', treatmentType: 'Mekanisk', status: 'pågår', scheduledDate: new Date().toISOString().split('T')[0], urgency: 'kritisk', notes: 'FLS behandling startet', recommendationSource: 'Veterinær' },
        { id: '3', locality: 'Nordland Sjømat', treatmentType: 'Ferskvann', status: 'planlagt', scheduledDate: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0], urgency: 'normal', notes: 'Brønnbåt reservert', recommendationSource: 'AI' }
      ],
      _demo: true
    });
  }
});

/**
 * GET /api/treatments/recommendations - AI-suggested treatments
 */
router.get('/recommendations', async (req, res) => {
  try {
    const query = `
      SELECT
        p.merd_id,
        COALESCE(m.name, p.locality_name) as merd_name,
        p.locality_name as lokalitet,
        p.current_lice,
        p.predicted_lice,
        p.probability_exceed_limit,
        p.risk_level,
        p.recommended_action,
        CASE
          WHEN p.probability_exceed_limit >= 0.8 THEN 'THERMOLICER'
          WHEN p.probability_exceed_limit >= 0.6 THEN 'HYDROLICER'
          ELSE 'MONITOR'
        END as recommended_treatment,
        CASE
          WHEN p.probability_exceed_limit >= 0.8 THEN 'Innen 5 dager'
          WHEN p.probability_exceed_limit >= 0.6 THEN 'Innen 10 dager'
          ELSE 'Fortsett overvåking'
        END as urgency_text,
        CASE
          WHEN p.probability_exceed_limit >= 0.8 THEN 'HIGH'
          WHEN p.probability_exceed_limit >= 0.6 THEN 'MEDIUM'
          ELSE 'LOW'
        END as urgency
      FROM predictions p
      LEFT JOIN merds m ON p.merd_id = m.id
      WHERE p.probability_exceed_limit >= 0.5
      ORDER BY p.probability_exceed_limit DESC
    `;

    const { rows } = await pool.query(query);

    res.json({
      count: rows.length,
      recommendations: rows.map(r => ({
        merdId: r.merd_id,
        merdName: r.merd_name,
        locality: r.lokalitet,
        currentLice: parseFloat(r.current_lice),
        predictedLice: parseFloat(r.predicted_lice),
        probabilityExceed: parseFloat(r.probability_exceed_limit),
        riskLevel: r.risk_level,
        recommendedTreatment: r.recommended_treatment,
        urgency: r.urgency,
        urgencyText: r.urgency_text
      }))
    });
  } catch (error) {
    console.error('Error fetching treatment recommendations:', error);
    // Demo fallback
    const needTreatment = DEMO_PREDICTIONS.filter(p => p.recommendedAction.includes('TREATMENT'));
    res.json({
      count: needTreatment.length,
      recommendations: needTreatment.map(p => ({
        merdId: p.id,
        merdName: p.merdName,
        locality: p.locality,
        currentLice: p.currentLice,
        predictedLice: p.predictedLice,
        probabilityExceed: p.probabilityExceedLimit,
        riskLevel: p.riskLevel,
        recommendedTreatment: p.probabilityExceedLimit >= 0.8 ? 'THERMOLICER' : 'HYDROLICER',
        urgency: p.probabilityExceedLimit >= 0.8 ? 'HIGH' : 'MEDIUM',
        urgencyText: p.probabilityExceedLimit >= 0.8 ? 'Innen 5 dager' : 'Innen 10 dager'
      })),
      _demo: true
    });
  }
});

/**
 * POST /api/treatments - Create new treatment
 */
router.post('/', async (req, res) => {
  try {
    const {
      merdId, treatmentType, scheduledDate, scheduledTime,
      liceBefore, notes, recommendationSource, urgency, localityName
    } = req.body;

    // Validation
    const errors = [];
    if (!treatmentType) errors.push('treatmentType er påkrevd');
    if (!scheduledDate) errors.push('scheduledDate er påkrevd');

    const validTypes = ['Hydrogenperoksid', 'Termisk', 'Mekanisk', 'Rensefisk', 'Ferskvann', 'Imidakloprid', 'Azametifos', 'Annet'];
    if (treatmentType && !validTypes.includes(treatmentType)) {
      errors.push(`treatmentType må være en av: ${validTypes.join(', ')}`);
    }

    if (scheduledDate) {
      const dateResult = validateDate(scheduledDate, 'scheduledDate');
      errors.push(...dateResult.errors);
    }

    if (liceBefore !== undefined && liceBefore !== null) {
      const lice = parseFloat(liceBefore);
      if (isNaN(lice) || lice < 0) {
        errors.push('liceBefore må være et positivt tall');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valideringsfeil', errors }
      });
    }

    const query = `
      INSERT INTO treatments (
        merd_id, locality_name, treatment_type, scheduled_date, scheduled_time,
        lice_before, notes, recommendation_source, urgency, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'planlagt')
      RETURNING *
    `;

    const { rows } = await pool.query(query, [
      merdId || null, localityName || null, treatmentType, scheduledDate, scheduledTime || null,
      liceBefore || null, notes || null, recommendationSource || 'Driftsleder', urgency || 'normal'
    ]);

    res.status(201).json({ success: true, treatment: rows[0] });
  } catch (error) {
    console.error('Error creating treatment:', error);
    const dbErr = databaseError(error);
    res.status(dbErr.statusCode).json({
      success: false,
      error: { code: dbErr.code, message: dbErr.message, details: dbErr.details }
    });
  }
});

/**
 * PUT /api/treatments/:id - Update treatment
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, completedDate, liceAfter, effectivenessPercent, mortalityPercent, costNok, notes } = req.body;

    // Validate UUID
    const uuidResult = validateUUID(id, 'id');
    if (!uuidResult.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Ugyldig ID-format', errors: uuidResult.errors }
      });
    }

    // Validate status
    const validStatuses = ['planlagt', 'pågår', 'fullført', 'kansellert'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `status må være en av: ${validStatuses.join(', ')}` }
      });
    }

    // Validate percentage fields
    const errors = [];
    if (effectivenessPercent !== undefined) {
      const eff = parseFloat(effectivenessPercent);
      if (isNaN(eff) || eff < 0 || eff > 100) {
        errors.push('effectivenessPercent må være mellom 0 og 100');
      }
    }
    if (mortalityPercent !== undefined) {
      const mort = parseFloat(mortalityPercent);
      if (isNaN(mort) || mort < 0 || mort > 100) {
        errors.push('mortalityPercent må være mellom 0 og 100');
      }
    }
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valideringsfeil', errors }
      });
    }

    const query = `
      UPDATE treatments
      SET
        status = COALESCE($2, status),
        completed_date = COALESCE($3, completed_date),
        lice_after = COALESCE($4, lice_after),
        effectiveness_percent = COALESCE($5, effectiveness_percent),
        mortality_percent = COALESCE($6, mortality_percent),
        cost_nok = COALESCE($7, cost_nok),
        notes = COALESCE($8, notes),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const { rows } = await pool.query(query, [
      id, status, completedDate, liceAfter, effectivenessPercent, mortalityPercent, costNok, notes
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Behandling ikke funnet' }
      });
    }

    res.json({ success: true, treatment: rows[0] });
  } catch (error) {
    console.error('Error updating treatment:', error);
    const dbErr = databaseError(error);
    res.status(dbErr.statusCode).json({
      success: false,
      error: { code: dbErr.code, message: dbErr.message }
    });
  }
});

module.exports = router;
