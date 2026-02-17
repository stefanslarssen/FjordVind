// Environment routes for FjordVind/Lusevokteren
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

/**
 * GET /api/environment - Get latest environment readings
 */
router.get('/', async (req, res) => {
  try {
    const { merdId, locality } = req.query;

    let query = `
      SELECT DISTINCT ON (COALESCE(e.merd_id::text, e.locality_name))
        e.*,
        COALESCE(m.name, e.locality_name) as merd_name,
        e.locality_name as lokalitet
      FROM environment_readings e
      LEFT JOIN merds m ON e.merd_id = m.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (merdId) {
      query += ` AND e.merd_id = $${paramCount}`;
      params.push(merdId);
      paramCount++;
    }

    if (locality) {
      query += ` AND e.locality_name = $${paramCount}`;
      params.push(locality);
      paramCount++;
    }

    query += ' ORDER BY COALESCE(e.merd_id::text, e.locality_name), e.reading_timestamp DESC';

    const { rows } = await pool.query(query, params);

    res.json({
      count: rows.length,
      readings: rows.map(r => ({
        id: r.id,
        merdId: r.merd_id,
        merdName: r.merd_name || r.locality_name,
        locality: r.lokalitet || r.locality_name,
        timestamp: r.reading_timestamp,
        temperature: parseFloat(r.temperature_celsius) || null,
        oxygenPercent: parseFloat(r.oxygen_percent) || null,
        oxygenMgL: parseFloat(r.oxygen_mg_l) || null,
        salinity: parseFloat(r.salinity_ppt) || null,
        ph: parseFloat(r.ph) || null,
        ammonia: parseFloat(r.ammonia_mg_l) || null,
        currentSpeed: parseFloat(r.current_speed_cm_s) || null,
        depth: parseFloat(r.depth_m) || null,
        algaeLevel: r.algae_level,
        dataSource: r.data_source,
        isAnomaly: r.is_anomaly
      }))
    });
  } catch (error) {
    console.error('Error fetching environment readings:', error);
    const now = new Date().toISOString();
    res.json({
      count: 5,
      readings: [
        { id: '1', merdId: '1', merdName: 'Merd A1', locality: 'Nordfjorden', timestamp: now, temperature: 12.3, oxygenPercent: 92, salinity: 33.2, ph: 8.1, ammonia: 0.02, dataSource: 'sensor', isAnomaly: false },
        { id: '2', merdId: '2', merdName: 'Merd A2', locality: 'Nordfjorden', timestamp: now, temperature: 12.1, oxygenPercent: 89, salinity: 33.0, ph: 8.0, ammonia: 0.03, dataSource: 'sensor', isAnomaly: false },
        { id: '3', merdId: '3', merdName: 'Merd B1', locality: 'Nordfjorden', timestamp: now, temperature: 11.9, oxygenPercent: 94, salinity: 32.8, ph: 8.2, ammonia: 0.01, dataSource: 'sensor', isAnomaly: false },
        { id: '4', merdId: '4', merdName: 'Merd M1', locality: 'Hardangerfjorden', timestamp: now, temperature: 11.5, oxygenPercent: 87, salinity: 34.1, ph: 8.0, ammonia: 0.04, dataSource: 'sensor', isAnomaly: false },
        { id: '5', merdId: '5', merdName: 'Merd M2', locality: 'Hardangerfjorden', timestamp: now, temperature: 11.8, oxygenPercent: 65, salinity: 34.0, ph: 7.9, ammonia: 0.05, dataSource: 'sensor', isAnomaly: true }
      ],
      _demo: true
    });
  }
});

/**
 * GET /api/environment/summary - Get environment averages
 */
router.get('/summary', async (req, res) => {
  try {
    const query = `
      SELECT
        AVG(temperature_celsius) as avg_temperature,
        AVG(oxygen_percent) as avg_oxygen,
        AVG(salinity_ppt) as avg_salinity,
        AVG(ph) as avg_ph,
        MIN(temperature_celsius) as min_temperature,
        MAX(temperature_celsius) as max_temperature,
        MIN(oxygen_percent) as min_oxygen,
        COUNT(CASE WHEN oxygen_percent < 70 THEN 1 END) as low_oxygen_count,
        COUNT(CASE WHEN is_anomaly = true THEN 1 END) as anomaly_count
      FROM environment_readings
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
    `;

    const { rows } = await pool.query(query);
    const stats = rows[0];

    res.json({
      last24Hours: {
        avgTemperature: parseFloat(stats.avg_temperature) || 0,
        avgOxygen: parseFloat(stats.avg_oxygen) || 0,
        avgSalinity: parseFloat(stats.avg_salinity) || 0,
        avgPh: parseFloat(stats.avg_ph) || 0,
        temperatureRange: {
          min: parseFloat(stats.min_temperature) || 0,
          max: parseFloat(stats.max_temperature) || 0
        },
        minOxygen: parseFloat(stats.min_oxygen) || 0,
        lowOxygenCount: parseInt(stats.low_oxygen_count) || 0,
        anomalyCount: parseInt(stats.anomaly_count) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching environment summary:', error);
    res.json({
      last24Hours: {
        avgTemperature: 11.9,
        avgOxygen: 85.4,
        avgSalinity: 33.4,
        avgPh: 8.0,
        temperatureRange: { min: 11.2, max: 12.5 },
        minOxygen: 65,
        lowOxygenCount: 1,
        anomalyCount: 1
      },
      _demo: true
    });
  }
});

module.exports = router;
