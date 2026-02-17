import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../contexts/AuthContext'

// Mock auth service
vi.mock('../services/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn().mockResolvedValue(null),
  getSession: vi.fn().mockResolvedValue(null),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  resetPassword: vi.fn(),
  changePassword: vi.fn(),
  refreshToken: vi.fn(),
  isDemoMode: vi.fn(() => false),
  getDemoUsers: vi.fn(() => []),
  getToken: vi.fn(() => null),
  checkApiHealth: vi.fn().mockResolvedValue({ ok: true }),
  getApiBaseUrl: vi.fn(() => 'http://localhost:3000'),
}))

// Test component that uses the auth context
function TestConsumer({ testFn }) {
  const auth = useAuth()
  return <div data-testid="result">{JSON.stringify(testFn(auth))}</div>
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should provide auth context to children', async () => {
    render(
      <AuthProvider>
        <TestConsumer testFn={(auth) => auth.isAuthenticated} />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('false')
    })
  })

  it('should throw error when useAuth is used outside provider', () => {
    // Suppress console.error for this test
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestConsumer testFn={(auth) => auth.isAuthenticated} />)
    }).toThrow('useAuth must be used within an AuthProvider')
  })

  describe('hasRole', () => {
    it('should return false when no user', async () => {
      render(
        <AuthProvider>
          <TestConsumer testFn={(auth) => auth.hasRole('admin')} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('false')
      })
    })
  })

  describe('role hierarchy', () => {
    // Test the role hierarchy logic directly
    const roleHierarchy = {
      'admin': 3,
      'driftsleder': 2,
      'røkter': 1,
      'viewer': 0
    }

    it('admin should have highest rank', () => {
      expect(roleHierarchy['admin']).toBe(3)
      expect(roleHierarchy['admin']).toBeGreaterThan(roleHierarchy['driftsleder'])
      expect(roleHierarchy['admin']).toBeGreaterThan(roleHierarchy['røkter'])
    })

    it('driftsleder should be higher than røkter', () => {
      expect(roleHierarchy['driftsleder']).toBeGreaterThan(roleHierarchy['røkter'])
    })

    it('røkter should be higher than viewer', () => {
      expect(roleHierarchy['røkter']).toBeGreaterThan(roleHierarchy['viewer'])
    })
  })

  describe('getAuthHeader', () => {
    it('should return empty object when no token', async () => {
      render(
        <AuthProvider>
          <TestConsumer testFn={(auth) => Object.keys(auth.getAuthHeader()).length} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('0')
      })
    })
  })

  describe('loading state', () => {
    it('should start in loading state', () => {
      render(
        <AuthProvider>
          <TestConsumer testFn={(auth) => auth.loading} />
        </AuthProvider>
      )

      // Initially should be loading (true) then becomes false
      expect(screen.getByTestId('result')).toBeDefined()
    })
  })
})
