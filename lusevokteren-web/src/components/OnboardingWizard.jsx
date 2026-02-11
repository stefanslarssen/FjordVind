import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

/**
 * OnboardingWizard - Veileder nye brukere gjennom oppsett
 * Vises automatisk første gang en bruker logger inn
 */
export default function OnboardingWizard({ onComplete }) {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [companyData, setCompanyData] = useState({
    name: '',
    orgNumber: '',
    address: '',
    contactEmail: '',
    contactPhone: ''
  })
  const [locationData, setLocationData] = useState({
    name: '',
    loknr: '',
    municipality: '',
    cageCount: 6
  })
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    weeklyReport: true,
    alertThreshold: 0.2,
    language: 'no'
  })

  const totalSteps = 4

  async function handleComplete() {
    setLoading(true)
    try {
      // Lagre onboarding-data lokalt
      localStorage.setItem('fjordvind_onboarding_complete', 'true')
      localStorage.setItem('fjordvind_preferences', JSON.stringify(preferences))

      // Selskapsinfo lagres lokalt for standalone app
      if (companyData.name) {
        localStorage.setItem('fjordvind_company', JSON.stringify(companyData))
      }

      onComplete?.()
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    {
      title: 'Velkommen til FjordVind',
      subtitle: 'La oss sette opp kontoen din',
      content: (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M2 16s1-4 4-4 4 4 7 4 4-4 7-4 4 4 4 4"/>
              <path d="M18 8c0-2-1.5-4-4-4s-4 2-4 4"/>
              <circle cx="7" cy="12" r="1" fill="white"/>
            </svg>
          </div>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '24px' }}>Velkommen, {user?.full_name || 'bruker'}!</h2>
          <p style={{ color: 'var(--muted)', fontSize: '15px', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
            FjordVind hjelper deg med profesjonell luseovervåking og rapportering
            for dine oppdrettsanlegg. La oss komme i gang!
          </p>
          <div style={{
            display: 'flex',
            gap: '24px',
            justifyContent: 'center',
            marginTop: '32px',
            flexWrap: 'wrap'
          }}>
            {[
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>,
                label: 'Luseovervåking'
              },
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.4 8 12 8 12s8-6.6 8-12a8 8 0 0 0-8-8z"/></svg>,
                label: 'Kartvisning'
              },
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>,
                label: 'Rapportering'
              },
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
                label: 'Varsler'
              }
            ].map((item, i) => (
              <div key={i} style={{
                padding: '16px 20px',
                background: 'var(--card)',
                borderRadius: '12px',
                textAlign: 'center',
                minWidth: '100px'
              }}>
                <div style={{ marginBottom: '8px', color: '#3b82f6' }}>{item.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: 'Selskapsinfo',
      subtitle: 'Legg til informasjon om selskapet ditt',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
              Selskapsnavn *
            </label>
            <input
              type="text"
              value={companyData.name}
              onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
              placeholder="F.eks. Nordlaks AS"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '14px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
              Organisasjonsnummer
            </label>
            <input
              type="text"
              value={companyData.orgNumber}
              onChange={(e) => setCompanyData({ ...companyData, orgNumber: e.target.value })}
              placeholder="123 456 789"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '14px'
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                Kontakt e-post
              </label>
              <input
                type="email"
                value={companyData.contactEmail}
                onChange={(e) => setCompanyData({ ...companyData, contactEmail: e.target.value })}
                placeholder="post@selskap.no"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                Telefon
              </label>
              <input
                type="tel"
                value={companyData.contactPhone}
                onChange={(e) => setCompanyData({ ...companyData, contactPhone: e.target.value })}
                placeholder="+47 123 45 678"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '8px 0 0 0' }}>
            * Denne informasjonen kan endres senere i innstillinger
          </p>
        </div>
      )
    },
    {
      title: 'Legg til lokalitet',
      subtitle: 'Registrer din første oppdrettslokalitet',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            padding: '16px',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '8px',
            fontSize: '13px',
            color: 'var(--text)'
          }}>
            <strong>Tips:</strong> Du kan også importere lokaliteter automatisk fra BarentsWatch via kartsiden.
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
              Lokalitetsnavn
            </label>
            <input
              type="text"
              value={locationData.name}
              onChange={(e) => setLocationData({ ...locationData, name: e.target.value })}
              placeholder="F.eks. Nordfjord"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '14px'
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                Lokalitetsnummer (loknr)
              </label>
              <input
                type="text"
                value={locationData.loknr}
                onChange={(e) => setLocationData({ ...locationData, loknr: e.target.value })}
                placeholder="12345"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                Kommune
              </label>
              <input
                type="text"
                value={locationData.municipality}
                onChange={(e) => setLocationData({ ...locationData, municipality: e.target.value })}
                placeholder="F.eks. Tromsø"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
              Antall merder
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={locationData.cageCount}
              onChange={(e) => setLocationData({ ...locationData, cageCount: parseInt(e.target.value) || 1 })}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '14px'
              }}
            />
          </div>
          <button
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px dashed var(--border)',
              background: 'transparent',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '13px',
              marginTop: '8px'
            }}
          >
            + Legg til flere lokaliteter senere
          </button>
        </div>
      )
    },
    {
      title: 'Innstillinger',
      subtitle: 'Tilpass varsler og rapporter',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            background: 'var(--card)',
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ fontWeight: 500, marginBottom: '4px' }}>E-postvarsler</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Motta varsler når lusenivå overskrider grensen
              </div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
              <input
                type="checkbox"
                checked={preferences.emailNotifications}
                onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0, left: 0, right: 0, bottom: 0,
                background: preferences.emailNotifications ? '#22c55e' : 'var(--border)',
                borderRadius: '26px',
                transition: '0.3s'
              }}>
                <span style={{
                  position: 'absolute',
                  content: '',
                  height: '20px',
                  width: '20px',
                  left: preferences.emailNotifications ? '25px' : '3px',
                  bottom: '3px',
                  background: 'white',
                  borderRadius: '50%',
                  transition: '0.3s'
                }}></span>
              </span>
            </label>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            background: 'var(--card)',
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ fontWeight: 500, marginBottom: '4px' }}>Ukentlig rapport</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Få automatisk ukerapport på e-post hver mandag
              </div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
              <input
                type="checkbox"
                checked={preferences.weeklyReport}
                onChange={(e) => setPreferences({ ...preferences, weeklyReport: e.target.checked })}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0, left: 0, right: 0, bottom: 0,
                background: preferences.weeklyReport ? '#22c55e' : 'var(--border)',
                borderRadius: '26px',
                transition: '0.3s'
              }}>
                <span style={{
                  position: 'absolute',
                  content: '',
                  height: '20px',
                  width: '20px',
                  left: preferences.weeklyReport ? '25px' : '3px',
                  bottom: '3px',
                  background: 'white',
                  borderRadius: '50%',
                  transition: '0.3s'
                }}></span>
              </span>
            </label>
          </div>

          <div style={{ padding: '16px', background: 'var(--card)', borderRadius: '8px' }}>
            <div style={{ fontWeight: 500, marginBottom: '4px' }}>Varslingsgrense for lus</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px' }}>
              Varsle når voksne hunnlus overstiger denne verdien
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <input
                type="range"
                min="0.1"
                max="0.5"
                step="0.05"
                value={preferences.alertThreshold}
                onChange={(e) => setPreferences({ ...preferences, alertThreshold: parseFloat(e.target.value) })}
                style={{ flex: 1, accentColor: '#1e40af' }}
              />
              <span style={{
                minWidth: '60px',
                padding: '6px 12px',
                background: preferences.alertThreshold >= 0.5 ? '#ef4444' :
                           preferences.alertThreshold >= 0.2 ? '#f59e0b' : '#22c55e',
                color: 'white',
                borderRadius: '6px',
                fontWeight: 600,
                textAlign: 'center'
              }}>
                {preferences.alertThreshold.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )
    }
  ]

  const currentStep = steps[step - 1]

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--bg)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Progress bar */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)'
        }}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: i < step ? '#1e40af' : 'var(--border)',
                transition: 'background 0.3s'
              }}
            />
          ))}
        </div>

        {/* Header */}
        <div style={{ padding: '24px 24px 0 24px' }}>
          <h1 style={{ margin: 0, fontSize: '20px' }}>{currentStep.title}</h1>
          <p style={{ margin: '8px 0 0 0', color: 'var(--muted)', fontSize: '14px' }}>
            {currentStep.subtitle}
          </p>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {currentStep.content}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderTop: '1px solid var(--border)',
          background: 'var(--card)'
        }}>
          <button
            onClick={() => step > 1 && setStep(step - 1)}
            disabled={step === 1}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: step === 1 ? 'var(--muted)' : 'var(--text)',
              cursor: step === 1 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Tilbake
          </button>

          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Steg {step} av {totalSteps}
          </span>

          {step < totalSteps ? (
            <button
              onClick={() => setStep(step + 1)}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#1e40af',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              Neste
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={loading}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#22c55e',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Lagrer...' : 'Fullfør oppsett'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
