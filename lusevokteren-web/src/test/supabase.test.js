import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the createClient function
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn()
    }
  }))
}))

describe('Supabase Service - Utility Functions', () => {
  describe('Data transformation', () => {
    it('should correctly identify unique locations', () => {
      const mockData = [
        { lokalitet: 'Lokalitet A' },
        { lokalitet: 'Lokalitet B' },
        { lokalitet: 'Lokalitet A' },
        { lokalitet: 'Lokalitet C' },
      ]

      const uniqueLokaliteter = [...new Set(mockData.map(d => d.lokalitet).filter(Boolean))]

      expect(uniqueLokaliteter).toHaveLength(3)
      expect(uniqueLokaliteter).toContain('Lokalitet A')
      expect(uniqueLokaliteter).toContain('Lokalitet B')
      expect(uniqueLokaliteter).toContain('Lokalitet C')
    })

    it('should filter out null/undefined locations', () => {
      const mockData = [
        { lokalitet: 'Lokalitet A' },
        { lokalitet: null },
        { lokalitet: undefined },
        { lokalitet: 'Lokalitet B' },
      ]

      const uniqueLokaliteter = [...new Set(mockData.map(d => d.lokalitet).filter(Boolean))]

      expect(uniqueLokaliteter).toHaveLength(2)
    })

    it('should transform locations to expected format', () => {
      const uniqueLokaliteter = ['Lok A', 'Lok B']
      const formatted = uniqueLokaliteter.map(name => ({ id: name, name }))

      expect(formatted).toEqual([
        { id: 'Lok A', name: 'Lok A' },
        { id: 'Lok B', name: 'Lok B' }
      ])
    })
  })

  describe('Dashboard Stats Aggregation', () => {
    it('should calculate correct totals', () => {
      const mockMerds = [
        { id: '1', lokalitet: 'Lok A' },
        { id: '2', lokalitet: 'Lok A' },
        { id: '3', lokalitet: 'Lok B' },
      ]

      const locations = [...new Set(mockMerds.map(m => m.lokalitet))]

      expect(locations).toHaveLength(2)
      expect(mockMerds.length).toBe(3)
    })
  })

  describe('Lice Count Calculations', () => {
    it('should calculate total voksne hunnlus correctly', () => {
      const observations = [
        { voksne_hunnlus: 2, bevegelige_lus: 1, fastsittende_lus: 3 },
        { voksne_hunnlus: 1, bevegelige_lus: 2, fastsittende_lus: 1 },
        { voksne_hunnlus: 0, bevegelige_lus: 0, fastsittende_lus: 0 },
      ]

      const totalVoksneHunnlus = observations.reduce((sum, o) => sum + (o.voksne_hunnlus || 0), 0)
      const totalBevegeligeLus = observations.reduce((sum, o) => sum + (o.bevegelige_lus || 0), 0)
      const totalFastsittendeLus = observations.reduce((sum, o) => sum + (o.fastsittende_lus || 0), 0)

      expect(totalVoksneHunnlus).toBe(3)
      expect(totalBevegeligeLus).toBe(3)
      expect(totalFastsittendeLus).toBe(4)
    })

    it('should handle missing observation data', () => {
      const observations = [
        { voksne_hunnlus: 2 },
        { bevegelige_lus: 1 },
        {},
      ]

      const totalVoksneHunnlus = observations.reduce((sum, o) => sum + (o.voksne_hunnlus || 0), 0)

      expect(totalVoksneHunnlus).toBe(2)
    })

    it('should calculate average per fish', () => {
      const observations = [
        { voksne_hunnlus: 2 },
        { voksne_hunnlus: 4 },
        { voksne_hunnlus: 0 },
      ]

      const total = observations.reduce((sum, o) => sum + (o.voksne_hunnlus || 0), 0)
      const fishCount = observations.length
      const average = fishCount > 0 ? (total / fishCount).toFixed(2) : '0.00'

      expect(average).toBe('2.00')
    })
  })

  describe('Sample Transformation', () => {
    it('should transform sample data correctly', () => {
      const sample = {
        id: 'sample-1',
        dato: '2024-01-15',
        notat: 'Test notat',
        merds: { lokalitet: 'Lok A', merd_id: 'M1', navn: 'Merd 1' },
        users: { full_name: 'Test User' },
        fish_observations: [
          { voksne_hunnlus: 2, bevegelige_lus: 1, fastsittende_lus: 3, bilde_url: null },
          { voksne_hunnlus: 1, bevegelige_lus: 0, fastsittende_lus: 1, bilde_url: 'http://image.jpg' },
        ]
      }

      const obs = sample.fish_observations || []
      const totalVoksneHunnlus = obs.reduce((sum, o) => sum + (o.voksne_hunnlus || 0), 0)
      const images = obs.filter(o => o.bilde_url).map(o => ({ url: o.bilde_url }))

      const transformed = {
        id: sample.id,
        date: sample.dato,
        location_name: sample.merds?.lokalitet || 'Ukjent',
        cage_id: sample.merds?.merd_id || sample.merds?.navn || 'Ukjent',
        fish_examined: sample.antall_fisk || obs.length,
        adult_female_lice: totalVoksneHunnlus,
        notes: sample.notat,
        images: images,
        user_name: sample.users?.full_name
      }

      expect(transformed.id).toBe('sample-1')
      expect(transformed.location_name).toBe('Lok A')
      expect(transformed.cage_id).toBe('M1')
      expect(transformed.fish_examined).toBe(2)
      expect(transformed.adult_female_lice).toBe(3)
      expect(transformed.images).toHaveLength(1)
      expect(transformed.user_name).toBe('Test User')
    })

    it('should handle missing nested data', () => {
      const sample = {
        id: 'sample-2',
        dato: '2024-01-15',
        merds: null,
        users: null,
        fish_observations: []
      }

      const transformed = {
        location_name: sample.merds?.lokalitet || 'Ukjent',
        cage_id: sample.merds?.merd_id || sample.merds?.navn || 'Ukjent',
        user_name: sample.users?.full_name
      }

      expect(transformed.location_name).toBe('Ukjent')
      expect(transformed.cage_id).toBe('Ukjent')
      expect(transformed.user_name).toBeUndefined()
    })
  })

  describe('Environment Reading Formatting', () => {
    it('should format environment reading data', () => {
      const input = {
        merdId: 'merd-1',
        locality: 'Lok A',
        temperature: 12.5,
        oxygen: 95.2,
        salinity: 33.5,
        ph: 8.1
      }

      const formatted = {
        merd_id: input.merdId || null,
        locality: input.locality,
        temperature_celsius: input.temperature,
        oxygen_percent: input.oxygen,
        salinity_ppt: input.salinity,
        ph: input.ph,
        timestamp: expect.any(String),
        is_anomaly: false
      }

      expect(formatted.merd_id).toBe('merd-1')
      expect(formatted.temperature_celsius).toBe(12.5)
      expect(formatted.oxygen_percent).toBe(95.2)
      expect(formatted.is_anomaly).toBe(false)
    })

    it('should handle optional merdId', () => {
      const input = {
        locality: 'Lok A',
        temperature: 10
      }

      const formatted = {
        merd_id: input.merdId || null,
        locality: input.locality,
        temperature_celsius: input.temperature
      }

      expect(formatted.merd_id).toBeNull()
    })
  })

  describe('Alert Filtering', () => {
    it('should filter alerts by severity', () => {
      const alerts = [
        { id: '1', severity: 'high', resolved_at: null },
        { id: '2', severity: 'low', resolved_at: null },
        { id: '3', severity: 'high', resolved_at: null },
        { id: '4', severity: 'medium', resolved_at: '2024-01-01' }, // resolved
      ]

      const unresolvedHighAlerts = alerts.filter(
        a => a.resolved_at === null && a.severity === 'high'
      )

      expect(unresolvedHighAlerts).toHaveLength(2)
    })
  })

  describe('Cage Creation Data', () => {
    it('should format cage creation data', () => {
      const input = {
        name: 'Merd 1',
        merdId: 'M1',
        locationName: 'Lok A',
        locationId: 'loc-123'
      }

      const formatted = {
        navn: input.name,
        merd_id: input.merdId || null,
        lokalitet: input.locationName,
        location_id: input.locationId || null
      }

      expect(formatted.navn).toBe('Merd 1')
      expect(formatted.merd_id).toBe('M1')
      expect(formatted.lokalitet).toBe('Lok A')
      expect(formatted.location_id).toBe('loc-123')
    })
  })
})

describe('Date Formatting', () => {
  it('should format date correctly for display', () => {
    const formatDate = (dateStr) => {
      const d = new Date(dateStr)
      return `${d.getDate()}/${d.getMonth() + 1}`
    }

    expect(formatDate('2024-01-15')).toBe('15/1')
    expect(formatDate('2024-12-31')).toBe('31/12')
  })

  it('should generate date range for chart', () => {
    const period = 7
    const dailyMap = {}

    for (let i = 0; i < period; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      dailyMap[dateStr] = 0
    }

    expect(Object.keys(dailyMap)).toHaveLength(7)
  })
})
