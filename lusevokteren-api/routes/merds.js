// Merd/Cage routes for FjordVind/Lusevokteren
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Demo merds for fallback
const DEMO_MERDS = [
  { id: '1', merd_id: 'NF-A1', cage_number: 'NF-A1', name: 'Merd A1', cage_name: 'Merd A1', location_id: 'Nordfjorden', lokalitet: 'Nordfjorden', lokalitetsnummer: '12345', latitude: 61.2, longitude: 6.8, capacity_tonnes: 500, current_generation: '2024-A', avg_adult_female: 0.42 },
  { id: '2', merd_id: 'NF-A2', cage_number: 'NF-A2', name: 'Merd A2', cage_name: 'Merd A2', location_id: 'Nordfjorden', lokalitet: 'Nordfjorden', lokalitetsnummer: '12345', latitude: 61.21, longitude: 6.81, capacity_tonnes: 500, current_generation: '2024-A', avg_adult_female: 0.35 },
  { id: '3', merd_id: 'NF-B1', cage_number: 'NF-B1', name: 'Merd B1', cage_name: 'Merd B1', location_id: 'Nordfjorden', lokalitet: 'Nordfjorden', lokalitetsnummer: '12345', latitude: 61.22, longitude: 6.82, capacity_tonnes: 500, current_generation: '2024-A', avg_adult_female: 0.22 },
  { id: '4', merd_id: 'HF-M1', cage_number: 'HF-M1', name: 'Merd M1', cage_name: 'Merd M1', location_id: 'Hardangerfjorden', lokalitet: 'Hardangerfjorden', lokalitetsnummer: '23456', latitude: 60.1, longitude: 6.2, capacity_tonnes: 500, current_generation: '2024-B', avg_adult_female: 0.38 },
  { id: '5', merd_id: 'HF-M2', cage_number: 'HF-M2', name: 'Merd M2', cage_name: 'Merd M2', location_id: 'Hardangerfjorden', lokalitet: 'Hardangerfjorden', lokalitetsnummer: '23456', latitude: 60.11, longitude: 6.21, capacity_tonnes: 500, current_generation: '2024-B', avg_adult_female: 0.48 }
];

/**
 * GET /api/merds - Get all merds/cages
 */
router.get('/', async (req, res) => {
  try {
    const { locationId } = req.query;

    let query = `
      SELECT
        m.*,
        (SELECT AVG(
          (SELECT SUM(voksne_hunnlus) FROM fish_observations WHERE sample_id = s.id) / s.antall_fisk::float
        ) FROM samples s WHERE s.merd_id = m.id AND s.dato >= CURRENT_DATE - INTERVAL '7 days') as avg_adult_female
      FROM merds m
      WHERE m.is_active = true
    `;

    const params = [];

    if (locationId) {
      query += ' AND m.lokalitet = $1';
      params.push(locationId);
    }

    query += ' ORDER BY m.name';

    const { rows } = await pool.query(query, params);

    const merds = rows.map(merd => ({
      id: merd.id,
      merd_id: merd.merd_id,
      cage_number: merd.merd_id,
      name: merd.navn,
      cage_name: merd.navn,
      location_id: merd.lokalitet,
      lokalitet: merd.lokalitet,
      lokalitetsnummer: merd.lokalitetsnummer,
      latitude: merd.latitude,
      longitude: merd.longitude,
      capacity_tonnes: merd.capacity_tonnes,
      current_generation: merd.current_generation,
      avg_adult_female: merd.avg_adult_female ? Number(merd.avg_adult_female.toFixed(3)) : null,
    }));

    res.json(merds);
  } catch (error) {
    console.error('Error fetching merds:', error);
    let merds = DEMO_MERDS;
    if (req.query.locationId) {
      merds = merds.filter(m => m.lokalitet === req.query.locationId);
    }
    res.json(merds);
  }
});

module.exports = router;
