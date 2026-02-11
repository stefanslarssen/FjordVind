/**
 * FjordVind Lusevokteren - Backend Konfigurasjon
 *
 * Alle hardkodede verdier samlet på ett sted for enkel vedlikehold.
 */

// ===========================================
// LUSEGRENSER (voksne hunnlus per fisk)
// ===========================================
const LICE_THRESHOLDS = {
  // Grønn status - alt OK
  OK_MAX: 0.08,

  // Gul status - advarsel
  WARNING_MIN: 0.08,
  WARNING_MAX: 0.10,

  // Rød status - fare/kritisk
  DANGER_MIN: 0.10,

  // Lovpålagt grense (Mattilsynet)
  LEGAL_LIMIT: 0.5,
};

// ===========================================
// MILJØGRENSER
// ===========================================
const ENVIRONMENT_THRESHOLDS = {
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
const API_CONFIG = {
  // Pagination
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutter
  RATE_LIMIT_MAX_REQUESTS: 100,
  RATE_LIMIT_AUTH_MAX: 10,

  // Cache (ms)
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutter
};

// ===========================================
// JWT-KONFIGURASJON
// ===========================================
const JWT_CONFIG = {
  EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ALGORITHM: 'HS256',
};

// ===========================================
// FILOPPPLASTING
// ===========================================
const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  MAX_FILES: 20,
};

// ===========================================
// VARSLINGER
// ===========================================
const ALERT_TYPES = {
  LICE_THRESHOLD: 'LICE_THRESHOLD',
  LICE_INCREASING: 'LICE_INCREASING',
  TREATMENT_DUE: 'TREATMENT_DUE',
  MORTALITY_HIGH: 'MORTALITY_HIGH',
  ENVIRONMENT_ALARM: 'ENVIRONMENT_ALARM',
};

const ALERT_SEVERITY = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
};

const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

// ===========================================
// BEHANDLINGSTYPER
// ===========================================
const TREATMENT_TYPES = [
  'Hydrogenperoksid',
  'Termisk',
  'Mekanisk',
  'Rensefisk',
  'Ferskvann',
  'Imidakloprid',
];

const TREATMENT_STATUS = {
  PLANNED: 'planlagt',
  IN_PROGRESS: 'pågår',
  COMPLETED: 'fullført',
  CANCELLED: 'kansellert',
};

// ===========================================
// HJELPEFUNKSJONER
// ===========================================

/**
 * Returnerer lusestatus basert på gjennomsnittlig lusenivå
 */
function getLiceStatus(avgLice) {
  if (avgLice === null || avgLice === undefined) return 'unknown';
  if (avgLice >= LICE_THRESHOLDS.DANGER_MIN) return 'DANGER';
  if (avgLice >= LICE_THRESHOLDS.WARNING_MIN) return 'WARNING';
  return 'OK';
}

/**
 * Sjekker om lusenivå er over lovpålagt grense
 */
function isAboveLegalLimit(avgLice) {
  return avgLice !== null && avgLice >= LICE_THRESHOLDS.LEGAL_LIMIT;
}

/**
 * Beregner risikonivå basert på ulike faktorer
 */
function calculateRiskLevel(liceScore, mortalityScore, environmentScore) {
  const avgScore = (liceScore + mortalityScore + environmentScore) / 3;
  if (avgScore >= 75) return RISK_LEVELS.CRITICAL;
  if (avgScore >= 50) return RISK_LEVELS.HIGH;
  if (avgScore >= 25) return RISK_LEVELS.MEDIUM;
  return RISK_LEVELS.LOW;
}

/**
 * Parser og validerer pagination-parametere fra request
 * @param {object} query - Request query-objektet
 * @returns {{ page: number, limit: number, offset: number }}
 */
function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(
    API_CONFIG.MAX_PAGE_SIZE,
    Math.max(1, parseInt(query.limit) || API_CONFIG.DEFAULT_PAGE_SIZE)
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Bygger paginert respons-objekt
 * @param {Array} items - Elementer på denne siden
 * @param {number} totalCount - Totalt antall elementer
 * @param {number} page - Gjeldende side
 * @param {number} limit - Elementer per side
 * @returns {object} Paginert respons
 */
function paginatedResponse(items, totalCount, page, limit) {
  const totalPages = Math.ceil(totalCount / limit);

  return {
    data: items,
    pagination: {
      page,
      limit,
      totalItems: totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
}

module.exports = {
  LICE_THRESHOLDS,
  ENVIRONMENT_THRESHOLDS,
  API_CONFIG,
  JWT_CONFIG,
  UPLOAD_CONFIG,
  ALERT_TYPES,
  ALERT_SEVERITY,
  RISK_LEVELS,
  TREATMENT_TYPES,
  TREATMENT_STATUS,
  getLiceStatus,
  isAboveLegalLimit,
  calculateRiskLevel,
  parsePagination,
  paginatedResponse,
};
