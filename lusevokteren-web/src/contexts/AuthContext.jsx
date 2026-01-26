import { createContext, useContext, useState, useEffect } from 'react'
import {
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
  getCurrentUser,
  getSession,
  onAuthStateChange,
  resetPassword as authResetPassword,
  changePassword as authChangePassword,
  refreshToken,
  isDemoMode,
  getDemoUsers,
  getToken,
  checkApiHealth,
  getApiBaseUrl
} from '../services/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [apiAvailable, setApiAvailable] = useState(null)

  useEffect(() => {
    // Check API health and existing session on mount
    async function initAuth() {
      try {
        // Check if API is available
        const health = await checkApiHealth()
        setApiAvailable(health.ok)

        // Get current session
        const currentUser = await getCurrentUser()
        const currentSession = await getSession()
        setUser(currentUser)
        setSession(currentSession)
      } catch (err) {
        console.error('Auth initialization error:', err)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Subscribe to auth changes
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user || null)

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setSession(null)
      }
    })

    return () => {
      subscription?.unsubscribe?.()
    }
  }, [])

  // Auto-refresh token periodically (every 6 hours)
  useEffect(() => {
    if (!session?.access_token) return

    const interval = setInterval(async () => {
      try {
        await refreshToken()
      } catch (err) {
        console.error('Token refresh failed:', err)
      }
    }, 6 * 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [session?.access_token])

  async function signIn(email, password) {
    setError(null)
    setLoading(true)
    try {
      const data = await authSignIn(email, password)
      setUser(data.user)
      setSession(data.session)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  async function signUp(email, password, fullName, companyName = '', orgNumber = '') {
    setError(null)
    setLoading(true)
    try {
      const data = await authSignUp(email, password, fullName, companyName, orgNumber)
      setUser(data.user)
      setSession(data.session)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    setError(null)
    try {
      await authSignOut()
      setUser(null)
      setSession(null)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  async function resetPassword(email) {
    setError(null)
    try {
      await authResetPassword(email)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  async function changePassword(currentPassword, newPassword) {
    setError(null)
    try {
      await authChangePassword(currentPassword, newPassword)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  // Check if user has specific role
  function hasRole(requiredRole) {
    if (!user) return false
    const userRole = user.role || user.user_metadata?.role
    if (!userRole) return false

    const roleHierarchy = {
      'admin': 3,
      'driftsleder': 2,
      'røkter': 1,
      'viewer': 0
    }

    return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0)
  }

  // Check if user is admin
  function isAdmin() {
    return hasRole('admin')
  }

  // Check if user is driftsleder or higher
  function isDriftsleder() {
    return hasRole('driftsleder')
  }

  // Get authorization header for API calls
  function getAuthHeader() {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const value = {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    changePassword,
    hasRole,
    isAdmin,
    isDriftsleder,
    isAuthenticated: !!user,
    isDemoMode: isDemoMode(),
    getDemoUsers,
    getToken,
    getAuthHeader,
    apiAvailable,
    apiBaseUrl: getApiBaseUrl()
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
