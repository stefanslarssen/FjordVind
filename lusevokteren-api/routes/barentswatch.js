// BarentsWatch API Routes
// Locality data, boundaries, and search from BarentsWatch

const express = require('express');
const router = express.Router();
const cache = require('../utils/cache');

// Helper function for polygon generation
function generatePolygonFromPoint(lat, lng, sizeMeters = 1200, seed = 0) {
  const latPerMeter = 1 / 111320;
  const lngPerMeter = 1 / (111320 * Math.cos(lat * Math.PI / 180));

  const seededRandom = (s) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  const variation = 0.8 + (seededRandom(seed + 1) * 0.4);
  const actualSize = sizeMeters * variation;

  const halfSizeLat = (actualSize / 2) * latPerMeter;
  const halfSizeLng = (actualSize / 2) * lngPerMeter;

  const angle = seededRandom(seed + 2) * Math.PI * 2;
  const points = [];
  for (let i = 0; i < 6; i++) {
    const a = angle + (i * Math.PI / 3);
    const r = 0.9 + (seededRandom(seed + i + 3) * 0.2);
    points.push([
      lng + (halfSizeLng * r * Math.cos(a)),
      lat + (halfSizeLat * r * Math.sin(a))
    ]);
  }
  points.push(points[0]);
  return points;
}

// Get locality polygon boundaries
router.get('/locality-boundaries', async (req, res) => {
  try {
    const { bbox, loknr, company, facilityType } = req.query;
    const { getLocalitiesWithLiceData, getWeekNumber } = require('../services/barentswatch');
    const { fetchLocalitiesWithOwners } = require('../services/fiskeridirektoratet');

    const now = new Date();
    const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();
    const week = req.query.week ? parseInt(req.query.week) : getWeekNumber(now);

    // Get lice data from BarentsWatch (may be mock data if no credentials)
    const liceData = await getLocalitiesWithLiceData(year, week);
    const liceMap = new Map();
    liceData.forEach(loc => {
      if (loc.localityNo) {
        liceMap.set(loc.localityNo, loc);
      }
    });

    // Get ALL localities from Fiskeridirektoratet (primary data source)
    const localitiesWithOwners = await fetchLocalitiesWithOwners();

    const features = localitiesWithOwners
      .filter(f => f.properties?.loknr && f.geometry?.coordinates)
      .map(f => {
        const props = f.properties;
        const loknr = props.loknr;
        const liceInfo = liceMap.get(loknr) || {};

        // Determine status based on lice data
        let status = 'UNKNOWN';
        let avgAdultFemaleLice = null;
        if (liceInfo.avgAdultFemaleLice !== undefined && liceInfo.avgAdultFemaleLice !== null) {
          avgAdultFemaleLice = liceInfo.avgAdultFemaleLice;
          if (avgAdultFemaleLice <= 0.2) status = 'OK';
          else if (avgAdultFemaleLice <= 0.5) status = 'WARNING';
          else status = 'DANGER';
        }

        return {
          type: 'Feature',
          properties: {
            loknr: loknr,
            name: props.navn || props.name || `Lokalitet ${loknr}`,
            municipality: props.kommune || liceInfo.municipality || '',
            avgAdultFemaleLice: avgAdultFemaleLice,
            status: status,
            hasReported: liceInfo.hasReported || false,
            isFallow: liceInfo.isFallow || false,
            owner: props.innehaver || liceInfo.owner || '',
            anleggstype: props.anleggstype || 'MATFISK',
            plassering: props.plassering || 'SJØ',
            vannmiljo: props.vannmiljo || 'SALTVANN',
            tillatelsestype: props.tillatelsestype || '',
            diseases: liceInfo.diseases || [],
          },
          geometry: f.geometry,
        };
      });

    let filteredFeatures = features;

    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number);
      filteredFeatures = filteredFeatures.filter(f => {
        if (!f.geometry?.coordinates) return false;
        if (f.geometry.type === 'Point') {
          const [lng, lat] = f.geometry.coordinates;
          return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
        } else if (f.geometry.type === 'Polygon') {
          const coords = f.geometry.coordinates[0];
          if (!coords) return false;
          return coords.some(([lng, lat]) =>
            lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat
          );
        }
        return false;
      });
    }

    if (loknr) {
      filteredFeatures = filteredFeatures.filter(f =>
        f.properties.loknr === parseInt(loknr)
      );
    }

    if (company) {
      const companyLower = company.toLowerCase();
      filteredFeatures = filteredFeatures.filter(f =>
        f.properties.owner && f.properties.owner.toLowerCase().includes(companyLower)
      );
    }

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
router.get('/locality-polygons', async (req, res) => {
  try {
    const { getLocalityPolygons } = require('../services/barentswatch');

    const polygonData = await getLocalityPolygons();

    if (!polygonData || !polygonData.features) {
      return res.json({
        type: 'FeatureCollection',
        features: [],
        source: 'Fiskeridirektoratet',
        message: 'No polygon data available'
      });
    }

    res.json({
      ...polygonData,
      source: 'Fiskeridirektoratet'
    });
  } catch (error) {
    console.error('Error fetching locality polygons:', error);
    res.status(500).json({ error: 'Failed to fetch locality polygons', details: error.message });
  }
});

// Get all BarentsWatch localities with caching
router.get('/all-localities', async (req, res) => {
  try {
    const { getLocalitiesWithLiceData, getWeekNumber } = require('../services/barentswatch');

    const now = new Date();
    const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();
    const week = req.query.week ? parseInt(req.query.week) : getWeekNumber(now);

    const cacheKey = `localities:${year}:${week}`;

    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      res.set('X-Cache', 'HIT');
      return res.json(cachedData);
    }

    const allLocalities = await getLocalitiesWithLiceData(year, week);

    const localities = allLocalities.filter(loc => {
      if (!loc.hasSalmonoidLicense) return false;
      if (!loc.latitude || !loc.longitude) return false;
      if (!loc.localityNo) return false;
      return true;
    });

    const responseData = {
      year,
      week,
      count: localities.length,
      totalCount: allLocalities.length,
      filtered: allLocalities.length - localities.length,
      localities
    };

    cache.set(cacheKey, responseData, 15 * 60 * 1000);
    res.set('X-Cache', 'MISS');

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching all localities:', error);
    res.status(500).json({ error: 'Failed to fetch all localities' });
  }
});

// Search for localities
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const { getLocalitiesWithLiceData, getWeekNumber } = require('../services/barentswatch');

    const now = new Date();
    const year = now.getFullYear();
    const week = getWeekNumber(now);

    const allLocalities = await getLocalitiesWithLiceData(year, week);

    const searchLower = q.toLowerCase();
    const results = allLocalities.filter(loc => {
      if (!loc.localityNo) return false;
      const nameMatch = loc.name && loc.name.toLowerCase().includes(searchLower);
      const numberMatch = loc.localityNo.toString().includes(q);
      return nameMatch || numberMatch;
    }).slice(0, 20);

    res.json(results);
  } catch (error) {
    console.error('Error searching localities:', error);
    res.status(500).json({ error: 'Failed to search localities' });
  }
});

// Get nearby localities within radius
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng parameters are required' });
    }

    const { getLocalitiesWithLiceData, getWeekNumber } = require('../services/barentswatch');

    const now = new Date();
    const year = now.getFullYear();
    const week = getWeekNumber(now);

    const allLocalities = await getLocalitiesWithLiceData(year, week);

    function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371;
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

// Get nearby farms (legacy endpoint)
router.get('/nearby-farms', async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing required parameters: latitude and longitude'
      });
    }

    const { getNearbyFarms } = require('../services/barentswatch');

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

module.exports = router;
