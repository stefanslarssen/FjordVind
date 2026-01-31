/**
 * Public API services for fetching fish farm data
 *
 * Data sources:
 * - Fiskeridirektoratet WFS: Public locality boundaries and positions
 * - BarentsWatch: Fish health data (lice levels, diseases)
 */

// Use proxy in development to avoid CORS issues
const isDev = import.meta.env.DEV

// Debug logging only in development
const debug = isDev ? console.log.bind(console, '[API]') : () => {}

// In development mode, we use Vite proxy to avoid CORS issues
// In production Tauri build, we use the Tauri HTTP plugin
async function getFetch() {
  if (isDev) {
    return window.fetch.bind(window)
  }

  // In production, try Tauri HTTP plugin
  if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
    try {
      const httpModule = await import('@tauri-apps/plugin-http')
      return httpModule.fetch
    } catch (e) {
      // Fallback to browser fetch silently
    }
  }

  return window.fetch.bind(window)
}

// Fiskeridirektoratet ArcGIS REST API (new endpoint as of 2025)
const FISKERIDIR_ARCGIS = isDev
  ? '/api/fiskeridir/server/rest/services/Yggdrasil/Akvakulturregisteret/FeatureServer/0/query'
  : 'https://gis.fiskeridir.no/server/rest/services/Yggdrasil/Akvakulturregisteret/FeatureServer/0/query'

// Fiskeridirektoratet polygon boundaries (permitted facility areas)
const FISKERIDIR_POLYGONS = isDev
  ? '/api/fiskeridir/server/rest/services/Yggdrasil/Stedfesting___Akvakulturregisteret/FeatureServer/1/query'
  : 'https://gis.fiskeridir.no/server/rest/services/Yggdrasil/Stedfesting___Akvakulturregisteret/FeatureServer/1/query'

// BarentsWatch endpoints
const BARENTSWATCH_TOKEN_URL = isDev
  ? '/api/barentswatch-auth/connect/token'
  : 'https://id.barentswatch.no/connect/token'
const BARENTSWATCH_API_BASE = isDev
  ? '/api/barentswatch/bwapi/v1/geodata'
  : 'https://www.barentswatch.no/bwapi/v1/geodata'

// BarentsWatch credentials from environment
const BW_CLIENT_ID = import.meta.env.VITE_BARENTSWATCH_CLIENT_ID
const BW_CLIENT_SECRET = import.meta.env.VITE_BARENTSWATCH_CLIENT_SECRET

// Validate required environment variables
if (!BW_CLIENT_ID || !BW_CLIENT_SECRET) {
  if (isDev) {
    console.warn('[API] BarentsWatch credentials not configured. Add VITE_BARENTSWATCH_CLIENT_ID and VITE_BARENTSWATCH_CLIENT_SECRET to .env')
  }
}

// Token cache
let barentswatchToken = null
let tokenExpiry = null

/**
 * Get BarentsWatch access token using OAuth2 client credentials flow
 */
async function getBarentswatchToken() {
  // Return cached token if still valid (with 60 second buffer)
  if (barentswatchToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
    return barentswatchToken
  }

  if (!BW_CLIENT_ID || !BW_CLIENT_SECRET) {
    return null
  }

  try {
    const fetch = await getFetch()

    const response = await fetch(BARENTSWATCH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: BW_CLIENT_ID,
        client_secret: BW_CLIENT_SECRET,
        scope: 'api'
      }).toString()
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    barentswatchToken = data.access_token
    tokenExpiry = Date.now() + (data.expires_in * 1000)

    debug('BarentsWatch token obtained')
    return barentswatchToken
  } catch (error) {
    return null
  }
}

/**
 * Fetch all aquaculture localities from Fiskeridirektoratet WFS
 * This is public data, no authentication needed
 */
export async function fetchLocalitiesFromFiskeridir() {
  try {
    const fetch = await getFetch()

    const params = new URLSearchParams({
      where: "plassering='SJØ' AND vannmiljo='SALTVANN'",
      outFields: '*',
      f: 'geojson',
      outSR: '4326',
      resultRecordCount: '5000'
    })

    const url = `${FISKERIDIR_ARCGIS}?${params}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Fiskeridirektoratet error: ${response.status}`)
    }

    const data = await response.json()

    // Transform to our format
    const features = (data.features || []).map(f => {
      const props = f.properties || {}
      const owners = props.til_innehavere || ''
      const primaryOwner = owners.split(',')[0]?.trim() || 'Ukjent'
      const species = props.til_arter || ''

      return {
        type: 'Feature',
        geometry: f.geometry,
        properties: {
          loknr: props.loknr,
          name: props.navn,
          municipality: props.kommune,
          county: props.fylke,
          owner: primaryOwner,
          species: species,
          status: props.status_lokalitet,
          waterType: props.vannmiljo,
          placement: props.plassering,
          capacity: props.kapasitet_lok,
          productionArea: props.prodareacode,
          avgAdultFemaleLice: null,
          diseases: [],
          isFallow: props.status_lokalitet === 'BRAKKLAGT',
          hasReported: false
        }
      }
    })

    debug(`Loaded ${features.length} facilities`)

    return {
      type: 'FeatureCollection',
      features: features
    }
  } catch (error) {
    throw error
  }
}

/**
 * Fetch locality polygon boundaries from Fiskeridirektoratet
 */
export async function fetchLocalityPolygons() {
  try {
    const fetch = await getFetch()

    const params = new URLSearchParams({
      where: '1=1',
      outFields: 'loknr,lokalitet,lok_navn',
      f: 'geojson',
      outSR: '4326',
      resultRecordCount: '9000'
    })

    const url = `${FISKERIDIR_POLYGONS}?${params}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      return { type: 'FeatureCollection', features: [] }
    }

    const data = await response.json()
    debug(`Loaded ${data.features?.length || 0} polygon boundaries`)

    return {
      type: 'FeatureCollection',
      features: data.features || []
    }
  } catch (error) {
    return { type: 'FeatureCollection', features: [] }
  }
}

/**
 * Get unique companies from locality data
 */
export function extractCompanies(localities) {
  const companyMap = new Map()

  const features = localities?.features || []
  features.forEach(f => {
    const owner = f.properties?.owner
    if (owner) {
      const current = companyMap.get(owner) || { name: owner, count: 0 }
      current.count++
      companyMap.set(owner, current)
    }
  })

  return Array.from(companyMap.values())
    .sort((a, b) => b.count - a.count)
}

// Cache for fish health data
let fishHealthCache = null
let fishHealthCacheTime = null
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

/**
 * Fetch fish health data from BarentsWatch with batch fetching
 */
export async function fetchFishHealthData(year, week, onProgress = null) {
  const cacheKey = `${year}-${week}`
  if (fishHealthCache && fishHealthCacheTime &&
      Date.now() - fishHealthCacheTime < CACHE_DURATION &&
      fishHealthCache.cacheKey === cacheKey) {
    return fishHealthCache.data
  }

  try {
    const token = await getBarentswatchToken()
    if (!token) {
      return null
    }

    const fetch = await getFetch()

    const listUrl = `${BARENTSWATCH_API_BASE}/fishhealth/localities`
    const listResponse = await fetch(listUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (!listResponse.ok) {
      return null
    }

    const localities = await listResponse.json()

    // Batch fetch lice data
    const BATCH_SIZE = 20
    const results = []
    const currentYear = year || new Date().getFullYear()
    const currentWeek = week || getCurrentWeek()

    for (let i = 0; i < localities.length; i += BATCH_SIZE) {
      const batch = localities.slice(i, i + BATCH_SIZE)

      const batchPromises = batch.map(async (loc) => {
        try {
          const url = `${BARENTSWATCH_API_BASE}/fishhealth/locality/${loc.localityNo}/${currentYear}/${currentWeek}`
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          })

          if (response.ok) {
            const data = await response.json()
            return {
              localityNo: loc.localityNo,
              avgAdultFemaleLice: data.localityWeek?.avgAdultFemaleLice ?? null,
              avgMobileLice: data.localityWeek?.avgMobileLice ?? null,
              isFallow: data.localityWeek?.isFallow ?? false,
              hasReported: data.localityWeek?.hasReportedLice ?? false,
              hasSalmonoids: data.localityWeek?.hasSalmonoids ?? false,
              seaTemperature: data.localityWeek?.seaTemperature ?? null,
              diseases: extractDiseases(data)
            }
          }
          return null
        } catch (e) {
          return null
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults.filter(r => r !== null))

      const progress = Math.min(100, Math.round((i + BATCH_SIZE) / localities.length * 100))
      if (onProgress) onProgress(progress, results.length)

      if (i + BATCH_SIZE < localities.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Cache the results
    fishHealthCache = { cacheKey, data: results }
    fishHealthCacheTime = Date.now()

    return results
  } catch (error) {
    return null
  }
}

/**
 * Extract disease information from BarentsWatch locality data
 */
function extractDiseases(data) {
  const diseases = []
  if (data.ilaPd) {
    if (data.ilaPd.ila) diseases.push('INFEKSIOES_LAKSEANEMI')
    if (data.ilaPd.pd) diseases.push('PANKREASSYKDOM')
  }
  if (data.ilaPdCase) {
    if (data.ilaPdCase.ilaStatus) diseases.push('INFEKSIOES_LAKSEANEMI')
    if (data.ilaPdCase.pdStatus) diseases.push('PANKREASSYKDOM')
  }
  return diseases
}

/**
 * Get current week number
 */
function getCurrentWeek() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now - start
  const oneWeek = 604800000
  return Math.ceil((diff + start.getDay() * 86400000) / oneWeek)
}

/**
 * Enrich locality data with fish health information
 */
export function enrichWithFishHealth(localities, fishHealthData) {
  if (!fishHealthData || !localities?.features) {
    return localities
  }

  const healthMap = new Map()
  if (Array.isArray(fishHealthData)) {
    fishHealthData.forEach(item => {
      if (item.localityNo) {
        healthMap.set(item.localityNo.toString(), item)
      }
    })
  }

  const enrichedFeatures = localities.features.map(f => {
    const loknr = f.properties?.loknr?.toString()
    const healthData = healthMap.get(loknr)

    if (healthData) {
      return {
        ...f,
        properties: {
          ...f.properties,
          avgAdultFemaleLice: healthData.avgAdultFemaleLice ?? null,
          diseases: healthData.diseases || [],
          isFallow: healthData.isFallow || false,
          hasReported: healthData.hasReported !== false
        }
      }
    }

    return f
  })

  return {
    type: 'FeatureCollection',
    features: enrichedFeatures
  }
}

/**
 * Generate mock fish health data for demonstration
 */
export function generateMockFishHealthData(localities) {
  if (!localities?.features) return []

  return localities.features.map(f => {
    const loknr = f.properties?.loknr
    if (!loknr) return null

    const random = Math.random()
    let lice = null
    let hasReported = Math.random() > 0.1

    if (hasReported) {
      if (random < 0.7) {
        lice = Math.random() * 0.08
      } else if (random < 0.9) {
        lice = 0.08 + Math.random() * 0.02
      } else {
        lice = 0.10 + Math.random() * 0.15
      }
    }

    const diseases = []
    if (Math.random() < 0.02) diseases.push('PANKREASSYKDOM')
    if (Math.random() < 0.01) diseases.push('INFEKSIOES_LAKSEANEMI')
    if (Math.random() < 0.005) diseases.push('BAKTERIELL_NYRESYKE')

    return {
      localityNo: loknr,
      avgAdultFemaleLice: lice,
      diseases,
      isFallow: Math.random() < 0.05,
      hasReported
    }
  }).filter(Boolean)
}
