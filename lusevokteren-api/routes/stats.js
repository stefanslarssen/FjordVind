// Stats and Dashboard Routes
// Extracted from server.js for better maintainability

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get dashboard statistics
router.get('/', async (req, res) => {
  try {
    const samplesQuery = `
      SELECT
        s.*,
        (SELECT json_agg(json_build_object('voksne_hunnlus', voksne_hunnlus))
         FROM fish_observations WHERE sample_id = s.id) as fish_observations
      FROM samples s
      ORDER BY s.dato DESC
      LIMIT 1000
    `;

    const { rows: samples } = await pool.query(samplesQuery);

    const total = samples.length;
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = samples.filter(s => s.dato === today).length;

    let totalAvg = 0;
    let aboveThreshold = 0;

    samples.forEach(sample => {
      const observations = sample.fish_observations || [];
      const totalVoksneHunnlus = observations.reduce((sum, f) => sum + (f.voksne_hunnlus || 0), 0);
      const avg = sample.antall_fisk > 0 ? totalVoksneHunnlus / sample.antall_fisk : 0;
      totalAvg += avg;
      if (avg >= 0.10) aboveThreshold++;
    });

    const avgAdultFemale = total > 0 ? totalAvg / total : 0;

    res.json({
      totalCounts: total,
      todayCounts: todayCount,
      avgAdultFemale: Number(avgAdultFemale.toFixed(3)),
      aboveThreshold,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    // Return demo stats
    res.json({
      totalCounts: 245,
      todayCounts: 12,
      avgAdultFemale: 0.38,
      aboveThreshold: 2,
      _demo: true
    });
  }
});

// Get lice trend data for the last N days (default 14)
router.get('/lice-trend', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 14;

    const query = `
      WITH daily_data AS (
        SELECT
          s.dato,
          COUNT(DISTINCT s.id) as sample_count,
          COALESCE(SUM(fo.voksne_hunnlus), 0) as total_lice,
          COALESCE(SUM(s.antall_fisk), 0) as total_fish
        FROM samples s
        LEFT JOIN fish_observations fo ON fo.sample_id = s.id
        WHERE s.dato >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY s.dato
        ORDER BY s.dato ASC
      )
      SELECT
        dato,
        sample_count,
        total_lice,
        total_fish,
        CASE WHEN total_fish > 0 THEN ROUND((total_lice::numeric / total_fish), 3) ELSE 0 END as avg_lice
      FROM daily_data
    `;

    const { rows } = await pool.query(query);

    // Fill in missing days with zeros
    const dailyData = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const existingData = rows.find(r => r.dato && r.dato.toISOString().split('T')[0] === dateStr);
      dailyData.push({
        date: dateStr,
        avgLice: existingData ? parseFloat(existingData.avg_lice) : 0,
        sampleCount: existingData ? parseInt(existingData.sample_count) : 0,
        totalFish: existingData ? parseInt(existingData.total_fish) : 0
      });
    }

    // Calculate trend (compare first half to second half)
    const halfPoint = Math.floor(dailyData.length / 2);
    const firstHalf = dailyData.slice(0, halfPoint);
    const secondHalf = dailyData.slice(halfPoint);

    const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.avgLice, 0) / firstHalf.length || 0;
    const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.avgLice, 0) / secondHalf.length || 0;

    let trendPercent = 0;
    if (firstHalfAvg > 0) {
      trendPercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    }

    res.json({
      days,
      dailyData,
      trend: {
        percent: Math.round(trendPercent),
        direction: trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'stable',
        firstHalfAvg: parseFloat(firstHalfAvg.toFixed(3)),
        secondHalfAvg: parseFloat(secondHalfAvg.toFixed(3))
      },
      totalSamples: dailyData.reduce((sum, d) => sum + d.sampleCount, 0)
    });
  } catch (error) {
    console.error('Error fetching lice trend:', error);
    // Return demo data when database fails
    const demoData = [];
    const today = new Date();
    const days = parseInt(req.query.days) || 14;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const baseValue = 0.35 + (Math.sin(i * 0.5) * 0.15);
      demoData.push({
        date: date.toISOString().split('T')[0],
        avgLice: parseFloat((baseValue + Math.random() * 0.1).toFixed(3)),
        sampleCount: Math.floor(Math.random() * 8) + 2,
        totalFish: Math.floor(Math.random() * 50) + 20
      });
    }

    res.json({
      days,
      dailyData: demoData,
      trend: {
        percent: -12,
        direction: 'down',
        firstHalfAvg: 0.42,
        secondHalfAvg: 0.37
      },
      totalSamples: demoData.reduce((sum, d) => sum + d.sampleCount, 0),
      _demo: true
    });
  }
});

// Get lice counts for a specific merd/cage
router.get('/lice-counts', async (req, res) => {
  try {
    const { merdId } = req.query;

    if (!merdId) {
      return res.status(400).json({ error: 'merdId parameter is required' });
    }

    const query = `
      SELECT
        s.*,
        m.name as cage_name,
        (SELECT json_agg(json_build_object(
          'voksne_hunnlus', voksne_hunnlus,
          'bevegelige_lus', bevegelige_lus,
          'fastsittende_lus', fastsittende_lus
        )) FROM fish_observations WHERE sample_id = s.id) as fish_observations
      FROM samples s
      JOIN merds m ON s.merd_id = m.id
      WHERE s.merd_id = $1
      ORDER BY s.dato DESC
    `;

    const { rows } = await pool.query(query, [merdId]);

    const transformed = rows.map(sample => {
      const observations = sample.fish_observations || [];
      const totalVoksneHunnlus = observations.reduce((sum, f) => sum + (f.voksne_hunnlus || 0), 0);

      return {
        id: sample.id,
        date: sample.dato,
        fish_examined: sample.antall_fisk,
        adult_female_lice: totalVoksneHunnlus,
        cage_name: sample.cage_name
      };
    });

    res.json(transformed);
  } catch (error) {
    console.error('Error fetching lice counts:', error);
    res.status(500).json({ error: 'Failed to fetch lice counts' });
  }
});

module.exports = router;
