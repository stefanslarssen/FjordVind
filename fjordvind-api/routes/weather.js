// Weather Routes

const express = require('express');
const router = express.Router();

// Weather cache
let weatherCache = {};
const WEATHER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Get weather data for a location
router.get('/:lat/:lon', async (req, res) => {
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

// Get sea temperature
router.get('/sea-temp/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;

    // Simulated data based on location and season
    const month = new Date().getMonth();
    const basTemp = 8;
    const seasonalVariation = Math.sin((month - 2) * Math.PI / 6) * 5;
    const latVariation = (70 - parseFloat(lat)) * 0.3;

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

module.exports = router;
