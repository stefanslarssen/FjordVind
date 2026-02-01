/**
 * Cookie Consent Banner
 * GDPR-compliant cookie consent for FjordVind
 */

import { useState, useEffect } from 'react'

const CONSENT_KEY = 'fjordvind_cookie_consent'

function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true, cannot be disabled
    functional: true,
    analytics: false
  })

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem(CONSENT_KEY)
    if (!consent) {
      // Small delay to avoid flash on page load
      const timer = setTimeout(() => setShowBanner(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const saveConsent = (consentData) => {
    const consent = {
      ...consentData,
      timestamp: new Date().toISOString(),
      version: '1.0'
    }
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))
    setShowBanner(false)
  }

  const acceptAll = () => {
    saveConsent({
      necessary: true,
      functional: true,
      analytics: true
    })
  }

  const acceptSelected = () => {
    saveConsent(preferences)
  }

  const rejectOptional = () => {
    saveConsent({
      necessary: true,
      functional: false,
      analytics: false
    })
  }

  if (!showBanner) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: 'var(--bg-dark, #0f172a)',
      borderTop: '1px solid var(--border, #334155)',
      padding: '16px 20px',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Main content */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            {/* Icon */}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="8" cy="9" r="1" fill="#3b82f6"/>
                <circle cx="15" cy="8" r="1" fill="#3b82f6"/>
                <circle cx="10" cy="14" r="1" fill="#3b82f6"/>
                <circle cx="16" cy="13" r="1" fill="#3b82f6"/>
                <circle cx="12" cy="11" r="1" fill="#3b82f6"/>
              </svg>
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: '280px' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--text-primary, #e2e8f0)',
                marginBottom: '6px'
              }}>
                Vi bruker informasjonskapsler
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'var(--text-secondary, #94a3b8)',
                lineHeight: '1.5'
              }}>
                Vi bruker informasjonskapsler for å sikre at tjenesten fungerer,
                lagre dine preferanser og forbedre brukeropplevelsen.{' '}
                <a
                  href="/personvern#cookies"
                  style={{ color: 'var(--primary, #3b82f6)', textDecoration: 'none' }}
                >
                  Les mer
                </a>
              </p>
            </div>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <button
                onClick={() => setShowDetails(!showDetails)}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  color: 'var(--text-secondary, #94a3b8)',
                  border: '1px solid var(--border, #334155)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {showDetails ? 'Skjul detaljer' : 'Tilpass'}
              </button>

              <button
                onClick={rejectOptional}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  color: 'var(--text-secondary, #94a3b8)',
                  border: '1px solid var(--border, #334155)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Kun nødvendige
              </button>

              <button
                onClick={acceptAll}
                style={{
                  padding: '10px 20px',
                  background: 'var(--primary, #1565c0)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Godta alle
              </button>
            </div>
          </div>

          {/* Details panel */}
          {showDetails && (
            <div style={{
              background: 'var(--bg-card, #1e293b)',
              borderRadius: '8px',
              padding: '16px',
              marginTop: '8px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {/* Necessary cookies */}
                <div style={cookieRowStyle}>
                  <div style={{ flex: 1 }}>
                    <div style={cookieTitleStyle}>
                      Nødvendige
                      <span style={requiredBadge}>Påkrevd</span>
                    </div>
                    <p style={cookieDescStyle}>
                      Kreves for innlogging, sikkerhet og grunnleggende funksjonalitet.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    style={checkboxStyle}
                  />
                </div>

                {/* Functional cookies */}
                <div style={cookieRowStyle}>
                  <div style={{ flex: 1 }}>
                    <div style={cookieTitleStyle}>Funksjonelle</div>
                    <p style={cookieDescStyle}>
                      Husker dine preferanser som språk, tema og kartinnstillinger.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.functional}
                    onChange={(e) => setPreferences(p => ({ ...p, functional: e.target.checked }))}
                    style={checkboxStyle}
                  />
                </div>

                {/* Analytics cookies */}
                <div style={cookieRowStyle}>
                  <div style={{ flex: 1 }}>
                    <div style={cookieTitleStyle}>Analytiske</div>
                    <p style={cookieDescStyle}>
                      Hjelper oss å forstå hvordan tjenesten brukes for å forbedre den.
                      Data er anonymisert.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences(p => ({ ...p, analytics: e.target.checked }))}
                    style={checkboxStyle}
                  />
                </div>

                {/* Save button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    onClick={acceptSelected}
                    style={{
                      padding: '10px 20px',
                      background: 'var(--primary, #1565c0)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Lagre valg
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Styles
const cookieRowStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '16px',
  padding: '12px',
  background: 'var(--bg-dark, #0f172a)',
  borderRadius: '6px'
}

const cookieTitleStyle = {
  fontSize: '14px',
  fontWeight: '500',
  color: 'var(--text-primary, #e2e8f0)',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '4px'
}

const cookieDescStyle = {
  fontSize: '13px',
  color: 'var(--text-secondary, #94a3b8)',
  lineHeight: '1.4'
}

const requiredBadge = {
  fontSize: '11px',
  padding: '2px 6px',
  background: 'rgba(59, 130, 246, 0.2)',
  color: '#3b82f6',
  borderRadius: '4px'
}

const checkboxStyle = {
  width: '20px',
  height: '20px',
  cursor: 'pointer',
  accentColor: 'var(--primary, #1565c0)'
}

/**
 * Hook to check cookie consent status
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY)
    if (stored) {
      try {
        setConsent(JSON.parse(stored))
      } catch (e) {
        setConsent(null)
      }
    }
  }, [])

  return {
    hasConsent: consent !== null,
    necessary: consent?.necessary ?? true,
    functional: consent?.functional ?? false,
    analytics: consent?.analytics ?? false,
    resetConsent: () => {
      localStorage.removeItem(CONSENT_KEY)
      window.location.reload()
    }
  }
}

export default CookieConsent
