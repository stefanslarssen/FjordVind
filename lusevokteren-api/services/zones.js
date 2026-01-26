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

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 timer

/**
 * Hent sykdomssoner (ILA/PD kontrollområder) fra BarentsWatch
 * Endepunkt: GET /bwapi/v2/geodata/fishhealth/controlAreas
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

    const response = await fetch(
      'https://www.barentswatch.no/bwapi/v2/geodata/fishhealth/controlAreas',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`BarentsWatch control areas request failed: ${response.status} ${response.statusText}`);
      return getMockDiseaseZones();
    }

    const data = await response.json();
    console.log(`Received ${Array.isArray(data) ? data.length : 'unknown'} control areas from BarentsWatch`);

    // Transform til GeoJSON FeatureCollection
    const features = [];

    if (Array.isArray(data)) {
      data.forEach(area => {
        // BarentsWatch returnerer kontrollområder med geometri
        if (area.geometry) {
          features.push({
            type: 'Feature',
            geometry: area.geometry,
            properties: {
              id: area.id || area.controlAreaId,
              name: area.name || area.controlAreaName,
              diseaseType: area.diseaseType || area.disease || 'ILA',
              zoneType: area.zoneType || area.type || 'surveillance', // 'surveillance' eller 'protection'
              validFrom: area.validFrom || area.establishedDate,
              validTo: area.validTo,
              regulation: area.regulation || area.regulationName,
              municipality: area.municipality,
              county: area.county,
              radiusKm: area.radiusKm || 10,
              center: area.center || null,
            }
          });
        }
      });
    }

    const result = {
      type: 'FeatureCollection',
      features: features,
      fetchedAt: new Date().toISOString(),
      source: 'BarentsWatch'
    };

    // Oppdater cache
    diseaseZonesCache.data = result;
    diseaseZonesCache.fetchedAt = Date.now();

    console.log(`✅ Cached ${features.length} disease zones from BarentsWatch`);
    return result;

  } catch (error) {
    console.error('Error fetching disease zones from BarentsWatch:', error);
    return getMockDiseaseZones();
  }
}

/**
 * Hent verneområder fra GeoNorge WFS
 * Bruker WFS-tjenesten for naturvernområder
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
    console.log('Fetching protected areas from GeoNorge WFS...');

    // GeoNorge WFS for naturvernområder
    const baseUrl = 'https://wfs.geonorge.no/skwms1/wfs.naturvern';

    // Bygg WFS GetFeature request
    let wfsUrl = `${baseUrl}?service=WFS&version=2.0.0&request=GetFeature&typeName=naturvern:Naturvernomrade&outputFormat=application/json&srsName=EPSG:4326`;

    // Legg til bbox filter hvis spesifisert
    if (bbox) {
      // bbox format: minLng,minLat,maxLng,maxLat
      wfsUrl += `&bbox=${bbox},EPSG:4326`;
    }

    // Begrens antall features for ytelse
    wfsUrl += '&count=500';

    const response = await fetch(wfsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`GeoNorge WFS request failed: ${response.status} ${response.statusText}`);
      return getMockProtectedAreas();
    }

    const data = await response.json();
    console.log(`Received ${data.features?.length || 0} protected areas from GeoNorge`);

    // Transform properties til norsk-vennlig format
    const features = (data.features || []).map(feature => {
      const props = feature.properties || {};
      return {
        type: 'Feature',
        geometry: feature.geometry,
        properties: {
          id: props.objektid || props.id,
          name: props.navn || props.omradenavn || 'Ukjent verneområde',
          areaType: props.verneform || props.vernetype || 'naturreservat',
          establishedYear: props.vernear || props.vernet_ar,
          areaKm2: props.areal_km2 || props.landareal_km2,
          regulation: props.forskrift || props.forvaltningsmyndighet,
          iucnCategory: props.iucn_kategori,
          municipality: props.kommune,
          county: props.fylke,
        }
      };
    });

    const result = {
      type: 'FeatureCollection',
      features: features,
      fetchedAt: new Date().toISOString(),
      source: 'GeoNorge'
    };

    // Oppdater cache kun hvis vi hentet full data (uten bbox)
    if (!bbox) {
      protectedAreasCache.data = result;
      protectedAreasCache.fetchedAt = Date.now();
      console.log(`✅ Cached ${features.length} protected areas from GeoNorge`);
    }

    return result;

  } catch (error) {
    console.error('Error fetching protected areas from GeoNorge:', error);
    return getMockProtectedAreas();
  }
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
  clearZonesCache,
  getMockDiseaseZones,
  getMockProtectedAreas,
};
