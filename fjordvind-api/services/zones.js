/**
 * Zones Service
 * Håndterer henting av sykdomssoner (ILA/PD) fra BarentsWatch
 * og verneområder fra GeoNorge WFS
 */

const { getAccessToken } = require('./barentswatch');

// Cache for soner (oppdateres sjelden - 24 timer TTL)
let diseaseZonesCache = {
  data: null,
  fetchedAt: null
};

let protectedAreasCache = {
  data: null,
  fetchedAt: null
};

let localityPolygonsCache = {
  data: null,
  fetchedAt: null
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 timer

/**
 * Hent sykdomssoner fra BarentsWatch
 * Henter lokaliteter med aktive sykdommer (ILA, PD) og genererer 10km soner rundt dem
 */
async function getDiseaseZones() {
  // Sjekk cache
  if (diseaseZonesCache.data && diseaseZonesCache.fetchedAt) {
    const age = Date.now() - diseaseZonesCache.fetchedAt;
    if (age < CACHE_TTL_MS) {
      console.log('Returning cached disease zones data');
      return diseaseZonesCache.data;
    }
  }

  const token = await getAccessToken();

  // Hvis ingen token, returner mock data
  if (!token) {
    console.log('No BarentsWatch token - returning mock disease zones');
    return getMockDiseaseZones();
  }

  try {
    console.log('Fetching disease zones from BarentsWatch API...');

    // Hent aktiv uke (siste tilgjengelige data)
    const now = new Date();
    const year = now.getFullYear();
    // Beregn ukenummer
    const startOfYear = new Date(year, 0, 1);
    const pastDays = Math.floor((now - startOfYear) / 86400000);
    const week = Math.max(1, Math.ceil((pastDays + startOfYear.getDay() + 1) / 7) - 1);

    // Prøv siste uke, hvis ikke tilgjengelig prøv forrige uke
    let data = null;
    for (let w = week; w >= Math.max(1, week - 4); w--) {
      const response = await fetch(
        `https://www.barentswatch.no/bwapi/v2/geodata/fishhealth/locality/${year}/${w}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (response.ok) {
        data = await response.json();
        console.log(`Got data for week ${w}/${year} - ${data.length} localities`);
        break;
      }
    }

    if (!data) {
      console.error('Could not fetch any locality data from BarentsWatch');
      return getMockDiseaseZones();
    }

    // Finn lokaliteter med sykdom og lag soner
    const features = [];
    const processedLocations = new Set(); // Unngå duplikater

    data.forEach(loc => {
      const diseases = loc.diseases || [];
      if (diseases.length === 0) return;

      const loknr = loc.locality?.no;
      const lat = loc.locality?.latitude || loc.geometry?.coordinates?.[1];
      const lon = loc.locality?.longitude || loc.geometry?.coordinates?.[0];

      if (!lat || !lon || !loknr) return;

      // Unngå duplikater
      const locKey = `${loknr}`;
      if (processedLocations.has(locKey)) return;
      processedLocations.add(locKey);

      diseases.forEach(disease => {
        let diseaseType = 'OTHER';
        let displayName = disease;

        if (disease === 'INFEKSIOES_LAKSEANEMI' || disease.includes('LAKSEANEMI')) {
          diseaseType = 'ILA';
          displayName = 'Infeksiøs lakseanemi (ILA)';
        } else if (disease === 'PANKREASSYKDOM') {
          diseaseType = 'PD';
          displayName = 'Pankreassykdom (PD)';
        } else if (disease === 'BAKTERIELL_NYRESYKE') {
          diseaseType = 'BKD';
          displayName = 'Bakteriell nyresyke (BKD)';
        } else if (disease === 'FRANCISELLOSE') {
          diseaseType = 'FRANCISELLOSE';
          displayName = 'Francisellose';
        }

        // Lag overvåkningssone (10km radius)
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          },
          properties: {
            id: `${diseaseType}-${loknr}-surveillance`,
            name: `${diseaseType}-sone ${loc.locality?.name || loknr}`,
            diseaseType: diseaseType,
            diseaseName: displayName,
            zoneType: 'surveillance',
            localityNo: loknr,
            localityName: loc.locality?.name,
            municipality: loc.municipality?.name,
            radiusKm: 10,
            center: { lat, lng: lon }
          }
        });

        // For ILA: Lag også beskyttelsessone (3km radius)
        if (diseaseType === 'ILA') {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [lon, lat]
            },
            properties: {
              id: `ILA-${loknr}-protection`,
              name: `ILA beskyttelsessone ${loc.locality?.name || loknr}`,
              diseaseType: 'ILA',
              diseaseName: displayName,
              zoneType: 'protection',
              localityNo: loknr,
              localityName: loc.locality?.name,
              municipality: loc.municipality?.name,
              radiusKm: 3,
              center: { lat, lng: lon }
            }
          });
        }
      });
    });

    const result = {
      type: 'FeatureCollection',
      features: features,
      fetchedAt: new Date().toISOString(),
      source: 'BarentsWatch',
      stats: {
        totalZones: features.length,
        ilaZones: features.filter(f => f.properties.diseaseType === 'ILA').length,
        pdZones: features.filter(f => f.properties.diseaseType === 'PD').length,
        otherZones: features.filter(f => !['ILA', 'PD'].includes(f.properties.diseaseType)).length
      }
    };

    // Oppdater cache
    diseaseZonesCache.data = result;
    diseaseZonesCache.fetchedAt = Date.now();

    console.log(`✅ Cached ${features.length} disease zones from BarentsWatch (ILA: ${result.stats.ilaZones}, PD: ${result.stats.pdZones})`);
    return result;

  } catch (error) {
    console.error('Error fetching disease zones from BarentsWatch:', error);
    return getMockDiseaseZones();
  }
}

/**
 * Hent verneområder fra Miljødirektoratet ArcGIS REST API
 * Bruker vern MapServer for naturvernområder
 */
async function getProtectedAreas(bbox = null) {
  // Sjekk cache (uten bbox for full data)
  if (!bbox && protectedAreasCache.data && protectedAreasCache.fetchedAt) {
    const age = Date.now() - protectedAreasCache.fetchedAt;
    if (age < CACHE_TTL_MS) {
      console.log('Returning cached protected areas data');
      return protectedAreasCache.data;
    }
  }

  try {
    console.log('Fetching protected areas from Miljødirektoratet...');

    // Miljødirektoratet ArcGIS REST API for naturvernområder
    const baseUrl = 'https://kart.miljodirektoratet.no/arcgis/rest/services/vern/MapServer/0/query';

    // Bygg query parameters
    const params = new URLSearchParams({
      where: '1=1', // Hent alle
      outFields: 'naturvernId,navn,verneform,vernedato,kommune,forvaltningsmyndighet,iucn',
      f: 'geojson', // GeoJSON format
      outSR: '4326', // WGS84 koordinater
      resultRecordCount: '500' // Begrens for ytelse
    });

    // Legg til bbox filter hvis spesifisert (format: minX,minY,maxX,maxY)
    if (bbox) {
      params.set('geometry', bbox);
      params.set('geometryType', 'esriGeometryEnvelope');
      params.set('inSR', '4326');
      params.set('spatialRel', 'esriSpatialRelIntersects');
    }

    const queryUrl = `${baseUrl}?${params.toString()}`;

    const response = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Miljødirektoratet request failed: ${response.status} ${response.statusText}`);
      return getMockProtectedAreas();
    }

    const data = await response.json();
    console.log(`Received ${data.features?.length || 0} protected areas from Miljødirektoratet`);

    // Transform til vårt format
    const features = (data.features || []).map(feature => {
      const props = feature.properties || {};

      // Parse vernedato til år
      let establishedYear = null;
      if (props.vernedato) {
        // vernedato er ofte epoch timestamp i ms
        const date = new Date(props.vernedato);
        establishedYear = date.getFullYear();
      }

      return {
        type: 'Feature',
        geometry: feature.geometry,
        properties: {
          id: props.naturvernId || props.OBJECTID,
          name: props.navn || 'Ukjent verneområde',
          areaType: props.verneform || 'naturreservat',
          establishedYear: establishedYear,
          regulation: props.forvaltningsmyndighet,
          iucnCategory: props.iucn,
          municipality: props.kommune,
        }
      };
    });

    const result = {
      type: 'FeatureCollection',
      features: features,
      fetchedAt: new Date().toISOString(),
      source: 'Miljødirektoratet'
    };

    // Oppdater cache kun hvis vi hentet full data (uten bbox)
    if (!bbox) {
      protectedAreasCache.data = result;
      protectedAreasCache.fetchedAt = Date.now();
      console.log(`✅ Cached ${features.length} protected areas from Miljødirektoratet`);
    }

    return result;

  } catch (error) {
    console.error('Error fetching protected areas from Miljødirektoratet:', error);
    return getMockProtectedAreas();
  }
}

/**
 * Hent lokalitets-polygoner fra Fiskeridirektoratet WFS
 * Returnerer faktiske oppdrettsanlegg-grenser
 */
async function getLocalityPolygons() {
  // Sjekk cache
  if (localityPolygonsCache.data && localityPolygonsCache.fetchedAt) {
    const age = Date.now() - localityPolygonsCache.fetchedAt;
    if (age < CACHE_TTL_MS) {
      console.log('Returning cached locality polygons data');
      return localityPolygonsCache.data;
    }
  }

  try {
    console.log('Fetching locality polygons from GeoNorge WFS (GML)...');

    // GeoNorge WFS for akvakulturlokaliteter (polygon-grenser)
    const wfsUrl = 'https://wfs.geonorge.no/skwms1/wfs.akvakulturlokaliteter';

    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: 'app:AkvakulturFlate',
      srsName: 'EPSG:4326',
      count: '10000'
    });

    const response = await fetch(`${wfsUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml',
      },
    });

    if (!response.ok) {
      console.error(`GeoNorge WFS request failed: ${response.status}`);
      throw new Error(`WFS request failed: ${response.status}`);
    }

    const gmlText = await response.text();
    console.log(`Received GML response (${gmlText.length} bytes)`);

    // Parse GML to extract polygons
    const features = parseGMLToGeoJSON(gmlText);
    console.log(`Parsed ${features.length} locality polygons from GML`);

    const result = {
      type: 'FeatureCollection',
      features: features,
      fetchedAt: new Date().toISOString(),
      source: 'GeoNorge'
    };

    // Oppdater cache
    localityPolygonsCache.data = result;
    localityPolygonsCache.fetchedAt = Date.now();
    console.log(`✅ Cached ${features.length} locality polygons from GeoNorge`);

    return result;

  } catch (error) {
    console.error('Error fetching locality polygons:', error);
    // Returner tom FeatureCollection ved feil
    return {
      type: 'FeatureCollection',
      features: [],
      fetchedAt: new Date().toISOString(),
      source: 'Error',
      error: error.message
    };
  }
}

/**
 * Parse GML response to GeoJSON features
 */
function parseGMLToGeoJSON(gmlText) {
  const features = [];

  // Regex to extract AkvakulturFlate elements
  const featureRegex = /<app:AkvakulturFlate[^>]*gml:id="([^"]+)"[^>]*>([\s\S]*?)<\/app:AkvakulturFlate>/g;
  const posListRegex = /<gml:posList>([^<]+)<\/gml:posList>/;
  const firmaRegex = /<app:firmanavn>([^<]*)<\/app:firmanavn>/;
  const artRegex = /<app:akvaArt>([^<]*)<\/app:akvaArt>/g;
  const plasseringRegex = /<app:akvaPlassering>([^<]*)<\/app:akvaPlassering>/;
  const vannmiljoRegex = /<app:akvaVannmiljø>([^<]*)<\/app:akvaVannmiljø>/;

  let match;
  while ((match = featureRegex.exec(gmlText)) !== null) {
    const id = match[1];
    const content = match[2];

    // Extract coordinates from posList
    const posListMatch = posListRegex.exec(content);
    if (!posListMatch) continue;

    const posListStr = posListMatch[1].trim();
    const coords = posListStr.split(/\s+/).map(Number);

    // Convert to GeoJSON coordinate pairs [lng, lat]
    const coordinates = [];
    for (let i = 0; i < coords.length; i += 2) {
      if (i + 1 < coords.length) {
        coordinates.push([coords[i], coords[i + 1]]);
      }
    }

    if (coordinates.length < 3) continue;

    // Extract properties
    const firmaMatch = firmaRegex.exec(content);
    const plasseringMatch = plasseringRegex.exec(content);
    const vannmiljoMatch = vannmiljoRegex.exec(content);

    // Extract all art types
    const artTypes = [];
    let artMatch;
    while ((artMatch = artRegex.exec(content)) !== null) {
      artTypes.push(artMatch[1]);
    }

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates]
      },
      properties: {
        id: id,
        owner: firmaMatch ? firmaMatch[1] : null,
        organisasjon: firmaMatch ? firmaMatch[1] : null,
        plassering: plasseringMatch ? plasseringMatch[1] : null,
        vannmiljo: vannmiljoMatch ? vannmiljoMatch[1] : null,
        art: artTypes.join(', ')
      }
    });
  }

  return features;
}

/**
 * Mock data for sykdomssoner (brukes ved manglende API-tilgang)
 * Basert på typiske ILA/PD soner langs norskekysten
 */
function getMockDiseaseZones() {
  console.log('Using mock disease zones data');

  return {
    type: 'FeatureCollection',
    features: [
      // ILA overvåkningssone - Nordland
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [14.5, 67.8]
        },
        properties: {
          id: 'mock-ila-1',
          name: 'ILA-sone Bodø',
          diseaseType: 'ILA',
          zoneType: 'surveillance',
          validFrom: '2024-06-15',
          validTo: null,
          regulation: 'FOR-2024-0615',
          municipality: 'Bodø',
          county: 'Nordland',
          radiusKm: 10,
          center: { lat: 67.8, lng: 14.5 }
        }
      },
      // ILA beskyttelsessone - Nordland
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [14.5, 67.8]
        },
        properties: {
          id: 'mock-ila-2',
          name: 'ILA-sone Bodø (indre)',
          diseaseType: 'ILA',
          zoneType: 'protection',
          validFrom: '2024-06-15',
          validTo: null,
          regulation: 'FOR-2024-0615',
          municipality: 'Bodø',
          county: 'Nordland',
          radiusKm: 3,
          center: { lat: 67.8, lng: 14.5 }
        }
      },
      // PD overvåkningssone - Vestland
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [5.3, 60.4]
        },
        properties: {
          id: 'mock-pd-1',
          name: 'PD-sone Hardangerfjorden',
          diseaseType: 'PD',
          zoneType: 'surveillance',
          validFrom: '2024-03-01',
          validTo: null,
          regulation: 'FOR-2024-0301',
          municipality: 'Ullensvang',
          county: 'Vestland',
          radiusKm: 10,
          center: { lat: 60.4, lng: 5.3 }
        }
      },
      // ILA-sone Troms
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [18.5, 69.4]
        },
        properties: {
          id: 'mock-ila-3',
          name: 'ILA-sone Senja',
          diseaseType: 'ILA',
          zoneType: 'surveillance',
          validFrom: '2024-09-10',
          validTo: null,
          regulation: 'FOR-2024-0910',
          municipality: 'Senja',
          county: 'Troms',
          radiusKm: 10,
          center: { lat: 69.4, lng: 18.5 }
        }
      },
      // PD-sone Møre og Romsdal
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [6.3, 62.5]
        },
        properties: {
          id: 'mock-pd-2',
          name: 'PD-sone Ålesund',
          diseaseType: 'PD',
          zoneType: 'surveillance',
          validFrom: '2024-05-20',
          validTo: null,
          regulation: 'FOR-2024-0520',
          municipality: 'Ålesund',
          county: 'Møre og Romsdal',
          radiusKm: 10,
          center: { lat: 62.5, lng: 6.3 }
        }
      },
    ],
    fetchedAt: new Date().toISOString(),
    source: 'Mock'
  };
}

/**
 * Mock data for verneområder
 * Typiske marine verneområder langs norskekysten
 */
function getMockProtectedAreas() {
  console.log('Using mock protected areas data');

  return {
    type: 'FeatureCollection',
    features: [
      // Naturreservat - Lofoten
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [13.5, 68.2],
            [13.8, 68.2],
            [13.8, 68.35],
            [13.5, 68.35],
            [13.5, 68.2]
          ]]
        },
        properties: {
          id: 'mock-nr-1',
          name: 'Røstlandet naturreservat',
          areaType: 'naturreservat',
          establishedYear: 2002,
          areaKm2: 12.5,
          regulation: 'Forskrift om Røstlandet naturreservat',
          municipality: 'Røst',
          county: 'Nordland'
        }
      },
      // Dyrelivsfredning - Vestfjorden
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [14.0, 67.5],
            [14.4, 67.5],
            [14.4, 67.7],
            [14.0, 67.7],
            [14.0, 67.5]
          ]]
        },
        properties: {
          id: 'mock-df-1',
          name: 'Vestfjorden dyrelivsfredningsområde',
          areaType: 'dyrelivsfredning',
          establishedYear: 1995,
          areaKm2: 45.2,
          regulation: 'Forskrift om dyrelivsfredning Vestfjorden',
          municipality: 'Vågan',
          county: 'Nordland'
        }
      },
      // Naturreservat - Sognefjorden
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [6.8, 61.0],
            [7.2, 61.0],
            [7.2, 61.15],
            [6.8, 61.15],
            [6.8, 61.0]
          ]]
        },
        properties: {
          id: 'mock-nr-2',
          name: 'Sognefjorden naturreservat',
          areaType: 'naturreservat',
          establishedYear: 2010,
          areaKm2: 28.3,
          regulation: 'Forskrift om Sognefjorden naturreservat',
          municipality: 'Sogndal',
          county: 'Vestland'
        }
      },
      // Marint verneområde - Troms
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [18.2, 69.5],
            [18.8, 69.5],
            [18.8, 69.7],
            [18.2, 69.7],
            [18.2, 69.5]
          ]]
        },
        properties: {
          id: 'mock-mv-1',
          name: 'Tromsøflaket marine verneområde',
          areaType: 'marint_verneomrade',
          establishedYear: 2018,
          areaKm2: 85.7,
          regulation: 'Forskrift om marine verneområder Troms',
          municipality: 'Tromsø',
          county: 'Troms'
        }
      },
    ],
    fetchedAt: new Date().toISOString(),
    source: 'Mock'
  };
}

/**
 * Tøm cache for soner (brukes ved behov for å tvinge ny henting)
 */
function clearZonesCache() {
  diseaseZonesCache.data = null;
  diseaseZonesCache.fetchedAt = null;
  protectedAreasCache.data = null;
  protectedAreasCache.fetchedAt = null;
  console.log('Zones cache cleared');
}

module.exports = {
  getDiseaseZones,
  getProtectedAreas,
  getLocalityPolygons,
  clearZonesCache,
  getMockDiseaseZones,
  getMockProtectedAreas,
};
