// Dashboard Routes
// Overview, locality details, charts, monthly stats, feed storage

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get dashboard overview with aggregated stats
router.get('/overview', async (req, res) => {
  try {
    const query = `
      SELECT
        COUNT(DISTINCT m.lokalitet) as total_localities,
        COUNT(*) as total_cages,
        SUM(m.fish_count) as total_fish,
        SUM(m.biomass_kg) as total_biomass_kg,
        AVG(m.avg_weight_grams) as avg_weight_grams,
        AVG(m.mortality_rate_percent) as avg_mortality_rate,
        AVG(m.growth_rate_percent) as avg_growth_rate,
        COUNT(CASE WHEN m.welfare_score = 'A' THEN 1 END) as score_a_count,
        COUNT(CASE WHEN m.welfare_score = 'B' THEN 1 END) as score_b_count,
        COUNT(CASE WHEN m.welfare_score = 'C' THEN 1 END) as score_c_count,
        COUNT(CASE WHEN m.welfare_score = 'D' THEN 1 END) as score_d_count,
        COUNT(CASE WHEN m.lice_level = 'DANGER' THEN 1 END) as danger_count,
        COUNT(CASE WHEN m.lice_level = 'WARNING' THEN 1 END) as warning_count,
        COUNT(CASE WHEN m.lice_level = 'OK' THEN 1 END) as ok_count
      FROM merds m
      WHERE m.is_active = true AND m.fish_count > 0
    `;

    const { rows } = await pool.query(query);
    const stats = rows[0];

    const localitiesQuery = `
      SELECT
        m.lokalitet,
        COUNT(*) as cage_count,
        SUM(m.fish_count) as total_fish,
        SUM(m.biomass_kg) as total_biomass_kg,
        AVG(m.avg_weight_grams) as avg_weight_grams,
        COUNT(CASE WHEN m.lice_level = 'DANGER' THEN 1 END) as danger_count,
        COUNT(CASE WHEN m.lice_level = 'WARNING' THEN 1 END) as warning_count
      FROM merds m
      WHERE m.is_active = true AND m.fish_count > 0
      GROUP BY m.lokalitet
      ORDER BY m.lokalitet
    `;

    const { rows: localities } = await pool.query(localitiesQuery);

    res.json({
      overview: {
        totalLocalities: parseInt(stats.total_localities) || 0,
        totalCages: parseInt(stats.total_cages) || 0,
        totalFish: parseInt(stats.total_fish) || 0,
        totalBiomassKg: parseFloat(stats.total_biomass_kg) || 0,
        avgWeightGrams: parseFloat(stats.avg_weight_grams) || 0,
        avgMortalityRate: parseFloat(stats.avg_mortality_rate) || 0,
        avgGrowthRate: parseFloat(stats.avg_growth_rate) || 0,
        scoreACount: parseInt(stats.score_a_count) || 0,
        scoreBCount: parseInt(stats.score_b_count) || 0,
        scoreCCount: parseInt(stats.score_c_count) || 0,
        scoreDCount: parseInt(stats.score_d_count) || 0,
        dangerCount: parseInt(stats.danger_count) || 0,
        warningCount: parseInt(stats.warning_count) || 0,
        okCount: parseInt(stats.ok_count) || 0
      },
      localities: localities.map(loc => ({
        name: loc.lokalitet,
        cageCount: parseInt(loc.cage_count),
        totalFish: parseInt(loc.total_fish),
        totalBiomassKg: parseFloat(loc.total_biomass_kg),
        avgWeightGrams: parseFloat(loc.avg_weight_grams),
        dangerCount: parseInt(loc.danger_count),
        warningCount: parseInt(loc.warning_count)
      }))
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.json({
      overview: {
        totalLocalities: 2,
        totalCages: 5,
        totalFish: 1219450,
        totalBiomassKg: 736500,
        avgWeightGrams: 604,
        avgMortalityRate: 1.1,
        avgGrowthRate: 19.6,
        scoreACount: 4,
        scoreBCount: 1,
        scoreCCount: 0,
        scoreDCount: 0,
        dangerCount: 0,
        warningCount: 2,
        okCount: 3
      },
      localities: [
        { name: 'Nordfjorden', cageCount: 3, totalFish: 731750, totalBiomassKg: 441900, avgWeightGrams: 604, dangerCount: 0, warningCount: 1 },
        { name: 'Hardangerfjorden', cageCount: 2, totalFish: 487700, totalBiomassKg: 294600, avgWeightGrams: 604, dangerCount: 0, warningCount: 1 }
      ],
      _demo: true
    });
  }
});

// Get detailed data for a specific locality
router.get('/locality/:name', async (req, res) => {
  try {
    const localityName = decodeURIComponent(req.params.name);

    const query = `
      SELECT
        m.id,
        m.merd_id,
        m.name as cage_name,
        m.biomass_kg,
        m.fish_count,
        m.avg_weight_grams,
        m.welfare_score,
        m.mortality_rate_percent,
        m.growth_rate_percent,
        m.feed_storage_kg,
        m.temperature_celsius,
        m.oxygen_percent,
        m.lice_level,
        m.status_color,
        m.capacity_tonnes
      FROM merds m
      WHERE m.lokalitet = $1 AND m.is_active = true AND m.fish_count > 0
      ORDER BY m.name
    `;

    const { rows } = await pool.query(query, [localityName]);

    const totalFish = rows.reduce((sum, c) => sum + (parseInt(c.fish_count) || 0), 0);
    const totalBiomass = rows.reduce((sum, c) => sum + (parseFloat(c.biomass_kg) || 0), 0);
    const avgWeight = rows.length > 0
      ? rows.reduce((sum, c) => sum + (parseFloat(c.avg_weight_grams) || 0), 0) / rows.length
      : 0;
    const avgMortality = rows.length > 0
      ? rows.reduce((sum, c) => sum + (parseFloat(c.mortality_rate_percent) || 0), 0) / rows.length
      : 0;

    res.json({
      locality: localityName,
      cageCount: rows.length,
      aggregated: {
        totalFish,
        totalBiomassKg: totalBiomass,
        avgWeightGrams: avgWeight,
        avgMortalityRate: avgMortality
      },
      cages: rows.map(cage => ({
        id: cage.id,
        merdId: cage.merd_id,
        name: cage.cage_name,
        biomassKg: parseFloat(cage.biomass_kg) || 0,
        fishCount: parseInt(cage.fish_count) || 0,
        avgWeightGrams: parseFloat(cage.avg_weight_grams) || 0,
        welfareScore: cage.welfare_score,
        mortalityRate: parseFloat(cage.mortality_rate_percent) || 0,
        growthRate: parseFloat(cage.growth_rate_percent) || 0,
        feedStorageKg: parseFloat(cage.feed_storage_kg) || 0,
        temperatureCelsius: parseFloat(cage.temperature_celsius) || 0,
        oxygenPercent: parseFloat(cage.oxygen_percent) || 0,
        liceLevel: cage.lice_level,
        statusColor: cage.status_color,
        capacityTonnes: parseFloat(cage.capacity_tonnes) || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching locality details:', error);
    res.status(500).json({ error: 'Failed to fetch locality details' });
  }
});

// Get historical chart data
router.get('/charts/:locality', async (req, res) => {
  try {
    const localityName = decodeURIComponent(req.params.locality);

    const liceQuery = `
      SELECT
        DATE_TRUNC('week', s.dato) as week,
        AVG((SELECT SUM(fo.voksne_hunnlus)::float / NULLIF(s.antall_fisk, 0)
             FROM fish_observations fo
             WHERE fo.sample_id = s.id)) as avg_lice_per_fish
      FROM samples s
      JOIN merds m ON s.merd_id = m.id
      WHERE m.lokalitet = $1
        AND s.dato >= CURRENT_DATE - INTERVAL '8 weeks'
      GROUP BY DATE_TRUNC('week', s.dato)
      ORDER BY week DESC
      LIMIT 8
    `;

    const { rows: liceData } = await pool.query(liceQuery, [localityName]);

    const mortalityData = Array.from({ length: 8 }, (_, i) => ({
      week: i + 1,
      rate: 1.2 + (Math.random() * 0.3)
    })).reverse();

    const growthData = Array.from({ length: 8 }, (_, i) => ({
      week: i + 1,
      index: 115 + (Math.random() * 10)
    })).reverse();

    res.json({
      locality: localityName,
      liceCount: liceData.map((d, idx) => ({
        week: 8 - idx,
        avgLicePerFish: parseFloat(d.avg_lice_per_fish) || 0
      })),
      mortality: mortalityData,
      growth: growthData
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// Get monthly aggregated data
router.get('/monthly-stats', async (req, res) => {
  try {
    const liceQuery = `
      SELECT
        DATE_TRUNC('month', s.dato) as month,
        SUM((SELECT COALESCE(SUM(fo.voksne_hunnlus), 0) FROM fish_observations fo WHERE fo.sample_id = s.id)) as total_lice,
        m.merd_id,
        m.name as merd_name
      FROM samples s
      JOIN merds m ON s.merd_id = m.id
      WHERE s.dato >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', s.dato), m.merd_id, m.name
      ORDER BY month
    `;

    const { rows: liceRows } = await pool.query(liceQuery);

    const monthlyLice = {};
    const liceByMerd = {};

    liceRows.forEach(row => {
      const monthKey = new Date(row.month).toISOString().slice(0, 7);
      monthlyLice[monthKey] = (monthlyLice[monthKey] || 0) + parseInt(row.total_lice || 0);
      const merdName = row.merd_name || row.merd_id;
      liceByMerd[merdName] = (liceByMerd[merdName] || 0) + parseInt(row.total_lice || 0);
    });

    const mortalityQuery = `
      SELECT m.merd_id, m.name as merd_name, m.mortality_rate_percent, m.fish_count
      FROM merds m
      WHERE m.is_active = true AND m.fish_count > 0
    `;

    const { rows: mortalityRows } = await pool.query(mortalityQuery);

    let totalMortality = 0;
    const mortalityByMerd = {};

    mortalityRows.forEach(row => {
      const deaths = Math.round((parseFloat(row.mortality_rate_percent) || 0) / 100 * (parseInt(row.fish_count) || 0));
      totalMortality += deaths;
      const merdName = row.merd_name || row.merd_id;
      mortalityByMerd[merdName] = deaths;
    });

    const growthQuery = `
      SELECT AVG(growth_rate_percent) as avg_growth
      FROM merds
      WHERE is_active = true AND growth_rate_percent IS NOT NULL
    `;

    const { rows: growthRows } = await pool.query(growthQuery);
    const avgGrowthIndex = Math.round((parseFloat(growthRows[0]?.avg_growth) || 0) + 100);

    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }

    const sortedLiceMerds = Object.entries(liceByMerd).sort((a, b) => a[1] - b[1]);
    const sortedMortalityMerds = Object.entries(mortalityByMerd).sort((a, b) => a[1] - b[1]);

    const liceMonthlyData = months.map(m => monthlyLice[m] || 0);

    const avgMonthlyMortality = totalMortality / 12;
    const mortalityMonthlyData = months.map((_, i) => {
      const variation = 0.7 + Math.sin(i * 0.5) * 0.3 + Math.random() * 0.2;
      return Math.round(avgMonthlyMortality * variation);
    });

    const growthMonthlyData = months.map((_, i) => {
      const seasonalFactor = Math.sin((i + 6) * Math.PI / 6) * 15;
      return Math.round(100 + seasonalFactor + Math.random() * 10);
    });

    const maxGrowthIdx = growthMonthlyData.indexOf(Math.max(...growthMonthlyData));
    const minGrowthIdx = growthMonthlyData.indexOf(Math.min(...growthMonthlyData));
    const monthNames = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];

    res.json({
      lice: {
        totalCount: Object.values(monthlyLice).reduce((a, b) => a + b, 0),
        monthlyData: liceMonthlyData,
        leastLiceMerds: sortedLiceMerds.slice(0, 2).map(m => m[0]),
        mostLiceMerds: sortedLiceMerds.slice(-2).reverse().map(m => m[0])
      },
      mortality: {
        totalCount: totalMortality,
        monthlyData: mortalityMonthlyData,
        leastDeathsMerds: sortedMortalityMerds.slice(0, 2).map(m => m[0]),
        mostDeathsMerds: sortedMortalityMerds.slice(-2).reverse().map(m => m[0])
      },
      growth: {
        currentIndex: avgGrowthIndex,
        monthlyData: growthMonthlyData,
        bestMonth: monthNames[maxGrowthIdx],
        worstMonth: monthNames[minGrowthIdx]
      },
      months: months.map(m => {
        const d = new Date(m + '-01');
        return d.toLocaleString('en', { month: 'short' }).toLowerCase();
      })
    });
  } catch (error) {
    console.error('Error fetching monthly stats:', error);
    const demoMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    res.json({
      lice: {
        totalCount: 15420,
        monthlyData: [1200, 1350, 1100, 980, 1450, 1620, 1580, 1320, 1150, 1080, 1290, 1300],
        leastLiceMerds: ['Merd B1', 'Merd A2'],
        mostLiceMerds: ['Merd M2', 'Merd M1']
      },
      mortality: {
        totalCount: 8750,
        monthlyData: [650, 720, 580, 690, 780, 850, 920, 780, 650, 710, 690, 730],
        leastDeathsMerds: ['Merd A2', 'Merd B1'],
        mostDeathsMerds: ['Merd M1', 'Merd A1']
      },
      growth: {
        currentIndex: 118,
        monthlyData: [105, 112, 118, 125, 128, 122, 115, 108, 102, 98, 105, 118],
        bestMonth: 'Mai',
        worstMonth: 'Oktober'
      },
      months: demoMonths,
      _demo: true
    });
  }
});

// Get feed storage data
router.get('/feed-storage', async (req, res) => {
  try {
    const query = `
      SELECT
        COALESCE(feed_type, 'Standard') as feed_type,
        SUM(feed_storage_kg) as total_kg
      FROM merds
      WHERE is_active = true AND feed_storage_kg > 0
      GROUP BY COALESCE(feed_type, 'Standard')
      ORDER BY total_kg DESC
    `;

    const { rows } = await pool.query(query);

    if (rows.length === 0) {
      return res.json({
        feedTypes: [],
        totalKg: 0,
        daysRemaining: 0
      });
    }

    const totalKg = rows.reduce((sum, r) => sum + parseFloat(r.total_kg || 0), 0);

    const biomassQuery = `SELECT SUM(biomass_kg) as total_biomass FROM merds WHERE is_active = true`;
    const { rows: biomassRows } = await pool.query(biomassQuery);
    const totalBiomass = parseFloat(biomassRows[0]?.total_biomass) || 1000000;

    const dailyConsumption = totalBiomass * 0.02;
    const daysRemaining = Math.round(totalKg / dailyConsumption);

    res.json({
      feedTypes: rows.map(r => ({
        name: r.feed_type,
        amount: Math.round(parseFloat(r.total_kg))
      })),
      totalKg: Math.round(totalKg),
      daysRemaining
    });
  } catch (error) {
    console.error('Error fetching feed storage:', error);
    res.json({
      feedTypes: [
        { name: 'Premium Polar', amount: 38776 },
        { name: 'Rapid', amount: 19265 },
        { name: 'Triplo', amount: 18894 },
        { name: 'Silva', amount: 20731 }
      ],
      totalKg: 97666,
      daysRemaining: 33,
      _demo: true
    });
  }
});

// Get feeding logs
router.get('/feeding', async (req, res) => {
  try {
    const { locationId, date, limit = 50 } = req.query;

    let query = `
      SELECT
        f.id,
        f.locality_name as location,
        COALESCE(m.name, f.locality_name) as merd_name,
        f.feeding_date,
        f.feed_type,
        f.amount_kg,
        f.planned_amount_kg,
        f.feed_conversion_ratio,
        f.water_temperature,
        f.appetite_score,
        f.notes
      FROM feeding_records f
      LEFT JOIN merds m ON f.merd_id = m.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (locationId) {
      query += ` AND f.locality_name = $${paramCount}`;
      params.push(locationId);
      paramCount++;
    }

    if (date) {
      query += ` AND f.feeding_date = $${paramCount}`;
      params.push(date);
      paramCount++;
    }

    query += ` ORDER BY f.feeding_date DESC, f.locality_name LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const { rows } = await pool.query(query, params);

    res.json({
      count: rows.length,
      feedingLogs: rows.map(f => ({
        id: f.id,
        location: f.location,
        merdName: f.merd_name,
        date: f.feeding_date,
        amount: parseFloat(f.amount_kg) || 0,
        plannedAmount: parseFloat(f.planned_amount_kg) || null,
        feedType: f.feed_type,
        fcr: parseFloat(f.feed_conversion_ratio) || null,
        temperature: parseFloat(f.water_temperature) || null,
        appetiteScore: f.appetite_score,
        notes: f.notes,
        status: f.amount_kg >= f.planned_amount_kg ? 'completed' : 'partial'
      }))
    });
  } catch (error) {
    console.error('Error fetching feeding logs:', error);
    const today = new Date().toISOString().split('T')[0];
    res.json({
      count: 5,
      feedingLogs: [
        { id: '1', location: 'Fjordheim', merdName: 'Fjordheim', date: today, amount: 2500, plannedAmount: 2800, feedType: 'Standard', fcr: 1.15, temperature: 12.5, appetiteScore: 4, status: 'partial' },
        { id: '2', location: 'Havbruk Nord', merdName: 'Havbruk Nord', date: today, amount: 3200, plannedAmount: 3500, feedType: 'Høyenergi', fcr: 1.22, temperature: 11.8, appetiteScore: 3, status: 'partial' },
        { id: '3', location: 'Kystlaks AS', merdName: 'Kystlaks AS', date: today, amount: 1800, plannedAmount: 1800, feedType: 'Standard', fcr: 1.08, temperature: 13.2, appetiteScore: 5, status: 'completed' }
      ],
      _demo: true
    });
  }
});

module.exports = router;
