// Sample/Lice Count routes for FjordVind
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { validateDate } = require('../utils/validation');

// Demo data for fallback
const DEMO_SAMPLES = [
  { id: 'demo-1', sample_id: 'SAMPLE-001', date: new Date().toISOString().slice(0, 10), location_name: 'Nordfjorden', cage_id: 'Merd A1', fish_examined: 20, mobile_lice: 12, attached_lice: 5, adult_female_lice: 8, avg_adult_female: 0.40, temperature: 12.5, notes: 'Normal telling' },
  { id: 'demo-2', sample_id: 'SAMPLE-002', date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), location_name: 'Nordfjorden', cage_id: 'Merd A2', fish_examined: 20, mobile_lice: 8, attached_lice: 3, adult_female_lice: 5, avg_adult_female: 0.25, temperature: 12.3, notes: null },
  { id: 'demo-3', sample_id: 'SAMPLE-003', date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10), location_name: 'Hardangerfjorden', cage_id: 'Merd M1', fish_examined: 20, mobile_lice: 18, attached_lice: 8, adult_female_lice: 12, avg_adult_female: 0.60, temperature: 11.8, notes: 'Hoyt nivå' },
  { id: 'demo-4', sample_id: 'SAMPLE-004', date: new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10), location_name: 'Hardangerfjorden', cage_id: 'Merd M2', fish_examined: 20, mobile_lice: 5, attached_lice: 2, adult_female_lice: 3, avg_adult_female: 0.15, temperature: 11.5, notes: null },
  { id: 'demo-5', sample_id: 'SAMPLE-005', date: new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10), location_name: 'Nordfjorden', cage_id: 'Merd B1', fish_examined: 20, mobile_lice: 4, attached_lice: 1, adult_female_lice: 2, avg_adult_female: 0.10, temperature: 12.0, notes: 'Lavt nivå' },
];

// In-memory store for demo samples
const demoSamplesStore = [];

// Demo merds for fallback
const DEMO_MERDS = [
  { id: 'merd-1', lokalitet: 'Nordfjorden', cage_name: 'Merd A1', name: 'Merd A1' },
  { id: 'merd-2', lokalitet: 'Nordfjorden', cage_name: 'Merd A2', name: 'Merd A2' },
  { id: 'merd-3', lokalitet: 'Hardangerfjorden', cage_name: 'Merd M1', name: 'Merd M1' },
];

/**
 * GET /api/samples - List samples with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { locationId, fromDate, toDate } = req.query;

    let query = `
      SELECT
        s.*,
        m.name as merd_navn,
        ul.name as lokalitet,
        (SELECT json_agg(json_build_object(
          'voksne_hunnlus', voksne_hunnlus,
          'bevegelige_lus', bevegelige_lus,
          'fastsittende_lus', fastsittende_lus
        )) FROM fish_observations WHERE sample_id = s.id) as fish_observations
      FROM samples s
      JOIN merds m ON s.merd_id = m.id
      LEFT JOIN user_localities ul ON m.locality_id = ul.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (locationId) {
      query += ` AND ul.name = $${paramCount}`;
      params.push(locationId);
      paramCount++;
    }

    if (fromDate) {
      query += ` AND s.dato >= $${paramCount}`;
      params.push(fromDate);
      paramCount++;
    }

    if (toDate) {
      query += ` AND s.dato <= $${paramCount}`;
      params.push(toDate);
      paramCount++;
    }

    query += ' ORDER BY s.dato DESC LIMIT 500';

    const { rows } = await pool.query(query, params);

    // Transform to match frontend format
    const transformed = rows.map(sample => {
      const observations = sample.fish_observations || [];
      const totalVoksneHunnlus = observations.reduce((sum, f) => sum + (f.voksne_hunnlus || 0), 0);
      const totalBevegeligeLus = observations.reduce((sum, f) => sum + (f.bevegelige_lus || 0), 0);
      const totalFastsittendeLus = observations.reduce((sum, f) => sum + (f.fastsittende_lus || 0), 0);
      const avgVoksneHunnlus = sample.antall_fisk > 0 ? totalVoksneHunnlus / sample.antall_fisk : 0;

      return {
        id: sample.id,
        sample_id: sample.sample_id,
        date: sample.dato,
        created_at: sample.created_at,
        location_name: sample.lokalitet || 'Ukjent',
        cage_id: sample.merd_navn || 'Ukjent',
        fish_examined: sample.antall_fisk,
        mobile_lice: totalBevegeligeLus,
        attached_lice: totalFastsittendeLus,
        adult_female_lice: totalVoksneHunnlus,
        avg_adult_female: Number(avgVoksneHunnlus.toFixed(3)),
        temperature: sample.temperatur,
        notes: sample.notat,
      };
    });

    res.json(transformed);
  } catch (error) {
    console.error('Error fetching samples:', error);
    // Return demo samples as fallback
    const allDemoSamples = [...DEMO_SAMPLES, ...demoSamplesStore].sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );

    let filtered = allDemoSamples;
    const { locationId, fromDate, toDate } = req.query;

    if (locationId) {
      filtered = filtered.filter(s => s.location_name === locationId);
    }
    if (fromDate) {
      filtered = filtered.filter(s => s.date >= fromDate);
    }
    if (toDate) {
      filtered = filtered.filter(s => s.date <= toDate);
    }

    res.json(filtered.map(s => ({ ...s, _demo: true })));
  }
});

/**
 * POST /api/samples - Create new sample (lice count)
 */
router.post('/', async (req, res) => {
  try {
    const { merdId, dato, tidspunkt, temperatur, dodfisk, notat, observations } = req.body;

    // Validation
    const errors = [];

    if (!merdId) errors.push('merdId er påkrevd');
    if (!dato) errors.push('dato er påkrevd');
    if (!observations || !Array.isArray(observations)) {
      errors.push('observations må være en array');
    } else if (observations.length === 0) {
      errors.push('observations kan ikke være tom - minst 1 fisk må registreres');
    } else if (observations.length > 100) {
      errors.push('Maksimalt 100 fisk per telling');
    }

    // Date validation
    if (dato) {
      const dateResult = validateDate(dato, 'dato');
      errors.push(...dateResult.errors);

      const inputDate = new Date(dato);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (inputDate > today) {
        errors.push('dato kan ikke være i fremtiden');
      }
    }

    // Temperature validation
    if (temperatur !== undefined && temperatur !== null && temperatur !== '') {
      const temp = parseFloat(temperatur);
      if (isNaN(temp)) {
        errors.push('temperatur må være et tall');
      } else if (temp < -2 || temp > 30) {
        errors.push('temperatur må være mellom -2 og 30 grader');
      }
    }

    // Dead fish validation
    if (dodfisk !== undefined && dodfisk !== null) {
      const dead = parseInt(dodfisk);
      if (isNaN(dead) || dead < 0) {
        errors.push('dodfisk må være et positivt heltall');
      }
    }

    // Validate observations
    if (observations && Array.isArray(observations)) {
      observations.forEach((obs, index) => {
        if (!obs.fishId) {
          errors.push(`Fisk ${index + 1}: fishId er påkrevd`);
        }
        const voksne = parseInt(obs.voksneHunnlus || 0);
        const bevegelige = parseInt(obs.bevegeligeLus || 0);
        const fastsittende = parseInt(obs.fastsittendeLus || 0);

        if (voksne < 0 || bevegelige < 0 || fastsittende < 0) {
          errors.push(`Fisk ${index + 1}: lusetall kan ikke være negative`);
        }
        if (voksne > 50 || bevegelige > 100 || fastsittende > 100) {
          errors.push(`Fisk ${index + 1}: urimelig høye lusetall - vennligst verifiser`);
        }
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valideringsfeil', errors }
      });
    }

    // Generate sample ID
    const sampleId = `SAMPLE-${Date.now()}`;

    // Get user ID
    let rokterId = req.user?.id;
    if (!rokterId) {
      const { rows: users } = await pool.query('SELECT id FROM users LIMIT 1');
      rokterId = users[0]?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    }

    // Insert sample
    const sampleQuery = `
      INSERT INTO samples (sample_id, merd_id, røkter_id, dato, tidspunkt, antall_fisk, temperatur, dodfisk, notat, synced)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
      RETURNING id
    `;

    const { rows: [sample] } = await pool.query(sampleQuery, [
      sampleId,
      merdId,
      rokterId,
      dato,
      tidspunkt || null,
      observations.length,
      temperatur || null,
      dodfisk || 0,
      notat || null
    ]);

    // Insert fish observations
    for (const obs of observations) {
      await pool.query(`
        INSERT INTO fish_observations (fish_id, sample_id, voksne_hunnlus, bevegelige_lus, fastsittende_lus)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        obs.fishId,
        sample.id,
        obs.voksneHunnlus || 0,
        obs.bevegeligeLus || 0,
        obs.fastsittendeLus || 0
      ]);
    }

    // Calculate stats for response
    const totalVoksneHunnlus = observations.reduce((sum, o) => sum + (o.voksneHunnlus || 0), 0);
    const avgVoksneHunnlus = observations.length > 0 ? totalVoksneHunnlus / observations.length : 0;

    res.status(201).json({
      id: sample.id,
      sample_id: sampleId,
      date: dato,
      fish_examined: observations.length,
      adult_female_lice: totalVoksneHunnlus,
      avg_adult_female: Number(avgVoksneHunnlus.toFixed(3)),
      dead_fish: dodfisk || 0,
      message: 'Telling lagret'
    });
  } catch (error) {
    console.error('Error creating sample:', error);

    // Demo mode fallback
    if (error.code === 'ECONNREFUSED' || error.message?.includes('connect')) {
      const { merdId, dato, temperatur, dodfisk, notat, observations = [] } = req.body;
      const totalVoksneHunnlus = observations.reduce((sum, o) => sum + (o.voksneHunnlus || 0), 0);
      const totalBevegeligeLus = observations.reduce((sum, o) => sum + (o.bevegeligeLus || 0), 0);
      const totalFastsittendeLus = observations.reduce((sum, o) => sum + (o.fastsittendeLus || 0), 0);
      const avgVoksneHunnlus = observations.length > 0 ? totalVoksneHunnlus / observations.length : 0;

      const merd = DEMO_MERDS.find(m => m.id === merdId) || { lokalitet: 'Ukjent', cage_name: 'Ukjent' };

      const newSample = {
        id: `demo-${Date.now()}`,
        sample_id: `SAMPLE-${Date.now()}`,
        date: dato,
        location_name: merd.lokalitet,
        cage_id: merd.cage_name || merd.name,
        fish_examined: observations.length,
        mobile_lice: totalBevegeligeLus,
        attached_lice: totalFastsittendeLus,
        adult_female_lice: totalVoksneHunnlus,
        avg_adult_female: Number(avgVoksneHunnlus.toFixed(3)),
        dead_fish: dodfisk || 0,
        temperature: temperatur || null,
        notes: notat || null,
        created_at: new Date().toISOString()
      };

      demoSamplesStore.push(newSample);

      res.status(201).json({
        ...newSample,
        message: 'Telling lagret (demo)',
        _demo: true
      });
    } else {
      res.status(500).json({ error: 'Kunne ikke lagre tellingen' });
    }
  }
});

/**
 * PUT /api/samples/:id - Update sample
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { dato, temperatur, dodfisk, notat } = req.body;

    const updateQuery = `
      UPDATE samples
      SET dato = COALESCE($1, dato),
          temperatur = COALESCE($2, temperatur),
          dodfisk = COALESCE($3, dodfisk),
          notat = COALESCE($4, notat)
      WHERE id = $5
      RETURNING *
    `;

    const { rows } = await pool.query(updateQuery, [dato, temperatur, dodfisk, notat, id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Sample not found' });
    }

    res.json({ message: 'Sample updated', sample: rows[0] });
  } catch (error) {
    console.error('Error updating sample:', error);
    res.status(500).json({ error: 'Could not update sample' });
  }
});

/**
 * DELETE /api/samples/:id - Delete sample
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First delete fish observations
    await pool.query('DELETE FROM fish_observations WHERE sample_id = $1', [id]);

    // Then delete the sample
    const { rowCount } = await pool.query('DELETE FROM samples WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Sample not found' });
    }

    res.json({ message: 'Sample deleted' });
  } catch (error) {
    console.error('Error deleting sample:', error);
    res.status(500).json({ error: 'Could not delete sample' });
  }
});

module.exports = router;
