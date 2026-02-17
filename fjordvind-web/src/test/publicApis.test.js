import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      DEV: true,
      VITE_BARENTSWATCH_CLIENT_ID: 'test-client-id',
      VITE_BARENTSWATCH_CLIENT_SECRET: 'test-secret'
    }
  }
})

// Import functions after mocking
import {
  extractCompanies,
  enrichWithFishHealth,
  generateMockFishHealthData
} from '../services/publicApis'

describe('publicApis', () => {
  describe('extractCompanies', () => {
    it('returns empty array for null input', () => {
      expect(extractCompanies(null)).toEqual([])
    })

    it('returns empty array for empty features', () => {
      expect(extractCompanies({ features: [] })).toEqual([])
    })

    it('extracts unique companies with counts', () => {
      const localities = {
        features: [
          { properties: { owner: 'Company A' } },
          { properties: { owner: 'Company A' } },
          { properties: { owner: 'Company B' } },
          { properties: { owner: 'Company A' } },
          { properties: { owner: 'Company B' } }
        ]
      }

      const result = extractCompanies(localities)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ name: 'Company A', count: 3 })
      expect(result[1]).toEqual({ name: 'Company B', count: 2 })
    })

    it('sorts companies by count descending', () => {
      const localities = {
        features: [
          { properties: { owner: 'Small Co' } },
          { properties: { owner: 'Big Co' } },
          { properties: { owner: 'Big Co' } },
          { properties: { owner: 'Big Co' } },
          { properties: { owner: 'Medium Co' } },
          { properties: { owner: 'Medium Co' } }
        ]
      }

      const result = extractCompanies(localities)

      expect(result[0].name).toBe('Big Co')
      expect(result[1].name).toBe('Medium Co')
      expect(result[2].name).toBe('Small Co')
    })

    it('handles features without owner property', () => {
      const localities = {
        features: [
          { properties: { owner: 'Company A' } },
          { properties: { name: 'No Owner' } },
          { properties: {} }
        ]
      }

      const result = extractCompanies(localities)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Company A')
    })
  })

  describe('enrichWithFishHealth', () => {
    it('returns original localities if no health data', () => {
      const localities = {
        type: 'FeatureCollection',
        features: [{ properties: { loknr: '123' } }]
      }

      const result = enrichWithFishHealth(localities, null)

      expect(result).toBe(localities)
    })

    it('returns localities if features is null', () => {
      const localities = { type: 'FeatureCollection' }
      const healthData = [{ localityNo: '123', avgAdultFemaleLice: 0.5 }]

      const result = enrichWithFishHealth(localities, healthData)

      expect(result).toBe(localities)
    })

    it('enriches localities with matching health data', () => {
      const localities = {
        type: 'FeatureCollection',
        features: [
          { properties: { loknr: '123', name: 'Test Locality' } },
          { properties: { loknr: '456', name: 'Other Locality' } }
        ]
      }

      const healthData = [
        {
          localityNo: '123',
          avgAdultFemaleLice: 0.15,
          diseases: ['PANKREASSYKDOM'],
          isFallow: false,
          hasReported: true
        }
      ]

      const result = enrichWithFishHealth(localities, healthData)

      expect(result.features[0].properties.avgAdultFemaleLice).toBe(0.15)
      expect(result.features[0].properties.diseases).toEqual(['PANKREASSYKDOM'])
      expect(result.features[0].properties.isFallow).toBe(false)
      expect(result.features[0].properties.hasReported).toBe(true)

      // Second locality should not be enriched
      expect(result.features[1].properties.avgAdultFemaleLice).toBeUndefined()
    })

    it('handles numeric and string loknr matching', () => {
      const localities = {
        type: 'FeatureCollection',
        features: [
          { properties: { loknr: 123 } }
        ]
      }

      const healthData = [
        { localityNo: '123', avgAdultFemaleLice: 0.1 }
      ]

      const result = enrichWithFishHealth(localities, healthData)

      expect(result.features[0].properties.avgAdultFemaleLice).toBe(0.1)
    })

    it('preserves existing properties when enriching', () => {
      const localities = {
        type: 'FeatureCollection',
        features: [
          {
            properties: {
              loknr: '123',
              name: 'Test',
              municipality: 'TestKommune',
              existingProp: 'should remain'
            },
            geometry: { type: 'Point', coordinates: [10, 60] }
          }
        ]
      }

      const healthData = [
        { localityNo: '123', avgAdultFemaleLice: 0.2 }
      ]

      const result = enrichWithFishHealth(localities, healthData)

      expect(result.features[0].properties.existingProp).toBe('should remain')
      expect(result.features[0].properties.name).toBe('Test')
      expect(result.features[0].geometry).toEqual({ type: 'Point', coordinates: [10, 60] })
    })
  })

  describe('generateMockFishHealthData', () => {
    it('returns empty array for null input', () => {
      expect(generateMockFishHealthData(null)).toEqual([])
    })

    it('returns empty array for localities without features', () => {
      expect(generateMockFishHealthData({})).toEqual([])
    })

    it('generates data for each locality with loknr', () => {
      const localities = {
        features: [
          { properties: { loknr: '123' } },
          { properties: { loknr: '456' } },
          { properties: { name: 'No Loknr' } }
        ]
      }

      const result = generateMockFishHealthData(localities)

      expect(result.length).toBe(2)
      expect(result.every(r => r.localityNo)).toBe(true)
    })

    it('generates valid lice values or null', () => {
      const localities = {
        features: Array(100).fill(null).map((_, i) => ({
          properties: { loknr: String(i) }
        }))
      }

      const result = generateMockFishHealthData(localities)

      result.forEach(item => {
        if (item.avgAdultFemaleLice !== null) {
          expect(item.avgAdultFemaleLice).toBeGreaterThanOrEqual(0)
          expect(item.avgAdultFemaleLice).toBeLessThan(0.25)
        }
      })
    })

    it('includes required health data fields', () => {
      const localities = {
        features: [{ properties: { loknr: '123' } }]
      }

      const result = generateMockFishHealthData(localities)

      expect(result[0]).toHaveProperty('localityNo')
      expect(result[0]).toHaveProperty('avgAdultFemaleLice')
      expect(result[0]).toHaveProperty('diseases')
      expect(result[0]).toHaveProperty('isFallow')
      expect(result[0]).toHaveProperty('hasReported')
      expect(Array.isArray(result[0].diseases)).toBe(true)
    })
  })
})

describe('Data transformation', () => {
  describe('GeoJSON structure', () => {
    it('enrichWithFishHealth maintains FeatureCollection structure', () => {
      const localities = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { loknr: '1' }, geometry: null }
        ]
      }

      const healthData = [{ localityNo: '1', avgAdultFemaleLice: 0.1 }]
      const result = enrichWithFishHealth(localities, healthData)

      expect(result.type).toBe('FeatureCollection')
      expect(Array.isArray(result.features)).toBe(true)
    })
  })

  describe('Disease data handling', () => {
    it('correctly maps empty diseases array', () => {
      const localities = {
        type: 'FeatureCollection',
        features: [{ properties: { loknr: '123' } }]
      }

      const healthData = [
        { localityNo: '123', diseases: [] }
      ]

      const result = enrichWithFishHealth(localities, healthData)

      expect(result.features[0].properties.diseases).toEqual([])
    })

    it('correctly maps multiple diseases', () => {
      const localities = {
        type: 'FeatureCollection',
        features: [{ properties: { loknr: '123' } }]
      }

      const healthData = [
        {
          localityNo: '123',
          diseases: ['PANKREASSYKDOM', 'INFEKSIOES_LAKSEANEMI']
        }
      ]

      const result = enrichWithFishHealth(localities, healthData)

      expect(result.features[0].properties.diseases).toContain('PANKREASSYKDOM')
      expect(result.features[0].properties.diseases).toContain('INFEKSIOES_LAKSEANEMI')
    })
  })
})
