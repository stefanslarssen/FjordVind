// Predictions and Risk Scores Routes

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { parsePagination, paginatedResponse } = require('../config/constants');
const predictionService = require('../services/predictions');
const logger = require('../utils/logger');

// Demo data for when database is unavailable
const DEMO_PREDICTIONS = [
  { id: '1', merdName: 'Merd A1', locality: 'Nordfjorden', currentLice: 0.42, predictedLice: 0.58, confidence: 0.85, probabilityExceedLimit: 0.78, riskLevel: 'HIGH', recommendedAction: 'SCHEDULE_TREATMENT', daysAhead: 7 },
  { id: '2', merdName: 'Merd A2', locality: 'Nordfjorden', currentLice: 0.35, predictedLice: 0.45, confidence: 0.80, probabilityExceedLimit: 0.45, riskLevel: 'MEDIUM', recommendedAction: 'MONITOR', daysAhead: 7 },
  { id: '3', merdName: 'Merd B1', locality: 'Nordfjorden', currentLice: 0.22, predictedLice: 0.28, confidence: 0.82, probabilityExceedLimit: 0.15, riskLevel: 'LOW', recommendedAction: 'NO_ACTION', daysAhead: 7 },
  { id: '4', merdName: 'Merd M1', locality: 'Hardangerfjorden', currentLice: 0.38, predictedLice: 0.52, confidence: 0.78, probabilityExceedLimit: 0.65, riskLevel: 'MEDIUM', recommendedAction: 'SCHEDULE_TREATMENT', daysAhead: 7 },
  { id: '5', merdName: 'Merd M2', locality: 'Hardangerfjorden', currentLice: 0.48, predictedLice: 0.72, confidence: 0.70, probabilityExceedLimit: 0.92, riskLevel: 'CRITICAL', recommendedAction: 'IMMEDIATE_TREATMENT', daysAhead: 7 },
];

const DEMO_RISK_SCORES = [
  { id: '1', merdName: 'Merd A1', locality: 'Nordfjorden', overallScore: 65, liceScore: 75, mortalityScore: 40, environmentScore: 85, treatmentScore: 60, riskLevel: 'HIGH' },
  { id: '2', merdName: 'Merd A2', locality: 'Nordfjorden', overallScore: 45, liceScore: 55, mortalityScore: 35, environmentScore: 90, treatmentScore: 40, riskLevel: 'MODERATE' },
  { id: '3', merdName: 'Merd B1', locality: 'Nordfjorden', overallScore: 25, liceScore: 30, mortalityScore: 30, environmentScore: 88, treatmentScore: 20, riskLevel: 'LOW' },
  { id: '4', merdName: 'Merd M1', locality: 'Hardangerfjorden', overallScore: 55, liceScore: 60, mortalityScore: 45, environmentScore: 75, treatmentScore: 50, riskLevel: 'MODERATE' },
  { id: '5', merdName: 'Merd M2', locality: 'Hardangerfjorden', overallScore: 78, liceScore: 85, mortalityScore: 55, environmentScore: 70, treatmentScore: 70, riskLevel: 'CRITICAL' },
];

/**
 * POST /api/predictions/generate - Generate new predictions for all merds
 * This can be called by a cron job or manually
 */
router.post('/generate', async (req, res) => {
  try {
    const { daysAhead = 7 } = req.body;

    logger.info('Generating predictions', { daysAhead });

    const predictions = await predictionService.generateAllPredictions(daysAhead);

    // Store predictions in database
    await predictionService.storePredictions(predictions);

    res.json({
      message: 'Predictions generated successfully',
      count: predictions.length,
      predictions: predictions.map(p => ({
        merdName: p.merdName,
        locality: p.locality,
        currentLice: p.currentLice,
        predictedLice: p.predictedLice,
        riskLevel: p.riskLevel,
        confidence: p.confidence
      }))
    });
  } catch (error) {
    logger.error('Failed to generate predictions', { error: error.message });
    res.status(500).json({ error: 'Kunne ikke generere prediksjoner' });
  }
});

/**
 * GET /api/predictions/calculate/:merdId - Calculate real-time prediction for a merd
 */
router.get('/calculate/:merdId', async (req, res) => {
  try {
    const { merdId } = req.params;
    const { daysAhead = 7 } = req.query;

    const prediction = await predictionService.calculateMerdPrediction(merdId, parseInt(daysAhead));

    // Get merd info
    const { rows } = await pool.query(
      'SELECT navn, lokalitet FROM merds WHERE id = $1',
      [merdId]
    );

    if (rows.length > 0) {
      prediction.merdName = rows[0].navn;
      prediction.locality = rows[0].lokalitet;
    }

    res.json({
      ...prediction,
      modelVersion: 'statistical-v1.0',
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to calculate prediction', { merdId: req.params.merdId, error: error.message });
    res.status(500).json({ error: 'Kunne ikke beregne prediksjon' });
  }
});

// Get all predictions
router.get('/', async (req, res) => {
  try {
    const { merdId, riskLevel, daysAhead } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (merdId) {
      whereClause += ` AND p.merd_id = $${paramCount}`;
      params.push(merdId);
      paramCount++;
    }

    if (riskLevel) {
      whereClause += ` AND p.risk_level = $${paramCount}`;
      params.push(riskLevel);
      paramCount++;
    }

    if (daysAhead) {
      whereClause += ` AND p.days_ahead = $${paramCount}`;
      params.push(parseInt(daysAhead));
      paramCount++;
    }

    const countQuery = `SELECT COUNT(*) FROM predictions p ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT
        p.*,
        COALESCE(m.name, p.locality_name) as merd_name,
        p.locality_name as lokalitet
      FROM predictions p
      LEFT JOIN merds m ON p.merd_id = m.id
      ${whereClause}
      ORDER BY
        CASE p.risk_level WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
        p.predicted_lice DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const { rows } = await pool.query(dataQuery, [...params, limit, offset]);

    const predictions = rows.map(p => ({
      id: p.id,
      merdId: p.merd_id,
      merdName: p.merd_name || p.locality_name,
      externalMerdId: p.external_merd_id,
      locality: p.lokalitet || p.locality_name,
      predictionDate: p.prediction_date,
      targetDate: p.target_date,
      daysAhead: p.days_ahead,
      currentLice: parseFloat(p.current_lice) || 0,
      predictedLice: parseFloat(p.predicted_lice) || 0,
      confidence: parseFloat(p.confidence) || 0,
      probabilityExceedLimit: parseFloat(p.probability_exceed_limit) || 0,
      riskLevel: p.risk_level,
      recommendedAction: p.recommended_action,
      modelVersion: p.model_version
    }));

    res.json(paginatedResponse(predictions, totalCount, page, limit));
  } catch (error) {
    console.error('Error fetching predictions:', error);
    let filtered = DEMO_PREDICTIONS;
    if (req.query.riskLevel) {
      filtered = filtered.filter(p => p.riskLevel === req.query.riskLevel);
    }
    const { page, limit } = parsePagination(req.query);
    const start = (page - 1) * limit;
    const paged = filtered.slice(start, start + limit);
    res.json({
      ...paginatedResponse(paged, filtered.length, page, limit),
      _demo: true
    });
  }
});

// Get prediction summary for dashboard
router.get('/summary', async (req, res) => {
  try {
    const query = `
      SELECT
        COUNT(*) as total_predictions,
        COUNT(CASE WHEN risk_level = 'CRITICAL' THEN 1 END) as critical_count,
        COUNT(CASE WHEN risk_level = 'HIGH' THEN 1 END) as high_count,
        COUNT(CASE WHEN risk_level = 'MEDIUM' THEN 1 END) as medium_count,
        COUNT(CASE WHEN risk_level = 'LOW' THEN 1 END) as low_count,
        AVG(predicted_lice) as avg_predicted_lice,
        AVG(probability_exceed_limit) as avg_probability_exceed,
        COUNT(CASE WHEN recommended_action = 'SCHEDULE_TREATMENT' OR recommended_action = 'IMMEDIATE_TREATMENT' THEN 1 END) as treatment_needed_count
      FROM predictions
      WHERE target_date >= CURRENT_DATE
        AND days_ahead = 7
    `;

    const { rows } = await pool.query(query);
    const stats = rows[0];

    const treatmentQuery = `
      SELECT DISTINCT m.name, m.lokalitet
      FROM predictions p
      JOIN merds m ON p.merd_id = m.id
      WHERE p.recommended_action IN ('SCHEDULE_TREATMENT', 'IMMEDIATE_TREATMENT')
        AND p.target_date >= CURRENT_DATE
        AND p.days_ahead = 7
    `;
    const { rows: treatmentMerds } = await pool.query(treatmentQuery);

    res.json({
      sevenDayForecast: {
        avgPredictedLice: parseFloat(stats.avg_predicted_lice) || 0,
        avgProbabilityExceed: parseFloat(stats.avg_probability_exceed) || 0,
        criticalCount: parseInt(stats.critical_count) || 0,
        highCount: parseInt(stats.high_count) || 0,
        mediumCount: parseInt(stats.medium_count) || 0,
        lowCount: parseInt(stats.low_count) || 0,
        treatmentNeededCount: parseInt(stats.treatment_needed_count) || 0,
        merdsNeedingTreatment: treatmentMerds.map(m => m.name)
      }
    });
  } catch (error) {
    console.error('Error fetching prediction summary:', error);
    const criticalCount = DEMO_PREDICTIONS.filter(p => p.riskLevel === 'CRITICAL').length;
    const highCount = DEMO_PREDICTIONS.filter(p => p.riskLevel === 'HIGH').length;
    const mediumCount = DEMO_PREDICTIONS.filter(p => p.riskLevel === 'MEDIUM').length;
    const lowCount = DEMO_PREDICTIONS.filter(p => p.riskLevel === 'LOW').length;
    const avgPredicted = DEMO_PREDICTIONS.reduce((sum, p) => sum + p.predictedLice, 0) / DEMO_PREDICTIONS.length;
    const avgProbability = DEMO_PREDICTIONS.reduce((sum, p) => sum + p.probabilityExceedLimit, 0) / DEMO_PREDICTIONS.length;
    const needTreatment = DEMO_PREDICTIONS.filter(p => p.recommendedAction.includes('TREATMENT'));

    res.json({
      sevenDayForecast: {
        avgPredictedLice: avgPredicted,
        avgProbabilityExceed: avgProbability,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        treatmentNeededCount: needTreatment.length,
        merdsNeedingTreatment: needTreatment.map(p => p.merdName)
      },
      _demo: true
    });
  }
});

// Get risk scores
router.get('/risk-scores', async (req, res) => {
  try {
    const query = `
      SELECT
        r.*,
        COALESCE(m.name, r.locality_name) as merd_name
      FROM risk_scores r
      LEFT JOIN merds m ON r.merd_id = m.id
      ORDER BY r.overall_score DESC
    `;

    const { rows } = await pool.query(query);

    const avgScore = rows.length > 0
      ? rows.reduce((sum, r) => sum + (r.overall_score || 0), 0) / rows.length
      : 0;

    res.json({
      aggregateRiskScore: Math.round(avgScore),
      aggregateRiskLevel: avgScore >= 70 ? 'CRITICAL' : avgScore >= 50 ? 'HIGH' : avgScore >= 30 ? 'MODERATE' : 'LOW',
      count: rows.length,
      scores: rows.map(r => ({
        id: r.id,
        merdId: r.merd_id,
        merdName: r.merd_name || r.locality_name,
        externalMerdId: r.external_merd_id,
        locality: r.locality_name,
        overallScore: r.overall_score,
        liceScore: r.lice_score,
        mortalityScore: r.mortality_score,
        environmentScore: r.environment_score,
        treatmentScore: r.treatment_score,
        riskLevel: r.risk_level,
        riskFactors: r.risk_factors,
        recommendations: r.recommendations,
        calculatedAt: r.calculated_at
      }))
    });
  } catch (error) {
    console.error('Error fetching risk scores:', error);
    const avgScore = DEMO_RISK_SCORES.reduce((sum, r) => sum + r.overallScore, 0) / DEMO_RISK_SCORES.length;
    res.json({
      aggregateRiskScore: Math.round(avgScore),
      aggregateRiskLevel: avgScore >= 70 ? 'CRITICAL' : avgScore >= 50 ? 'HIGH' : avgScore >= 30 ? 'MODERATE' : 'LOW',
      count: DEMO_RISK_SCORES.length,
      scores: DEMO_RISK_SCORES,
      _demo: true
    });
  }
});

/**
 * GET /api/predictions/model-info - Get information about the prediction model
 */
router.get('/model-info', (req, res) => {
  res.json({
    model: {
      name: 'FjordVind Statistical Prediction Model',
      version: 'statistical-v1.0',
      type: 'Statistical/Trend Analysis',
      description: 'Bruker historiske lusedata, temperatur og sesongfaktorer for å forutsi lusenivåer'
    },
    factors: {
      historical: {
        description: 'Lineær regresjon på historiske lusetellinger',
        weight: 0.4,
        dataWindow: '30 dager'
      },
      temperature: {
        description: 'Temperaturens effekt på lusevekst (graddager-modell)',
        optimalTemp: '12°C',
        weight: 0.2
      },
      seasonal: {
        description: 'Sesongvariasjon basert på norsk forskning',
        peakMonths: 'Juni-August',
        weight: 0.2
      },
      treatment: {
        description: 'Effekt av nylige behandlinger',
        effectWindow: '14 dager',
        weight: 0.2
      }
    },
    limits: predictionService.LICE_LIMITS,
    seasonalFactors: predictionService.SEASONAL_FACTORS,
    disclaimer: 'Dette er en statistisk modell. For høyere nøyaktighet, vurder ML-modeller som LSTM eller Prophet.',
    lastUpdated: '2026-01-31'
  });
});

/**
 * GET /api/predictions/risk-score/:merdId - Calculate real-time risk score for a merd
 */
router.get('/risk-score/:merdId', async (req, res) => {
  try {
    const { merdId } = req.params;

    const riskScore = await predictionService.calculateRiskScore(merdId);

    // Get merd info
    const { rows } = await pool.query(
      'SELECT navn, lokalitet FROM merds WHERE id = $1',
      [merdId]
    );

    if (rows.length > 0) {
      riskScore.merdName = rows[0].navn;
      riskScore.locality = rows[0].lokalitet;
    }

    res.json(riskScore);
  } catch (error) {
    logger.error('Failed to calculate risk score', { merdId: req.params.merdId, error: error.message });
    res.status(500).json({ error: 'Kunne ikke beregne risikoscore' });
  }
});

module.exports = router;
