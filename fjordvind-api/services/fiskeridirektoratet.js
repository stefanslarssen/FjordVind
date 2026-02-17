/**
 * Fiskeridirektoratet Aquaculture REST API
 * Fetches locality and owner information from REST API
 * Using layer 4 (akvakultur_innehaverinfo) from WMS_akva service
 * This layer has formaal_kode (Matfisk, Settefisk, etc.) for facility type filtering
 */

// REST API endpoint - layer 4 has locality info with formaal_kode (facility type)
const REST_BASE = 'https://gis.fiskeridir.no/server/rest/services/fiskeridirWMS_akva/MapServer/4/query';

// Cache for company data to avoid repeated fetches
let companiesCache = null;
let localitiesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Fetch all locality data from Fiskeridirektoratet REST API (akvakultur_innehaverinfo layer)
 * Layer 4 contains locality data with formaal_kode for facility type filtering
 */
async function fetchLocalitiesWithOwners() {
  // Return cached data if valid
  if (localitiesCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    console.log('Using cached localities data');
    return localitiesCache;
  }

  try {
    console.log('Fetching all localities from Fiskeridirektoratet REST API (innehaverinfo layer)...');

    const pageSize = 1000;
    let allFeatures = [];
    let resultOffset = 0;
    let hasMore = true;

    while (hasMore) {
      // Only fetch KLARERT (active) localities
      const url = `${REST_BASE}?where=status_lokalitet%3D%27KLARERT%27+OR+status_lokalitet%3D%27AKTIV%27&outFields=loknr,navn,innehaver,formaal_kode,plassering,vannmiljo,kommune,fylke,kapasitet_lok,status_lokalitet,lat,lon&returnGeometry=false&f=json&resultOffset=${resultOffset}&resultRecordCount=${pageSize}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`REST API request failed: ${response.status}`);
        break;
      }

      const data = await response.json();

      if (data && data.features && data.features.length > 0) {
        // Map layer 4 fields to our expected format
        const mappedFeatures = data.features.map(f => {
          const attrs = f.attributes;
          return {
            type: 'Feature',
            geometry: attrs.lat && attrs.lon ? {
              type: 'Point',
              coordinates: [attrs.lon, attrs.lat]
            } : null,
            properties: {
              loknr: attrs.loknr,
              lokalitetnavn: attrs.navn,
              navn: attrs.navn,
              innehaver: attrs.innehaver,
              // formaal_kode has values like "Matfisk", "Settefisk", "Stamdyr, Stamfisk", etc.
              anleggstype: getAnleggstypeFromFormaal(attrs.formaal_kode, attrs.plassering, attrs.vannmiljo),
              formaal_kode: attrs.formaal_kode,
              kapasitet: attrs.kapasitet_lok,
              plassering: attrs.plassering,
              vannmiljo: attrs.vannmiljo,
              kommune: attrs.kommune,
              fylke: attrs.fylke,
              status: attrs.status_lokalitet,
            }
          };
        });

        allFeatures = allFeatures.concat(mappedFeatures);
        console.log(`  Batch ${Math.floor(resultOffset / pageSize) + 1}: ${data.features.length} features (total: ${allFeatures.length})`);

        if (data.features.length < pageSize || !data.exceededTransferLimit) {
          hasMore = false;
        } else {
          resultOffset += pageSize;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ Fetched ${allFeatures.length} localities from Fiskeridirektoratet`);
    localitiesCache = allFeatures;
    cacheTimestamp = Date.now();
    return allFeatures;

  } catch (error) {
    console.error('Error fetching localities from REST API:', error);
    return [];
  }
}

/**
 * Determine facility type from formaal_kode (purpose code)
 * formaal_kode can contain multiple values like "Matfisk, Settefisk, Stamdyr"
 */
function getAnleggstypeFromFormaal(formaalKode, plassering, vannmiljo) {
  const formaal = (formaalKode || '').toUpperCase();

  // Check for specific facility types in the formaal_kode
  if (formaal.includes('SETTEFISK')) {
    return 'SETTEFISK';
  }
  if (formaal.includes('SLAKT') || formaal.includes('VENTE')) {
    return 'VENTEMERD';
  }
  if (formaal.includes('STAMFISK') || formaal.includes('STAMDYR')) {
    return 'STAMFISK';
  }

  // If it's a land-based facility
  if (plassering === 'LAND') {
    if (vannmiljo === 'FERSKVANN') {
      return 'SETTEFISK'; // Land-based freshwater typically settefisk
    }
    return 'LANDANLEGG'; // Land-based saltwater = RAS
  }

  // Default for sea-based facilities
  if (formaal.includes('MATFISK') || formaal.includes('KONSUM')) {
    return 'MATFISK';
  }

  return 'MATFISK'; // Default
}

/**
 * Get all unique companies/owners from aquaculture localities
 * Extracts from "innehaver" (owner) field in WFS point data
 */
async function getAquacultureCompanies() {
  // Return cached data if valid
  if (companiesCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    console.log('Using cached companies data');
    return companiesCache;
  }

  try {
    const localities = await fetchLocalitiesWithOwners();

    // Extract unique company names from "innehaver" field
    const companiesSet = new Set();

    localities.forEach(feature => {
      const innehaver = feature.properties?.innehaver;
      if (innehaver && innehaver.trim()) {
        // Some localities have multiple owners separated by comma
        const owners = innehaver.split(',').map(owner => owner.trim());
        owners.forEach(owner => {
          if (owner) {
            companiesSet.add(owner);
          }
        });
      }
    });

    const companies = Array.from(companiesSet)
      .sort((a, b) => a.localeCompare(b, 'nb'))
      .map(name => ({ name }));

    console.log(`✅ Found ${companies.length} unique aquaculture companies`);
    companiesCache = companies;
    return companies;

  } catch (error) {
    console.error('Error extracting companies:', error);
    return [];
  }
}

/**
 * Get all sites (localities) for a specific company
 * @param {string} companyName - Company name to filter by
 */
async function getCompanySites(companyName) {
  try {
    console.log(`Fetching sites for company "${companyName}"...`);

    const localities = await fetchLocalitiesWithOwners();

    // Filter localities where innehaver includes the company name
    const matchingSites = localities
      .filter(feature => {
        const innehaver = feature.properties?.innehaver;
        return innehaver && innehaver.includes(companyName);
      })
      .map(feature => ({
        loknr: feature.properties?.loknr,
        name: feature.properties?.lokalitetnavn || feature.properties?.navn || `Lokalitet ${feature.properties?.loknr}`
      }))
      .filter(site => site.loknr != null);

    console.log(`✅ Found ${matchingSites.length} sites for company "${companyName}"`);
    return matchingSites;

  } catch (error) {
    console.error(`Error fetching sites for company "${companyName}":`, error);
    return [];
  }
}

module.exports = {
  getAquacultureCompanies,
  getCompanySites,
  fetchLocalitiesWithOwners,
};
