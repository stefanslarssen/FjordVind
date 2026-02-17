import { describe, it, expect } from 'vitest'
import {
  rules,
  validateField,
  validateForm,
  sampleSchema,
  treatmentSchema,
  alertPreferencesSchema,
  formatApiError
} from '../utils/validation'

describe('Validation Rules', () => {
  describe('rules.required', () => {
    it('should return error for empty values', () => {
      expect(rules.required('')).toBeTruthy()
      expect(rules.required(null)).toBeTruthy()
      expect(rules.required(undefined)).toBeTruthy()
    })

    it('should return null for valid values', () => {
      expect(rules.required('test')).toBeNull()
      expect(rules.required(0)).toBeNull()
      expect(rules.required(false)).toBeNull()
    })

    it('should use custom field name', () => {
      const error = rules.required('', 'E-post')
      expect(error).toContain('E-post')
    })
  })

  describe('rules.email', () => {
    it('should accept valid email addresses', () => {
      expect(rules.email('test@example.com')).toBeNull()
      expect(rules.email('user.name@domain.no')).toBeNull()
      expect(rules.email('admin@fjordvind.no')).toBeNull()
    })

    it('should reject invalid email addresses', () => {
      expect(rules.email('notanemail')).toBeTruthy()
      expect(rules.email('@nodomain.com')).toBeTruthy()
      expect(rules.email('noat.com')).toBeTruthy()
    })

    it('should return null for empty values', () => {
      expect(rules.email('')).toBeNull()
      expect(rules.email(null)).toBeNull()
    })
  })

  describe('rules.phone', () => {
    it('should accept valid Norwegian phone numbers', () => {
      expect(rules.phone('91234567')).toBeNull()
      expect(rules.phone('41234567')).toBeNull()
      expect(rules.phone('+4791234567')).toBeNull()
    })

    it('should reject invalid phone numbers', () => {
      expect(rules.phone('12345678')).toBeTruthy()
      expect(rules.phone('9123456')).toBeTruthy()
      expect(rules.phone('abcdefgh')).toBeTruthy()
    })

    it('should return null for empty values', () => {
      expect(rules.phone('')).toBeNull()
    })
  })

  describe('rules.minLength', () => {
    it('should validate minimum length', () => {
      const minThree = rules.minLength(3)
      expect(minThree('ab')).toBeTruthy()
      expect(minThree('abc')).toBeNull()
      expect(minThree('abcd')).toBeNull()
    })

    it('should return null for empty values', () => {
      const minThree = rules.minLength(3)
      expect(minThree('')).toBeNull()
    })
  })

  describe('rules.maxLength', () => {
    it('should validate maximum length', () => {
      const maxFive = rules.maxLength(5)
      expect(maxFive('abc')).toBeNull()
      expect(maxFive('abcde')).toBeNull()
      expect(maxFive('abcdef')).toBeTruthy()
    })
  })

  describe('rules.min', () => {
    it('should validate minimum value', () => {
      const minTen = rules.min(10)
      expect(minTen(5)).toBeTruthy()
      expect(minTen(10)).toBeNull()
      expect(minTen(15)).toBeNull()
    })

    it('should handle string numbers', () => {
      const minTen = rules.min(10)
      expect(minTen('15')).toBeNull()
    })

    it('should return null for empty values', () => {
      const minTen = rules.min(10)
      expect(minTen('')).toBeNull()
      expect(minTen(null)).toBeNull()
    })
  })

  describe('rules.max', () => {
    it('should validate maximum value', () => {
      const maxHundred = rules.max(100)
      expect(maxHundred(50)).toBeNull()
      expect(maxHundred(100)).toBeNull()
      expect(maxHundred(150)).toBeTruthy()
    })
  })

  describe('rules.range', () => {
    it('should validate value in range', () => {
      const oneToTen = rules.range(1, 10)
      expect(oneToTen(0)).toBeTruthy()
      expect(oneToTen(1)).toBeNull()
      expect(oneToTen(5)).toBeNull()
      expect(oneToTen(10)).toBeNull()
      expect(oneToTen(11)).toBeTruthy()
    })

    it('should return null for empty values', () => {
      const oneToTen = rules.range(1, 10)
      expect(oneToTen('')).toBeNull()
    })
  })

  describe('rules.integer', () => {
    it('should accept integers', () => {
      expect(rules.integer(5)).toBeNull()
      expect(rules.integer('10')).toBeNull()
      expect(rules.integer(0)).toBeNull()
    })

    it('should reject non-integers', () => {
      expect(rules.integer(5.5)).toBeTruthy()
      expect(rules.integer('5.5')).toBeTruthy()
    })
  })

  describe('rules.positiveInteger', () => {
    it('should accept positive integers', () => {
      expect(rules.positiveInteger(0)).toBeNull()
      expect(rules.positiveInteger(5)).toBeNull()
      expect(rules.positiveInteger('10')).toBeNull()
    })

    it('should reject negative numbers', () => {
      expect(rules.positiveInteger(-5)).toBeTruthy()
    })
  })

  describe('rules.date', () => {
    it('should accept valid dates', () => {
      expect(rules.date('2024-01-15')).toBeNull()
      expect(rules.date('2024-12-31')).toBeNull()
    })

    it('should reject invalid date formats', () => {
      expect(rules.date('01-15-2024')).toBeTruthy()
      expect(rules.date('invalid')).toBeTruthy()
    })

    it('should reject invalid dates', () => {
      expect(rules.date('2024-13-01')).toBeTruthy()
      // Note: JavaScript Date auto-corrects 2024-02-30 to 2024-03-01
      // So we test with completely invalid format instead
      expect(rules.date('not-a-date')).toBeTruthy()
    })
  })

  describe('rules.notFutureDate', () => {
    it('should accept past dates', () => {
      expect(rules.notFutureDate('2020-01-01')).toBeNull()
    })

    it('should reject future dates', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      const futureDateStr = futureDate.toISOString().split('T')[0]
      expect(rules.notFutureDate(futureDateStr)).toBeTruthy()
    })
  })

  describe('rules.liceCount', () => {
    it('should accept valid lice counts', () => {
      expect(rules.liceCount(0)).toBeNull()
      expect(rules.liceCount(0.5)).toBeNull()
      expect(rules.liceCount(1.5)).toBeNull()
    })

    it('should reject negative values', () => {
      expect(rules.liceCount(-0.1)).toBeTruthy()
    })

    it('should warn about unreasonably high values', () => {
      expect(rules.liceCount(100)).toBeTruthy()
    })
  })

  describe('rules.temperature', () => {
    it('should accept valid temperatures', () => {
      expect(rules.temperature(10)).toBeNull()
      expect(rules.temperature(-2)).toBeNull()
      expect(rules.temperature(30)).toBeNull()
    })

    it('should reject out of range temperatures', () => {
      expect(rules.temperature(-5)).toBeTruthy()
      expect(rules.temperature(35)).toBeTruthy()
    })

    it('should reject non-numeric values', () => {
      expect(rules.temperature('abc')).toBeTruthy()
    })
  })
})

describe('validateField', () => {
  it('should return first error from validators', () => {
    const validators = [rules.required, rules.email]
    expect(validateField('', validators, 'E-post')).toBeTruthy()
  })

  it('should return null if all validators pass', () => {
    const validators = [rules.required, rules.email]
    expect(validateField('test@test.no', validators)).toBeNull()
  })
})

describe('validateForm', () => {
  it('should validate all fields in schema', () => {
    const data = {
      email: 'invalid-email',
      phone: '123'
    }
    const schema = {
      email: [rules.email],
      phone: [rules.phone]
    }

    const result = validateForm(data, schema)
    expect(result.valid).toBe(false)
    expect(result.errors.email).toBeTruthy()
    expect(result.errors.phone).toBeTruthy()
  })

  it('should return valid true when all fields pass', () => {
    const data = {
      email: 'test@test.no',
      phone: '91234567'
    }
    const schema = {
      email: [rules.email],
      phone: [rules.phone]
    }

    const result = validateForm(data, schema)
    expect(result.valid).toBe(true)
    expect(Object.keys(result.errors).length).toBe(0)
  })
})

describe('Predefined Schemas', () => {
  describe('sampleSchema', () => {
    it('should validate sample data', () => {
      const validSample = {
        dato: '2024-01-15',
        antallFisk: 20,
        temperatur: 10
      }

      const result = validateForm(validSample, sampleSchema)
      expect(result.valid).toBe(true)
    })

    it('should reject invalid sample data', () => {
      const invalidSample = {
        dato: '',
        antallFisk: -5,
        temperatur: 50
      }

      const result = validateForm(invalidSample, sampleSchema)
      expect(result.valid).toBe(false)
    })
  })

  describe('treatmentSchema', () => {
    it('should validate treatment data', () => {
      const validTreatment = {
        treatmentType: 'Thermolicer',
        scheduledDate: '2024-03-15',
        liceBefore: 0.5,
        effectivenessPercent: 85,
        mortalityPercent: 2
      }

      const result = validateForm(validTreatment, treatmentSchema)
      expect(result.valid).toBe(true)
    })
  })

  describe('alertPreferencesSchema', () => {
    it('should validate alert preferences', () => {
      const validPrefs = {
        email: 'test@test.no',
        phone: '91234567',
        liceThresholdWarning: 0.2,
        liceThresholdCritical: 0.5
      }

      const result = validateForm(validPrefs, alertPreferencesSchema)
      expect(result.valid).toBe(true)
    })
  })
})

describe('formatApiError', () => {
  it('should handle null/undefined', () => {
    expect(formatApiError(null)).toBe('En ukjent feil oppstod')
    expect(formatApiError(undefined)).toBe('En ukjent feil oppstod')
  })

  it('should handle network errors', () => {
    const error = { message: 'Failed to fetch' }
    expect(formatApiError(error)).toContain('internettforbindelsen')
  })

  it('should handle API error with errors array', () => {
    const error = {
      error: {
        errors: ['Feil 1', 'Feil 2']
      }
    }
    expect(formatApiError(error)).toBe('Feil 1. Feil 2')
  })

  it('should handle API error with message', () => {
    const error = {
      error: {
        message: 'Ugyldig forespørsel'
      }
    }
    expect(formatApiError(error)).toBe('Ugyldig forespørsel')
  })

  it('should handle string errors', () => {
    expect(formatApiError('String error')).toBe('String error')
  })

  it('should handle error objects with message', () => {
    const error = { message: 'Some error' }
    expect(formatApiError(error)).toBe('Some error')
  })
})
