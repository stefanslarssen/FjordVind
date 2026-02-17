import { useState, useEffect } from 'react'
import { fetchPredictions, fetchRiskScores } from '../services/supabase'

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState([])
  const [summary, setSummary] = useState(null)
  const [riskScores, setRiskScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [selectedMerd, setSelectedMerd] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      const [predictionsData, riskData] = await Promise.all([
        fetchPredictions(),
        fetchRiskScores()
      ])

      // Transform predictions
      const transformedPredictions = (predictionsData || []).map(p => ({
        id: p.id,
        merdName: p.merds?.navn || 'Ukjent',
        locality: p.merds?.lokalitet || 'Ukjent',
        currentLice: p.current_lice,
        predictedLice: p.predicted_lice,
        probabilityExceedLimit: p.probability_exceed_limit,
        riskLevel: p.risk_level,
        recommendedAction: p.recommended_action,
        confidence: p.confidence,
        targetDate: p.target_date
      }))
      setPredictions(transformedPredictions)

      // Calculate summary from predictions
      if (transformedPredictions.length > 0) {
        const avgPredictedLice = transformedPredictions.reduce((sum, p) => sum + (p.predictedLice || 0), 0) / transformedPredictions.length
        const avgProbabilityExceed = transformedPredictions.reduce((sum, p) => sum + (p.probabilityExceedLimit || 0), 0) / transformedPredictions.length
        const treatmentNeeded = transformedPredictions.filter(p =>
          p.recommendedAction === 'SCHEDULE_TREATMENT' || p.recommendedAction === 'IMMEDIATE_TREATMENT'
        )

        setSummary({
          avgPredictedLice,
          avgProbabilityExceed,
          treatmentNeededCount: treatmentNeeded.length,
          merdsNeedingTreatment: treatmentNeeded.map(p => p.merdName),
          criticalCount: transformedPredictions.filter(p => p.riskLevel === 'CRITICAL').length,
          highCount: transformedPredictions.filter(p => p.riskLevel === 'HIGH').length,
          mediumCount: transformedPredictions.filter(p => p.riskLevel === 'MEDIUM').length,
          lowCount: transformedPredictions.filter(p => p.riskLevel === 'LOW').length
        })
      }

      // Transform risk scores
      const transformedRiskScores = (riskData || []).map(s => ({
        id: s.id,
        merdName: s.merds?.navn || 'Ukjent',
        locality: s.merds?.lokalitet || s.locality || 'Ukjent',
        overallScore: s.overall_score,
        liceScore: s.lice_score,
        mortalityScore: s.mortality_score,
        environmentScore: s.environment_score,
        treatmentScore: s.treatment_score,
        riskLevel: s.risk_level
      }))
      setRiskScores(transformedRiskScores)

    } catch (err) {
      console.error('Failed to load predictions:', err)
      setError('Nettverksfeil: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredPredictions = filter === 'all'
    ? predictions
    : predictions.filter(p => p.riskLevel === filter)

  const getRiskColor = (level) => {
    switch (level) {
      case 'CRITICAL': return '#ef4444'
      case 'HIGH': return '#f59e0b'
      case 'MEDIUM': return '#eab308'
      case 'LOW': return '#22c55e'
      default: return '#6b7280'
    }
  }

  const getRiskBgColor = (level) => {
    switch (level) {
      case 'CRITICAL': return 'rgba(239, 68, 68, 0.15)'
      case 'HIGH': return 'rgba(245, 158, 11, 0.15)'
      case 'MEDIUM': return 'rgba(234, 179, 8, 0.15)'
      case 'LOW': return 'rgba(34, 197, 94, 0.15)'
      default: return 'rgba(107, 114, 128, 0.15)'
    }
  }

  // Mini sparkline chart component
  const SparkLine = ({ data, color }) => {
    if (!data || data.length < 2) return null
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1
    const width = 80
    const height = 30
    const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(' ')

    return (
      <svg width={width} height={height} style={{ display: 'block' }}>
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (loading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#94a3b8'
      }}>
        <div style={{ fontSize: '18px', marginBottom: '8px' }}>Laster prediksjoner...</div>
        <div style={{ fontSize: '14px' }}>Analyserer data med AI-modeller</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#ef4444', marginBottom: '8px' }}>
            Kunne ikke laste data
          </div>
          <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px' }}>
            {error}
          </div>
          <button
            onClick={loadData}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Prov igjen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 16px 16px 16px' }}>
      {/* Header med linje */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '12px 0',
        borderBottom: '1px solid var(--border)',
        marginBottom: '20px'
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          Prediktiv Analyse
          <span style={{
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            color: 'white'
          }}>AI-DREVET</span>
        </h1>
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
          7-14 dagers prognoser for luseniva basert pa historiske data, temperatur og sesongmonstre
        </span>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* Luseprediksjon */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #172554 100%)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '12px' }}>
              Luseprediksjon (7 dager)
            </div>
            <div style={{
              fontSize: '36px',
              fontWeight: 700,
              color: summary.avgPredictedLice >= 0.5 ? '#ef4444' : summary.avgPredictedLice >= 0.4 ? '#f59e0b' : '#22c55e',
              marginBottom: '8px'
            }}>
              {summary.avgPredictedLice?.toFixed(2) || '0.00'}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Forventet snitt voksne hunnlus
            </div>
          </div>

          {/* Behandlingsbehov */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #172554 100%)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '12px' }}>
              Behandlingsbehov
            </div>
            <div style={{
              fontSize: '36px',
              fontWeight: 700,
              color: summary.treatmentNeededCount > 2 ? '#ef4444' : summary.treatmentNeededCount > 0 ? '#f59e0b' : '#22c55e',
              marginBottom: '8px'
            }}>
              {summary.treatmentNeededCount || 0}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
              Merder innen 14 dager
            </div>
            {summary.merdsNeedingTreatment?.length > 0 && (
              <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>
                {summary.merdsNeedingTreatment.join(', ')}
              </div>
            )}
          </div>

          {/* Risiko-fordeling */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #172554 100%)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '12px' }}>
              Risiko-fordeling
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>{summary.criticalCount || 0}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Kritisk</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>{summary.highCount || 0}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Hoy</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#eab308' }}>{summary.mediumCount || 0}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Medium</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e' }}>{summary.lowCount || 0}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Lav</div>
              </div>
            </div>
          </div>

          {/* Sannsynlighet */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #172554 100%)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '12px' }}>
              Sannsynlighet overskridelse
            </div>
            <div style={{
              fontSize: '36px',
              fontWeight: 700,
              color: summary.avgProbabilityExceed >= 0.5 ? '#ef4444' : '#fff',
              marginBottom: '8px'
            }}>
              {((summary.avgProbabilityExceed || 0) * 100).toFixed(0)}%
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Snitt sannsynlighet for 0.5 grensen
            </div>
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        {['all', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(level => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: filter === level
                ? (level === 'all' ? 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)' : getRiskColor(level))
                : '#334155',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              transition: 'all 0.15s'
            }}
          >
            {level === 'all' ? 'Alle' : level}
          </button>
        ))}
      </div>

      {/* Predictions Table */}
      <div style={{
        background: '#1e293b',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #334155',
        marginBottom: '24px'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0f172a' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>Merd</th>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>Lokalitet</th>
              <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>Na</th>
              <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>7 dager</th>
              <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>Sannsynlighet</th>
              <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>Risiko</th>
              <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>Anbefaling</th>
            </tr>
          </thead>
          <tbody>
            {filteredPredictions.map(pred => (
              <tr
                key={pred.id}
                style={{
                  borderBottom: '1px solid #334155',
                  cursor: 'pointer',
                  background: selectedMerd === pred.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                }}
                onClick={() => setSelectedMerd(selectedMerd === pred.id ? null : pred.id)}
              >
                <td style={{ padding: '16px', fontWeight: 600, color: 'white' }}>{pred.merdName}</td>
                <td style={{ padding: '16px', color: '#94a3b8' }}>{pred.locality}</td>
                <td style={{ padding: '16px', textAlign: 'center', color: 'white' }}>{pred.currentLice?.toFixed(2) || '-'}</td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <span style={{
                    fontWeight: 700,
                    color: pred.predictedLice >= 0.5 ? '#ef4444' : pred.predictedLice >= 0.4 ? '#f59e0b' : '#22c55e'
                  }}>
                    {pred.predictedLice?.toFixed(2) || '-'}
                  </span>
                  {pred.currentLice && pred.predictedLice && (
                    <span style={{
                      fontSize: '12px',
                      color: pred.predictedLice > pred.currentLice ? '#ef4444' : '#22c55e',
                      marginLeft: '6px'
                    }}>
                      {pred.predictedLice > pred.currentLice ? '↑' : '↓'}
                    </span>
                  )}
                </td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <div style={{
                    display: 'inline-block',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: pred.probabilityExceedLimit >= 0.7 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                    color: pred.probabilityExceedLimit >= 0.7 ? '#ef4444' : '#94a3b8',
                    fontWeight: 600,
                    fontSize: '13px'
                  }}>
                    {((pred.probabilityExceedLimit || 0) * 100).toFixed(0)}%
                  </div>
                </td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <span style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    background: getRiskBgColor(pred.riskLevel),
                    color: getRiskColor(pred.riskLevel),
                    fontWeight: 600,
                    fontSize: '12px'
                  }}>
                    {pred.riskLevel}
                  </span>
                </td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: pred.recommendedAction === 'IMMEDIATE_TREATMENT' ? 'rgba(239, 68, 68, 0.15)' :
                               pred.recommendedAction === 'SCHEDULE_TREATMENT' ? 'rgba(245, 158, 11, 0.15)' :
                               'rgba(34, 197, 94, 0.15)',
                    color: pred.recommendedAction === 'IMMEDIATE_TREATMENT' ? '#ef4444' :
                           pred.recommendedAction === 'SCHEDULE_TREATMENT' ? '#f59e0b' :
                           '#22c55e',
                    fontSize: '11px',
                    fontWeight: 600
                  }}>
                    {pred.recommendedAction === 'SCHEDULE_TREATMENT' && 'Planlegg behandling'}
                    {pred.recommendedAction === 'IMMEDIATE_TREATMENT' && 'Umiddelbar handling'}
                    {pred.recommendedAction === 'MONITOR' && 'Overvak'}
                    {pred.recommendedAction === 'NO_ACTION' && 'Ingen handling'}
                    {!pred.recommendedAction && '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredPredictions.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            {predictions.length === 0
              ? 'Ingen prediksjoner i databasen. Kjor prediksjonsmodellen for a generere prognoser.'
              : 'Ingen prediksjoner funnet for valgt filter'}
          </div>
        )}
      </div>

      {/* Risk Score Section */}
      {riskScores.length > 0 && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Risikoscore per merd
            <span style={{
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              fontSize: '10px',
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: '4px'
            }}>LIVE</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {riskScores.map(score => (
              <div key={score.id} style={{
                background: '#1e293b',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #334155',
                borderLeft: `4px solid ${getRiskColor(score.riskLevel)}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'white', marginBottom: '4px' }}>{score.merdName}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{score.locality}</div>
                  </div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: getRiskColor(score.riskLevel)
                  }}>
                    {score.overallScore}
                  </div>
                </div>

                {/* Score breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Lus</span>
                    <span style={{ color: 'white', fontWeight: 600 }}>{score.liceScore || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Dodelighet</span>
                    <span style={{ color: 'white', fontWeight: 600 }}>{score.mortalityScore || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Miljo</span>
                    <span style={{ color: 'white', fontWeight: 600 }}>{score.environmentScore || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Behandling</span>
                    <span style={{ color: 'white', fontWeight: 600 }}>{score.treatmentScore || '-'}</span>
                  </div>
                </div>

                {/* Risk bar */}
                <div style={{ marginTop: '12px' }}>
                  <div style={{
                    height: '6px',
                    background: '#0f172a',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${score.overallScore}%`,
                      background: `linear-gradient(90deg, ${getRiskColor(score.riskLevel)}88, ${getRiskColor(score.riskLevel)})`,
                      borderRadius: '3px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
