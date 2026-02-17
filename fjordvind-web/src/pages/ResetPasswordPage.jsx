import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [validToken, setValidToken] = useState(false)

  useEffect(() => {
    // Check if we have a valid token from URL
    if (token && token.length === 64) {
      setValidToken(true)
    }
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passordene er ikke like')
      return
    }

    if (password.length < 8) {
      setError('Passord må være minst 8 tegn')
      return
    }

    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecial) {
      setError('Passord må inneholde stor bokstav, liten bokstav, tall og spesialtegn')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke tilbakestille passord')
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/login?reset=success')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Kunne ikke tilbakestille passord')
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
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Lag nytt passord</p>
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
                <p style={{ margin: '0 0 8px 0', fontWeight: '600', fontSize: '18px' }}>
                  Passord tilbakestilt!
                </p>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  Du blir nå sendt til innloggingssiden...
                </p>
              </div>
            </div>
          ) : !validToken ? (
            <div>
              <div style={{
                padding: '16px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>Ugyldig lenke</p>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  Denne lenken er ugyldig eller har utløpt. Vennligst be om en ny tilbakestillingslenke.
                </p>
              </div>
              <Link
                to="/forgot-password"
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
                Be om ny lenke
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
                Velg et nytt passord for kontoen din. Passordet må være minst 6 tegn.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle} htmlFor="password">Nytt passord</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  placeholder="Minst 6 tegn"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle} htmlFor="confirmPassword">Bekreft passord</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={inputStyle}
                  placeholder="Skriv passordet på nytt"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
                style={{ width: '100%', padding: '14px', fontSize: '16px' }}
              >
                {isLoading ? 'Lagrer...' : 'Lagre nytt passord'}
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
      </div>
    </div>
  )
}
