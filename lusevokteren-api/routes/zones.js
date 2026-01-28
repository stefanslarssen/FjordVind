// Disease Zones and Protected Areas Routes

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');

// Get disease zones (ILA/PD control areas)
router.get('/disease-zones', async (req, res) => {
  try {
    const { getDiseaseZones } = require('../services/zones');
    const zones = await getDiseaseZones();
    res.json(zones);
  } catch (error) {
    console.error('Error fetching disease zones:', error);
    res.status(500).json({ error: 'Failed to fetch disease zones', details: error.message });
  }
});

// Get locality polygon boundaries from Fiskeridirektoratet WFS
router.get('/locality-polygons', async (req, res) => {
  try {
    const { getLocalityPolygons } = require('../services/zones');
    const polygons = await getLocalityPolygons();
    res.json(polygons);
  } catch (error) {
    console.error('Error fetching locality polygons:', error);
    res.status(500).json({ error: 'Failed to fetch locality polygons', details: error.message });
  }
});

// Get protected areas from GeoNorge WFS
router.get('/protected-areas', async (req, res) => {
  try {
    const { bbox } = req.query;
    const { getProtectedAreas } = require('../services/zones');
    const areas = await getProtectedAreas(bbox || null);
    res.json(areas);
  } catch (error) {
    console.error('Error fetching protected areas:', error);
    res.status(500).json({ error: 'Failed to fetch protected areas', details: error.message });
  }
});

// Clear zones cache (admin only)
router.post('/clear-cache', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { clearZonesCache } = require('../services/zones');
    clearZonesCache();
    res.json({ success: true, message: 'Zones cache cleared' });
  } catch (error) {
    console.error('Error clearing zones cache:', error);
    res.status(500).json({ error: 'Failed to clear zones cache' });
  }
});

module.exports = router;
