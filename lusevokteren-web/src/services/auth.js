/**
 * Authentication Service
 * Connects to FjordVind Lusevokteren API (JWT-based auth)
 */

// API Base URL - defaults to local development server
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Storage keys
const TOKEN_KEY = 'fjordvind_token'
const USER_KEY = 'fjordvind_user'

// Demo users for development when API is unavailable
const DEMO_USERS = [
  { id: 'demo-1', email: 'admin@fjordvind.no', password: 'admin123', full_name: 'Admin Bruker', role: 'admin' },
  { id: 'demo-2', email: 'leder@fjordvind.no', password: 'leder123', full_name: 'Ole Dansen', role: 'driftsleder' },
  { id: 'demo-3', email: 'rokter@fjordvind.no', password: 'rokter123', full_name: 'Kari Hansen', role: 'røkter' },
]

// Track if we're in demo mode (API not available)
let demoMode = false

/**
 * Make authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
  const token = getToken()

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || data.message || 'API request failed')
    }

    return data
  } catch (error) {
    // If network error, we might be in demo mode
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.warn('API not available, switching to demo mode')
      demoMode = true
      throw new Error('API ikke tilgjengelig. Demo-modus aktivert.')
    }
    throw error
  }
}

/**
 * Get stored token
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Store token
 */
function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

/**
 * Get stored user
 */
function getStoredUser() {
  const stored = localStorage.getItem(USER_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  }
  return null
}

/**
 * Store user
 */
function setStoredUser(user) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(USER_KEY)
  }
}

/**
 * Sign up new user
 */
export async function signUp(email, password, fullName, companyName = '', orgNumber = '') {
  // Try API first
  if (!demoMode) {
    try {
      const data = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          company_name: companyName,
          org_number: orgNumber,
        }),
      })

      // Store token and user
      setToken(data.token)
      setStoredUser(data.user)

      return {
        user: data.user,
        session: { access_token: data.token, user: data.user }
      }
    } catch (error) {
      // If not a network error, rethrow
      if (!error.message.includes('Demo-modus')) {
        throw error
      }
    }
  }

  // Demo mode fallback
  const existingUser = DEMO_USERS.find(u => u.email === email)
  if (existingUser) {
    throw new Error('En bruker med denne e-posten eksisterer allerede')
  }

  const newUser = {
    id: `demo-${DEMO_USERS.length + 1}`,
    email,
    full_name: fullName,
    role: 'røkter'
  }
  DEMO_USERS.push({ ...newUser, password })

  const demoToken = `demo_token_${newUser.role}`
  setToken(demoToken)
  setStoredUser(newUser)

  return {
    user: newUser,
    session: { access_token: demoToken, user: newUser }
  }
}

/**
 * Sign in existing user
 */
export async function signIn(email, password) {
  // Try API first
  if (!demoMode) {
    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      // Store token and user
      setToken(data.token)
      setStoredUser(data.user)

      return {
        user: data.user,
        session: { access_token: data.token, user: data.user }
      }
    } catch (error) {
      // If not a network error, rethrow
      if (!error.message.includes('Demo-modus')) {
        throw error
      }
    }
  }

  // Demo mode fallback
  const user = DEMO_USERS.find(u => u.email === email && u.password === password)
  if (!user) {
    throw new Error('Feil e-post eller passord')
  }

  const { password: _, ...userWithoutPassword } = user
  const demoToken = `demo_token_${user.role}`

  setToken(demoToken)
  setStoredUser(userWithoutPassword)

  return {
    user: userWithoutPassword,
    session: { access_token: demoToken, user: userWithoutPassword }
  }
}

/**
 * Sign out
 */
export async function signOut() {
  // Try API logout (optional - just for cleanup on server)
  if (!demoMode) {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' })
    } catch {
      // Ignore errors - we'll clear local state anyway
    }
  }

  // Clear local state
  setToken(null)
  setStoredUser(null)
}

/**
 * Get current user from API or storage
 */
export async function getCurrentUser() {
  const token = getToken()
  if (!token) return null

  // Try API first
  if (!demoMode) {
    try {
      const data = await apiRequest('/api/auth/me')
      setStoredUser(data.user)
      return data.user
    } catch (error) {
      // If token is invalid, clear it
      if (error.message.includes('AUTH_REQUIRED') || error.message.includes('INVALID_TOKEN')) {
        setToken(null)
        setStoredUser(null)
        return null
      }
      // For other errors (network), fall back to stored user
    }
  }

  // Return stored user
  return getStoredUser()
}

/**
 * Get current session
 */
export async function getSession() {
  const token = getToken()
  const user = await getCurrentUser()

  if (!token || !user) return null

  return {
    access_token: token,
    user
  }
}

/**
 * Refresh token
 */
export async function refreshToken() {
  if (!demoMode) {
    try {
      const data = await apiRequest('/api/auth/refresh', { method: 'POST' })
      setToken(data.token)
      return data.token
    } catch {
      // If refresh fails, user needs to login again
      return null
    }
  }
  return getToken()
}

/**
 * Reset password (request)
 */
export async function resetPassword(email) {
  if (!demoMode) {
    try {
      await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      return
    } catch (error) {
      // If endpoint doesn't exist yet, just log
      console.warn('Password reset not implemented:', error.message)
    }
  }

  // Demo mode - just pretend it worked
  console.log('Demo mode: Password reset email would be sent to', email)
}

/**
 * Change password
 */
export async function changePassword(currentPassword, newPassword) {
  if (!demoMode) {
    await apiRequest('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    })
    return
  }

  // Demo mode
  console.log('Demo mode: Password would be changed')
}

/**
 * Subscribe to auth changes
 * Since we're using JWT (not real-time), this just checks initial state
 */
export function onAuthStateChange(callback) {
  // Check current state immediately
  const token = getToken()
  const user = getStoredUser()

  if (token && user) {
    callback('SIGNED_IN', { access_token: token, user })
  } else {
    callback('SIGNED_OUT', null)
  }

  // Return unsubscribe function (no-op for JWT)
  return {
    data: {
      subscription: {
        unsubscribe: () => {}
      }
    }
  }
}

/**
 * Check if running in demo mode
 */
export function isDemoMode() {
  return demoMode || getToken()?.startsWith('demo_token_')
}

/**
 * Force demo mode (for testing)
 */
export function setDemoMode(enabled) {
  demoMode = enabled
}

/**
 * Get demo users (for development/testing)
 */
export function getDemoUsers() {
  return DEMO_USERS.map(({ password, ...user }) => user)
}

/**
 * Get API base URL
 */
export function getApiBaseUrl() {
  return API_BASE_URL
}

/**
 * Check API health
 */
export async function checkApiHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`)
    const data = await response.json()
    demoMode = false
    return { ok: true, data }
  } catch {
    demoMode = true
    return { ok: false, error: 'API not available' }
  }
}
