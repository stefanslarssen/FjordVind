/**
 * Prediction Service for FjordVind FjordVind
 *
 * Calculates lice predictions using:
 * - Historical lice count trends
 * - Water temperature (lice development rate)
 * - Seasonal factors (spring/summer = higher growth)
 * - Treatment history
 * - Nearby farm data (infection pressure)
 *
 * This is a statistical model - for production, consider:
 * - Machine learning models (LSTM, Prophet, etc.)
 * - Integration with research institutions (e.g., Veterinærinstituttet)
 */

const pool = require('../config/database');
const logger = require('../utils/logger');

// Regulatory limits (Mattilsynet)
const LICE_LIMITS = {
  ADULT_FEMALE_LIMIT: 0.5,        // Grense for voksne hunnlus
  WARNING_THRESHOLD: 0.3,          // Varselnivå
  CRITICAL_THRESHOLD: 0.7,         // Kritisk nivå (dobbel grense)
  SPRING_LIMIT: 0.2,               // Strengere i vårperioden (uke 16-21)
};

// Temperature effect on lice development (degree-days model)
const TEMP_FACTORS = {
  OPTIMAL_TEMP: 12,                // Optimal temperature for lice growth
  MIN_TEMP: 4,                     // Below this, lice development slows significantly
  MAX_TEMP: 20,                    // Above this, stress increases mortality
};

// Seasonal multipliers based on Norwegian research
const SEASONAL_FACTORS = {
  1: 0.6,   // January - cold, slow growth
  2: 0.5,   // February - coldest
  3: 0.7,   // March - starting to warm
  4: 0.9,   // April - spring increase
  5: 1.2,   // May - rapid growth
  6: 1.4,   // June - peak season starts
  7: 1.5,   // July - peak
  8: 1.5,   // August - peak
  9: 1.3,   // September - starting to decline
  10: 1.0,  // October - autumn
  11: 0.8,  // November - cooling
  12: 0.7,  // December - winter
};

/**
 * Calculate lice growth rate based on temperature
 * Uses degree-day model from salmon lice research
 */
function calculateTempFactor(temperature) {
  if (temperature < TEMP_FACTORS.MIN_TEMP) {
    return 0.3; // Very slow development
  }
  if (temperature > TEMP_FACTORS.MAX_TEMP) {
    return 0.8; // Heat stress reduces reproduction
  }

  // Optimal around 12°C, normalized growth curve
  const deviation = Math.abs(temperature - TEMP_FACTORS.OPTIMAL_TEMP);
  return Math.max(0.5, 1 - (deviation * 0.05));
}

/**
 * Calculate trend from historical data using linear regression
 */
function calculateTrend(dataPoints) {
  if (dataPoints.length < 2) return { slope: 0, intercept: 0, r2: 0 };

  const n = dataPoints.length;
  const sumX = dataPoints.reduce((s, _, i) => s + i, 0);
  const sumY = dataPoints.reduce((s, d) => s + d.value, 0);
  const sumXY = dataPoints.reduce((s, d, i) => s + i * d.value, 0);
  const sumX2 = dataPoints.reduce((s, _, i) => s + i * i, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R² (coefficient of determination)
  const yMean = sumY / n;
  const ssRes = dataPoints.reduce((s, d, i) => {
    const predicted = slope * i + intercept;
    return s + Math.pow(d.value - predicted, 2);
  }, 0);
  const ssTot = dataPoints.reduce((s, d) => s + Math.pow(d.value - yMean, 2), 0);
  const r2 = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

  return { slope, intercept, r2 };
}

/**
 * Get historical lice data for a merd
 */
async function getHistoricalData(merdId, days = 30) {
  try {
    const query = `
      SELECT
        s.dato as date,
        AVG(
          (fo.voksne_hunnlus + fo.bevegelige_lus * 0.5) /
          NULLIF(s.antall_fisk, 0)
        ) as avg_lice
      FROM samples s
      JOIN fish_observations fo ON fo.sample_id = s.id
      WHERE s.merd_id = $1
        AND s.dato >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY s.dato
      ORDER BY s.dato ASC
    `;

    const { rows } = await pool.query(query, [merdId]);
    return rows.map(r => ({
      date: r.date,
      value: parseFloat(r.avg_lice) || 0
    }));
  } catch (error) {
    logger.error('Failed to get historical data', { merdId, error: error.message });
    return [];
  }
}

/**
 * Get latest temperature reading for a merd
 */
async function getLatestTemperature(merdId) {
  try {
    const query = `
      SELECT temperature_celsius
      FROM environment_readings
      WHERE merd_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    const { rows } = await pool.query(query, [merdId]);
    return rows[0]?.temperature_celsius || 10; // Default to 10°C
  } catch (error) {
    return 10;
  }
}

/**
 * Get recent treatment history
 */
async function getRecentTreatments(merdId, days = 14) {
  try {
    const query = `
      SELECT
        treatment_type,
        completed_date,
        effectiveness_percent
      FROM treatments
      WHERE merd_id = $1
        AND status = 'COMPLETED'
        AND completed_date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY completed_date DESC
    `;

    const { rows } = await pool.query(query, [merdId]);
    return rows;
  } catch (error) {
    return [];
  }
}

/**
 * Calculate prediction for a single merd
 */
async function calculateMerdPrediction(merdId, daysAhead = 7) {
  // Get historical data
  const history = await getHistoricalData(merdId, 30);
  const currentTemp = await getLatestTemperature(merdId);
  const recentTreatments = await getRecentTreatments(merdId, 14);

  const currentMonth = new Date().getMonth() + 1;
  const seasonalFactor = SEASONAL_FACTORS[currentMonth] || 1.0;
  const tempFactor = calculateTempFactor(currentTemp);

  // Calculate current lice level
  let currentLice = 0;
  if (history.length > 0) {
    currentLice = history[history.length - 1].value;
  }

  // Calculate trend
  const trend = calculateTrend(history);

  // Base growth rate (about 10-15% per week under normal conditions)
  const baseGrowthRate = 0.12;

  // Adjust growth rate based on factors
  let adjustedGrowthRate = baseGrowthRate * seasonalFactor * tempFactor;

  // Reduce growth if recent treatment was effective
  if (recentTreatments.length > 0) {
    const latestTreatment = recentTreatments[0];
    const daysSinceTreatment = Math.floor(
      (Date.now() - new Date(latestTreatment.completed_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceTreatment < 7) {
      // Treatment effect: reduce growth significantly in first week
      adjustedGrowthRate *= 0.3;
    } else if (daysSinceTreatment < 14) {
      // Partial recovery
      adjustedGrowthRate *= 0.6;
    }
  }

  // Use trend if we have good historical data (R² > 0.5)
  let predictedLice;
  let confidence;

  if (history.length >= 5 && trend.r2 > 0.5) {
    // Use linear regression prediction
    const predictedIndex = history.length + (daysAhead / 7); // Assuming weekly samples
    predictedLice = Math.max(0, trend.slope * predictedIndex + trend.intercept);
    confidence = 0.7 + (trend.r2 * 0.2); // 70-90% based on fit
  } else {
    // Use exponential growth model
    predictedLice = currentLice * Math.pow(1 + adjustedGrowthRate, daysAhead / 7);
    confidence = Math.max(0.5, 0.7 - (0.05 * (7 - Math.min(history.length, 7)))); // 50-70%
  }

  // Cap predictions at reasonable maximum
  predictedLice = Math.min(predictedLice, 3.0);

  // Calculate probability of exceeding limit
  const limit = currentMonth >= 4 && currentMonth <= 5 ? LICE_LIMITS.SPRING_LIMIT : LICE_LIMITS.ADULT_FEMALE_LIMIT;
  const distanceToLimit = limit - predictedLice;
  const probabilityExceedLimit = distanceToLimit <= 0 ? 0.95 :
    distanceToLimit < 0.1 ? 0.8 :
    distanceToLimit < 0.2 ? 0.5 :
    distanceToLimit < 0.3 ? 0.3 : 0.1;

  // Determine risk level
  let riskLevel;
  if (predictedLice >= LICE_LIMITS.CRITICAL_THRESHOLD || probabilityExceedLimit >= 0.9) {
    riskLevel = 'CRITICAL';
  } else if (predictedLice >= LICE_LIMITS.ADULT_FEMALE_LIMIT || probabilityExceedLimit >= 0.7) {
    riskLevel = 'HIGH';
  } else if (predictedLice >= LICE_LIMITS.WARNING_THRESHOLD || probabilityExceedLimit >= 0.4) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  // Determine recommended action
  let recommendedAction;
  if (riskLevel === 'CRITICAL') {
    recommendedAction = 'IMMEDIATE_TREATMENT';
  } else if (riskLevel === 'HIGH') {
    recommendedAction = 'SCHEDULE_TREATMENT';
  } else if (riskLevel === 'MEDIUM') {
    recommendedAction = 'MONITOR';
  } else {
    recommendedAction = 'NO_ACTION';
  }

  return {
    merdId,
    currentLice: Math.round(currentLice * 100) / 100,
    predictedLice: Math.round(predictedLice * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    probabilityExceedLimit: Math.round(probabilityExceedLimit * 100) / 100,
    riskLevel,
    recommendedAction,
    daysAhead,
    factors: {
      seasonalFactor: Math.round(seasonalFactor * 100) / 100,
      tempFactor: Math.round(tempFactor * 100) / 100,
      temperature: currentTemp,
      trendSlope: Math.round(trend.slope * 1000) / 1000,
      trendR2: Math.round(trend.r2 * 100) / 100,
      dataPoints: history.length,
      recentTreatments: recentTreatments.length
    }
  };
}

/**
 * Generate predictions for all merds
 */
async function generateAllPredictions(daysAhead = 7) {
  try {
    // Get all active merds
    const { rows: merds } = await pool.query(`
      SELECT id, merd_id, navn, lokalitet, lokalitetsnummer
      FROM merds
      WHERE is_active = true
    `);

    const predictions = [];

    for (const merd of merds) {
      const prediction = await calculateMerdPrediction(merd.id, daysAhead);
      predictions.push({
        ...prediction,
        merdName: merd.navn,
        externalMerdId: merd.merd_id,
        locality: merd.lokalitet,
        localityNumber: merd.lokalitetsnummer
      });
    }

    return predictions;
  } catch (error) {
    logger.error('Failed to generate predictions', { error: error.message });
    throw error;
  }
}

/**
 * Store predictions in database
 */
async function storePredictions(predictions) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const pred of predictions) {
      await client.query(`
        INSERT INTO predictions (
          merd_id, prediction_date, target_date, days_ahead,
          current_lice, predicted_lice, confidence,
          probability_exceed_limit, risk_level, recommended_action,
          model_version, factors
        ) VALUES (
          $1, NOW(), CURRENT_DATE + INTERVAL '${pred.daysAhead} days', $2,
          $3, $4, $5, $6, $7, $8, $9, $10
        )
      `, [
        pred.merdId,
        pred.daysAhead,
        pred.currentLice,
        pred.predictedLice,
        pred.confidence,
        pred.probabilityExceedLimit,
        pred.riskLevel,
        pred.recommendedAction,
        'statistical-v1.0',
        JSON.stringify(pred.factors)
      ]);
    }

    await client.query('COMMIT');
    logger.info('Stored predictions', { count: predictions.length });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to store predictions', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Calculate risk score for a merd
 */
async function calculateRiskScore(merdId) {
  const prediction = await calculateMerdPrediction(merdId, 7);

  // Get mortality data
  let mortalityScore = 20; // Default low
  try {
    const { rows } = await pool.query(`
      SELECT
        SUM(count) as total_mortality,
        AVG(count) as avg_mortality
      FROM mortality_records
      WHERE merd_id = $1
        AND date >= CURRENT_DATE - INTERVAL '7 days'
    `, [merdId]);

    if (rows[0]?.avg_mortality) {
      const avgMortality = parseFloat(rows[0].avg_mortality);
      mortalityScore = Math.min(100, avgMortality * 10); // Scale
    }
  } catch (error) {
    // Use default
  }

  // Get environment score
  let environmentScore = 80; // Default good
  try {
    const { rows } = await pool.query(`
      SELECT
        temperature_celsius,
        oxygen_percent
      FROM environment_readings
      WHERE merd_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `, [merdId]);

    if (rows[0]) {
      const temp = rows[0].temperature_celsius;
      const oxygen = rows[0].oxygen_percent;

      // Temperature score (optimal 8-14°C)
      let tempScore = 100;
      if (temp < 4 || temp > 18) tempScore = 50;
      else if (temp < 6 || temp > 16) tempScore = 70;
      else if (temp < 8 || temp > 14) tempScore = 85;

      // Oxygen score (optimal >90%)
      let oxygenScore = 100;
      if (oxygen < 60) oxygenScore = 30;
      else if (oxygen < 70) oxygenScore = 50;
      else if (oxygen < 80) oxygenScore = 70;
      else if (oxygen < 90) oxygenScore = 85;

      environmentScore = Math.round((tempScore + oxygenScore) / 2);
    }
  } catch (error) {
    // Use default
  }

  // Lice score from prediction
  const liceScore = Math.round(prediction.probabilityExceedLimit * 100);

  // Treatment score (how well-managed)
  let treatmentScore = 50;
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) as treatment_count,
        AVG(effectiveness_percent) as avg_effectiveness
      FROM treatments
      WHERE merd_id = $1
        AND status = 'COMPLETED'
        AND completed_date >= CURRENT_DATE - INTERVAL '30 days'
    `, [merdId]);

    if (rows[0]?.avg_effectiveness) {
      treatmentScore = Math.round(rows[0].avg_effectiveness);
    }
  } catch (error) {
    // Use default
  }

  // Calculate overall score (weighted average)
  const weights = {
    lice: 0.4,
    mortality: 0.2,
    environment: 0.2,
    treatment: 0.2
  };

  const overallScore = Math.round(
    liceScore * weights.lice +
    mortalityScore * weights.mortality +
    (100 - environmentScore) * weights.environment + // Invert: lower env score = higher risk
    (100 - treatmentScore) * weights.treatment // Invert: lower treatment score = higher risk
  );

  // Determine risk level
  let riskLevel;
  if (overallScore >= 70) riskLevel = 'CRITICAL';
  else if (overallScore >= 50) riskLevel = 'HIGH';
  else if (overallScore >= 30) riskLevel = 'MODERATE';
  else riskLevel = 'LOW';

  return {
    merdId,
    overallScore,
    liceScore,
    mortalityScore,
    environmentScore,
    treatmentScore,
    riskLevel,
    calculatedAt: new Date().toISOString()
  };
}

// ========== HELPER FUNCTIONS FOR TESTING ==========

/**
 * Get seasonal multiplier for a given month (0-11)
 */
function calculateSeasonalMultiplier(month) {
  // Convert 0-indexed month to 1-indexed for SEASONAL_FACTORS
  const monthKey = month + 1;
  return SEASONAL_FACTORS[monthKey] || 1.0;
}

/**
 * Calculate temperature effect on lice growth
 */
function calculateTemperatureEffect(temperature) {
  return calculateTempFactor(temperature);
}

/**
 * Calculate risk level from lice counts
 */
function calculateRiskLevelFromLice(currentLice, predictedLice) {
  if (predictedLice >= LICE_LIMITS.CRITICAL_THRESHOLD || currentLice >= LICE_LIMITS.CRITICAL_THRESHOLD) {
    return 'CRITICAL';
  } else if (predictedLice >= LICE_LIMITS.ADULT_FEMALE_LIMIT || currentLice >= LICE_LIMITS.ADULT_FEMALE_LIMIT) {
    return 'HIGH';
  } else if (predictedLice >= LICE_LIMITS.WARNING_THRESHOLD || currentLice >= LICE_LIMITS.WARNING_THRESHOLD) {
    return 'MEDIUM';
  } else {
    return 'LOW';
  }
}

/**
 * Predict lice growth over time
 */
function predictLiceGrowth({ currentLice, temperature, daysAhead, month = new Date().getMonth() }) {
  const tempFactor = calculateTempFactor(temperature);
  const seasonalFactor = SEASONAL_FACTORS[month + 1] || 1.0;
  const baseGrowthRate = 0.12; // 12% per week

  const adjustedGrowthRate = baseGrowthRate * seasonalFactor * tempFactor;
  const predictedLice = currentLice * Math.pow(1 + adjustedGrowthRate, daysAhead / 7);

  return {
    predictedLice: Math.min(predictedLice, 3.0),
    growthRate: adjustedGrowthRate,
    tempFactor,
    seasonalFactor
  };
}

/**
 * Calculate risk score from parameters
 */
function calculateRiskScoreFromParams({ currentLice, predictedLice, trend, treatmentDue }) {
  let score = 0;

  // Lice contribution (40%)
  const liceContrib = Math.min(100, (predictedLice / LICE_LIMITS.ADULT_FEMALE_LIMIT) * 100);
  score += liceContrib * 0.4;

  // Trend contribution (20%)
  const trendContrib = Math.min(100, Math.max(0, 50 + trend * 500));
  score += trendContrib * 0.2;

  // Current lice contribution (25%)
  const currentContrib = Math.min(100, (currentLice / LICE_LIMITS.ADULT_FEMALE_LIMIT) * 100);
  score += currentContrib * 0.25;

  // Treatment urgency (15%)
  if (treatmentDue) {
    score += 15;
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Check if date is in spring period (stricter limits)
 */
function isSpringPeriod(date = new Date()) {
  const month = date.getMonth();
  const day = date.getDate();

  // Spring period: March 15 - June 30 (roughly week 11-26)
  if (month === 2 && day >= 15) return true; // March 15+
  if (month === 3) return true; // April
  if (month === 4) return true; // May
  if (month === 5) return true; // June
  return false;
}

/**
 * Get applicable lice limit based on date
 */
function getLiceLimit(date = new Date()) {
  return isSpringPeriod(date) ? LICE_LIMITS.SPRING_LIMIT : LICE_LIMITS.ADULT_FEMALE_LIMIT;
}

module.exports = {
  // Main functions
  calculateMerdPrediction,
  generateAllPredictions,
  storePredictions,
  calculateRiskScore,

  // Helper functions (for testing)
  calculateSeasonalMultiplier,
  calculateTemperatureEffect,
  calculateRiskLevel: calculateRiskLevelFromLice,
  predictLiceGrowth,
  calculateRiskScore: calculateRiskScoreFromParams,
  isSpringPeriod,
  getLiceLimit,

  // Constants
  LICE_LIMITS,
  SEASONAL_FACTORS
};
