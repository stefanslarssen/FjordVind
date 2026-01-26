const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Logging
const logger = require('./utils/logger');
const { requestLogger, errorLogger, errorHandler } = require('./middleware/requestLogger');

// Error Monitoring (Sentry-ready)
const errorMonitoring = require('./utils/errorMonitoring');

// Input Sanitization
const { sanitizeMiddleware } = require('./utils/sanitizer');

// API Documentation (Swagger)
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

// Database pool (shared across routes)
const pool = require('./config/database');

// Route modules (refactored endpoints)
const routes = require('./routes');

// External services
const { getNearbyFarms } = require('./services/barentswatch');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Initialize error monitoring (Sentry) - must be early
errorMonitoring.init(app);

// =============================================
// SECURITY MIDDLEWARE
// =============================================

// Helmet: Security headers
app.use(helmet({
  contentSecurityPolicy: IS_PRODUCTION ? undefined : false, // Disable CSP in dev for easier debugging
  crossOriginEmbedderPolicy: false // Allow embedding for maps
}));

// Compression: Gzip responses for better performance
app.use(compression());

// Rate limiting: Prevent brute force and DDoS
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: IS_PRODUCTION ? 100 : 1000, // Limit each IP
  message: { error: 'For mange forespørsler. Prøv igjen senere.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: IS_PRODUCTION ? 10 : 100, // Stricter limit for auth endpoints
  message: { error: 'For mange innloggingsforsøk. Prøv igjen om 15 minutter.', code: 'AUTH_RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Request logging
app.use(requestLogger);

// Log startup
logger.info('Server starting', { port: PORT, env: process.env.NODE_ENV || 'development' });

// Configure multer for image uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `fish-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Ugyldig filtype. Kun JPEG, PNG, GIF og WebP er tillatt.'));
    }
  }
});

// Note: PostgreSQL pool is now imported from ./config/database

// Middleware
app.use(cors());
app.use(express.json());

// Input sanitization - strips HTML, normalizes whitespace, removes dangerous chars
app.use(sanitizeMiddleware({ stripHtml: true, normalizeWhitespace: true }));

// Serve uploaded images statically
app.use('/uploads', express.static(uploadsDir));

// In-memory store for uploaded images (maps observation ID to image URLs)
const imageStore = {};

// Authentication middleware (now in middleware/auth.js)
const { optionalAuth, requireAuth, requireRole, requireCompanyAccess, DEMO_USERS, DEMO_MODE } = require('./middleware/auth');

// Apply optional auth to all routes
app.use(optionalAuth);

// =============================================
// ROUTE MODULES (Refactored endpoints)
// =============================================
// These routes are now in separate files for maintainability
// Original endpoints are kept below for backwards compatibility
// and will be migrated incrementally

// Refactored route modules (active)
app.use('/api/auth', authLimiter, routes.auth); // Auth with stricter rate limiting
app.use('/api/samples', routes.samples);
app.use('/api/treatments', routes.treatments);
app.use('/api/alerts', routes.alerts);
app.use('/api/mortality', routes.mortality);
app.use('/api/environment', routes.environment);
app.use('/api/locations', routes.locations);
app.use('/api/merds', routes.merds);

// API Documentation (Swagger UI)
try {
  const swaggerDocument = YAML.load(path.join(__dirname, 'docs', 'openapi.yaml'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Lusevokteren API Docs'
  }));
  logger.info('API documentation available at /api/docs');
} catch (err) {
  logger.warn('Could not load API documentation', { error: err.message });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Lusevokteren API is running' });
});

// Get dashboard statistics
app.get('/api/stats', async (req, res) => {
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
app.get('/api/stats/lice-trend', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 14;

    // Get daily average lice counts for the last N days
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
      // Generate realistic demo data with slight variation
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

// NOTE: /api/samples endpoints are now in routes/samples.js
// NOTE: /api/mortality endpoints are now in routes/mortality.js

// Get lice counts for a specific merd/cage
app.get('/api/lice-counts', async (req, res) => {
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

    // Transform to match frontend format
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

// NOTE: /api/locations endpoints are now in routes/locations.js
// NOTE: /api/merds endpoints are now in routes/merds.js

// Get nearby farms from BarentsWatch
app.get('/api/nearby-farms', async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing required parameters: latitude and longitude'
      });
    }

    const nearbyFarms = await getNearbyFarms(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius)
    );

    res.json(nearbyFarms);
  } catch (error) {
    console.error('Error fetching nearby farms:', error);
    res.status(500).json({ error: 'Failed to fetch nearby farms' });
  }
});

// Generate polygon boxes around localities from BarentsWatch data
// This creates approximate boundaries when WFS data is unavailable
// Uses deterministic variation based on locality number for consistent polygons
function generatePolygonFromPoint(lat, lng, sizeMeters = 1200, seed = 0) {
  // Approximate degrees per meter at given latitude
  const latPerMeter = 1 / 111320;
  const lngPerMeter = 1 / (111320 * Math.cos(lat * Math.PI / 180));

  // Simple seeded random function for consistent results
  const seededRandom = (s) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  // Add some variation based on seed to make it look more natural (±20%)
  const variation = 0.8 + (seededRandom(seed + 1) * 0.4);
  const actualSize = sizeMeters * variation;

  const halfSizeLat = (actualSize / 2) * latPerMeter;
  const halfSizeLng = (actualSize / 2) * lngPerMeter;

  // Create slightly irregular hexagon for more realistic appearance
  const angle = seededRandom(seed + 2) * Math.PI * 2; // Deterministic rotation
  const points = [];
  for (let i = 0; i < 6; i++) {
    const a = angle + (i * Math.PI / 3);
    const r = 0.9 + (seededRandom(seed + i + 3) * 0.2); // Deterministic radius variation
    points.push([
      lng + (halfSizeLng * r * Math.cos(a)),
      lat + (halfSizeLat * r * Math.sin(a))
    ]);
  }
  points.push(points[0]); // Close the polygon

  return points;
}

// Get locality polygon boundaries - uses real WFS data enriched with BarentsWatch lice data
app.get('/api/locality-boundaries', async (req, res) => {
  try {
    const { bbox, loknr, company, facilityType, useBarentsWatch } = req.query;
    const { getLocalitiesWithLiceData, getWeekNumber, getLocalityPolygons, getLocalityPolygonsFromBarentsWatch } = require('./services/barentswatch');
    const { fetchLocalitiesWithOwners } = require('./services/fiskeridirektoratet');

    // Get all localities with lice data
    const now = new Date();
    const year = now.getFullYear();
    const week = getWeekNumber(now);
    const localities = await getLocalitiesWithLiceData(year, week);

    // Get owner/company data from Fiskeridirektoratet WMS_akva layer 4
    const localitiesWithOwners = await fetchLocalitiesWithOwners();
    const ownerMap = new Map();
    localitiesWithOwners.forEach(f => {
      if (f.properties?.loknr) {
        ownerMap.set(f.properties.loknr, {
          owner: f.properties.innehaver || '',
          anleggstype: f.properties.anleggstype || 'MATFISK',
          formaal_kode: f.properties.formaal_kode || '',
          kapasitet: f.properties.kapasitet || '',
          plassering: f.properties.plassering || '',
          vannmiljo: f.properties.vannmiljo || '',
        });
      }
    });

    // Bruk punkt-geometri fra BarentsWatch fishhealth API
    // BarentsWatch returnerer Point-geometri, ikke Polygon
    const geometryType = req.query.geometryType || 'point'; // 'point' eller 'polygon'

    console.log(`Building features with ${geometryType} geometry from BarentsWatch data...`);

    const features = localities.map(loc => {
      const ownerData = ownerMap.get(loc.localityNo) || {};

      // Bruk anleggstype fra Fiskeridirektoratet (basert på formaal_kode)
      const anleggstype = ownerData.anleggstype || 'MATFISK';

      // Bruk Point-geometri fra BarentsWatch (polygoner hentes separat)
      const geometry = {
        type: 'Point',
        coordinates: [loc.longitude, loc.latitude]
      };

      return {
        type: 'Feature',
        properties: {
          loknr: loc.localityNo,
          name: loc.name,
          municipality: loc.municipality,
          avgAdultFemaleLice: loc.avgAdultFemaleLice,
          status: loc.status,
          hasReported: loc.hasReported,
          isFallow: loc.isFallow,
          owner: ownerData.owner || loc.owner || '',
          anleggstype: anleggstype,
          plassering: 'SJØ',
          vannmiljo: 'SALTVANN',
          tillatelsestype: ownerData.tillatelsestype || '',
          diseases: loc.diseases || [],  // Sykdomsstatus (ILA, PD, etc.)
        },
        geometry: geometry,
      };
    });

    console.log(`✅ Built ${features.length} features with ${geometryType} geometry from BarentsWatch`);

    // Apply filters
    let filteredFeatures = features;

    // Bounding box filter - handles both Point and Polygon geometry
    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number);
      filteredFeatures = filteredFeatures.filter(f => {
        if (!f.geometry?.coordinates) return false;

        if (f.geometry.type === 'Point') {
          // Point: coordinates = [lng, lat]
          const [lng, lat] = f.geometry.coordinates;
          return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
        } else if (f.geometry.type === 'Polygon') {
          // Polygon: coordinates = [[[lng, lat], ...]]
          const coords = f.geometry.coordinates[0];
          if (!coords) return false;
          return coords.some(([lng, lat]) =>
            lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat
          );
        }
        return false;
      });
    }

    // Locality number filter
    if (loknr) {
      filteredFeatures = filteredFeatures.filter(f =>
        f.properties.loknr === parseInt(loknr)
      );
    }

    // Company/owner filter
    if (company) {
      const companyLower = company.toLowerCase();
      filteredFeatures = filteredFeatures.filter(f =>
        f.properties.owner && f.properties.owner.toLowerCase().includes(companyLower)
      );
    }

    // Facility type filter (matfisk, settefisk, ventemerd, landanlegg)
    if (facilityType) {
      const typeLower = facilityType.toUpperCase();
      filteredFeatures = filteredFeatures.filter(f =>
        f.properties.anleggstype === typeLower
      );
    }

    res.json({
      type: 'FeatureCollection',
      features: filteredFeatures,
      total: features.length,
      filtered: filteredFeatures.length,
      source: 'BarentsWatch',
    });
  } catch (error) {
    console.error('Error fetching locality boundaries:', error);
    res.status(500).json({ error: 'Failed to fetch locality boundaries', details: error.message });
  }
});

// Get real polygon boundaries from Fiskeridirektoratet
app.get('/api/locality-polygons', async (req, res) => {
  try {
    const { getLocalityPolygons } = require('./services/barentswatch');

    console.log('Fetching real polygon boundaries from Fiskeridirektoratet...');
    const polygonData = await getLocalityPolygons();

    if (!polygonData || !polygonData.features) {
      return res.json({
        type: 'FeatureCollection',
        features: [],
        source: 'Fiskeridirektoratet',
        message: 'No polygon data available'
      });
    }

    console.log(`✅ Returning ${polygonData.features.length} real polygon boundaries`);
    res.json({
      ...polygonData,
      source: 'Fiskeridirektoratet'
    });
  } catch (error) {
    console.error('Error fetching locality polygons:', error);
    res.status(500).json({ error: 'Failed to fetch locality polygons', details: error.message });
  }
});

// Get all BarentsWatch localities (hele Norge)
app.get('/api/barentswatch/all-localities', async (req, res) => {
  try {
    const { getLocalitiesWithLiceData, getWeekNumber } = require('./services/barentswatch');

    const now = new Date();
    const year = now.getFullYear();
    const week = getWeekNumber(now);

    const allLocalities = await getLocalitiesWithLiceData(year, week);

    // Filter for only sea-based salmonid (salmon/trout) farms
    // Include both active and fallow localities, but exclude land-based facilities
    const localities = allLocalities.filter(loc => {
      // Must have salmonoid license (laks/ørret)
      if (!loc.hasSalmonoidLicense) return false;

      // Must have valid coordinates (sea-based)
      if (!loc.latitude || !loc.longitude) return false;

      // Must have a locality number
      if (!loc.localityNo) return false;

      return true;
    });

    console.log(`Filtered localities: ${allLocalities.length} -> ${localities.length} (removed ${allLocalities.length - localities.length} non-salmonid/land-based)`);

    res.json({
      year,
      week,
      count: localities.length,
      totalCount: allLocalities.length,
      filtered: allLocalities.length - localities.length,
      localities
    });
  } catch (error) {
    console.error('Error fetching all localities:', error);
    res.status(500).json({ error: 'Failed to fetch all localities' });
  }
});

// Search for localities by name or number
app.get('/api/barentswatch/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const { getLocalitiesWithLiceData, getWeekNumber } = require('./services/barentswatch');

    const now = new Date();
    const year = now.getFullYear();
    const week = getWeekNumber(now);

    const allLocalities = await getLocalitiesWithLiceData(year, week);

    // Filter based on search term (name or locality number)
    const searchLower = q.toLowerCase();
    const results = allLocalities.filter(loc => {
      if (!loc.localityNo) return false;
      const nameMatch = loc.name && loc.name.toLowerCase().includes(searchLower);
      const numberMatch = loc.localityNo.toString().includes(q);
      return nameMatch || numberMatch;
    }).slice(0, 20); // Limit to 20 results

    res.json(results);
  } catch (error) {
    console.error('Error searching localities:', error);
    res.status(500).json({ error: 'Failed to search localities' });
  }
});

// Get nearby localities within radius
app.get('/api/barentswatch/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng parameters are required' });
    }

    const { getLocalitiesWithLiceData, getWeekNumber } = require('./services/barentswatch');

    const now = new Date();
    const year = now.getFullYear();
    const week = getWeekNumber(now);

    const allLocalities = await getLocalitiesWithLiceData(year, week);

    // Haversine formula for distance calculation
    function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371; // Earth radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    const centerLat = parseFloat(lat);
    const centerLng = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    // Filter localities within radius
    const nearby = allLocalities.filter(loc => {
      if (!loc.latitude || !loc.longitude || !loc.localityNo) return false;

      const distance = calculateDistance(centerLat, centerLng, loc.latitude, loc.longitude);
      return distance <= radiusKm;
    });

    res.json(nearby);
  } catch (error) {
    console.error('Error fetching nearby localities:', error);
    res.status(500).json({ error: 'Failed to fetch nearby localities' });
  }
});

// =============================================
// DISEASE ZONES AND PROTECTED AREAS ENDPOINTS
// =============================================

// Get disease zones (ILA/PD control areas) from BarentsWatch
app.get('/api/disease-zones', async (req, res) => {
  try {
    const { getDiseaseZones } = require('./services/zones');
    const zones = await getDiseaseZones();
    res.json(zones);
  } catch (error) {
    console.error('Error fetching disease zones:', error);
    res.status(500).json({ error: 'Failed to fetch disease zones', details: error.message });
  }
});

// Get protected areas from GeoNorge WFS
app.get('/api/protected-areas', async (req, res) => {
  try {
    const { bbox } = req.query;
    const { getProtectedAreas } = require('./services/zones');
    const areas = await getProtectedAreas(bbox || null);
    res.json(areas);
  } catch (error) {
    console.error('Error fetching protected areas:', error);
    res.status(500).json({ error: 'Failed to fetch protected areas', details: error.message });
  }
});

// Clear zones cache (admin endpoint)
app.post('/api/zones/clear-cache', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { clearZonesCache } = require('./services/zones');
    clearZonesCache();
    res.json({ success: true, message: 'Zones cache cleared' });
  } catch (error) {
    console.error('Error clearing zones cache:', error);
    res.status(500).json({ error: 'Failed to clear zones cache' });
  }
});

// Create a new company
app.post('/api/companies', async (req, res) => {
  try {
    const { name, org_number, contact_name, contact_email } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const query = `
      INSERT INTO companies (name, org_number, contact_name, contact_email)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const { rows } = await pool.query(query, [name, org_number, contact_name, contact_email]);

    res.status(201).json({ company: rows[0] });
  } catch (error) {
    console.error('Error creating company:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Company with this org number already exists' });
    }
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// Add a user locality (link a BarentsWatch locality to a company)
app.post('/api/user-localities', async (req, res) => {
  try {
    const { company_id, locality_no, name, latitude, longitude, municipality } = req.body;

    if (!company_id || !locality_no || !name || !latitude || !longitude) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const query = `
      INSERT INTO user_localities (company_id, locality_no, name, latitude, longitude, municipality)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const { rows } = await pool.query(query, [company_id, locality_no, name, latitude, longitude, municipality]);

    res.status(201).json({ locality: rows[0] });
  } catch (error) {
    console.error('Error adding user locality:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Locality already added' });
    }
    res.status(500).json({ error: 'Failed to add locality' });
  }
});

// Get user localities for a company
app.get('/api/user-localities', async (req, res) => {
  try {
    const { company_id } = req.query;

    let query = 'SELECT * FROM user_localities WHERE is_active = true';
    const params = [];

    if (company_id) {
      query += ' AND company_id = $1';
      params.push(company_id);
    }

    query += ' ORDER BY name ASC';

    const { rows } = await pool.query(query, params);

    res.json({ localities: rows });
  } catch (error) {
    console.error('Error fetching user localities:', error);
    res.status(500).json({ error: 'Failed to fetch user localities' });
  }
});

// Get all aquaculture companies/owners
app.get('/api/companies', async (req, res) => {
  try {
    const { getAquacultureCompanies } = require('./services/fiskeridirektoratet');

    const companies = await getAquacultureCompanies();

    res.json({
      count: companies.length,
      companies
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Get sites for a specific company
app.get('/api/companies/:companyName/sites', async (req, res) => {
  try {
    const { getCompanySites } = require('./services/fiskeridirektoratet');
    const { companyName } = req.params;
    // Decode URL-encoded company name
    const decodedName = decodeURIComponent(companyName);

    const sites = await getCompanySites(decodedName);

    res.json({
      companyName: decodedName,
      count: sites.length,
      sites
    });
  } catch (error) {
    console.error('Error fetching company sites:', error);
    res.status(500).json({ error: 'Failed to fetch company sites' });
  }
});

// ========== DASHBOARD API ENDPOINTS ==========

// Get dashboard overview with aggregated stats
app.get('/api/dashboard/overview', async (req, res) => {
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

    // Get list of localities with their totals
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
    // Return demo dashboard overview
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

// Get detailed data for a specific locality with all cages
app.get('/api/dashboard/locality/:name', async (req, res) => {
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

    // Calculate aggregated stats for this locality
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

// Get historical chart data for graphs
app.get('/api/dashboard/charts/:locality', async (req, res) => {
  try {
    const localityName = decodeURIComponent(req.params.locality);

    // Get lice count history from samples (last 8 weeks)
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

    // Mock mortality data (in production, this would come from a mortality_records table)
    const mortalityData = Array.from({ length: 8 }, (_, i) => ({
      week: i + 1,
      rate: 1.2 + (Math.random() * 0.3)
    })).reverse();

    // Mock growth data
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

// ========== PREDICTIONS API ==========

// Demo data for when database is unavailable
const DEMO_PREDICTIONS = [
  { id: '1', merdName: 'Merd A1', locality: 'Nordfjorden', currentLice: 0.42, predictedLice: 0.58, confidence: 0.85, probabilityExceedLimit: 0.78, riskLevel: 'HIGH', recommendedAction: 'SCHEDULE_TREATMENT', daysAhead: 7 },
  { id: '2', merdName: 'Merd A2', locality: 'Nordfjorden', currentLice: 0.35, predictedLice: 0.45, confidence: 0.80, probabilityExceedLimit: 0.45, riskLevel: 'MEDIUM', recommendedAction: 'MONITOR', daysAhead: 7 },
  { id: '3', merdName: 'Merd B1', locality: 'Nordfjorden', currentLice: 0.22, predictedLice: 0.28, confidence: 0.82, probabilityExceedLimit: 0.15, riskLevel: 'LOW', recommendedAction: 'NO_ACTION', daysAhead: 7 },
  { id: '4', merdName: 'Merd M1', locality: 'Hardangerfjorden', currentLice: 0.38, predictedLice: 0.52, confidence: 0.78, probabilityExceedLimit: 0.65, riskLevel: 'MEDIUM', recommendedAction: 'SCHEDULE_TREATMENT', daysAhead: 7 },
  { id: '5', merdName: 'Merd M2', locality: 'Hardangerfjorden', currentLice: 0.48, predictedLice: 0.72, confidence: 0.70, probabilityExceedLimit: 0.92, riskLevel: 'CRITICAL', recommendedAction: 'IMMEDIATE_TREATMENT', daysAhead: 7 },
];

const DEMO_RISK_SCORES = [
  { id: '1', merdName: 'Merd A1', locality: 'Nordfjorden', overallScore: 65, liceScore: 75, mortalityScore: 40, environmentScore: 85, treatmentScore: 60, riskLevel: 'HIGH' },
  { id: '2', merdName: 'Merd A2', locality: 'Nordfjorden', overallScore: 45, liceScore: 55, mortalityScore: 35, environmentScore: 90, treatmentScore: 40, riskLevel: 'MODERATE' },
  { id: '3', merdName: 'Merd B1', locality: 'Nordfjorden', overallScore: 25, liceScore: 30, mortalityScore: 30, environmentScore: 88, treatmentScore: 20, riskLevel: 'LOW' },
  { id: '4', merdName: 'Merd M1', locality: 'Hardangerfjorden', overallScore: 55, liceScore: 60, mortalityScore: 45, environmentScore: 75, treatmentScore: 50, riskLevel: 'MODERATE' },
  { id: '5', merdName: 'Merd M2', locality: 'Hardangerfjorden', overallScore: 78, liceScore: 85, mortalityScore: 55, environmentScore: 70, treatmentScore: 70, riskLevel: 'CRITICAL' },
];

// Get all predictions (with optional filters)
app.get('/api/predictions', async (req, res) => {
  try {
    const { merdId, riskLevel, daysAhead } = req.query;

    let query = `
      SELECT
        p.*,
        COALESCE(m.name, p.locality_name) as merd_name,
        p.locality_name as lokalitet
      FROM predictions p
      LEFT JOIN merds m ON p.merd_id = m.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (merdId) {
      query += ` AND p.merd_id = $${paramCount}`;
      params.push(merdId);
      paramCount++;
    }

    if (riskLevel) {
      query += ` AND p.risk_level = $${paramCount}`;
      params.push(riskLevel);
      paramCount++;
    }

    if (daysAhead) {
      query += ` AND p.days_ahead = $${paramCount}`;
      params.push(parseInt(daysAhead));
      paramCount++;
    }

    query += ` ORDER BY
      CASE p.risk_level WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
      p.predicted_lice DESC`;

    const { rows } = await pool.query(query, params);

    res.json({
      count: rows.length,
      predictions: rows.map(p => ({
        id: p.id,
        merdId: p.merd_id,
        merdName: p.merd_name || p.locality_name,
        externalMerdId: p.external_merd_id,
        locality: p.lokalitet || p.locality_name,
        predictionDate: p.prediction_date,
        targetDate: p.target_date,
        daysAhead: p.days_ahead,
        currentLice: parseFloat(p.current_lice) || 0,
        predictedLice: parseFloat(p.predicted_lice) || 0,
        confidence: parseFloat(p.confidence) || 0,
        probabilityExceedLimit: parseFloat(p.probability_exceed_limit) || 0,
        riskLevel: p.risk_level,
        recommendedAction: p.recommended_action,
        modelVersion: p.model_version
      }))
    });
  } catch (error) {
    console.error('Error fetching predictions:', error);
    // Return demo data when database is unavailable
    let filtered = DEMO_PREDICTIONS;
    if (req.query.riskLevel) {
      filtered = filtered.filter(p => p.riskLevel === req.query.riskLevel);
    }
    res.json({
      count: filtered.length,
      predictions: filtered,
      _demo: true
    });
  }
});

// Get prediction summary for dashboard
app.get('/api/predictions/summary', async (req, res) => {
  try {
    const query = `
      SELECT
        COUNT(*) as total_predictions,
        COUNT(CASE WHEN risk_level = 'CRITICAL' THEN 1 END) as critical_count,
        COUNT(CASE WHEN risk_level = 'HIGH' THEN 1 END) as high_count,
        COUNT(CASE WHEN risk_level = 'MEDIUM' THEN 1 END) as medium_count,
        COUNT(CASE WHEN risk_level = 'LOW' THEN 1 END) as low_count,
        AVG(predicted_lice) as avg_predicted_lice,
        AVG(probability_exceed_limit) as avg_probability_exceed,
        COUNT(CASE WHEN recommended_action = 'SCHEDULE_TREATMENT' OR recommended_action = 'IMMEDIATE_TREATMENT' THEN 1 END) as treatment_needed_count
      FROM predictions
      WHERE target_date >= CURRENT_DATE
        AND days_ahead = 7
    `;

    const { rows } = await pool.query(query);
    const stats = rows[0];

    // Get merds that need treatment
    const treatmentQuery = `
      SELECT DISTINCT m.name, m.lokalitet
      FROM predictions p
      JOIN merds m ON p.merd_id = m.id
      WHERE p.recommended_action IN ('SCHEDULE_TREATMENT', 'IMMEDIATE_TREATMENT')
        AND p.target_date >= CURRENT_DATE
        AND p.days_ahead = 7
    `;
    const { rows: treatmentMerds } = await pool.query(treatmentQuery);

    res.json({
      sevenDayForecast: {
        avgPredictedLice: parseFloat(stats.avg_predicted_lice) || 0,
        avgProbabilityExceed: parseFloat(stats.avg_probability_exceed) || 0,
        criticalCount: parseInt(stats.critical_count) || 0,
        highCount: parseInt(stats.high_count) || 0,
        mediumCount: parseInt(stats.medium_count) || 0,
        lowCount: parseInt(stats.low_count) || 0,
        treatmentNeededCount: parseInt(stats.treatment_needed_count) || 0,
        merdsNeedingTreatment: treatmentMerds.map(m => m.name)
      }
    });
  } catch (error) {
    console.error('Error fetching prediction summary:', error);
    // Return demo summary data
    const criticalCount = DEMO_PREDICTIONS.filter(p => p.riskLevel === 'CRITICAL').length;
    const highCount = DEMO_PREDICTIONS.filter(p => p.riskLevel === 'HIGH').length;
    const mediumCount = DEMO_PREDICTIONS.filter(p => p.riskLevel === 'MEDIUM').length;
    const lowCount = DEMO_PREDICTIONS.filter(p => p.riskLevel === 'LOW').length;
    const avgPredicted = DEMO_PREDICTIONS.reduce((sum, p) => sum + p.predictedLice, 0) / DEMO_PREDICTIONS.length;
    const avgProbability = DEMO_PREDICTIONS.reduce((sum, p) => sum + p.probabilityExceedLimit, 0) / DEMO_PREDICTIONS.length;
    const needTreatment = DEMO_PREDICTIONS.filter(p => p.recommendedAction.includes('TREATMENT'));

    res.json({
      sevenDayForecast: {
        avgPredictedLice: avgPredicted,
        avgProbabilityExceed: avgProbability,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        treatmentNeededCount: needTreatment.length,
        merdsNeedingTreatment: needTreatment.map(p => p.merdName)
      },
      _demo: true
    });
  }
});

// NOTE: /api/alerts endpoints are now in routes/alerts.js
// NOTE: /api/treatments endpoints are now in routes/treatments.js
// NOTE: /api/environment endpoints are now in routes/environment.js

// ========== MONTHLY STATS API ==========

// Get monthly aggregated data for dashboard cards
app.get('/api/dashboard/monthly-stats', async (req, res) => {
  try {
    // Get monthly lice data for the past 12 months
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

    // Aggregate by month
    const monthlyLice = {};
    const liceByMerd = {};

    liceRows.forEach(row => {
      const monthKey = new Date(row.month).toISOString().slice(0, 7);
      monthlyLice[monthKey] = (monthlyLice[monthKey] || 0) + parseInt(row.total_lice || 0);

      const merdName = row.merd_name || row.merd_id;
      liceByMerd[merdName] = (liceByMerd[merdName] || 0) + parseInt(row.total_lice || 0);
    });

    // Get mortality data from merds (using mortality_rate_percent)
    const mortalityQuery = `
      SELECT
        m.merd_id,
        m.name as merd_name,
        m.mortality_rate_percent,
        m.fish_count
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

    // Get growth data from merds
    const growthQuery = `
      SELECT AVG(growth_rate_percent) as avg_growth
      FROM merds
      WHERE is_active = true AND growth_rate_percent IS NOT NULL
    `;

    const { rows: growthRows } = await pool.query(growthQuery);
    const avgGrowthIndex = Math.round((parseFloat(growthRows[0]?.avg_growth) || 0) + 100);

    // Generate 12 months of data
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }

    // Sort merds by lice count
    const sortedLiceMerds = Object.entries(liceByMerd).sort((a, b) => a[1] - b[1]);
    const sortedMortalityMerds = Object.entries(mortalityByMerd).sort((a, b) => a[1] - b[1]);

    // Calculate monthly totals (fill in zeros for missing months)
    const liceMonthlyData = months.map(m => monthlyLice[m] || 0);

    // Generate monthly mortality data (simulated distribution based on total)
    const avgMonthlyMortality = totalMortality / 12;
    const mortalityMonthlyData = months.map((_, i) => {
      const variation = 0.7 + Math.sin(i * 0.5) * 0.3 + Math.random() * 0.2;
      return Math.round(avgMonthlyMortality * variation);
    });

    // Generate growth index data
    const growthMonthlyData = months.map((_, i) => {
      const seasonalFactor = Math.sin((i + 6) * Math.PI / 6) * 15;
      return Math.round(100 + seasonalFactor + Math.random() * 10);
    });

    // Find best/worst months for growth
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
    // Return demo monthly stats
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
app.get('/api/dashboard/feed-storage', async (req, res) => {
  try {
    // Get feed storage from merds grouped by feed type
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

    // If no data, return some default structure
    if (rows.length === 0) {
      return res.json({
        feedTypes: [],
        totalKg: 0,
        daysRemaining: 0
      });
    }

    const totalKg = rows.reduce((sum, r) => sum + parseFloat(r.total_kg || 0), 0);

    // Estimate daily consumption (roughly 2% of biomass per day)
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
    // Return demo feed storage
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
app.get('/api/feeding', async (req, res) => {
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
    // Return demo feeding logs
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

// ========== RISK SCORES API ==========

// Get risk scores
app.get('/api/risk-scores', async (req, res) => {
  try {
    const query = `
      SELECT
        r.*,
        COALESCE(m.name, r.locality_name) as merd_name
      FROM risk_scores r
      LEFT JOIN merds m ON r.merd_id = m.id
      ORDER BY r.overall_score DESC
    `;

    const { rows } = await pool.query(query);

    // Calculate aggregate risk
    const avgScore = rows.length > 0
      ? rows.reduce((sum, r) => sum + (r.overall_score || 0), 0) / rows.length
      : 0;

    res.json({
      aggregateRiskScore: Math.round(avgScore),
      aggregateRiskLevel: avgScore >= 70 ? 'CRITICAL' : avgScore >= 50 ? 'HIGH' : avgScore >= 30 ? 'MODERATE' : 'LOW',
      count: rows.length,
      scores: rows.map(r => ({
        id: r.id,
        merdId: r.merd_id,
        merdName: r.merd_name || r.locality_name,
        externalMerdId: r.external_merd_id,
        locality: r.locality_name,
        overallScore: r.overall_score,
        liceScore: r.lice_score,
        mortalityScore: r.mortality_score,
        environmentScore: r.environment_score,
        treatmentScore: r.treatment_score,
        riskLevel: r.risk_level,
        riskFactors: r.risk_factors,
        recommendations: r.recommendations,
        calculatedAt: r.calculated_at
      }))
    });
  } catch (error) {
    console.error('Error fetching risk scores:', error);
    // Return demo risk scores
    const avgScore = DEMO_RISK_SCORES.reduce((sum, r) => sum + r.overallScore, 0) / DEMO_RISK_SCORES.length;
    res.json({
      aggregateRiskScore: Math.round(avgScore),
      aggregateRiskLevel: avgScore >= 70 ? 'CRITICAL' : avgScore >= 50 ? 'HIGH' : avgScore >= 30 ? 'MODERATE' : 'LOW',
      count: DEMO_RISK_SCORES.length,
      scores: DEMO_RISK_SCORES,
      _demo: true
    });
  }
});

// ============================================
// Alert Preferences & Email Notifications
// ============================================

// In-memory store for alert preferences (should be moved to DB in production)
let alertPreferencesStore = {};

// Save alert preferences
app.post('/api/alert-preferences', async (req, res) => {
  try {
    const { userId = 'default', preferences } = req.body;

    // Store preferences (in production, save to database)
    alertPreferencesStore[userId] = {
      ...preferences,
      updatedAt: new Date().toISOString()
    };

    console.log(`Alert preferences saved for user ${userId}:`, preferences);

    res.json({
      success: true,
      message: 'Varslingsinnstillinger lagret',
      preferences: alertPreferencesStore[userId]
    });
  } catch (error) {
    console.error('Error saving alert preferences:', error);
    res.status(500).json({ error: 'Kunne ikke lagre varslingsinnstillinger' });
  }
});

// Get alert preferences
app.get('/api/alert-preferences', async (req, res) => {
  try {
    const { userId = 'default' } = req.query;

    const preferences = alertPreferencesStore[userId] || {
      alertEmail: '',
      alertPhone: '',
      liceCriticalThreshold: 0.5,
      liceWarningThreshold: 0.2,
      emailAlerts: true,
      smsAlerts: false,
      alertTypes: {
        LICE_CRITICAL: { email: true, sms: false, push: true },
        LICE_WARNING: { email: true, sms: false, push: true },
        MORTALITY_HIGH: { email: true, sms: true, push: true },
        TREATMENT_DUE: { email: true, sms: false, push: true },
        WEEKLY_REPORT: { email: true, sms: false, push: false },
        REGULATORY_DEADLINE: { email: true, sms: true, push: true }
      }
    };

    res.json(preferences);
  } catch (error) {
    console.error('Error fetching alert preferences:', error);
    res.status(500).json({ error: 'Kunne ikke hente varslingsinnstillinger' });
  }
});

// ============================================
// Image Upload & Storage
// ============================================

// Upload single image for fish observation
app.post('/api/upload/fish-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Ingen fil lastet opp' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    const { observationId, sampleId } = req.body;

    // Store image reference
    const imageId = `img-${Date.now()}`;
    imageStore[imageId] = {
      id: imageId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: imageUrl,
      observationId: observationId || null,
      sampleId: sampleId || null,
      uploadedAt: new Date().toISOString()
    };

    console.log(`📷 Image uploaded: ${req.file.filename}`);

    res.json({
      success: true,
      message: 'Bilde lastet opp',
      image: {
        id: imageId,
        url: imageUrl,
        filename: req.file.filename
      }
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Kunne ikke laste opp bildet' });
  }
});

// Upload multiple images
app.post('/api/upload/images', upload.array('images', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Ingen filer lastet opp' });
    }

    const { sampleId, treatmentId } = req.body;
    const uploadedImages = [];

    for (const file of req.files) {
      const imageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const imageUrl = `/uploads/${file.filename}`;

      imageStore[imageId] = {
        id: imageId,
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: imageUrl,
        sampleId: sampleId || null,
        treatmentId: treatmentId || null,
        uploadedAt: new Date().toISOString()
      };

      uploadedImages.push({
        id: imageId,
        url: imageUrl,
        filename: file.filename,
        originalName: file.originalname
      });
    }

    console.log(`📷 ${uploadedImages.length} images uploaded`);

    res.json({
      success: true,
      message: `${uploadedImages.length} bilder lastet opp`,
      images: uploadedImages
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({ error: 'Kunne ikke laste opp bildene' });
  }
});

// Get images for a sample or treatment
app.get('/api/images', async (req, res) => {
  try {
    const { sampleId, treatmentId, observationId } = req.query;

    let images = Object.values(imageStore);

    if (sampleId) {
      images = images.filter(img => img.sampleId === sampleId);
    }
    if (treatmentId) {
      images = images.filter(img => img.treatmentId === treatmentId);
    }
    if (observationId) {
      images = images.filter(img => img.observationId === observationId);
    }

    res.json({ images });
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Kunne ikke hente bilder' });
  }
});

// Delete an image
app.delete('/api/images/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    const image = imageStore[imageId];

    if (!image) {
      return res.status(404).json({ error: 'Bilde ikke funnet' });
    }

    // Delete file from disk
    const filePath = path.join(uploadsDir, image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from store
    delete imageStore[imageId];

    console.log(`🗑️ Image deleted: ${image.filename}`);

    res.json({
      success: true,
      message: 'Bilde slettet'
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Kunne ikke slette bildet' });
  }
});

// ========== PUSH NOTIFICATIONS ==========

// Store for push subscriptions (in production, use database)
const pushSubscriptions = {};

// Subscribe to push notifications
app.post('/api/push/subscribe', async (req, res) => {
  try {
    const { subscription, userId } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Ugyldig subscription' });
    }

    const subscriptionId = `sub_${Date.now()}`;
    pushSubscriptions[subscriptionId] = {
      id: subscriptionId,
      userId: userId || 'anonymous',
      subscription,
      createdAt: new Date().toISOString()
    };

    console.log(`📱 New push subscription: ${subscriptionId}`);

    res.json({
      success: true,
      subscriptionId,
      message: 'Push-varsler aktivert'
    });
  } catch (error) {
    console.error('Error subscribing to push:', error);
    res.status(500).json({ error: 'Kunne ikke aktivere push-varsler' });
  }
});

// Unsubscribe from push notifications
app.post('/api/push/unsubscribe', async (req, res) => {
  try {
    const { subscriptionId, endpoint } = req.body;

    if (subscriptionId) {
      delete pushSubscriptions[subscriptionId];
    } else if (endpoint) {
      // Find and delete by endpoint
      for (const [id, sub] of Object.entries(pushSubscriptions)) {
        if (sub.subscription.endpoint === endpoint) {
          delete pushSubscriptions[id];
          break;
        }
      }
    }

    console.log(`📱 Push subscription removed`);

    res.json({
      success: true,
      message: 'Push-varsler deaktivert'
    });
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    res.status(500).json({ error: 'Kunne ikke deaktivere push-varsler' });
  }
});

// Send push notification (internal use for alerts)
app.post('/api/push/send', async (req, res) => {
  try {
    const { title, body, url, userId, tag } = req.body;

    // In production, use web-push library
    // For now, we'll simulate sending
    const targetSubs = userId
      ? Object.values(pushSubscriptions).filter(s => s.userId === userId)
      : Object.values(pushSubscriptions);

    console.log(`📱 Sending push to ${targetSubs.length} subscribers: ${title}`);

    // Simulate sending (in production, use web-push)
    const results = targetSubs.map(sub => ({
      subscriptionId: sub.id,
      sent: true
    }));

    res.json({
      success: true,
      sent: results.length,
      message: `Push sendt til ${results.length} enheter`
    });
  } catch (error) {
    console.error('Error sending push:', error);
    res.status(500).json({ error: 'Kunne ikke sende push-varsler' });
  }
});

// Get push subscription status
app.get('/api/push/status', async (req, res) => {
  try {
    const { userId, endpoint } = req.query;

    let isSubscribed = false;
    let subscriptionId = null;

    if (endpoint) {
      for (const [id, sub] of Object.entries(pushSubscriptions)) {
        if (sub.subscription.endpoint === endpoint) {
          isSubscribed = true;
          subscriptionId = id;
          break;
        }
      }
    } else if (userId) {
      const userSub = Object.values(pushSubscriptions).find(s => s.userId === userId);
      if (userSub) {
        isSubscribed = true;
        subscriptionId = userSub.id;
      }
    }

    res.json({
      isSubscribed,
      subscriptionId
    });
  } catch (error) {
    console.error('Error checking push status:', error);
    res.status(500).json({ error: 'Kunne ikke sjekke push-status' });
  }
});

// ========== SMS NOTIFICATIONS (Twilio) ==========

// Store for SMS preferences
const smsPreferences = {};

// Configure SMS preferences
app.post('/api/sms/preferences', async (req, res) => {
  try {
    const { userId, phoneNumber, enabled, alertTypes } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId er påkrevd' });
    }

    // Validate Norwegian phone number format
    if (phoneNumber && !/^(\+47)?[49]\d{7}$/.test(phoneNumber.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Ugyldig norsk telefonnummer' });
    }

    smsPreferences[userId] = {
      userId,
      phoneNumber: phoneNumber ? phoneNumber.replace(/\s/g, '').replace(/^(\d{8})$/, '+47$1') : null,
      enabled: enabled !== false,
      alertTypes: alertTypes || ['critical', 'warning'],
      updatedAt: new Date().toISOString()
    };

    console.log(`📱 SMS preferences updated for ${userId}`);

    res.json({
      success: true,
      preferences: smsPreferences[userId]
    });
  } catch (error) {
    console.error('Error updating SMS preferences:', error);
    res.status(500).json({ error: 'Kunne ikke oppdatere SMS-innstillinger' });
  }
});

// Get SMS preferences
app.get('/api/sms/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const prefs = smsPreferences[userId] || {
      userId,
      phoneNumber: null,
      enabled: false,
      alertTypes: ['critical']
    };

    res.json(prefs);
  } catch (error) {
    console.error('Error fetching SMS preferences:', error);
    res.status(500).json({ error: 'Kunne ikke hente SMS-innstillinger' });
  }
});

// Send SMS (using Twilio)
app.post('/api/sms/send', async (req, res) => {
  try {
    const { to, message, userId } = req.body;

    // Get phone number
    let phoneNumber = to;
    if (!phoneNumber && userId) {
      const prefs = smsPreferences[userId];
      if (prefs?.phoneNumber && prefs?.enabled) {
        phoneNumber = prefs.phoneNumber;
      }
    }

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Ingen telefonnummer konfigurert' });
    }

    // In production, use Twilio:
    // const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // const result = await twilio.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phoneNumber
    // });

    console.log(`📱 SMS sent to ${phoneNumber}: ${message.substring(0, 50)}...`);

    res.json({
      success: true,
      message: 'SMS sendt',
      to: phoneNumber,
      // In production: sid: result.sid
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ error: 'Kunne ikke sende SMS' });
  }
});

// Send test SMS
app.post('/api/sms/test', async (req, res) => {
  try {
    const { userId, phoneNumber } = req.body;

    const testPhone = phoneNumber || smsPreferences[userId]?.phoneNumber;

    if (!testPhone) {
      return res.status(400).json({ error: 'Ingen telefonnummer' });
    }

    // Simulate sending test SMS
    console.log(`📱 Test SMS to ${testPhone}`);

    res.json({
      success: true,
      message: `Test-SMS sendt til ${testPhone}`
    });
  } catch (error) {
    console.error('Error sending test SMS:', error);
    res.status(500).json({ error: 'Kunne ikke sende test-SMS' });
  }
});

// ========== WEATHER DATA INTEGRATION ==========

// Weather cache
let weatherCache = {};
const WEATHER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Get weather data for a location
app.get('/api/weather/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const cacheKey = `${lat}_${lon}`;

    // Check cache
    if (weatherCache[cacheKey] && Date.now() - weatherCache[cacheKey].timestamp < WEATHER_CACHE_TTL) {
      return res.json(weatherCache[cacheKey].data);
    }

    // Fetch from MET Norway API (Yr.no)
    const response = await fetch(
      `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`,
      {
        headers: {
          'User-Agent': 'FjordVind/1.0 (lice monitoring system)'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    const timeseries = data.properties?.timeseries || [];

    // Parse current and forecast data
    const current = timeseries[0]?.data?.instant?.details || {};
    const next12Hours = timeseries.slice(0, 12).map(t => ({
      time: t.time,
      temp: t.data?.instant?.details?.air_temperature,
      wind: t.data?.instant?.details?.wind_speed,
      windDir: t.data?.instant?.details?.wind_from_direction,
      humidity: t.data?.instant?.details?.relative_humidity,
      precipitation: t.data?.next_1_hours?.details?.precipitation_amount || 0,
      symbol: t.data?.next_1_hours?.summary?.symbol_code || t.data?.next_6_hours?.summary?.symbol_code
    }));

    const weatherData = {
      location: { lat: parseFloat(lat), lon: parseFloat(lon) },
      current: {
        temperature: current.air_temperature,
        windSpeed: current.wind_speed,
        windDirection: current.wind_from_direction,
        humidity: current.relative_humidity,
        pressure: current.air_pressure_at_sea_level,
        cloudCover: current.cloud_area_fraction
      },
      forecast: next12Hours,
      seaTemperature: null, // Would need separate API
      waveHeight: null, // Would need separate API
      updatedAt: new Date().toISOString()
    };

    // Cache the result
    weatherCache[cacheKey] = {
      data: weatherData,
      timestamp: Date.now()
    };

    res.json(weatherData);
  } catch (error) {
    console.error('Error fetching weather:', error);
    res.status(500).json({ error: 'Kunne ikke hente værdata', details: error.message });
  }
});

// Get sea temperature from Havvarsel (NIVA/IMR)
app.get('/api/weather/sea-temp/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;

    // In production, integrate with:
    // - Havvarsel API (https://havvarsel.no)
    // - NIVA's ocean temperature API
    // - IMR's ocean monitoring

    // For now, return simulated data based on location and season
    const month = new Date().getMonth();
    const basTemp = 8; // Base temperature
    const seasonalVariation = Math.sin((month - 2) * Math.PI / 6) * 5; // Peak in Aug
    const latVariation = (70 - parseFloat(lat)) * 0.3; // Colder up north

    const seaTemp = Math.round((basTemp + seasonalVariation + latVariation) * 10) / 10;

    res.json({
      location: { lat: parseFloat(lat), lon: parseFloat(lon) },
      seaTemperature: seaTemp,
      depth: '3m',
      source: 'simulated',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching sea temperature:', error);
    res.status(500).json({ error: 'Kunne ikke hente sjøtemperatur' });
  }
});

// ========== AUTOMATIC WEEKLY REPORTS ==========

// Store for scheduled reports
const scheduledReports = {};

// Schedule automatic weekly report
app.post('/api/reports/schedule', async (req, res) => {
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

    console.log(`📅 Report scheduled: ${scheduleId}`);

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
app.get('/api/reports/schedules', async (req, res) => {
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
app.put('/api/reports/schedule/:scheduleId', async (req, res) => {
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
app.delete('/api/reports/schedule/:scheduleId', async (req, res) => {
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

// =============================================
// ERROR HANDLING (must be after all routes)
// =============================================
app.use(errorMonitoring.getErrorHandler()); // Sentry error handler (if configured)
app.use(errorLogger);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, '0.0.0.0', async () => {
  logger.info('Server started', {
    port: PORT,
    env: process.env.NODE_ENV || 'development',
    endpoints: {
      stats: `/api/stats`,
      samples: `/api/samples`,
      auth: `/api/auth`,
      locations: `/api/locations`
    }
  });

  // Pre-cache company data in background
  logger.info('Pre-caching company data...');
  const { getAquacultureCompanies } = require('./services/fiskeridirektoratet');
  getAquacultureCompanies()
    .then(() => logger.info('Company data cached and ready'))
    .catch(err => logger.error('Failed to pre-cache company data', { error: err.message }));
});

// =============================================
// GRACEFUL SHUTDOWN
// =============================================
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`${signal} received, starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close database pool
      await pool.end();
      logger.info('Database pool closed');

      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', { error: err.message });
      process.exit(1);
    }
  });

  // Force exit after 30 seconds if graceful shutdown fails
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});
