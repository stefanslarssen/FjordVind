/**
 * Prediction Scheduler
 * Runs prediction generation on a schedule
 *
 * Default: Daily at 06:00 Norwegian time
 */

const predictionService = require('../services/predictions');
const logger = require('../utils/logger');

let schedulerInterval = null;
const HOURS_BETWEEN_RUNS = 24;
const TARGET_HOUR = 6; // 06:00

/**
 * Run prediction generation
 */
async function runPredictions() {
  logger.info('Starting scheduled prediction generation');

  try {
    // Generate 7-day predictions
    const predictions7d = await predictionService.generateAllPredictions(7);
    await predictionService.storePredictions(predictions7d);

    // Generate 14-day predictions
    const predictions14d = await predictionService.generateAllPredictions(14);
    await predictionService.storePredictions(predictions14d);

    logger.info('Scheduled prediction generation complete', {
      predictions7d: predictions7d.length,
      predictions14d: predictions14d.length,
      criticalCount: predictions7d.filter(p => p.riskLevel === 'CRITICAL').length,
      highCount: predictions7d.filter(p => p.riskLevel === 'HIGH').length
    });

    // Check for critical predictions and trigger alerts
    const criticalPredictions = predictions7d.filter(p => p.riskLevel === 'CRITICAL');
    if (criticalPredictions.length > 0) {
      logger.warn('Critical lice predictions detected', {
        count: criticalPredictions.length,
        merds: criticalPredictions.map(p => p.merdName || p.merdId)
      });

      // TODO: Trigger alert notifications
      // await alertService.createPredictionAlerts(criticalPredictions);
    }

    return {
      success: true,
      predictions7d: predictions7d.length,
      predictions14d: predictions14d.length
    };
  } catch (error) {
    logger.error('Scheduled prediction generation failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Calculate milliseconds until next target hour
 */
function msUntilNextRun() {
  const now = new Date();
  const next = new Date(now);

  next.setHours(TARGET_HOUR, 0, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
}

/**
 * Start the scheduler
 */
function start() {
  if (schedulerInterval) {
    logger.warn('Prediction scheduler already running');
    return;
  }

  // Run immediately on startup if in production
  if (process.env.NODE_ENV === 'production') {
    logger.info('Running initial prediction generation');
    runPredictions().catch(err => {
      logger.error('Initial prediction run failed', { error: err.message });
    });
  }

  // Schedule next run
  const msToNext = msUntilNextRun();
  logger.info('Prediction scheduler started', {
    nextRunIn: Math.round(msToNext / 1000 / 60) + ' minutes',
    targetHour: TARGET_HOUR + ':00'
  });

  // First timeout to align with target hour
  setTimeout(() => {
    runPredictions();

    // Then run every 24 hours
    schedulerInterval = setInterval(() => {
      runPredictions();
    }, HOURS_BETWEEN_RUNS * 60 * 60 * 1000);
  }, msToNext);
}

/**
 * Stop the scheduler
 */
function stop() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('Prediction scheduler stopped');
  }
}

/**
 * Get scheduler status
 */
function getStatus() {
  return {
    running: schedulerInterval !== null,
    targetHour: TARGET_HOUR + ':00',
    intervalHours: HOURS_BETWEEN_RUNS,
    nextRunIn: schedulerInterval ? Math.round(msUntilNextRun() / 1000 / 60) + ' minutes' : 'N/A'
  };
}

module.exports = {
  start,
  stop,
  getStatus,
  runPredictions // Export for manual trigger
};
