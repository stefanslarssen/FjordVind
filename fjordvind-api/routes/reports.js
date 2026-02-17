// Reports Routes - Scheduling and PDF Generation

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const pdfGenerator = require('../services/pdfGenerator');
const logger = require('../utils/logger');

// Store for scheduled reports
const scheduledReports = {};

// ========== PDF GENERATION ==========

// Generate Mattilsynet report PDF
router.get('/pdf/mattilsynet', requireAuth, async (req, res) => {
  try {
    const { locationId, startDate, endDate } = req.query;
    const user = req.user;

    logger.info('Generating Mattilsynet PDF report', { userId: user.id, locationId });

    const pdfBuffer = await pdfGenerator.generateMattilsynetReport({
      locationId,
      startDate,
      endDate,
      companyName: user.company_name || 'FjordVind AS',
      locationName: req.query.locationName || 'Alle lokaliteter'
    });

    const weekNumber = pdfGenerator.getWeekNumber(new Date());
    const year = new Date().getFullYear();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Mattilsynet_Uke${weekNumber}_${year}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Error generating Mattilsynet PDF', { error: error.message });
    res.status(500).json({ error: 'Kunne ikke generere PDF' });
  }
});

// Generate treatment report PDF
router.get('/pdf/treatment', requireAuth, async (req, res) => {
  try {
    const { locationId, startDate, endDate } = req.query;
    const user = req.user;

    logger.info('Generating treatment PDF report', { userId: user.id });

    const pdfBuffer = await pdfGenerator.generateTreatmentReport({
      locationId,
      startDate,
      endDate,
      companyName: user.company_name || 'FjordVind AS'
    });

    const dateStr = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Behandlingsrapport_${dateStr}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Error generating treatment PDF', { error: error.message });
    res.status(500).json({ error: 'Kunne ikke generere PDF' });
  }
});

// Generate lice summary report PDF
router.get('/pdf/lice', requireAuth, async (req, res) => {
  try {
    const { locationId, startDate, endDate } = req.query;

    logger.info('Generating lice PDF report', { userId: req.user.id });

    const pdfBuffer = await pdfGenerator.generateLiceSummaryReport({
      locationId,
      startDate,
      endDate
    });

    const dateStr = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Luserapport_${dateStr}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Error generating lice PDF', { error: error.message });
    res.status(500).json({ error: 'Kunne ikke generere PDF' });
  }
});

// ========== REPORT SCHEDULING ==========

// Helper function to calculate next run time
function calculateNextRun(dayOfWeek, time) {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const targetDay = dayOfWeek; // 0=Sunday, 1=Monday, etc.

  const daysUntilTarget = (targetDay - now.getDay() + 7) % 7 || 7;
  const nextRun = new Date(now);
  nextRun.setDate(now.getDate() + daysUntilTarget);
  nextRun.setHours(hours, minutes, 0, 0);

  // If it's the same day but time has passed, add 7 days
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 7);
  }

  return nextRun.toISOString();
}

// Schedule automatic weekly report
router.post('/schedule', async (req, res) => {
  try {
    const { userId, locationId, dayOfWeek, time, recipients, format } = req.body;

    if (!userId || !locationId) {
      return res.status(400).json({ error: 'userId og locationId er påkrevd' });
    }

    const scheduleId = `sched_${Date.now()}`;
    scheduledReports[scheduleId] = {
      id: scheduleId,
      userId,
      locationId,
      dayOfWeek: dayOfWeek || 1, // Monday
      time: time || '08:00',
      recipients: recipients || [],
      format: format || 'pdf',
      enabled: true,
      createdAt: new Date().toISOString(),
      lastRun: null,
      nextRun: calculateNextRun(dayOfWeek || 1, time || '08:00')
    };

    console.log(`Report scheduled: ${scheduleId}`);

    res.json({
      success: true,
      scheduleId,
      schedule: scheduledReports[scheduleId]
    });
  } catch (error) {
    console.error('Error scheduling report:', error);
    res.status(500).json({ error: 'Kunne ikke planlegge rapport' });
  }
});

// Get scheduled reports
router.get('/schedules', async (req, res) => {
  try {
    const { userId, locationId } = req.query;

    let schedules = Object.values(scheduledReports);

    if (userId) {
      schedules = schedules.filter(s => s.userId === userId);
    }
    if (locationId) {
      schedules = schedules.filter(s => s.locationId === locationId);
    }

    res.json({ schedules });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Kunne ikke hente planlagte rapporter' });
  }
});

// Update scheduled report
router.put('/schedule/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const updates = req.body;

    if (!scheduledReports[scheduleId]) {
      return res.status(404).json({ error: 'Planlagt rapport ikke funnet' });
    }

    scheduledReports[scheduleId] = {
      ...scheduledReports[scheduleId],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (updates.dayOfWeek || updates.time) {
      scheduledReports[scheduleId].nextRun = calculateNextRun(
        scheduledReports[scheduleId].dayOfWeek,
        scheduledReports[scheduleId].time
      );
    }

    res.json({
      success: true,
      schedule: scheduledReports[scheduleId]
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Kunne ikke oppdatere planlagt rapport' });
  }
});

// Delete scheduled report
router.delete('/schedule/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;

    if (!scheduledReports[scheduleId]) {
      return res.status(404).json({ error: 'Planlagt rapport ikke funnet' });
    }

    delete scheduledReports[scheduleId];

    res.json({
      success: true,
      message: 'Planlagt rapport slettet'
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: 'Kunne ikke slette planlagt rapport' });
  }
});

module.exports = router;
