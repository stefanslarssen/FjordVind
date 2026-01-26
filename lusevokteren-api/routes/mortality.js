// Mortality routes for FjordVind/Lusevokteren
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Demo data for causes when DB is not available
const DEMO_MORTALITY_CAUSES = [
  { id: 1, cause_name: 'Naturlig dødelighet', category: 'normal' },
  { id: 2, cause_name: 'Ukjent årsak', category: 'normal' },
  { id: 3, cause_name: 'Avlusning - mekanisk', category: 'behandling' },
  { id: 4, cause_name: 'Avlusning - termisk', category: 'behandling' },
  { id: 5, cause_name: 'Avlusning - medisinsk', category: 'behandling' },
  { id: 6, cause_name: 'Ferskvannsbehandling', category: 'behandling' },
  { id: 7, cause_name: 'Vaksinering', category: 'behandling' },
  { id: 8, cause_name: 'PD (Pancreas Disease)', category: 'sykdom' },
  { id: 9, cause_name: 'ILA (Infeksiøs lakseanemi)', category: 'sykdom' },
  { id: 10, cause_name: 'CMS (Hjertesprekk)', category: 'sykdom' },
  { id: 11, cause_name: 'AGD (Amøbegjellesykdom)', category: 'sykdom' },
  { id: 12, cause_name: 'Vintersår', category: 'sykdom' },
  { id: 13, cause_name: 'Bakteriell infeksjon', category: 'sykdom' },
  { id: 14, cause_name: 'Parasitter', category: 'sykdom' },
  { id: 15, cause_name: 'Trenging', category: 'håndtering' },
  { id: 16, cause_name: 'Sortering', category: 'håndtering' },
  { id: 17, cause_name: 'Transport', category: 'håndtering' },
  { id: 18, cause_name: 'Notskifte', category: 'håndtering' },
  { id: 19, cause_name: 'Sel', category: 'predator' },
  { id: 20, cause_name: 'Oter', category: 'predator' },
  { id: 21, cause_name: 'Fugl', category: 'predator' },
  { id: 22, cause_name: 'Algeoppblomstring', category: 'miljø' },
  { id: 23, cause_name: 'Manet', category: 'miljø' },
  { id: 24, cause_name: 'Oksygenmangel', category: 'miljø' },
  { id: 25, cause_name: 'Temperaturstress', category: 'miljø' },
  { id: 26, cause_name: 'Rømming (gjenfanget død)', category: 'annet' },
  { id: 27, cause_name: 'Annet', category: 'annet' }
];

/**
 * GET /api/mortality/causes - Get all mortality causes
 */
router.get('/causes', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM mortality_causes WHERE is_active = true ORDER BY category, cause_name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching mortality causes:', error);
    if (error.code === 'ECONNREFUSED' || error.message?.includes('connect')) {
      res.json(DEMO_MORTALITY_CAUSES);
    } else {
      res.status(500).json({ error: 'Kunne ikke hente årsaker' });
    }
  }
});

/**
 * GET /api/mortality/by-date - Get records for a specific date
 */
router.get('/by-date', async (req, res) => {
  const { localityId, date } = req.query;

  try {
    const result = await pool.query(`
      SELECT
        mr.*,
        m.name as merd_name
      FROM mortality_records mr
      JOIN merds m ON mr.merd_id = m.id
      WHERE m.locality_id = $1 AND mr.record_date = $2
      ORDER BY m.name
    `, [localityId, date]);

    const records = result.rows.map(r => ({
      id: r.id,
      merdId: r.merd_id,
      merdName: r.merd_name,
      recordDate: r.record_date,
      salmonDead: r.salmon_dead || 0,
      salmonCause: r.salmon_cause,
      salmonNotes: r.salmon_notes,
      cleanerFishDead: r.cleaner_fish_dead || 0,
      cleanerFishType: r.cleaner_fish_type,
      cleanerFishCause: r.cleaner_fish_cause,
      mortalityCategory: r.mortality_category
    }));

    res.json(records);
  } catch (error) {
    console.error('Error fetching mortality by date:', error);
    if (error.code === 'ECONNREFUSED' || error.message?.includes('connect')) {
      res.json([]);
    } else {
      res.status(500).json({ error: 'Kunne ikke hente registreringer' });
    }
  }
});

/**
 * GET /api/mortality/summary - Get summary for period
 */
router.get('/summary', async (req, res) => {
  const { localityId, startDate, endDate } = req.query;

  try {
    const result = await pool.query(`
      SELECT
        mortality_category,
        SUM(salmon_dead) as total_salmon,
        SUM(cleaner_fish_dead) as total_cleaner_fish,
        COUNT(DISTINCT record_date) as days_with_mortality
      FROM mortality_records mr
      JOIN merds m ON mr.merd_id = m.id
      WHERE m.locality_id = $1
        AND mr.record_date BETWEEN $2 AND $3
      GROUP BY mortality_category
    `, [localityId, startDate, endDate]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching mortality summary:', error);
    if (error.code === 'ECONNREFUSED' || error.message?.includes('connect')) {
      res.json([]);
    } else {
      res.status(500).json({ error: 'Kunne ikke hente oppsummering' });
    }
  }
});

/**
 * GET /api/mortality - List all mortality records with filters
 */
router.get('/', async (req, res) => {
  try {
    const { merdId, fromDate, toDate } = req.query;

    let query = `
      SELECT mr.*, m.name as cage_name, l.name as location_name
      FROM mortality_records mr
      LEFT JOIN merds m ON mr.merd_id = m.id
      LEFT JOIN user_localities l ON m.locality_id = l.id
      WHERE 1=1
    `;
    const params = [];

    if (merdId) {
      params.push(merdId);
      query += ` AND mr.merd_id = $${params.length}`;
    }

    if (fromDate) {
      params.push(fromDate);
      query += ` AND mr.record_date >= $${params.length}`;
    }

    if (toDate) {
      params.push(toDate);
      query += ` AND mr.record_date <= $${params.length}`;
    }

    query += ' ORDER BY mr.record_date DESC, mr.created_at DESC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching mortality records:', error);
    if (error.code === 'ECONNREFUSED' || error.message?.includes('connect')) {
      res.json([]);
    } else {
      res.status(500).json({ error: 'Kunne ikke hente dødlighetsdata' });
    }
  }
});

/**
 * POST /api/mortality/batch - Save multiple records (upsert)
 */
router.post('/batch', async (req, res) => {
  const { date, localityId, records } = req.body;

  if (!date || !records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'date og records array er påkrevd' });
  }

  try {
    let userId = req.user?.id;
    if (!userId) {
      const { rows: users } = await pool.query('SELECT id FROM users LIMIT 1');
      userId = users[0]?.id;
    }

    const savedRecords = [];
    for (const record of records) {
      if ((record.salmonDead || 0) === 0 && (record.cleanerFishDead || 0) === 0) continue;

      const result = await pool.query(`
        INSERT INTO mortality_records (
          merd_id, record_date, salmon_dead, salmon_cause, salmon_notes,
          cleaner_fish_dead, cleaner_fish_type, cleaner_fish_cause,
          mortality_category, registered_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (merd_id, record_date)
        DO UPDATE SET
          salmon_dead = EXCLUDED.salmon_dead,
          salmon_cause = EXCLUDED.salmon_cause,
          salmon_notes = EXCLUDED.salmon_notes,
          cleaner_fish_dead = EXCLUDED.cleaner_fish_dead,
          cleaner_fish_type = EXCLUDED.cleaner_fish_type,
          cleaner_fish_cause = EXCLUDED.cleaner_fish_cause,
          mortality_category = EXCLUDED.mortality_category,
          updated_at = NOW()
        RETURNING id
      `, [
        record.merdId,
        date,
        record.salmonDead || 0,
        record.salmonCause || null,
        record.salmonNotes || null,
        record.cleanerFishDead || 0,
        record.cleanerFishType || null,
        record.cleanerFishCause || null,
        record.mortalityCategory || 'normal',
        userId
      ]);

      savedRecords.push({
        id: result.rows[0].id,
        merdId: record.merdId,
        salmonDead: record.salmonDead || 0,
        cleanerFishDead: record.cleanerFishDead || 0
      });
    }

    const totalSalmon = savedRecords.reduce((sum, r) => sum + r.salmonDead, 0);
    const totalCleanerFish = savedRecords.reduce((sum, r) => sum + r.cleanerFishDead, 0);

    res.json({
      success: true,
      count: savedRecords.length,
      summary: {
        totalSalmon,
        totalCleanerFish,
        total: totalSalmon + totalCleanerFish
      }
    });
  } catch (error) {
    console.error('Error saving mortality batch:', error);

    const isConnectionError =
      error.code === 'ECONNREFUSED' ||
      error.name === 'AggregateError' ||
      error.message?.includes('connect') ||
      error.message?.includes('ECONNREFUSED');

    if (isConnectionError) {
      const totalSalmon = records.reduce((sum, r) => sum + (r.salmonDead || 0), 0);
      const totalCleanerFish = records.reduce((sum, r) => sum + (r.cleanerFishDead || 0), 0);

      res.json({
        success: true,
        count: records.filter(r => (r.salmonDead || 0) > 0 || (r.cleanerFishDead || 0) > 0).length,
        summary: { totalSalmon, totalCleanerFish, total: totalSalmon + totalCleanerFish },
        _demo: true
      });
    } else {
      res.status(500).json({ error: 'Kunne ikke lagre registreringer' });
    }
  }
});

module.exports = router;
