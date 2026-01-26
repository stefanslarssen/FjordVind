/**
 * BarentsWatch API Service
 * Håndterer autentisering og datahenting fra BarentsWatch Fish Health API
 */

// BarentsWatch credentials (sett disse som miljøvariabler)
const BARENTSWATCH_CLIENT_ID = process.env.BARENTSWATCH_CLIENT_ID;
const BARENTSWATCH_CLIENT_SECRET = process.env.BARENTSWATCH_CLIENT_SECRET;

// Cache for access token
let tokenCache = {
  token: null,
  expiresAt: null
};

/**
 * Hent access token fra BarentsWatch
 */
async function getAccessToken() {
  // Sjekk om vi har gyldig token i cache
  if (tokenCache.token && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  // TODO: Implementer når du har fått API-nøkler
  // For nå returnerer vi null og bruker mock data
  if (!BARENTSWATCH_CLIENT_ID || !BARENTSWATCH_CLIENT_SECRET) {
    console.warn('BarentsWatch credentials not configured. Using mock data.');
    return null;
  }

  try {
    const response = await fetch('https://id.barentswatch.no/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: BARENTSWATCH_CLIENT_ID,
        client_secret: BARENTSWATCH_CLIENT_SECRET,
        scope: 'api',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();

    // Cache token (gyldig i 1 time minus 5 minutter buffer)
    tokenCache.token = data.access_token;
    tokenCache.expiresAt = Date.now() + ((data.expires_in - 300) * 1000);

    return data.access_token;
  } catch (error) {
    console.error('Error getting BarentsWatch access token:', error);
    throw error;
  }
}

/**
 * Hent lokaliteter med lusedata for en spesifikk uke
 */
async function getLocalitiesWithLiceData(year, week) {
  const token = await getAccessToken();

  // Hvis ingen token, returner mock data
  if (!token) {
    return getMockLocalitiesData();
  }

  try {
    const response = await fetch(
      `https://www.barentswatch.no/bwapi/v2/geodata/fishhealth/locality/${year}/${week}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Filtre kan legges til her om ønskelig
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch localities: ${response.statusText}`);
    }

    const data = await response.json();

    // Transform BarentsWatch format to our format
    return data.map(loc => ({
      localityNo: loc.locality?.no,
      name: loc.locality?.name,
      latitude: loc.geometry?.coordinates?.[1],  // GeoJSON: [lng, lat]
      longitude: loc.geometry?.coordinates?.[0],
      municipality: loc.municipality?.name,
      avgAdultFemaleLice: loc.liceReport?.adultFemaleLice?.average,
      avgMobileLice: loc.liceReport?.mobileLice?.average,
      avgStationaryLice: loc.liceReport?.stationaryLice?.average,
      seaTemperature: loc.liceReport?.seaTemperature,
      hasReported: loc.liceReport?.hasReported,
      isFallow: loc.liceReport?.isFallow,
      hasSalmonoidLicense: loc.hasSalmonoidLicense,
      status: getStatus(loc.liceReport?.adultFemaleLice?.average),
    }));
  } catch (error) {
    console.error('Error fetching localities from BarentsWatch:', error);
    throw error;
  }
}

/**
 * Beregn status basert på lusenivå
 */
function getStatus(avgLice) {
  if (avgLice === null || avgLice === undefined) return 'UNKNOWN';
  if (avgLice >= 0.5) return 'DANGER';
  if (avgLice >= 0.2) return 'WARNING';
  return 'OK';
}

/**
 * Finn nabooppdrett innenfor en radius
 */
function findNearbyFarms(centerLat, centerLng, radiusKm, allFarms) {
  return allFarms
    .map(farm => {
      const distance = calculateDistance(centerLat, centerLng, farm.latitude, farm.longitude);
      return {
        ...farm,
        distance: distance,
      };
    })
    .filter(farm => farm.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Beregn avstand mellom to koordinater (Haversine-formel)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Jordens radius i km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Mock data for testing uten BarentsWatch-tilgang
 * Generer realistiske data for hele Vestlandet og Nord-Norge
 */
function getMockLocalitiesData() {
  // Større datasett som dekker hele Norge
  const localities = [];

  // Hordaland/Vestland (rundt Bergen)
  const vestlandBase = [
    { name: 'Klongsholmen', lat: 60.5833, lng: 5.4167, muni: 'Bergen', lice: 0.65 },
    { name: 'Øygarden Nord', lat: 60.5900, lng: 5.4300, muni: 'Øygarden', lice: 1.82 },
    { name: 'Osterøy Sør', lat: 60.5700, lng: 5.4000, muni: 'Osterøy', lice: 0.95 },
    { name: 'Fensfjorden', lat: 60.6000, lng: 5.4500, muni: 'Masfjorden', lice: 0.45 },
    { name: 'Radsundet', lat: 60.5500, lng: 5.3800, muni: 'Øygarden', lice: 1.15 },
    { name: 'Hjeltefjorden Vest', lat: 60.6100, lng: 5.3700, muni: 'Alver', lice: 0.38 },
    { name: 'Sotra Sør', lat: 60.3500, lng: 5.1000, muni: 'Øygarden', lice: 0.72 },
    { name: 'Austevoll', lat: 60.0800, lng: 5.2500, muni: 'Austevoll', lice: 0.55 },
    { name: 'Bømlo Nord', lat: 59.8500, lng: 5.2000, muni: 'Bømlo', lice: 1.05 },
    { name: 'Stord Vest', lat: 59.7800, lng: 5.4500, muni: 'Stord', lice: 0.88 },
  ];

  // Hardanger
  const hardangerBase = [
    { name: 'Hardangerfjorden Nord', lat: 60.3000, lng: 6.3000, muni: 'Ullensvang', lice: 0.62 },
    { name: 'Utne', lat: 60.4200, lng: 6.5200, muni: 'Ullensvang', lice: 0.45 },
    { name: 'Eidfjord', lat: 60.4700, lng: 7.0700, muni: 'Eidfjord', lice: 0.35 },
    { name: 'Granvin', lat: 60.5300, lng: 6.7200, muni: 'Ulvik', lice: 0.58 },
  ];

  // Sogn og Fjordane
  const sognBase = [
    { name: 'Sognefjorden Indre', lat: 61.0900, lng: 7.2000, muni: 'Sogndal', lice: 0.48 },
    { name: 'Aurlandsfjorden', lat: 60.9100, lng: 7.1900, muni: 'Aurland', lice: 0.52 },
    { name: 'Florø Nord', lat: 61.6000, lng: 5.0300, muni: 'Kinn', lice: 0.95 },
    { name: 'Førde Vest', lat: 61.4500, lng: 5.8500, muni: 'Sunnfjord', lice: 0.68 },
  ];

  // Møre og Romsdal
  const moreBase = [
    { name: 'Ålesund Sør', lat: 62.4700, lng: 6.1500, muni: 'Ålesund', lice: 1.12 },
    { name: 'Molde Nord', lat: 62.7400, lng: 7.1600, muni: 'Molde', lice: 0.78 },
    { name: 'Kristiansund Vest', lat: 63.1100, lng: 7.7300, muni: 'Kristiansund', lice: 0.92 },
    { name: 'Sula', lat: 62.4200, lng: 6.1100, muni: 'Sula', lice: 1.25 },
  ];

  // Trøndelag
  const trondelagBase = [
    { name: 'Hitra Nord', lat: 63.6000, lng: 8.6500, muni: 'Hitra', lice: 0.85 },
    { name: 'Frøya Sør', lat: 63.6700, lng: 8.7500, muni: 'Frøya', lice: 0.72 },
    { name: 'Åfjord', lat: 63.9600, lng: 10.2200, muni: 'Åfjord', lice: 0.58 },
    { name: 'Rørvik', lat: 64.8600, lng: 11.2400, muni: 'Nærøysund', lice: 0.45 },
  ];

  // Nordland
  const nordlandBase = [
    { name: 'Bodø Vest', lat: 67.2800, lng: 14.4000, muni: 'Bodø', lice: 0.35 },
    { name: 'Lofoten Sør', lat: 68.0800, lng: 13.5700, muni: 'Vågan', lice: 0.42 },
    { name: 'Vesterålen Nord', lat: 68.8100, lng: 15.4000, muni: 'Sortland', lice: 0.38 },
    { name: 'Salten', lat: 67.0000, lng: 15.0000, muni: 'Gildeskål', lice: 0.52 },
  ];

  // Troms
  const tromsBase = [
    { name: 'Tromsø Sør', lat: 69.6500, lng: 18.9600, muni: 'Tromsø', lice: 0.28 },
    { name: 'Senja Nord', lat: 69.3500, lng: 17.9700, muni: 'Senja', lice: 0.35 },
    { name: 'Kvaløya', lat: 69.7400, lng: 18.6200, muni: 'Tromsø', lice: 0.32 },
  ];

  // Finnmark
  const finnmarkBase = [
    { name: 'Alta Vest', lat: 69.9700, lng: 23.2700, muni: 'Alta', lice: 0.22 },
    { name: 'Hammerfest Nord', lat: 70.6600, lng: 23.6800, muni: 'Hammerfest', lice: 0.18 },
    { name: 'Vardø', lat: 70.3700, lng: 31.1100, muni: 'Vardø', lice: 0.15 },
  ];

  const allRegions = [
    ...vestlandBase,
    ...hardangerBase,
    ...sognBase,
    ...moreBase,
    ...trondelagBase,
    ...nordlandBase,
    ...tromsBase,
    ...finnmarkBase,
  ];

  let localityNo = 10000;
  allRegions.forEach(loc => {
    // Simulate some localities being fallow (brakklagt)
    const isFallow = Math.random() < 0.15; // 15% av lokalitetene er brakklagt
    const hasReported = !isFallow && Math.random() > 0.05; // Aktive rapporterer vanligvis

    localities.push({
      localityNo: localityNo++,
      name: loc.name,
      latitude: loc.lat,
      longitude: loc.lng,
      municipality: loc.muni,
      avgAdultFemaleLice: isFallow ? null : loc.lice,
      avgMobileLice: isFallow ? null : loc.lice * 1.5,
      avgStationaryLice: isFallow ? null : loc.lice * 0.8,
      seaTemperature: isFallow ? null : (6 + Math.random() * 6), // 6-12°C
      hasReported: hasReported,
      isFallow: isFallow,
      hasSalmonoidLicense: true, // Alle mock-data er sjøbaserte laks/ørret anlegg
      status: isFallow ? 'UNKNOWN' : (loc.lice >= 0.10 ? 'DANGER' : loc.lice >= 0.08 ? 'WARNING' : 'OK'),
      owner: `${loc.name} Oppdrett AS`,
    });
  });

  return localities;
}

/**
 * Hent nabooppdrett rundt en gitt posisjon
 */
async function getNearbyFarms(latitude, longitude, radiusKm = 10) {
  try {
    // Hent gjeldende uke
    const now = new Date();
    const year = now.getFullYear();
    const week = getWeekNumber(now);

    // Hent alle lokaliteter med lusedata
    const allLocalities = await getLocalitiesWithLiceData(year, week);

    // Finn naboer innenfor radius
    const nearbyFarms = findNearbyFarms(
      latitude,
      longitude,
      radiusKm,
      allLocalities
    );

    return nearbyFarms;
  } catch (error) {
    console.error('Error getting nearby farms:', error);
    // Returner mock data ved feil
    const mockData = getMockLocalitiesData();
    return findNearbyFarms(latitude, longitude, radiusKm, mockData);
  }
}

/**
 * Hent ISO ukenummer
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Hent faktiske polygon-geometrier for lokaliteter fra Geonorge WFS (åpent API)
 * Dette er et offentlig tilgjengelig WFS-endepunkt som ikke krever autentisering
 */
async function getLocalityPolygons() {
  try {
    // Hent polygon-geometrier via ArcGIS REST API
    // WFS-grensesnittet har problemer, så vi bruker REST API i stedet
    console.log('Fetching locality polygons from Fiskeridirektoratet (REST API)...');

    const baseUrl = 'https://gis.fiskeridir.no/server/rest/services/FiskeridirWFS_akva/MapServer/80/query';
    const pageSize = 1000; // REST API støtter større batches
    let allFeatures = [];
    let filteredCount = {
      landFreshwater: 0,
      keptFeatures: 0,
      total: 0
    };
    let resultOffset = 0;
    let hasMore = true;

    while (hasMore) {
      // REST API query: hent alle features med paginering
      const queryUrl = `${baseUrl}?where=1%3D1&outFields=*&returnGeometry=true&f=geojson&resultOffset=${resultOffset}&resultRecordCount=${pageSize}`;

      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`REST API request failed: ${response.status} ${response.statusText}`);
        return null;
      }

      const geoJsonData = await response.json();

      if (geoJsonData && geoJsonData.features && geoJsonData.features.length > 0) {
        filteredCount.total += geoJsonData.features.length;

        // Filter basert på:
        // 1) Gyldig geometri
        // 2) Kun sjøanlegg (SJØ + SALTVANN) og landbaserte saltvannsanlegg (LAND + SALTVANN)
        // 3) EKSKLUDER landbaserte ferskvannsanlegg (LAND + FERSKVANN) - ingen lus i ferskvann
        const validFeatures = geoJsonData.features.filter(f => {
          // Must have valid geometry
          if (!f.geometry || !f.geometry.coordinates || f.geometry.coordinates.length === 0) {
            return false;
          }

          const plassering = f.properties?.plassering || '';
          const vannmiljo = f.properties?.vannmiljo || '';

          // FILTRER UT: Landbaserte ferskvannsanlegg (settefisk, matfisk i ferskvann, etc.)
          // Lus lever kun i saltvann, så ferskvannsanlegg har ingen luserelevans
          if (plassering === 'LAND' && vannmiljo === 'FERSKVANN') {
            filteredCount.landFreshwater++;
            return false;
          }

          // BEHOLD alt annet:
          // - SJØ + SALTVANN (normale sjøanlegg for matfisk)
          // - LAND + SALTVANN (landbaserte RAS-anlegg med sjøvann)
          filteredCount.keptFeatures++;
          return true;
        });

        allFeatures = allFeatures.concat(validFeatures);
        console.log(`  Batch ${Math.floor(resultOffset / pageSize) + 1}: ${validFeatures.length}/${geoJsonData.features.length} kept (total: ${filteredCount.landFreshwater} land+freshwater filtered)`);

        // Check if there are more features
        if (geoJsonData.features.length < pageSize) {
          hasMore = false;
        } else {
          resultOffset += pageSize;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`\n📊 FILTERING SUMMARY:`);
    console.log(`   Total polygons from REST API: ${filteredCount.total}`);
    console.log(`   ✅ Kept (lice-relevant): ${filteredCount.keptFeatures}`);
    console.log(`   ❌ Filtered out (LAND + FERSKVANN): ${filteredCount.landFreshwater}`);
    console.log(`   → ${allFeatures.length} real polygons will be displayed on map\n`);

    if (allFeatures.length > 0) {
      return {
        type: 'FeatureCollection',
        features: allFeatures
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching locality polygons from REST API:', error);
    return null;
  }
}

/**
 * Hent polygon-grenser fra BarentsWatch API for en spesifikk lokalitet
 * Endpoint: GET /bwapi/v2/geodata/locality/{localityNo}
 */
async function getLocalityPolygonFromBarentsWatch(localityNo) {
  const token = await getAccessToken();

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(
      `https://www.barentswatch.no/bwapi/v2/geodata/locality/${localityNo}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching polygon for locality ${localityNo}:`, error);
    return null;
  }
}

/**
 * Hent polygon-grenser fra BarentsWatch for flere lokaliteter
 * Returnerer GeoJSON FeatureCollection med detaljerte polygon-grenser
 */
async function getLocalityPolygonsFromBarentsWatch(localityNumbers) {
  const token = await getAccessToken();

  if (!token) {
    console.log('No BarentsWatch token - cannot fetch detailed polygons');
    return null;
  }

  console.log(`Fetching detailed polygons from BarentsWatch for ${localityNumbers.length} localities...`);

  const features = [];
  const batchSize = 50; // Prosesser i batches for å unngå rate limiting

  for (let i = 0; i < localityNumbers.length; i += batchSize) {
    const batch = localityNumbers.slice(i, i + batchSize);

    const promises = batch.map(async (loknr) => {
      try {
        const response = await fetch(
          `https://www.barentswatch.no/bwapi/v2/geodata/locality/${loknr}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data && data.geometry) {
            return {
              type: 'Feature',
              geometry: data.geometry,
              properties: {
                loknr: loknr,
                name: data.name || data.lokalitetsnavn,
                owner: data.owner || data.innehaver,
                facilityType: data.facilityType || data.anleggstype,
                municipality: data.municipality || data.kommune,
                ...data.properties
              }
            };
          }
        }
        return null;
      } catch (err) {
        return null;
      }
    });

    const results = await Promise.all(promises);
    features.push(...results.filter(f => f !== null));

    console.log(`  Batch ${Math.floor(i / batchSize) + 1}: ${features.length} polygons fetched`);

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < localityNumbers.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`✅ Fetched ${features.length} detailed polygon boundaries from BarentsWatch`);

  return {
    type: 'FeatureCollection',
    features: features
  };
}

module.exports = {
  getAccessToken,
  getLocalitiesWithLiceData,
  getNearbyFarms,
  findNearbyFarms,
  calculateDistance,
  getWeekNumber,
  getLocalityPolygons,
  getLocalityPolygonFromBarentsWatch,
  getLocalityPolygonsFromBarentsWatch,
};
