/**
 * Fiskeridirektoratet Aquaculture REST API
 * Fetches locality and owner information from REST API
 * Using layer 6 (Biomasse) as primary data source since layer 0 is currently empty
 */

// REST API endpoint - layer 6 has current biomass/locality data
const REST_BASE = 'https://gis.fiskeridir.no/server/rest/services/FiskeridirWFS_akva/MapServer/6/query';

// Cache for company data to avoid repeated fetches
let companiesCache = null;
let localitiesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Fetch all locality point data from Fiskeridirektoratet REST API (Biomasse layer)
 * Layer 6 contains current locality data with biomass information
 */
async function fetchLocalitiesWithOwners() {
  // Return cached data if valid
  if (localitiesCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    console.log('Using cached localities data');
    return localitiesCache;
  }

  try {
    console.log('Fetching all localities from Fiskeridirektoratet REST API (Biomasse layer)...');

    const pageSize = 1000;
    let allFeatures = [];
    let resultOffset = 0;
    let hasMore = true;

    while (hasMore) {
      const url = `${REST_BASE}?where=1=1&outFields=*&returnGeometry=true&f=geojson&resultOffset=${resultOffset}&resultRecordCount=${pageSize}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`REST API request failed: ${response.status}`);
        break;
      }

      const data = await response.json();

      if (data && data.features && data.features.length > 0) {
        // Map Biomasse layer fields to our expected format
        const mappedFeatures = data.features.map(f => ({
          type: 'Feature',
          geometry: f.geometry,
          properties: {
            loknr: f.properties.loknr,
            lokalitetnavn: f.properties.navn,
            navn: f.properties.navn,
            innehaver: null, // Biomasse layer doesn't have owner info
            anleggstype: getAnleggstypeFromPlassering(f.properties.plassering, f.properties.vannmiljo),
            kapasitet: f.properties.kapasitet_lok,
            plassering: f.properties.plassering,
            vannmiljo: f.properties.vannmiljo,
            kommune: f.properties.kommune,
            fylke: f.properties.fylke,
            status: f.properties.status_lokalitet,
            har_fisk: f.properties.har_fisk,
          }
        }));

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
 * Determine facility type from placement and water environment
 */
function getAnleggstypeFromPlassering(plassering, vannmiljo) {
  if (plassering === 'LAND' && vannmiljo === 'FERSKVANN') {
    return 'SETTEFISK'; // Land-based freshwater = smolt/settefisk
  } else if (plassering === 'SJØ' || (plassering === 'LAND' && vannmiljo === 'SALTVANN')) {
    return 'MATFISK'; // Sea-based or saltwater = matfisk
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
