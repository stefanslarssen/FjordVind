import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { signUp, isDemoMode } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passordene stemmer ikke overens')
      return
    }

    if (password.length < 6) {
      setError('Passordet må være minst 6 tegn')
      return
    }

    setIsLoading(true)

    try {
      await signUp(email, password, fullName)
      navigate('/')
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
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Opprett ny konto</p>
        </div>

        {/* Signup Form */}
        <div className="card" style={{ padding: '32px' }}>
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

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle} htmlFor="fullName">Fullt navn</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={inputStyle}
                placeholder="Ola Nordmann"
                required
                autoComplete="name"
              />
            </div>

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

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle} htmlFor="password">Passord</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                placeholder="Minst 6 tegn"
                required
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
                placeholder="Skriv passordet igjen"
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{ width: '100%', padding: '14px', fontSize: '16px' }}
            >
              {isLoading ? 'Oppretter konto...' : 'Opprett konto'}
            </button>
          </form>

          <div style={{
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 8px 0', fontSize: '14px' }}>
              Har du allerede en konto?
            </p>
            <Link
              to="/login"
              style={{
                color: 'var(--primary)',
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              Logg inn
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
              Nye brukere lagres kun i denne nettleserøkten og vil forsvinne ved refresh.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
