import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock API configuration
const API_BASE_URL = 'http://localhost:3000/api'

// API helper functions to test
const apiHelpers = {
  async fetchStats() {
    const response = await fetch(`${API_BASE_URL}/stats`)
    if (!response.ok) throw new Error('Failed to fetch stats')
    return response.json()
  },

  async fetchLocalities(year, week) {
    const url = new URL(`${API_BASE_URL}/barentswatch/all-localities`)
    if (year) url.searchParams.set('year', year)
    if (week) url.searchParams.set('week', week)
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch localities')
    return response.json()
  },

  async searchLocalities(query) {
    if (!query || query.length < 2) {
      throw new Error('Search query must be at least 2 characters')
    }
    const response = await fetch(`${API_BASE_URL}/barentswatch/search?q=${encodeURIComponent(query)}`)
    if (!response.ok) throw new Error('Failed to search localities')
    return response.json()
  },

  buildLiceColor(value) {
    if (value === null || value === undefined) return '#9e9e9e'
    if (value >= 0.5) return '#d32f2f'  // Critical - red
    if (value >= 0.2) return '#f57c00'  // Warning - orange
    if (value >= 0.1) return '#fbc02d'  // Caution - yellow
    return '#388e3c'  // OK - green
  },

  formatLiceValue(value) {
    if (value === null || value === undefined) return 'N/A'
    return value.toFixed(2)
  },

  calculateAverageLice(observations) {
    if (!observations || observations.length === 0) return 0
    const total = observations.reduce((sum, obs) => sum + (obs.voksneHunnlus || 0), 0)
    return total / observations.length
  },

  isAboveThreshold(value, threshold = 0.5) {
    return value !== null && value >= threshold
  },

  formatDate(dateString, locale = 'nb-NO') {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
}

describe('API Helper Functions', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchStats', () => {
    it('fetches stats from correct endpoint', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          totalCounts: 100,
          todayCounts: 5,
          avgAdultFemale: 0.15,
          aboveThreshold: 3
        })
      })

      const result = await apiHelpers.fetchStats()

      expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/stats`)
      expect(result.totalCounts).toBe(100)
    })

    it('throws error on failed request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      await expect(apiHelpers.fetchStats()).rejects.toThrow('Failed to fetch stats')
    })
  })

  describe('fetchLocalities', () => {
    it('fetches localities with year and week params', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          year: 2024,
          week: 10,
          count: 50,
          localities: []
        })
      })

      await apiHelpers.fetchLocalities(2024, 10)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('year=2024'),
        })
      )
    })
  })

  describe('searchLocalities', () => {
    it('throws error for short queries', async () => {
      await expect(apiHelpers.searchLocalities('a')).rejects.toThrow(
        'Search query must be at least 2 characters'
      )
    })

    it('throws error for empty queries', async () => {
      await expect(apiHelpers.searchLocalities('')).rejects.toThrow(
        'Search query must be at least 2 characters'
      )
    })

    it('encodes query parameter', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      })

      await apiHelpers.searchLocalities('test query')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('test%20query')
      )
    })
  })
})

describe('buildLiceColor', () => {
  it('returns gray for null values', () => {
    expect(apiHelpers.buildLiceColor(null)).toBe('#9e9e9e')
    expect(apiHelpers.buildLiceColor(undefined)).toBe('#9e9e9e')
  })

  it('returns red for critical values (>= 0.5)', () => {
    expect(apiHelpers.buildLiceColor(0.5)).toBe('#d32f2f')
    expect(apiHelpers.buildLiceColor(0.75)).toBe('#d32f2f')
    expect(apiHelpers.buildLiceColor(1.0)).toBe('#d32f2f')
  })

  it('returns orange for warning values (>= 0.2, < 0.5)', () => {
    expect(apiHelpers.buildLiceColor(0.2)).toBe('#f57c00')
    expect(apiHelpers.buildLiceColor(0.35)).toBe('#f57c00')
    expect(apiHelpers.buildLiceColor(0.49)).toBe('#f57c00')
  })

  it('returns yellow for caution values (>= 0.1, < 0.2)', () => {
    expect(apiHelpers.buildLiceColor(0.1)).toBe('#fbc02d')
    expect(apiHelpers.buildLiceColor(0.15)).toBe('#fbc02d')
    expect(apiHelpers.buildLiceColor(0.19)).toBe('#fbc02d')
  })

  it('returns green for ok values (< 0.1)', () => {
    expect(apiHelpers.buildLiceColor(0)).toBe('#388e3c')
    expect(apiHelpers.buildLiceColor(0.05)).toBe('#388e3c')
    expect(apiHelpers.buildLiceColor(0.09)).toBe('#388e3c')
  })
})

describe('formatLiceValue', () => {
  it('returns N/A for null or undefined', () => {
    expect(apiHelpers.formatLiceValue(null)).toBe('N/A')
    expect(apiHelpers.formatLiceValue(undefined)).toBe('N/A')
  })

  it('formats numbers to 2 decimal places', () => {
    expect(apiHelpers.formatLiceValue(0.1)).toBe('0.10')
    expect(apiHelpers.formatLiceValue(0.123)).toBe('0.12')
    expect(apiHelpers.formatLiceValue(1.5)).toBe('1.50')
    expect(apiHelpers.formatLiceValue(0)).toBe('0.00')
  })
})

describe('calculateAverageLice', () => {
  it('returns 0 for empty array', () => {
    expect(apiHelpers.calculateAverageLice([])).toBe(0)
  })

  it('returns 0 for null/undefined', () => {
    expect(apiHelpers.calculateAverageLice(null)).toBe(0)
    expect(apiHelpers.calculateAverageLice(undefined)).toBe(0)
  })

  it('calculates average correctly', () => {
    const observations = [
      { voksneHunnlus: 2 },
      { voksneHunnlus: 4 },
      { voksneHunnlus: 6 }
    ]
    expect(apiHelpers.calculateAverageLice(observations)).toBe(4)
  })

  it('handles missing voksneHunnlus values', () => {
    const observations = [
      { voksneHunnlus: 3 },
      { otherField: 5 },
      { voksneHunnlus: 6 }
    ]
    expect(apiHelpers.calculateAverageLice(observations)).toBe(3) // (3 + 0 + 6) / 3
  })
})

describe('isAboveThreshold', () => {
  it('returns false for null values', () => {
    expect(apiHelpers.isAboveThreshold(null)).toBe(false)
  })

  it('uses default threshold of 0.5', () => {
    expect(apiHelpers.isAboveThreshold(0.49)).toBe(false)
    expect(apiHelpers.isAboveThreshold(0.5)).toBe(true)
    expect(apiHelpers.isAboveThreshold(0.6)).toBe(true)
  })

  it('uses custom threshold when provided', () => {
    expect(apiHelpers.isAboveThreshold(0.09, 0.1)).toBe(false)
    expect(apiHelpers.isAboveThreshold(0.1, 0.1)).toBe(true)
    expect(apiHelpers.isAboveThreshold(0.2, 0.1)).toBe(true)
  })
})

describe('formatDate', () => {
  it('returns empty string for empty input', () => {
    expect(apiHelpers.formatDate('')).toBe('')
    expect(apiHelpers.formatDate(null)).toBe('')
    expect(apiHelpers.formatDate(undefined)).toBe('')
  })

  it('formats date correctly', () => {
    const result = apiHelpers.formatDate('2024-03-15')
    expect(result).toContain('2024')
    expect(result).toContain('15')
  })
})
