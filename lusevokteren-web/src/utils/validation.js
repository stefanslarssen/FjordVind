// Frontend validation utilities for FjordVind

/**
 * Validation rules for common fields
 */
export const rules = {
  required: (value, fieldName = 'Dette feltet') => {
    if (value === undefined || value === null || value === '') {
      return `${fieldName} er påkrevd`
    }
    return null
  },

  email: (value) => {
    if (!value) return null
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return 'Ugyldig e-postadresse'
    }
    return null
  },

  phone: (value) => {
    if (!value) return null
    const cleanPhone = value.replace(/\s/g, '')
    const phoneRegex = /^(\+47)?[2-9]\d{7}$/
    if (!phoneRegex.test(cleanPhone)) {
      return 'Ugyldig telefonnummer (må være 8 siffer)'
    }
    return null
  },

  minLength: (min) => (value, fieldName = 'Dette feltet') => {
    if (!value) return null
    if (value.length < min) {
      return `${fieldName} må være minst ${min} tegn`
    }
    return null
  },

  maxLength: (max) => (value, fieldName = 'Dette feltet') => {
    if (!value) return null
    if (value.length > max) {
      return `${fieldName} kan ikke være mer enn ${max} tegn`
    }
    return null
  },

  min: (minVal) => (value, fieldName = 'Verdien') => {
    if (value === undefined || value === null || value === '') return null
    const num = parseFloat(value)
    if (isNaN(num) || num < minVal) {
      return `${fieldName} må være minst ${minVal}`
    }
    return null
  },

  max: (maxVal) => (value, fieldName = 'Verdien') => {
    if (value === undefined || value === null || value === '') return null
    const num = parseFloat(value)
    if (isNaN(num) || num > maxVal) {
      return `${fieldName} kan ikke være mer enn ${maxVal}`
    }
    return null
  },

  range: (minVal, maxVal) => (value, fieldName = 'Verdien') => {
    if (value === undefined || value === null || value === '') return null
    const num = parseFloat(value)
    if (isNaN(num) || num < minVal || num > maxVal) {
      return `${fieldName} må være mellom ${minVal} og ${maxVal}`
    }
    return null
  },

  integer: (value, fieldName = 'Verdien') => {
    if (value === undefined || value === null || value === '') return null
    if (!Number.isInteger(Number(value))) {
      return `${fieldName} må være et heltall`
    }
    return null
  },

  positiveInteger: (value, fieldName = 'Verdien') => {
    if (value === undefined || value === null || value === '') return null
    const num = parseInt(value)
    if (isNaN(num) || num < 0 || !Number.isInteger(Number(value))) {
      return `${fieldName} må være et positivt heltall`
    }
    return null
  },

  date: (value, fieldName = 'Dato') => {
    if (!value) return null
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(value)) {
      return `${fieldName} må være i format YYYY-MM-DD`
    }
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      return `${fieldName} er ikke en gyldig dato`
    }
    return null
  },

  notFutureDate: (value, fieldName = 'Dato') => {
    if (!value) return null
    const date = new Date(value)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    if (date > today) {
      return `${fieldName} kan ikke være i fremtiden`
    }
    return null
  },

  liceCount: (value, fieldName = 'Lusetall') => {
    if (value === undefined || value === null || value === '') return null
    const num = parseFloat(value)
    if (isNaN(num) || num < 0) {
      return `${fieldName} kan ikke være negativt`
    }
    if (num > 50) {
      return `${fieldName} virker urimelig høyt. Vennligst verifiser.`
    }
    return null
  },

  temperature: (value) => {
    if (value === undefined || value === null || value === '') return null
    const temp = parseFloat(value)
    if (isNaN(temp)) {
      return 'Temperatur må være et tall'
    }
    if (temp < -2 || temp > 30) {
      return 'Temperatur må være mellom -2 og 30 grader'
    }
    return null
  }
}

/**
 * Validate a single field with multiple rules
 * @param {*} value - Value to validate
 * @param {Function[]} validators - Array of validator functions
 * @param {string} fieldName - Field name for error messages
 * @returns {string|null} Error message or null if valid
 */
export function validateField(value, validators, fieldName = '') {
  for (const validator of validators) {
    const error = validator(value, fieldName)
    if (error) return error
  }
  return null
}

/**
 * Validate multiple fields
 * @param {Object} data - Data object to validate
 * @param {Object} schema - Validation schema { fieldName: [validators] }
 * @returns {Object} { valid: boolean, errors: { fieldName: string } }
 */
export function validateForm(data, schema) {
  const errors = {}
  let valid = true

  for (const [fieldName, validators] of Object.entries(schema)) {
    const error = validateField(data[fieldName], validators, fieldName)
    if (error) {
      errors[fieldName] = error
      valid = false
    }
  }

  return { valid, errors }
}

/**
 * Sample validation schema
 */
export const sampleSchema = {
  dato: [rules.required, rules.date, rules.notFutureDate],
  antallFisk: [rules.required, rules.positiveInteger, rules.min(1), rules.max(100)],
  temperatur: [rules.temperature]
}

/**
 * Treatment validation schema
 */
export const treatmentSchema = {
  treatmentType: [rules.required],
  scheduledDate: [rules.required, rules.date],
  liceBefore: [rules.liceCount],
  effectivenessPercent: [rules.range(0, 100)],
  mortalityPercent: [rules.range(0, 100)]
}

/**
 * Alert preferences validation schema
 */
export const alertPreferencesSchema = {
  email: [rules.email],
  phone: [rules.phone],
  liceThresholdWarning: [rules.range(0, 1)],
  liceThresholdCritical: [rules.range(0, 2)]
}

/**
 * Format API error response for display
 * @param {Object} error - API error response
 * @returns {string} Formatted error message
 */
export function formatApiError(error) {
  if (!error) return 'En ukjent feil oppstod'

  // Handle fetch/network errors
  if (error.message === 'Failed to fetch') {
    return 'Kunne ikke koble til serveren. Sjekk internettforbindelsen.'
  }

  // Handle API error response
  if (error.error) {
    const apiError = error.error
    if (apiError.errors && Array.isArray(apiError.errors)) {
      return apiError.errors.join('. ')
    }
    return apiError.message || 'En feil oppstod'
  }

  // Handle string error
  if (typeof error === 'string') {
    return error
  }

  return error.message || 'En ukjent feil oppstod'
}
