import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    setError(null)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setError(error.message)
      throw error
    }

    return data
  }

  async function signUp(email, password, metadata = {}) {
    setError(null)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })

    if (error) {
      setError(error.message)
      throw error
    }

    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      setError(error.message)
      throw error
    }
    setUser(null)
    setSession(null)
  }

  async function resetPassword(email) {
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    if (error) {
      setError(error.message)
      throw error
    }
  }

  async function changePassword(newPassword) {
    setError(null)
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      setError(error.message)
      throw error
    }
  }

  function hasRole(requiredRole) {
    if (!user) return false
    const userRole = user.user_metadata?.role || 'bruker'

    const roleHierarchy = ['bruker', 'driftsleder', 'admin']
    const userLevel = roleHierarchy.indexOf(userRole)
    const requiredLevel = roleHierarchy.indexOf(requiredRole)

    return userLevel >= requiredLevel
  }

  function isAdmin() {
    return hasRole('admin')
  }

  function isDriftsleder() {
    return hasRole('driftsleder')
  }

  function getAuthHeader() {
    if (!session?.access_token) return {}
    return { Authorization: `Bearer ${session.access_token}` }
  }

  function getToken() {
    return session?.access_token || null
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
    isAuthenticated: !!session,
    getToken,
    getAuthHeader
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
