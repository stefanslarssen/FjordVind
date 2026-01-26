import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { resetPassword, isDemoMode } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setIsLoading(true)

    try {
      await resetPassword(email)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
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
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Tilbakestill passord</p>
        </div>

        {/* Reset Form */}
        <div className="card" style={{ padding: '32px' }}>
          {success ? (
            <div>
              <div style={{
                padding: '16px',
                borderRadius: '8px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#22c55e',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>E-post sendt!</p>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  Sjekk innboksen din for instruksjoner om hvordan du tilbakestiller passordet.
                </p>
              </div>
              <Link
                to="/login"
                className="btn btn-primary"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '14px',
                  fontSize: '16px',
                  textAlign: 'center',
                  textDecoration: 'none',
                  boxSizing: 'border-box'
                }}
              >
                Tilbake til innlogging
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
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

              <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px 0', fontSize: '14px' }}>
                Skriv inn e-postadressen din, så sender vi deg en lenke for å tilbakestille passordet.
              </p>

              <div style={{ marginBottom: '24px' }}>
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

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
                style={{ width: '100%', padding: '14px', fontSize: '16px' }}
              >
                {isLoading ? 'Sender...' : 'Send tilbakestillingslenke'}
              </button>
            </form>
          )}

          <div style={{
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <Link
              to="/login"
              style={{
                color: 'var(--primary)',
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              Tilbake til innlogging
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
              marginBottom: '8px',
              color: 'var(--warning)'
            }}>
              <span style={{ fontSize: '18px' }}>!</span>
              <span style={{ fontWeight: '600' }}>Demo-modus</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              I demo-modus sendes ingen e-post. Bruk demo-brukerne fra innloggingssiden.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
