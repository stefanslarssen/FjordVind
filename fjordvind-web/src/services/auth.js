/**
 * Authentication Service
 * Uses Supabase for authentication
 */

import { supabase } from './supabase'

// Storage key for user info
const USER_KEY = 'fjordvind_user'

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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        company_name: companyName,
        org_number: orgNumber,
        role: 'røkter'
      }
    }
  })

  if (error) throw error

  const user = {
    id: data.user?.id,
    email: data.user?.email,
    full_name: fullName,
    role: 'røkter'
  }

  setStoredUser(user)

  return {
    user,
    session: data.session
  }
}

/**
 * Sign in existing user
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) throw error

  const user = {
    id: data.user?.id,
    email: data.user?.email,
    full_name: data.user?.user_metadata?.full_name || email.split('@')[0],
    role: data.user?.user_metadata?.role || 'røkter'
  }

  setStoredUser(user)

  return {
    user,
    session: data.session
  }
}

/**
 * Sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) console.error('Sign out error:', error)
  setStoredUser(null)
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    setStoredUser(null)
    return null
  }

  const userData = {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
    role: user.user_metadata?.role || 'røkter'
  }

  setStoredUser(userData)
  return userData
}

/**
 * Get current session
 */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/**
 * Refresh token
 */
export async function refreshToken() {
  const { data, error } = await supabase.auth.refreshSession()
  if (error) {
    console.error('Token refresh failed:', error)
    return null
  }
  return data.session?.access_token
}

/**
 * Reset password (request)
 */
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw error
}

/**
 * Change password
 */
export async function changePassword(currentPassword, newPassword) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })
  if (error) throw error
}

/**
 * Subscribe to auth changes
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
}

/**
 * Check if running in demo mode - always false now
 */
export function isDemoMode() {
  return false
}

/**
 * Get demo users - empty now
 */
export function getDemoUsers() {
  return []
}

/**
 * Get token
 */
export function getToken() {
  return null // Supabase handles tokens internally
}

/**
 * Get API base URL
 */
export function getApiBaseUrl() {
  return '' // Not using API anymore
}

/**
 * Check API health - always OK since we use Supabase
 */
export async function checkApiHealth() {
  return { ok: true, data: { status: 'healthy', database: 'supabase' } }
}
