import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, loading, hasRole } = useAuth()
  const location = useLocation()

  // Show loading state while checking auth
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
          <svg viewBox="0 0 100 100" style={{ width: '60px', height: '60px', marginBottom: '16px', opacity: 0.5 }}>
            <path d="M15 65 L32 35 L50 50 L70 22" stroke="#1e40af" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 78 L45 78" stroke="#3b82f6" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
            <path d="M35 88 L85 88" stroke="#93c5fd" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
          </svg>
          <p style={{ color: 'var(--text-secondary)' }}>Laster...</p>
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
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-dark)'
      }}>
        <div className="card" style={{ padding: '32px', textAlign: 'center', maxWidth: '400px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '28px'
          }}>
            !
          </div>
          <h2 style={{ margin: '0 0 12px 0', color: 'var(--text)' }}>Ingen tilgang</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 24px 0' }}>
            Du har ikke tilgang til denne siden. Kontakt administrator hvis du mener dette er feil.
          </p>
          <a
            href="/"
            className="btn btn-primary"
            style={{ textDecoration: 'none' }}
          >
            Tilbake til oversikt
          </a>
        </div>
      </div>
    )
  }

  return children
}
