/**
 * PricingPage - Prising og abonnementsvalg
 *
 * Viser tilgjengelige abonnementer for FjordVind FjordVind.
 */

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { redirectToCheckout } from '../services/stripe'

const PLANS = [
  {
    id: 'basic',
    name: 'Grunnleggende',
    description: 'For mindre oppdrettsanlegg',
    monthlyPrice: 1990,
    yearlyPrice: 19900,
    features: [
      'Opptil 2 lokaliteter',
      'Luseregistrering og historikk',
      'Grunnleggende rapporter',
      'E-postvarsler',
      'Mobilapp (iOS/Android)',
    ],
    limits: {
      locations: 2,
      users: 3,
      historyMonths: 12,
    },
    popular: false,
  },
  {
    id: 'professional',
    name: 'Profesjonell',
    description: 'For mellomstore oppdrettere',
    monthlyPrice: 4990,
    yearlyPrice: 49900,
    features: [
      'Opptil 10 lokaliteter',
      'Alt i Grunnleggende, pluss:',
      'Prediktiv luseanalyse (AI)',
      'Nabosammenligning',
      'Mattilsynet-rapporter (PDF)',
      'SMS-varsler',
      'API-tilgang',
      'Prioritert support',
    ],
    limits: {
      locations: 10,
      users: 10,
      historyMonths: 36,
    },
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Bedrift',
    description: 'For store oppdrettsselskaper',
    monthlyPrice: null, // Kontakt oss
    yearlyPrice: null,
    features: [
      'Ubegrenset antall lokaliteter',
      'Alt i Profesjonell, pluss:',
      'Dedikert kundekontakt',
      'Tilpassede integrasjoner',
      'SSO (Single Sign-On)',
      'SLA-garanti',
      'On-premise mulighet',
      'Opplæring og onboarding',
    ],
    limits: {
      locations: -1,
      users: -1,
      historyMonths: -1,
    },
    popular: false,
  },
]

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState('yearly')
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const formatPrice = (price) => {
    if (price === null) return 'Kontakt oss'
    return new Intl.NumberFormat('nb-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const [loading, setLoading] = useState(null)
  const [error, setError] = useState(null)

  const handleSelectPlan = async (planId) => {
    const plan = PLANS.find(p => p.id === planId)

    // Enterprise plans go to contact form
    if (planId === 'enterprise') {
      const period = billingPeriod === 'yearly' ? 'årlig' : 'månedlig'
      const subject = encodeURIComponent(`Forespørsel: ${plan.name} (${period})`)
      window.location.href = `mailto:salg@fjordvind.no?subject=${subject}`
      return
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      navigate('/login?redirect=/priser')
      return
    }

    // Start Stripe checkout
    setLoading(planId)
    setError(null)

    try {
      await redirectToCheckout(planId, billingPeriod === 'yearly' ? 'yearly' : 'monthly')
    } catch (err) {
      console.error('Checkout error:', err)
      setError(err.message || 'Noe gikk galt. Prøv igjen eller kontakt support.')
      setLoading(null)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-dark)',
      padding: '40px 20px',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <svg viewBox="0 0 100 100" style={{ width: '60px', height: '60px', marginBottom: '16px' }}>
              <path d="M15 65 L32 35 L50 50 L70 22" stroke="#1e40af" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 78 L45 78" stroke="#3b82f6" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
              <path d="M35 88 L85 88" stroke="#93c5fd" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
            </svg>
          </Link>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}>
            Velg ditt abonnement
          </h1>
          <p style={{
            fontSize: '18px',
            color: 'var(--text-secondary)',
            maxWidth: '600px',
            margin: '0 auto 32px',
          }}>
            Profesjonell luseovervåking for norsk oppdrettsnæring.
            Alle priser er ekskl. mva.
          </p>

          {/* Billing toggle */}
          <div style={{
            display: 'inline-flex',
            background: 'var(--bg-card)',
            borderRadius: '8px',
            padding: '4px',
            gap: '4px',
          }}>
            <button
              onClick={() => setBillingPeriod('monthly')}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                background: billingPeriod === 'monthly' ? 'var(--primary)' : 'transparent',
                color: billingPeriod === 'monthly' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s',
              }}
            >
              Månedlig
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                background: billingPeriod === 'yearly' ? 'var(--primary)' : 'transparent',
                color: billingPeriod === 'yearly' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s',
              }}
            >
              Årlig
              <span style={{
                marginLeft: '8px',
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(34, 197, 94, 0.2)',
                color: '#22c55e',
                fontSize: '12px',
              }}>
                Spar 17%
              </span>
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              marginTop: '24px',
              padding: '12px 20px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '14px',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Pricing cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          maxWidth: '1000px',
          margin: '0 auto',
        }}>
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              style={{
                background: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '32px',
                border: plan.popular
                  ? '2px solid var(--primary)'
                  : '1px solid var(--border)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--primary)',
                  color: 'white',
                  padding: '4px 16px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}>
                  Mest populær
                </div>
              )}

              <h2 style={{
                fontSize: '24px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '8px',
              }}>
                {plan.name}
              </h2>

              <p style={{
                color: 'var(--text-secondary)',
                marginBottom: '24px',
                fontSize: '14px',
              }}>
                {plan.description}
              </p>

              <div style={{ marginBottom: '24px' }}>
                <span style={{
                  fontSize: '42px',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                }}>
                  {formatPrice(billingPeriod === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice)}
                </span>
                {plan.monthlyPrice !== null && (
                  <span style={{
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                  }}>
                    /{billingPeriod === 'yearly' ? 'år' : 'mnd'}
                  </span>
                )}
              </div>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading === plan.id}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  border: plan.popular ? 'none' : '1px solid var(--border)',
                  background: plan.popular ? 'var(--primary)' : 'transparent',
                  color: plan.popular ? 'white' : 'var(--text-primary)',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: loading === plan.id ? 'wait' : 'pointer',
                  marginBottom: '24px',
                  transition: 'all 0.2s',
                  opacity: loading === plan.id ? 0.7 : 1,
                }}
              >
                {loading === plan.id ? 'Vennligst vent...' : (plan.id === 'enterprise' ? 'Kontakt oss' : 'Velg plan')}
              </button>

              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                flex: 1,
              }}>
                {plan.features.map((feature, index) => (
                  <li
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      marginBottom: '12px',
                      color: 'var(--text-secondary)',
                      fontSize: '14px',
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="2"
                      style={{ flexShrink: 0, marginTop: '2px' }}
                    >
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ teaser */}
        <div style={{
          textAlign: 'center',
          marginTop: '64px',
          padding: '32px',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          maxWidth: '600px',
          margin: '64px auto 0',
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            marginBottom: '12px',
          }}>
            Har du spørsmål?
          </h3>
          <p style={{
            color: 'var(--text-secondary)',
            marginBottom: '20px',
          }}>
            Vi hjelper deg gjerne med å finne riktig løsning for din bedrift.
          </p>
          <a
            href="mailto:salg@fjordvind.no"
            style={{
              color: 'var(--primary)',
              textDecoration: 'none',
              fontWeight: '500',
            }}
          >
            salg@fjordvind.no
          </a>
        </div>

        {/* Footer links */}
        <div style={{
          textAlign: 'center',
          marginTop: '48px',
          paddingTop: '24px',
          borderTop: '1px solid var(--border)',
          fontSize: '14px',
          color: 'var(--text-secondary)',
        }}>
          <Link to="/personvern" style={{ color: 'var(--text-secondary)', marginRight: '24px' }}>
            Personvern
          </Link>
          <Link to="/vilkar" style={{ color: 'var(--text-secondary)' }}>
            Brukervilkår
          </Link>
        </div>
      </div>
    </div>
  )
}
