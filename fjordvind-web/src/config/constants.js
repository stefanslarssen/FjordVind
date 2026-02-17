/**
 * FjordVind FjordVind - Sentral konfigurasjon
 *
 * Alle hardkodede verdier samlet på ett sted for enkel vedlikehold.
 * Endre verdier her for å påvirke hele applikasjonen.
 */

// ===========================================
// LUSEGRENSER (voksne hunnlus per fisk)
// ===========================================
export const LICE_THRESHOLDS = {
  // Grønn status - alt OK
  OK_MAX: 0.08,

  // Gul status - advarsel
  WARNING_MIN: 0.08,
  WARNING_MAX: 0.10,

  // Rød status - fare/kritisk
  DANGER_MIN: 0.10,

  // Lovpålagt grense (Mattilsynet)
  LEGAL_LIMIT: 0.5,

  // Prediksjonsgrense
  PREDICTION_THRESHOLD: 0.5,
};

// ===========================================
// STATUSFARGER
// ===========================================
export const STATUS_COLORS = {
  // Lusenivå
  LICE_OK: '#4CAF50',           // Grønn
  LICE_OK_DARK: '#2e7d32',
  LICE_WARNING: '#ff9800',       // Oransje
  LICE_WARNING_DARK: '#e65100',
  LICE_DANGER: '#f44336',        // Rød
  LICE_DANGER_DARK: '#c62828',
  LICE_UNKNOWN: '#9e9e9e',       // Grå
  LICE_NOT_REPORTED: '#3399ff', // Blå

  // Sykdomsfarger (som BarentsWatch)
  DISEASE_PD: '#7B68EE',         // Pankreassykdom
  DISEASE_ILA: '#20B2AA',        // Infeksiøs lakseanemi
  DISEASE_BKD: '#FF6347',        // Bakteriell nyresyke
  DISEASE_FRANCISELLOSE: '#FF6347',

  // Soner
  ZONE_SURVEILLANCE: '#D4A574',  // Overvåkningssone
  ZONE_PROTECTION: '#C98B4A',    // Beskyttelsessone
  ZONE_BORDER: '#8B6914',

  // Verneområder
  PROTECTED_AREA: '#2E8B2E',
  PROTECTED_AREA_FILL: 'rgba(46,139,46,0.1)',

  // UI-farger
  PRIMARY: '#1565c0',
  PRIMARY_DARK: '#1a3a5c',
  SUCCESS: '#4CAF50',
  WARNING: '#ff9800',
  DANGER: '#f44336',
  INFO: '#2196F3',
};

// ===========================================
// MILJØGRENSER
// ===========================================
export const ENVIRONMENT_THRESHOLDS = {
  // Temperatur (Celsius)
  TEMP_MIN_ALARM: 4,
  TEMP_MAX_ALARM: 18,
  TEMP_OPTIMAL_MIN: 8,
  TEMP_OPTIMAL_MAX: 14,

  // Oksygen (%)
  OXYGEN_MIN_ALARM: 60,
  OXYGEN_OPTIMAL_MIN: 80,

  // Salinitet (ppt)
  SALINITY_NORMAL_MIN: 30,
  SALINITY_NORMAL_MAX: 35,
};

// ===========================================
// API-KONFIGURASJON
// ===========================================
export const API_CONFIG = {
  // Pagination
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,

  // Timeout (ms)
  REQUEST_TIMEOUT: 30000,

  // Cache (ms)
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutter
};

// ===========================================
// KART-KONFIGURASJON
// ===========================================
export const MAP_CONFIG = {
  // Norge sentrum
  DEFAULT_CENTER: { lat: 65.0, lng: 13.0 },
  DEFAULT_ZOOM: 5,

  // Zoom-nivåer for markør-størrelser
  ZOOM_COUNTRY: 6,
  ZOOM_REGION: 8,
  ZOOM_LOCAL: 10,
  ZOOM_DETAIL: 12,

  // Marker clustering
  CLUSTER_RADIUS: 60,
  CLUSTER_MIN_ZOOM: 9,
  CLUSTER_MIN_POINTS: 50,

  // Radius for nabo-visning (km)
  NEIGHBOR_RADIUS: 10,
};

// ===========================================
// ANIMASJON-KONFIGURASJON
// ===========================================
export const ANIMATION_CONFIG = {
  // Tidslinje-animasjon (ms per uke)
  SPEED_SLOW: 2000,
  SPEED_NORMAL: 1000,
  SPEED_FAST: 500,
  SPEED_VERY_FAST: 250,
};

// ===========================================
// HJELPEFUNKSJONER
// ===========================================

/**
 * Returnerer lusestatus basert på gjennomsnittlig lusenivå
 * @param {number} avgLice - Gjennomsnittlig voksne hunnlus per fisk
 * @returns {'ok' | 'warning' | 'danger' | 'unknown'}
 */
export function getLiceStatus(avgLice) {
  if (avgLice === null || avgLice === undefined) return 'unknown';
  if (avgLice >= LICE_THRESHOLDS.DANGER_MIN) return 'danger';
  if (avgLice >= LICE_THRESHOLDS.WARNING_MIN) return 'warning';
  return 'ok';
}

/**
 * Returnerer fargekode basert på lusestatus
 * @param {number} avgLice - Gjennomsnittlig voksne hunnlus per fisk
 * @returns {string} - Hex fargekode
 */
export function getLiceColor(avgLice) {
  const status = getLiceStatus(avgLice);
  switch (status) {
    case 'danger': return STATUS_COLORS.LICE_DANGER;
    case 'warning': return STATUS_COLORS.LICE_WARNING;
    case 'ok': return STATUS_COLORS.LICE_OK;
    default: return STATUS_COLORS.LICE_UNKNOWN;
  }
}

/**
 * Sjekker om lusenivå er over lovpålagt grense
 * @param {number} avgLice - Gjennomsnittlig voksne hunnlus per fisk
 * @returns {boolean}
 */
export function isAboveLegalLimit(avgLice) {
  return avgLice !== null && avgLice >= LICE_THRESHOLDS.LEGAL_LIMIT;
}

export default {
  LICE_THRESHOLDS,
  STATUS_COLORS,
  ENVIRONMENT_THRESHOLDS,
  API_CONFIG,
  MAP_CONFIG,
  ANIMATION_CONFIG,
  getLiceStatus,
  getLiceColor,
  isAboveLegalLimit,
};
