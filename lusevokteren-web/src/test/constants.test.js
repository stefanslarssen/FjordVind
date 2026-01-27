import { describe, it, expect } from 'vitest'
import {
  LICE_THRESHOLDS,
  STATUS_COLORS,
  getLiceStatus,
  getLiceColor,
  isAboveLegalLimit,
} from '../config/constants'

describe('LICE_THRESHOLDS', () => {
  it('should have correct threshold values', () => {
    expect(LICE_THRESHOLDS.OK_MAX).toBe(0.08)
    expect(LICE_THRESHOLDS.WARNING_MIN).toBe(0.08)
    expect(LICE_THRESHOLDS.WARNING_MAX).toBe(0.10)
    expect(LICE_THRESHOLDS.DANGER_MIN).toBe(0.10)
    expect(LICE_THRESHOLDS.LEGAL_LIMIT).toBe(0.5)
  })
})

describe('getLiceStatus', () => {
  it('should return "ok" for values below warning threshold', () => {
    expect(getLiceStatus(0)).toBe('ok')
    expect(getLiceStatus(0.05)).toBe('ok')
    expect(getLiceStatus(0.079)).toBe('ok')
  })

  it('should return "warning" for values at or above warning but below danger', () => {
    expect(getLiceStatus(0.08)).toBe('warning')
    expect(getLiceStatus(0.09)).toBe('warning')
    expect(getLiceStatus(0.099)).toBe('warning')
  })

  it('should return "danger" for values at or above danger threshold', () => {
    expect(getLiceStatus(0.10)).toBe('danger')
    expect(getLiceStatus(0.15)).toBe('danger')
    expect(getLiceStatus(0.5)).toBe('danger')
    expect(getLiceStatus(1.0)).toBe('danger')
  })

  it('should return "unknown" for null or undefined', () => {
    expect(getLiceStatus(null)).toBe('unknown')
    expect(getLiceStatus(undefined)).toBe('unknown')
  })
})

describe('getLiceColor', () => {
  it('should return green color for ok status', () => {
    expect(getLiceColor(0.05)).toBe(STATUS_COLORS.LICE_OK)
  })

  it('should return orange color for warning status', () => {
    expect(getLiceColor(0.08)).toBe(STATUS_COLORS.LICE_WARNING)
  })

  it('should return red color for danger status', () => {
    expect(getLiceColor(0.10)).toBe(STATUS_COLORS.LICE_DANGER)
  })

  it('should return gray color for unknown status', () => {
    expect(getLiceColor(null)).toBe(STATUS_COLORS.LICE_UNKNOWN)
  })
})

describe('isAboveLegalLimit', () => {
  it('should return false for values below legal limit', () => {
    expect(isAboveLegalLimit(0)).toBe(false)
    expect(isAboveLegalLimit(0.3)).toBe(false)
    expect(isAboveLegalLimit(0.49)).toBe(false)
  })

  it('should return true for values at or above legal limit', () => {
    expect(isAboveLegalLimit(0.5)).toBe(true)
    expect(isAboveLegalLimit(0.6)).toBe(true)
    expect(isAboveLegalLimit(1.0)).toBe(true)
  })

  it('should return false for null', () => {
    expect(isAboveLegalLimit(null)).toBe(false)
  })
})

describe('STATUS_COLORS', () => {
  it('should have valid hex color codes', () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/
    expect(STATUS_COLORS.LICE_OK).toMatch(hexPattern)
    expect(STATUS_COLORS.LICE_WARNING).toMatch(hexPattern)
    expect(STATUS_COLORS.LICE_DANGER).toMatch(hexPattern)
    expect(STATUS_COLORS.PRIMARY).toMatch(hexPattern)
  })
})
