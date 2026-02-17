// Location and Merd routes for FjordVind/Lusevokteren
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Demo locations for fallback
const DEMO_LOCATIONS = [
  { id: 'Nordfjorden', name: 'Nordfjorden' },
  { id: 'Hardangerfjorden', name: 'Hardangerfjorden' }
];

// Demo merds for fallback
const DEMO_MERDS = [
  { id: '1', merd_id: 'NF-A1', cage_number: 'NF-A1', name: 'Merd A1', cage_name: 'Merd A1', location_id: 'Nordfjorden', lokalitet: 'Nordfjorden', lokalitetsnummer: '12345', latitude: 61.2, longitude: 6.8, capacity_tonnes: 500, current_generation: '2024-A', avg_adult_female: 0.42 },
  { id: '2', merd_id: 'NF-A2', cage_number: 'NF-A2', name: 'Merd A2', cage_name: 'Merd A2', location_id: 'Nordfjorden', lokalitet: 'Nordfjorden', lokalitetsnummer: '12345', latitude: 61.21, longitude: 6.81, capacity_tonnes: 500, current_generation: '2024-A', avg_adult_female: 0.35 },
  { id: '3', merd_id: 'NF-B1', cage_number: 'NF-B1', name: 'Merd B1', cage_name: 'Merd B1', location_id: 'Nordfjorden', lokalitet: 'Nordfjorden', lokalitetsnummer: '12345', latitude: 61.22, longitude: 6.82, capacity_tonnes: 500, current_generation: '2024-A', avg_adult_female: 0.22 },
  { id: '4', merd_id: 'HF-M1', cage_number: 'HF-M1', name: 'Merd M1', cage_name: 'Merd M1', location_id: 'Hardangerfjorden', lokalitet: 'Hardangerfjorden', lokalitetsnummer: '23456', latitude: 60.1, longitude: 6.2, capacity_tonnes: 500, current_generation: '2024-B', avg_adult_female: 0.38 },
  { id: '5', merd_id: 'HF-M2', cage_number: 'HF-M2', name: 'Merd M2', cage_name: 'Merd M2', location_id: 'Hardangerfjorden', lokalitet: 'Hardangerfjorden', lokalitetsnummer: '23456', latitude: 60.11, longitude: 6.21, capacity_tonnes: 500, current_generation: '2024-B', avg_adult_female: 0.48 }
];

/**
 * GET /api/locations - Get all locations
 */
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT lokalitet
      FROM merds
      WHERE is_active = true
      ORDER BY lokalitet
    `;

    const { rows } = await pool.query(query);

    const locations = rows.map(row => ({
      id: row.lokalitet,
      name: row.lokalitet,
    }));

    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.json(DEMO_LOCATIONS);
  }
});

module.exports = router;

// Export DEMO_MERDS for use in merds router
module.exports.DEMO_MERDS = DEMO_MERDS;
module.exports.DEMO_LOCATIONS = DEMO_LOCATIONS;
