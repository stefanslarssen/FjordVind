/**
 * Public API services for fetching environmental/oceanographic data
 *
 * Data sources:
 * - Havforskningsinstituttet (Institute of Marine Research)
 * - Meteorologisk institutt (Norwegian Meteorological Institute) - Ocean forecasts
 * - Barentswatch - Coastal water temperature
 */

// Frost API (met.no) for ocean observations
const FROST_API = 'https://frost.met.no/observations/v0.jsonld'

// Havvarsel API for ocean forecasts
const HAVVARSEL_API = 'https://api.met.no/weatherapi/oceanforecast/2.0/complete'

/**
 * Fetch sea temperature from met.no Frost API
 * Note: Requires API client ID from met.no
 */
export async function fetchSeaTemperatureFromFrost(lat, lon) {
  // Frost API requires registration - return null if not configured
  const clientId = import.meta.env.VITE_FROST_CLIENT_ID
  if (!clientId) {
    console.log('Frost API: No client ID configured')
    return null
  }

  try {
    const params = new URLSearchParams({
      sources: 'SN76920', // Example: Coastal station
      elements: 'sea_water_temperature',
      referencetime: 'latest',
      maxage: 'PT3H'
    })

    const response = await fetch(`${FROST_API}?${params}`, {
      headers: {
        'Authorization': `Basic ${btoa(clientId + ':')}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      return data
    }
  } catch (error) {
    console.error('Frost API error:', error)
  }
  return null
}

/**
 * Fetch ocean forecast from met.no Havvarsel API
 * This is a free API that provides sea temperature forecasts
 */
export async function fetchOceanForecast(lat, lon) {
  try {
    const url = `${HAVVARSEL_API}?lat=${lat}&lon=${lon}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FjordVind/1.0 (https://fjordvind.no)'
      }
    })

    if (!response.ok) {
      throw new Error(`Havvarsel API error: ${response.status}`)
    }

    const data = await response.json()

    // Extract relevant data from the forecast
    const timeseries = data.properties?.timeseries || []

    if (timeseries.length === 0) {
      return null
    }

    // Get current conditions (first entry)
    const current = timeseries[0]
    const details = current.data?.instant?.details || {}

    return {
      timestamp: current.time,
      seaWaterTemperature: details.sea_water_temperature,
      seaWaterSpeed: details.sea_water_speed,
      seaWaterDirection: details.sea_water_to_direction,
      seaSurfaceWaveHeight: details.sea_surface_wave_height,
      coordinates: { lat, lon }
    }
  } catch (error) {
    console.error('Failed to fetch ocean forecast:', error)
    return null
  }
}

/**
 * Fetch environmental data for multiple locations
 */
export async function fetchEnvironmentDataForLocations(locations) {
  const results = []

  for (const location of locations) {
    if (!location.lat || !location.lon) continue

    try {
      const forecast = await fetchOceanForecast(location.lat, location.lon)

      if (forecast) {
        results.push({
          locationId: location.id,
          locationName: location.name,
          ...forecast
        })
      }
    } catch (error) {
      console.error(`Failed to fetch data for ${location.name}:`, error)
    }

    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  return results
}

/**
 * Get nearby ocean monitoring stations
 * Returns a list of met.no stations near a given coordinate
 */
export async function getNearbyStations(lat, lon, radiusKm = 50) {
  // This would require Frost API access
  // For now, return some known coastal stations in Norway
  const knownStations = [
    { id: 'SN76920', name: 'Sognesjoen', lat: 61.0, lon: 4.8 },
    { id: 'SN71990', name: 'Nordkapp', lat: 71.1, lon: 25.8 },
    { id: 'SN50540', name: 'Bergen - Florida', lat: 60.4, lon: 5.3 },
    { id: 'SN68860', name: 'Tromso', lat: 69.7, lon: 19.0 },
    { id: 'SN58070', name: 'Kristiansund', lat: 63.1, lon: 7.7 },
    { id: 'SN44640', name: 'Stavanger', lat: 58.9, lon: 5.7 }
  ]

  // Filter by distance
  return knownStations.filter(station => {
    const distance = calculateDistance(lat, lon, station.lat, station.lon)
    return distance <= radiusKm
  })
}

/**
 * Calculate distance between two coordinates in km (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg) {
  return deg * (Math.PI / 180)
}

/**
 * Estimate environmental parameters based on location and season
 * This provides reasonable estimates when API data is not available
 */
export function estimateEnvironmentParameters(lat, month) {
  // Temperature varies by latitude and season
  // Norwegian coastal waters: ~4-16°C depending on location and season

  // Base temperature by latitude (rough estimate)
  let baseTemp
  if (lat > 70) {
    baseTemp = 6 // Northern Norway
  } else if (lat > 65) {
    baseTemp = 8 // Mid Norway
  } else if (lat > 60) {
    baseTemp = 10 // Western Norway
  } else {
    baseTemp = 11 // Southern Norway
  }

  // Seasonal variation (±4°C)
  const seasonalOffset = 4 * Math.sin((month - 4) * Math.PI / 6)
  const temperature = baseTemp + seasonalOffset

  // Salinity is relatively stable in Norwegian coastal waters
  // Lower near fjords/rivers, higher in open sea
  const salinity = 33 + (Math.random() * 2 - 1) // 32-34 ppt

  // Oxygen is generally good in Norwegian waters
  // Can be lower in summer due to higher temperatures
  const oxygenBase = 95
  const oxygenVariation = month >= 6 && month <= 8 ? -10 : 0
  const oxygen = oxygenBase + oxygenVariation + (Math.random() * 10 - 5)

  // pH in seawater is relatively stable
  const ph = 8.1 + (Math.random() * 0.2 - 0.1)

  return {
    temperature: Math.round(temperature * 10) / 10,
    salinity: Math.round(salinity * 10) / 10,
    oxygen: Math.round(oxygen),
    ph: Math.round(ph * 100) / 100,
    isEstimate: true
  }
}

/**
 * Fetch all available environmental data for a location
 * Combines API data with estimates when needed
 */
export async function fetchCompleteEnvironmentData(lat, lon, locationName) {
  const result = {
    locationName,
    coordinates: { lat, lon },
    timestamp: new Date().toISOString(),
    source: 'unknown',
    data: {}
  }

  // Try to get ocean forecast from met.no
  const forecast = await fetchOceanForecast(lat, lon)

  if (forecast && forecast.seaWaterTemperature !== undefined) {
    result.source = 'met.no'
    result.data.temperature = forecast.seaWaterTemperature
    result.timestamp = forecast.timestamp
  }

  // Fill in missing data with estimates
  const month = new Date().getMonth() + 1
  const estimates = estimateEnvironmentParameters(lat, month)

  if (result.data.temperature === undefined) {
    result.data.temperature = estimates.temperature
    result.data.temperatureEstimated = true
  }

  result.data.salinity = estimates.salinity
  result.data.salinityEstimated = true

  result.data.oxygen = estimates.oxygen
  result.data.oxygenEstimated = true

  result.data.ph = estimates.ph
  result.data.phEstimated = true

  return result
}
