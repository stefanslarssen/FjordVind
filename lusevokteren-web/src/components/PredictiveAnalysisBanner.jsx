import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function PredictiveAnalysisBanner({ onPlanTreatment, onSeeDetails }) {
  const [predictionData, setPredictionData] = useState(null)
  const [riskData, setRiskData] = useState(null)
  const [alertData, setAlertData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [predRes, riskRes, alertRes] = await Promise.all([
        fetch(`${API_URL}/api/predictions/summary`).catch(() => null),
        fetch(`${API_URL}/api/risk-scores`).catch(() => null),
        fetch(`${API_URL}/api/alerts?severity=CRITICAL&limit=1`).catch(() => null)
      ])

      if (predRes?.ok) {
        const pred = await predRes.json()
        setPredictionData(pred.sevenDayForecast)
      }

      if (riskRes?.ok) {
        const risk = await riskRes.json()
        setRiskData(risk)
      }

      if (alertRes?.ok) {
        const alerts = await alertRes.json()
        if (alerts.alerts?.length > 0) {
          setAlertData(alerts.alerts[0])
        }
      }
    } catch (error) {
      console.error('Failed to load predictive data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Default values if API data not available
  const prediction = predictionData || {
    avgPredictedLice: 0.58,
    avgProbabilityExceed: 0.78,
    treatmentNeededCount: 2,
    merdsNeedingTreatment: ['Merd 4', 'Merd 5'],
    criticalCount: 1,
    highCount: 1
  }

  const risk = riskData || {
    aggregateRiskScore: 34,
    aggregateRiskLevel: 'MODERATE'
  }

  const alert = alertData || {
    title: 'Merd 4 og 5 nærmer seg lusegrensen',
    message: `Prediksjon viser ${Math.round(prediction.avgProbabilityExceed * 100)}% sannsynlighet for å overskride 0.5 grensen innen 7 dager. Anbefalt handling: Planlegg behandling.`
  }

  const currentDate = new Date()
  const timeString = currentDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })

  // Calculate trend (mock data - would come from API)
  const liceChange = 29 // percent change from current
  const growthRate = 18 // percent growth forecast

  function getRiskLevelText(score) {
    if (score >= 70) return 'Kritisk'
    if (score >= 50) return 'Høy'
    if (score >= 30) return 'Lav-moderat'
    return 'Lav'
  }

  function getRiskColor(score) {
    if (score >= 70) return '#ef4444'
    if (score >= 50) return '#f59e0b'
    if (score >= 30) return '#22c55e'
    return '#10b981'
  }

  const showCriticalAlert = prediction.criticalCount > 0 || prediction.highCount > 0

  return (
    <div style={{ padding: '0 24px', marginTop: '16px' }}>
      {/* Critical Alert Banner */}
      {showCriticalAlert && (
        <div style={{
          background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
          borderRadius: '12px',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Warning Icon */}
            <div style={{
              width: '40px',
              height: '40px',
              background: '#fbbf24',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
            </div>

            <div>
              <div style={{
                color: 'white',
                fontWeight: 700,
                fontSize: '16px',
                marginBottom: '4px'
              }}>
                KRITISK: {alert.title}
              </div>
              <div style={{
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: '14px'
              }}>
                {alert.message}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
            <button
              onClick={onPlanTreatment}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: '2px solid rgba(255, 255, 255, 0.6)',
                borderRadius: '8px',
                color: 'white',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                e.target.style.borderColor = 'white'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.6)'
              }}
            >
              Planlegg behandling
            </button>
            <button
              onClick={onSeeDetails}
              style={{
                padding: '10px 20px',
                background: '#3b82f6',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = '#2563eb'}
              onMouseOut={(e) => e.target.style.background = '#3b82f6'}
            >
              Se detaljer
            </button>
          </div>
        </div>
      )}

      {/* Predictive Analysis Section */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '12px',
        padding: '20px 24px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Robot icon */}
            <span style={{ fontSize: '24px' }}>🤖</span>
            <span style={{
              color: 'white',
              fontWeight: 700,
              fontSize: '18px'
            }}>
              Prediktiv Analyse
            </span>
            <span style={{
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: 'white',
              fontSize: '10px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '4px',
              letterSpacing: '0.5px'
            }}>
              AI-DREVET
            </span>
          </div>
          <div style={{
            color: '#94a3b8',
            fontSize: '13px'
          }}>
            Oppdatert: I dag {timeString}
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px'
        }}>
          {/* Lice Prediction Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #172554 100%)',
            borderRadius: '10px',
            padding: '20px',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <div style={{
              color: '#94a3b8',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px'
            }}>
              LUSEPREDIKSJON (7 DAGER)
            </div>
            <div style={{
              color: prediction.avgPredictedLice > 0.5 ? '#ef4444' : prediction.avgPredictedLice > 0.3 ? '#f59e0b' : '#22c55e',
              fontSize: '36px',
              fontWeight: 700,
              marginBottom: '8px'
            }}>
              {prediction.avgPredictedLice.toFixed(2)}
            </div>
            <div style={{
              color: '#94a3b8',
              fontSize: '12px',
              marginBottom: '4px'
            }}>
              Forventet snitt voksne hunnlus
            </div>
            <div style={{
              color: '#f59e0b',
              fontSize: '12px',
              fontWeight: 600
            }}>
              ↑ +{liceChange}% fra i dag
            </div>
          </div>

          {/* Treatment Need Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #172554 100%)',
            borderRadius: '10px',
            padding: '20px',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <div style={{
              color: '#94a3b8',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px'
            }}>
              BEHANDLINGSBEHOV
            </div>
            <div style={{
              color: 'white',
              fontSize: '36px',
              fontWeight: 700,
              marginBottom: '8px'
            }}>
              {prediction.treatmentNeededCount}
            </div>
            <div style={{
              color: '#94a3b8',
              fontSize: '12px',
              marginBottom: '4px'
            }}>
              Merder innen 14 dager
            </div>
            <div style={{
              color: '#f59e0b',
              fontSize: '12px',
              fontWeight: 600
            }}>
              {prediction.merdsNeedingTreatment?.join(', ') || 'Merd 4, 5'}
            </div>
          </div>

          {/* Growth Forecast Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #172554 100%)',
            borderRadius: '10px',
            padding: '20px',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <div style={{
              color: '#94a3b8',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px'
            }}>
              VEKSTPROGNOSE (30D)
            </div>
            <div style={{
              color: '#22c55e',
              fontSize: '36px',
              fontWeight: 700,
              marginBottom: '8px'
            }}>
              +{growthRate}%
            </div>
            <div style={{
              color: '#94a3b8',
              fontSize: '12px',
              marginBottom: '4px'
            }}>
              Forventet biomasse økning
            </div>
            <div style={{
              color: '#22c55e',
              fontSize: '12px',
              fontWeight: 600
            }}>
              ↑ God vekst
            </div>
          </div>

          {/* Risk Score Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #172554 100%)',
            borderRadius: '10px',
            padding: '20px',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <div style={{
              color: '#94a3b8',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px'
            }}>
              RISIKOSCORE
            </div>
            <div style={{
              color: getRiskColor(risk.aggregateRiskScore),
              fontSize: '36px',
              fontWeight: 700,
              marginBottom: '8px'
            }}>
              {risk.aggregateRiskScore}<span style={{ fontSize: '18px', color: '#64748b' }}>/100</span>
            </div>
            <div style={{
              color: '#94a3b8',
              fontSize: '12px',
              marginBottom: '4px'
            }}>
              Samlet anleggsrisiko
            </div>
            <div style={{
              color: getRiskColor(risk.aggregateRiskScore),
              fontSize: '12px',
              fontWeight: 600
            }}>
              {getRiskLevelText(risk.aggregateRiskScore)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
