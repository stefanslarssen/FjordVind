// Validation utilities for FjordVind API

/**
 * Validation result object
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string[]} errors - Array of error messages
 */

/**
 * Validate required fields
 * @param {Object} data - Data object to validate
 * @param {string[]} requiredFields - Array of required field names
 * @returns {ValidationResult}
 */
function validateRequired(data, requiredFields) {
  const errors = []

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`${field} er påkrevd`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate numeric value is within range
 * @param {number} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {ValidationResult}
 */
function validateRange(value, fieldName, min, max) {
  const errors = []

  if (typeof value !== 'number' || isNaN(value)) {
    errors.push(`${fieldName} må være et tall`)
  } else if (value < min || value > max) {
    errors.push(`${fieldName} må være mellom ${min} og ${max}`)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {ValidationResult}
 */
function validateEmail(email) {
  const errors = []
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!email || !emailRegex.test(email)) {
    errors.push('Ugyldig e-postadresse')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate phone number (Norwegian format)
 * @param {string} phone - Phone number to validate
 * @returns {ValidationResult}
 */
function validatePhone(phone) {
  const errors = []
  // Norwegian phone: 8 digits, optionally with +47 prefix
  const phoneRegex = /^(\+47)?[2-9]\d{7}$/
  const cleanPhone = phone?.replace(/\s/g, '')

  if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
    errors.push('Ugyldig telefonnummer (må være 8 siffer)')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} dateStr - Date string to validate
 * @param {string} fieldName - Field name for error message
 * @returns {ValidationResult}
 */
function validateDate(dateStr, fieldName) {
  const errors = []
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/

  if (!dateStr || !dateRegex.test(dateStr)) {
    errors.push(`${fieldName} må være i format YYYY-MM-DD`)
  } else {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      errors.push(`${fieldName} er ikke en gyldig dato`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate UUID format
 * @param {string} uuid - UUID to validate
 * @param {string} fieldName - Field name for error message
 * @returns {ValidationResult}
 */
function validateUUID(uuid, fieldName) {
  const errors = []
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (!uuid || !uuidRegex.test(uuid)) {
    errors.push(`${fieldName} må være en gyldig UUID`)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate enum value
 * @param {string} value - Value to validate
 * @param {string[]} allowedValues - Array of allowed values
 * @param {string} fieldName - Field name for error message
 * @returns {ValidationResult}
 */
function validateEnum(value, allowedValues, fieldName) {
  const errors = []

  if (!allowedValues.includes(value)) {
    errors.push(`${fieldName} må være en av: ${allowedValues.join(', ')}`)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate lice count value
 * @param {number} value - Lice count value
 * @param {string} fieldName - Field name for error message
 * @returns {ValidationResult}
 */
function validateLiceCount(value, fieldName) {
  const errors = []

  if (typeof value !== 'number' || isNaN(value)) {
    errors.push(`${fieldName} må være et tall`)
  } else if (value < 0) {
    errors.push(`${fieldName} kan ikke være negativt`)
  } else if (value > 50) {
    errors.push(`${fieldName} virker urimelig høyt (>${50}). Vennligst bekreft verdien.`)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate treatment request body
 * @param {Object} body - Request body
 * @returns {ValidationResult}
 */
function validateTreatment(body) {
  const errors = []

  // Required fields
  const required = validateRequired(body, ['treatment_type', 'scheduled_date'])
  errors.push(...required.errors)

  // Treatment type
  const validTypes = ['Hydrogenperoksid', 'Termisk', 'Mekanisk', 'Rensefisk', 'Ferskvann', 'Imidakloprid', 'Azametifos', 'Annet']
  if (body.treatment_type && !validTypes.includes(body.treatment_type)) {
    errors.push(`treatment_type må være en av: ${validTypes.join(', ')}`)
  }

  // Status
  const validStatuses = ['planlagt', 'pågår', 'fullført', 'kansellert']
  if (body.status && !validStatuses.includes(body.status)) {
    errors.push(`status må være en av: ${validStatuses.join(', ')}`)
  }

  // Date
  if (body.scheduled_date) {
    const dateResult = validateDate(body.scheduled_date, 'scheduled_date')
    errors.push(...dateResult.errors)
  }

  // Numeric fields
  if (body.lice_before !== undefined) {
    const liceResult = validateLiceCount(parseFloat(body.lice_before), 'lice_before')
    errors.push(...liceResult.errors)
  }

  if (body.effectiveness_percent !== undefined) {
    const effResult = validateRange(parseFloat(body.effectiveness_percent), 'effectiveness_percent', 0, 100)
    errors.push(...effResult.errors)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate sample/lice count request body
 * @param {Object} body - Request body
 * @returns {ValidationResult}
 */
function validateSample(body) {
  const errors = []

  // Required fields
  const required = validateRequired(body, ['dato', 'antall_fisk'])
  errors.push(...required.errors)

  // Date
  if (body.dato) {
    const dateResult = validateDate(body.dato, 'dato')
    errors.push(...dateResult.errors)
  }

  // Fish count
  if (body.antall_fisk !== undefined) {
    const count = parseInt(body.antall_fisk)
    if (isNaN(count) || count < 1) {
      errors.push('antall_fisk må være minst 1')
    } else if (count > 100) {
      errors.push('antall_fisk kan ikke være mer enn 100 per telling')
    }
  }

  // Temperature
  if (body.temperatur !== undefined) {
    const temp = parseFloat(body.temperatur)
    const tempResult = validateRange(temp, 'temperatur', -2, 30)
    errors.push(...tempResult.errors)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate alert preferences
 * @param {Object} body - Request body
 * @returns {ValidationResult}
 */
function validateAlertPreferences(body) {
  const errors = []

  // Email validation
  if (body.email_address) {
    const emailResult = validateEmail(body.email_address)
    errors.push(...emailResult.errors)
  }

  // Phone validation
  if (body.phone_number) {
    const phoneResult = validatePhone(body.phone_number)
    errors.push(...phoneResult.errors)
  }

  // Threshold validation
  if (body.lice_threshold_warning !== undefined) {
    const warnResult = validateRange(parseFloat(body.lice_threshold_warning), 'lice_threshold_warning', 0, 1)
    errors.push(...warnResult.errors)
  }

  if (body.lice_threshold_critical !== undefined) {
    const critResult = validateRange(parseFloat(body.lice_threshold_critical), 'lice_threshold_critical', 0, 2)
    errors.push(...critResult.errors)
  }

  // Ensure warning < critical
  if (body.lice_threshold_warning !== undefined && body.lice_threshold_critical !== undefined) {
    if (parseFloat(body.lice_threshold_warning) >= parseFloat(body.lice_threshold_critical)) {
      errors.push('lice_threshold_warning må være lavere enn lice_threshold_critical')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Combine multiple validation results
 * @param {...ValidationResult} results - Validation results to combine
 * @returns {ValidationResult}
 */
function combineValidations(...results) {
  const allErrors = results.flatMap(r => r.errors)
  return {
    valid: allErrors.length === 0,
    errors: allErrors
  }
}

module.exports = {
  validateRequired,
  validateRange,
  validateEmail,
  validatePhone,
  validateDate,
  validateUUID,
  validateEnum,
  validateLiceCount,
  validateTreatment,
  validateSample,
  validateAlertPreferences,
  combineValidations
}
