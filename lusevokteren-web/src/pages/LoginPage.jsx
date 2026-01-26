import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { signIn, isDemoMode, getDemoUsers } = useAuth()
  const navigate = useNavigate()

  // Check for success messages from redirects
  const resetSuccess = searchParams.get('reset') === 'success'
  const verifiedSuccess = searchParams.get('verified') === 'true'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleDemoLogin(demoUser) {
    const demoPasswords = {
      'admin@fjordvind.no': 'admin123',
      'leder@fjordvind.no': 'leder123',
      'rokter@fjordvind.no': 'rokter123'
    }
    setEmail(demoUser.email)
    setPassword(demoPasswords[demoUser.email] || '')
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text)',
    fontSize: '16px',
    boxSizing: 'border-box'
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '500',
    color: 'var(--text-secondary)'
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'var(--bg-dark)'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <svg viewBox="0 0 100 100" style={{ width: '80px', height: '80px', marginBottom: '16px' }}>
            <path d="M15 65 L32 35 L50 50 L70 22" stroke="#1e40af" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 78 L45 78" stroke="#3b82f6" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
            <path d="M35 88 L85 88" stroke="#93c5fd" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
          </svg>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text)', margin: '0 0 8px 0' }}>
            FjordVind
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Logg inn for å fortsette</p>
        </div>

        {/* Login Form */}
        <div className="card" style={{ padding: '32px' }}>
          <form onSubmit={handleSubmit}>
            {/* Success messages from redirects */}
            {resetSuccess && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#22c55e',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                Passordet ditt er oppdatert! Du kan nå logge inn med ditt nye passord.
              </div>
            )}

            {verifiedSuccess && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#22c55e',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                E-postadressen din er bekreftet! Du kan nå logge inn.
              </div>
            )}

            {error && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle} htmlFor="email">E-post</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                placeholder="din@epost.no"
                required
                autoComplete="email"
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle} htmlFor="password">Passord</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                placeholder="Ditt passord"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{ width: '100%', padding: '14px', fontSize: '16px' }}
            >
              {isLoading ? 'Logger inn...' : 'Logg inn'}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <Link
              to="/forgot-password"
              style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '14px' }}
            >
              Glemt passord?
            </Link>
          </div>

          <div style={{
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 8px 0', fontSize: '14px' }}>
              Har du ikke en konto?
            </p>
            <Link
              to="/signup"
              style={{
                color: 'var(--primary)',
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              Opprett konto
            </Link>
          </div>
        </div>

        {/* Demo Mode Info */}
        {isDemoMode && (
          <div className="card" style={{ marginTop: '16px', padding: '20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              color: 'var(--warning)'
            }}>
              <span style={{ fontSize: '18px' }}>!</span>
              <span style={{ fontWeight: '600' }}>Demo-modus</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 16px 0' }}>
              Supabase er ikke konfigurert. Bruk en av demo-brukerne:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {getDemoUsers().map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleDemoLogin(user)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textAlign: 'left'
                  }}
                >
                  <span>{user.full_name}</span>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: user.role === 'admin' ? 'rgba(239, 68, 68, 0.2)' :
                               user.role === 'driftsleder' ? 'rgba(59, 130, 246, 0.2)' :
                               'rgba(34, 197, 94, 0.2)',
                    color: user.role === 'admin' ? '#ef4444' :
                           user.role === 'driftsleder' ? '#3b82f6' :
                           '#22c55e',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {user.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
