import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, loading, hasRole } = useAuth()
  const location = useLocation()

  // Show nothing while checking auth status
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-dark)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid var(--border)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px'
          }} />
          <span style={{ color: 'var(--text-secondary)' }}>Laster...</span>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role if required
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/" replace />
  }

  return children
}
