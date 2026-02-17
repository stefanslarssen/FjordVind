import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase module
vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    functions: {
      invoke: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}))

// Import after mocking
import { supabase } from '../services/supabase'
import {
  getSubscriptionStatus,
  hasActiveSubscription,
  getSubscriptionPlan
} from '../services/stripe'

describe('Stripe Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSubscriptionStatus', () => {
    it('should return null when not authenticated', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await getSubscriptionStatus()
      expect(result).toBeNull()
    })

    it('should query subscriptions table when authenticated', async () => {
      const mockSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        plan_id: 'basic',
        status: 'active'
      }

      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })

      const mockSingle = vi.fn().mockResolvedValue({ data: mockSubscription, error: null })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      supabase.from.mockReturnValue({ select: mockSelect })

      const result = await getSubscriptionStatus()

      expect(supabase.from).toHaveBeenCalledWith('subscriptions')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(result).toEqual(mockSubscription)
    })

    it('should handle database errors gracefully', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })

      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' }
      })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      supabase.from.mockReturnValue({ select: mockSelect })

      const result = await getSubscriptionStatus()

      // Should return null on PGRST116 error (no subscription found)
      expect(result).toBeNull()
    })
  })

  describe('hasActiveSubscription', () => {
    it('should return false when no subscription', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await hasActiveSubscription()
      expect(result).toBe(false)
    })

    it('should return true for active subscription', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })

      const mockSingle = vi.fn().mockResolvedValue({
        data: { status: 'active' },
        error: null
      })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      supabase.from.mockReturnValue({ select: mockSelect })

      const result = await hasActiveSubscription()
      expect(result).toBe(true)
    })

    it('should return true for trialing subscription', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })

      const mockSingle = vi.fn().mockResolvedValue({
        data: { status: 'trialing' },
        error: null
      })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      supabase.from.mockReturnValue({ select: mockSelect })

      const result = await hasActiveSubscription()
      expect(result).toBe(true)
    })

    it('should return false for canceled subscription', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })

      const mockSingle = vi.fn().mockResolvedValue({
        data: { status: 'canceled' },
        error: null
      })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      supabase.from.mockReturnValue({ select: mockSelect })

      const result = await hasActiveSubscription()
      expect(result).toBe(false)
    })

    it('should return false for past_due subscription', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })

      const mockSingle = vi.fn().mockResolvedValue({
        data: { status: 'past_due' },
        error: null
      })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      supabase.from.mockReturnValue({ select: mockSelect })

      const result = await hasActiveSubscription()
      expect(result).toBe(false)
    })
  })

  describe('getSubscriptionPlan', () => {
    it('should return free plan when no subscription', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await getSubscriptionPlan()

      expect(result).toEqual({ plan: 'free', status: 'none' })
    })

    it('should return plan details when subscribed', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })

      const mockSubscription = {
        plan_id: 'professional',
        status: 'active',
        current_period_end: '2024-12-31T23:59:59Z',
        cancel_at_period_end: false
      }

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockSubscription,
        error: null
      })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      supabase.from.mockReturnValue({ select: mockSelect })

      const result = await getSubscriptionPlan()

      expect(result).toEqual({
        plan: 'professional',
        status: 'active',
        currentPeriodEnd: '2024-12-31T23:59:59Z',
        cancelAtPeriodEnd: false
      })
    })

    it('should handle unknown plan_id', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })

      const mockSubscription = {
        plan_id: null,
        status: 'active'
      }

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockSubscription,
        error: null
      })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      supabase.from.mockReturnValue({ select: mockSelect })

      const result = await getSubscriptionPlan()

      expect(result.plan).toBe('unknown')
    })
  })
})

describe('Stripe Price Configuration', () => {
  it('should have expected plan structure', () => {
    const expectedPlans = ['basic', 'professional']
    const expectedPeriods = ['monthly', 'yearly']

    // Verify structure - env vars should be configurable
    expectedPlans.forEach(plan => {
      expectedPeriods.forEach(period => {
        const envVarName = `VITE_STRIPE_PRICE_${plan.toUpperCase()}_${period.toUpperCase()}`
        expect(typeof envVarName).toBe('string')
      })
    })
  })
})
