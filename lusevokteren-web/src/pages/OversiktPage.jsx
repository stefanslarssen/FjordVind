import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function OversiktPage() {
  const navigate = useNavigate()
  const { language, t } = useLanguage()
  const [selectedLocation, setSelectedLocation] = useState('')
  const [locations, setLocations] = useState([])
  const [merds, setMerds] = useState([])
  const [predictions, setPredictions] = useState(null)
  const [treatments, setTreatments] = useState([])
  const [riskScores, setRiskScores] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [stats, setStats] = useState(null)
  const [monthlyStats, setMonthlyStats] = useState(null)
  const [feedStorageData, setFeedStorageData] = useState(null)
  const [liceTrendData, setLiceTrendData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showFilter, setShowFilter] = useState(false)
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadAllData()
  }, [])

  useEffect(() => {
    if (selectedLocation) {
      loadMerdsForLocation(selectedLocation)
    }
  }, [selectedLocation])

  async function loadAllData() {
    try {
      const [locRes, predRes, treatRes, riskRes, alertRes, statsRes, monthlyRes, feedRes, trendRes] = await Promise.all([
        fetch(`${API_URL}/api/locations`).catch(() => null),
        fetch(`${API_URL}/api/predictions/summary`).catch(() => null),
        fetch(`${API_URL}/api/treatments/recommendations`).catch(() => null),
        fetch(`${API_URL}/api/risk-scores`).catch(() => null),
        fetch(`${API_URL}/api/alerts?severity=CRITICAL&limit=5`).catch(() => null),
        fetch(`${API_URL}/api/stats`).catch(() => null),
        fetch(`${API_URL}/api/dashboard/monthly-stats`).catch(() => null),
        fetch(`${API_URL}/api/dashboard/feed-storage`).catch(() => null),
        fetch(`${API_URL}/api/stats/lice-trend?days=14`).catch(() => null)
      ])

      if (locRes?.ok) {
        const locData = await locRes.json()
        const locs = locData.locations || locData || []
        setLocations(locs)
        if (locs.length > 0) {
          setSelectedLocation(locs[0].name || locs[0].lokalitet)
        }
      }

      if (predRes?.ok) {
        const predData = await predRes.json()
        setPredictions(predData.sevenDayForecast)
      }

      if (treatRes?.ok) {
        const treatData = await treatRes.json()
        setTreatments(treatData.recommendations || [])
      }

      if (riskRes?.ok) {
        const riskData = await riskRes.json()
        setRiskScores(riskData)
      }

      if (alertRes?.ok) {
        const alertData = await alertRes.json()
        setAlerts(alertData.alerts || [])
      }

      if (statsRes?.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (monthlyRes?.ok) {
        const monthlyData = await monthlyRes.json()
        setMonthlyStats(monthlyData)
      }

      if (feedRes?.ok) {
        const feedData = await feedRes.json()
        setFeedStorageData(feedData)
      }

      if (trendRes?.ok) {
        const trendData = await trendRes.json()
        setLiceTrendData(trendData)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadMerdsForLocation(location) {
    try {
      const response = await fetch(`${API_URL}/api/dashboard/locality/${encodeURIComponent(location)}`)
      if (response.ok) {
        const data = await response.json()
        setMerds(data.cages || [])
      }
    } catch (error) {
      console.error('Failed to load merds:', error)
    }
  }

  const currentDate = new Date()
  const locale = language === 'en' ? 'en-US' : 'nb-NO'
  const dateString = currentDate.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeString = currentDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })

  // Use API data or fallback to defaults
  const predictionData = predictions || {
    avgPredictedLice: 0.58,
    avgProbabilityExceed: 0.78,
    treatmentNeededCount: 2,
    merdsNeedingTreatment: ['Merd 4', 'Merd 5'],
    criticalCount: 1,
    highCount: 1
  }

  const riskData = riskScores || {
    aggregateRiskScore: 34,
    aggregateRiskLevel: 'MODERATE'
  }

  const statsData = stats || {
    avgLice: 0.45,
    totalMerds: merds.length || 7,
    mortalityRate: 1.25
  }

  const criticalAlert = alerts.length > 0 ? alerts[0] : null

  function getWelfareColor(score) {
    switch (score) {
      case 'A': return '#22c55e'
      case 'B': return '#f59e0b'
      case 'C': return '#ef4444'
      default: return '#6b7280'
    }
  }

  // Generate chart data from API or use defaults
  const liceChartData = liceTrendData?.dailyData?.map(d => d.avgLice * 50) || [12, 15, 18, 14, 16, 19, 22, 20, 18, 15, 13, 14, 16, 18]
  const liceTrend = liceTrendData?.trend || { percent: -12, direction: 'down' }

  // Use monthly stats from API
  const months = monthlyStats?.months || ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
  const liceMonthlyData = monthlyStats?.lice?.monthlyData || []
  const mortalityMonthlyData = monthlyStats?.mortality?.monthlyData || []
  const growthMonthlyData = monthlyStats?.growth?.monthlyData || []

  // Feed storage from API
  const feedStorage = feedStorageData?.feedTypes || []
  const totalFeedStorage = feedStorageData?.totalKg || 0
  const daysRemaining = feedStorageData?.daysRemaining || 0
  const maxFeedAmount = feedStorage.length > 0 ? Math.max(...feedStorage.map(f => f.amount)) : 1

  if (loading) {
    return (
      <div style={{
        background: 'var(--bg)',
        minHeight: '100vh',
        color: 'var(--text)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>{t('dashboard.loadingData')}</div>
          <div style={{ color: 'var(--muted)', fontSize: '14px' }}>{t('dashboard.fetchingFromApi')}</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--bg)',
      minHeight: '100vh',
      color: 'var(--text)',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    }}>
      {/* Top Header Bar */}
      <div style={{
        background: 'var(--panel)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* FjordVind Icon */}
          <svg viewBox="0 0 100 100" style={{ width: '36px', height: '36px' }}>
            <path d="M15 65 L32 35 L50 50 L70 22" stroke="#1e40af" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 78 L45 78" stroke="#3b82f6" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
            <path d="M35 88 L85 88" stroke="#93c5fd" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
          </svg>

          <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>FjordVind</span>

          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            style={{
              padding: '10px 16px',
              background: 'var(--border)',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--text)',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            {locations.length > 0 ? (
              locations.map(loc => (
                <option key={loc.id || loc.name} value={loc.name || loc.lokalitet}>
                  {loc.name || loc.lokalitet}
                </option>
              ))
            ) : (
              <option value="">{t('dashboard.noLocations')}</option>
            )}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/rapporter')}
            style={{
              padding: '10px 16px',
              background: 'var(--panel, #334155)',
              border: '1px solid var(--border, #475569)',
              borderRadius: '8px',
              color: 'var(--text, white)',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary, #3b82f6)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--panel, #334155)'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            {t('dashboard.reports')}
          </button>

          <button
            onClick={() => setShowFilter(true)}
            style={{
              padding: '10px 16px',
              background: 'var(--panel, #334155)',
              border: '1px solid var(--border, #475569)',
              borderRadius: '8px',
              color: 'var(--text, white)',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary, #3b82f6)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--panel, #334155)'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            {t('dashboard.filter')}
          </button>

          <div style={{
            padding: '10px 16px',
            background: 'var(--panel, #334155)',
            border: '1px solid var(--border, #475569)',
            borderRadius: '8px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <input
              type="date"
              value={viewDate}
              onChange={(e) => setViewDate(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text, white)',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {/* Critical Alert Banner */}
        {(criticalAlert || predictionData.criticalCount > 0 || predictionData.highCount > 0) && (
          <div style={{
            background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
            borderRadius: '12px',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: '#fbbf24',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>
                  {criticalAlert?.title || `${t('dashboard.critical')}: ${predictionData.merdsNeedingTreatment?.join(language === 'en' ? ' and ' : ' og ') || (language === 'en' ? 'Multiple cages' : 'Flere merder')} ${t('dashboard.approachingLimit')}`}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                  {criticalAlert?.message || `${t('dashboard.predictionShows')} ${Math.round(predictionData.avgProbabilityExceed * 100)}% ${t('dashboard.probabilityExceed')}. ${t('dashboard.recommendedAction')}`}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => navigate('/treatments')}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '2px solid rgba(255,255,255,0.5)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {t('dashboard.planTreatment')}
              </button>
              <button
                onClick={() => navigate('/predictions')}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {t('dashboard.seeDetails')}
              </button>
            </div>
          </div>
        )}

        {/* Dashboard Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
          {/* Lice Count Card */}
          <div style={{
            background: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
            borderRadius: '12px',
            padding: '20px',
            color: 'var(--text)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>{t('dashboard.liceCount')} ~</div>
                <div style={{ fontSize: '32px', fontWeight: 700 }}>{(monthlyStats?.lice?.totalCount || 0).toLocaleString()}</div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>{t('dashboard.totalLiceFound')}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '50px', marginBottom: '12px' }}>
              {liceMonthlyData.length > 0 ? liceMonthlyData.map((value, idx) => {
                const maxVal = Math.max(...liceMonthlyData, 1)
                return (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.6)',
                      borderRadius: '2px 2px 0 0',
                      height: `${(value / maxVal) * 100}%`,
                      minHeight: value > 0 ? '4px' : '0'
                    }}
                  />
                )
              }) : (
                <div style={{ flex: 1, opacity: 0.5, textAlign: 'center', fontSize: '11px' }}>{t('common.noData')}</div>
              )}
            </div>
            <div style={{ display: 'flex', fontSize: '9px', opacity: 0.7, justifyContent: 'space-between' }}>
              {months.map(m => <span key={m}>{m}</span>)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '10px' }}>
              <div>
                <div style={{ opacity: 0.7 }}>{t('dashboard.leastLiceIn')}</div>
                <div style={{ fontWeight: 600 }}>{monthlyStats?.lice?.leastLiceMerds?.join(', ') || '-'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ opacity: 0.7 }}>{t('dashboard.mostLiceIn')}</div>
                <div style={{ fontWeight: 600 }}>{monthlyStats?.lice?.mostLiceMerds?.join(', ') || '-'}</div>
              </div>
            </div>
          </div>

          {/* Mortality Card */}
          <div style={{
            background: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
            borderRadius: '12px',
            padding: '20px',
            color: 'var(--text)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>{t('dashboard.mortality')} ~</div>
                <div style={{ fontSize: '32px', fontWeight: 700 }}>{(monthlyStats?.mortality?.totalCount || 0).toLocaleString()}</div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>{t('dashboard.totalLoss')}</div>
              </div>
            </div>
            <div style={{ position: 'relative', height: '50px', marginBottom: '12px' }}>
              {mortalityMonthlyData.length > 0 ? (
                <svg width="100%" height="100%" viewBox="0 0 100 50" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="mortalityGradientOversikt" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M0,${50 - (mortalityMonthlyData[0] / Math.max(...mortalityMonthlyData, 1)) * 45} ${mortalityMonthlyData.map((v, i) => `L${(i / (mortalityMonthlyData.length - 1 || 1)) * 100},${50 - (v / Math.max(...mortalityMonthlyData, 1)) * 45}`).join(' ')} L100,50 L0,50 Z`}
                    fill="url(#mortalityGradientOversikt)"
                  />
                  <path
                    d={`M0,${50 - (mortalityMonthlyData[0] / Math.max(...mortalityMonthlyData, 1)) * 45} ${mortalityMonthlyData.map((v, i) => `L${(i / (mortalityMonthlyData.length - 1 || 1)) * 100},${50 - (v / Math.max(...mortalityMonthlyData, 1)) * 45}`).join(' ')}`}
                    fill="none"
                    stroke="rgba(255,255,255,0.8)"
                    strokeWidth="2"
                  />
                </svg>
              ) : (
                <div style={{ opacity: 0.5, textAlign: 'center', fontSize: '11px', paddingTop: '15px' }}>{t('common.noData')}</div>
              )}
            </div>
            <div style={{ display: 'flex', fontSize: '9px', opacity: 0.7, justifyContent: 'space-between' }}>
              {months.map(m => <span key={m}>{m}</span>)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '10px' }}>
              <div>
                <div style={{ opacity: 0.7 }}>{t('dashboard.leastLossIn')}</div>
                <div style={{ fontWeight: 600 }}>{monthlyStats?.mortality?.leastDeathsMerds?.join(', ') || '-'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ opacity: 0.7 }}>{t('dashboard.mostLossIn')}</div>
                <div style={{ fontWeight: 600 }}>{monthlyStats?.mortality?.mostDeathsMerds?.join(', ') || '-'}</div>
              </div>
            </div>
          </div>

          {/* Relative Growth Index Card */}
          <div style={{
            background: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
            borderRadius: '12px',
            padding: '20px',
            color: 'var(--text)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>{t('dashboard.relativeGrowthIndex')}</div>
                <div style={{ fontSize: '32px', fontWeight: 700 }}>{monthlyStats?.growth?.currentIndex || 100}</div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>{(monthlyStats?.growth?.currentIndex || 100) >= 100 ? t('dashboard.goodGrowth') : t('dashboard.belowTarget')}</div>
              </div>
            </div>
            <div style={{ position: 'relative', height: '50px', marginBottom: '12px' }}>
              {growthMonthlyData.length > 0 ? (
                <svg width="100%" height="100%" viewBox="0 0 100 50" preserveAspectRatio="none">
                  <path
                    d={`M0,${50 - ((growthMonthlyData[0] - 80) / 70) * 45} ${growthMonthlyData.map((v, i) => `L${(i / (growthMonthlyData.length - 1 || 1)) * 100},${50 - ((v - 80) / 70) * 45}`).join(' ')}`}
                    fill="none"
                    stroke="rgba(255,255,255,0.8)"
                    strokeWidth="2"
                  />
                </svg>
              ) : (
                <div style={{ opacity: 0.5, textAlign: 'center', fontSize: '11px', paddingTop: '15px' }}>{t('common.noData')}</div>
              )}
            </div>
            <div style={{ display: 'flex', fontSize: '9px', opacity: 0.7, justifyContent: 'space-between' }}>
              {months.map(m => <span key={m}>{m}</span>)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '10px' }}>
              <div>
                <div style={{ opacity: 0.7 }}>{t('dashboard.bestIn')}</div>
                <div style={{ fontWeight: 600 }}>{monthlyStats?.growth?.bestMonth || '-'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ opacity: 0.7 }}>{t('dashboard.worstIn')}</div>
                <div style={{ fontWeight: 600 }}>{monthlyStats?.growth?.worstMonth || '-'}</div>
              </div>
            </div>
          </div>

          {/* Feed Storage Card */}
          <div style={{
            background: 'var(--panel)',
            borderRadius: '12px',
            padding: '20px',
            color: 'var(--text)',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>{t('dashboard.feedStorage')}</div>
                <div style={{ fontSize: '28px', fontWeight: 700 }}>{totalFeedStorage.toLocaleString()} kg</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{daysRemaining > 0 ? t('dashboard.lastsForDays').replace('{days}', daysRemaining) : t('common.noData')}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '60px', marginTop: '16px' }}>
              {feedStorage.length > 0 ? feedStorage.map((feed, idx) => (
                <div key={idx} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: 'var(--muted)', marginBottom: '4px' }}>
                    {(feed.amount / 1000).toFixed(0)}k
                  </div>
                  <div
                    style={{
                      background: 'linear-gradient(180deg, #14b8a6 0%, #0d9488 100%)',
                      borderRadius: '4px 4px 0 0',
                      height: `${(feed.amount / maxFeedAmount) * 50}px`,
                      margin: '0 auto'
                    }}
                  />
                </div>
              )) : (
                <div style={{ flex: 1, color: 'var(--muted)', textAlign: 'center', fontSize: '11px', paddingTop: '20px' }}>
                  {t('dashboard.noStorageData')}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              {feedStorage.map((feed, idx) => (
                <div key={idx} style={{ flex: 1, fontSize: '8px', color: 'var(--muted)', textAlign: 'center' }}>
                  {feed.name?.split(' ')[0] || `Type ${idx + 1}`}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Predictive Analysis Section */}
        <div style={{
          background: 'var(--panel)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '20px',
          border: '1px solid var(--border)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 700, fontSize: '18px' }}>{t('dashboard.predictiveAnalysis')}</span>
              <span style={{
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: 'var(--text)',
                fontSize: '10px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '4px'
              }}>
                {t('dashboard.aiDriven')}
              </span>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '13px' }}>
              {t('dashboard.updated')}: {t('dashboard.today')} {timeString}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {/* Luseprediksjon */}
            <div style={{
              background: 'var(--panel)',
              borderRadius: '10px',
              padding: '20px',
              border: '1px solid rgba(59,130,246,0.3)'
            }}>
              <div style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px' }}>
                {t('dashboard.licePrediction7Days')}
              </div>
              <div style={{ color: predictionData.avgPredictedLice > 0.5 ? '#ef4444' : predictionData.avgPredictedLice > 0.3 ? '#f59e0b' : '#22c55e', fontSize: '36px', fontWeight: 700, marginBottom: '8px' }}>
                {predictionData.avgPredictedLice?.toFixed(2) || '0.58'}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '4px' }}>
                {t('dashboard.expectedAvgAdultFemale')}
              </div>
              <div style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 600 }}>
                ↑ +29% {t('dashboard.fromToday')}
              </div>
            </div>

            {/* Behandlingsbehov */}
            <div style={{
              background: 'var(--panel)',
              borderRadius: '10px',
              padding: '20px',
              border: '1px solid rgba(59,130,246,0.3)'
            }}>
              <div style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px' }}>
                {t('dashboard.treatmentNeed')}
              </div>
              <div style={{ color: 'var(--text)', fontSize: '36px', fontWeight: 700, marginBottom: '8px' }}>
                {predictionData.treatmentNeededCount || treatments.length || 2}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '4px' }}>
                {t('dashboard.cagesWithin14Days')}
              </div>
              <div style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 600 }}>
                {predictionData.merdsNeedingTreatment?.join(', ') || treatments.map(t => t.merdName).join(', ') || 'Merd 4, 5'}
              </div>
            </div>

            {/* Vekstprognose */}
            <div style={{
              background: 'var(--panel)',
              borderRadius: '10px',
              padding: '20px',
              border: '1px solid rgba(59,130,246,0.3)'
            }}>
              <div style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px' }}>
                {t('dashboard.growthForecast30D')}
              </div>
              <div style={{ color: '#22c55e', fontSize: '36px', fontWeight: 700, marginBottom: '8px' }}>
                +18%
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '4px' }}>
                {t('dashboard.expectedBiomassIncrease')}
              </div>
              <div style={{ color: '#22c55e', fontSize: '12px', fontWeight: 600 }}>
                ↑ {t('dashboard.goodGrowth')}
              </div>
            </div>

            {/* Risikoscore */}
            <div style={{
              background: 'var(--panel)',
              borderRadius: '10px',
              padding: '20px',
              border: '1px solid rgba(59,130,246,0.3)'
            }}>
              <div style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px' }}>
                {t('dashboard.riskScore')}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: riskData.aggregateRiskScore >= 70 ? '#ef4444' : riskData.aggregateRiskScore >= 50 ? '#f59e0b' : '#22c55e', fontSize: '36px', fontWeight: 700 }}>
                  {riskData.aggregateRiskScore || 34}
                </span>
                <span style={{ color: 'var(--muted)', fontSize: '18px' }}>/100</span>
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '4px' }}>
                {t('dashboard.totalFacilityRisk')}
              </div>
              <div style={{ color: riskData.aggregateRiskScore >= 70 ? '#ef4444' : riskData.aggregateRiskScore >= 50 ? '#f59e0b' : '#22c55e', fontSize: '12px', fontWeight: 600 }}>
                {riskData.aggregateRiskScore >= 70 ? t('dashboard.criticalRisk') : riskData.aggregateRiskScore >= 50 ? t('dashboard.highRisk') : riskData.aggregateRiskScore >= 30 ? t('dashboard.lowModerateRisk') : t('dashboard.lowRisk')}
              </div>
            </div>
          </div>
        </div>

        {/* Merd Status Section */}
        <div style={{
          background: 'var(--panel)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '20px',
          border: '1px solid var(--border)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 600 }}>
              {t('dashboard.merdStatus')} ({merds.length || statsData.totalMerds} {t('dashboard.active')})
            </div>
            <button
              onClick={() => navigate('/locations')}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--muted)',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {t('dashboard.seeAllDetails')} →
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(merds.length || 7, 7)}, 1fr)`, gap: '12px' }}>
            {(merds.length > 0 ? merds : [
              { id: 1, name: 'Merd 1', welfareScore: 'A', fishCount: 243950, avgWeight: 604, liceLevel: 'OK' },
              { id: 2, name: 'Merd 2', welfareScore: 'A', fishCount: 244100, avgWeight: 603, liceLevel: 'OK' },
              { id: 3, name: 'Merd 3', welfareScore: 'A', fishCount: 243700, avgWeight: 605, liceLevel: 'OK' },
              { id: 4, name: 'Merd 4', welfareScore: 'B', fishCount: 244200, avgWeight: 603, liceLevel: 'WARNING' },
              { id: 5, name: 'Merd 5', welfareScore: 'B', fishCount: 243500, avgWeight: 605, liceLevel: 'WARNING' },
              { id: 6, name: 'Merd 6', welfareScore: 'A', fishCount: 244000, avgWeight: 604, liceLevel: 'OK' },
              { id: 7, name: 'Merd 7', welfareScore: 'A', fishCount: 243800, avgWeight: 604.5, liceLevel: 'OK' },
            ]).slice(0, 7).map(merd => (
              <div
                key={merd.id}
                style={{
                  background: 'var(--bg)',
                  borderRadius: '10px',
                  padding: '16px',
                  textAlign: 'center',
                  border: '1px solid var(--border)',
                  position: 'relative',
                  cursor: 'pointer'
                }}
              >
                {(merd.liceLevel === 'WARNING' || merd.liceLevel === 'DANGER') && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '16px',
                    height: '16px',
                    background: merd.liceLevel === 'DANGER' ? '#ef4444' : '#f59e0b',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: 'var(--text)',
                    fontWeight: 700
                  }}>!</div>
                )}

                <div style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '8px' }}>
                  {merd.name || `Merd ${merd.id}`}
                </div>

                <div style={{
                  width: '48px',
                  height: '48px',
                  background: getWelfareColor(merd.welfareScore || merd.welfare || 'A'),
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  fontSize: '20px',
                  fontWeight: 700
                }}>
                  {merd.welfareScore || merd.welfare || 'A'}
                </div>

                <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
                  {(merd.fishCount || merd.fish || 240000).toLocaleString()}
                </div>

                <div style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '8px' }}>
                  {t('dashboard.fish')} • {merd.avgWeight || merd.weight || 600}g {t('dashboard.avgWeight')}
                </div>

                <div style={{
                  background: merd.liceLevel === 'DANGER' ? 'rgba(239,68,68,0.2)' : merd.liceLevel === 'WARNING' ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)',
                  color: merd.liceLevel === 'DANGER' ? '#fca5a5' : merd.liceLevel === 'WARNING' ? '#fcd34d' : '#86efac',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 600
                }}>
                  {t('dashboard.liceRisk7d')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Behandlingsanbefalinger Section */}
        <div style={{
          background: 'var(--panel)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '20px',
          border: '1px solid var(--border)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px', fontWeight: 600 }}>{t('dashboard.treatmentRecommendations')}</span>
              <span style={{
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                color: 'var(--text)',
                fontSize: '10px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '4px'
              }}>
                {t('dashboard.newFeature')}
              </span>
            </div>
            <button
              onClick={() => navigate('/treatments')}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text)',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              + {t('dashboard.planTreatment')}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(treatments.length > 0 ? treatments : [
              { merdName: 'Merd 4', currentLice: 0.42, predictedLice: 0.62, recommendedTreatment: 'THERMOLICER', urgency: 'HIGH', urgencyText: 'Innen 5 dager' },
              { merdName: 'Merd 5', currentLice: 0.38, predictedLice: 0.55, recommendedTreatment: 'HYDROLICER', urgency: 'MEDIUM', urgencyText: 'Innen 10 dager' },
            ]).map((tr, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg)',
                  borderRadius: '10px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid var(--border)'
                }}
              >
                <div style={{ fontWeight: 600, minWidth: '80px' }}>{tr.merdName || tr.merd}</div>

                <div style={{ color: 'var(--muted)', fontSize: '13px' }}>
                  {t('dashboard.liceLevel')} {tr.currentLice?.toFixed(2) || '0.42'} → {t('dashboard.predicted')}<br />
                  <span style={{ color: '#f59e0b' }}>{tr.predictedLice?.toFixed(2) || '0.62'}</span> {t('dashboard.inDays').replace('{days}', '7')}
                </div>

                <div style={{ color: 'var(--muted)', fontSize: '13px' }}>
                  {t('dashboard.recommendedMethod')}:<br />
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{tr.recommendedTreatment || tr.method || 'Termolicer'}</span>
                </div>

                <div style={{
                  background: tr.urgency === 'HIGH' ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)',
                  color: tr.urgency === 'HIGH' ? '#fcd34d' : '#86efac',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  {tr.urgencyText || t('dashboard.withinDays').replace('{days}', tr.urgency === 'HIGH' ? '5' : '10')}
                </div>

                <button
                  onClick={() => navigate('/treatments')}
                  style={{
                    padding: '8px 20px',
                    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'var(--text)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  {t('dashboard.plan')} →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Stats Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px' }}>
          {/* Lusetelling Trend */}
          <div style={{
            background: 'var(--panel)',
            borderRadius: '12px',
            padding: '20px 24px',
            border: '1px solid var(--border)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{t('dashboard.liceTrend')}</div>
              <div style={{
                color: liceTrend.direction === 'down' ? '#22c55e' : liceTrend.direction === 'up' ? '#ef4444' : '#94a3b8',
                fontSize: '13px',
                fontWeight: 600
              }}>
                {liceTrend.direction === 'down' ? '↓' : liceTrend.direction === 'up' ? '↑' : '→'} {liceTrend.percent > 0 ? '+' : ''}{liceTrend.percent}% {t('dashboard.last14Days')}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px' }}>
              {liceChartData.map((value, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(180deg, #22d3ee 0%, #0891b2 100%)',
                    borderRadius: '4px 4px 0 0',
                    height: `${(value / 25) * 100}%`,
                    minHeight: '20px'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Snitt Lusenivå */}
          <div style={{
            background: 'var(--panel)',
            borderRadius: '12px',
            padding: '20px 24px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '12px' }}>
              {t('dashboard.avgLiceLevel')}
            </div>
            <div style={{ color: '#22d3ee', fontSize: '48px', fontWeight: 700, marginBottom: '8px' }}>
              {statsData.avgLice?.toFixed(2) || '0.45'}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '12px' }}>
              {t('dashboard.adultFemaleLicePerFish')}
            </div>
            <div style={{
              background: (statsData.avgLice || 0.45) < 0.5 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
              color: (statsData.avgLice || 0.45) < 0.5 ? '#86efac' : '#fca5a5',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              display: 'inline-block'
            }}>
              {(statsData.avgLice || 0.45) < 0.5 ? `✓ ${t('dashboard.belowLimit')}` : `⚠ ${t('dashboard.aboveLimit')}`}
            </div>
          </div>

          {/* Dødelighet */}
          <div style={{
            background: 'var(--panel)',
            borderRadius: '12px',
            padding: '20px 24px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '12px' }}>
              {t('dashboard.mortalityTitle')}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#f59e0b', fontSize: '48px', fontWeight: 700 }}>
                {statsData.mortalityRate?.toFixed(2) || '1.25'}
              </span>
              <span style={{ color: 'var(--muted)', fontSize: '24px' }}>%</span>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '12px' }}>
              {t('dashboard.lossLast30Days')}
            </div>
            <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>
              ↑ +0.3% {t('dashboard.fromLastMonth')}
            </div>
          </div>
        </div>

        {/* Miljøparametere Section */}
        <div style={{
          background: 'var(--panel)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginTop: '20px',
          border: '1px solid var(--border)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <span style={{ fontSize: '18px', fontWeight: 600 }}>{t('dashboard.environmentParameters')}</span>
            <span style={{
              background: '#22c55e',
              color: 'var(--text)',
              fontSize: '10px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '4px'
            }}>
              {t('dashboard.liveData')}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
            {/* Vanntemperatur */}
            <div style={{
              background: 'var(--bg)',
              borderRadius: '10px',
              padding: '20px',
              textAlign: 'center',
              border: '1px solid var(--border)'
            }}>
              <div style={{ color: '#22d3ee', fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
                8.2°C
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '8px' }}>
                {t('dashboard.waterTemperature')}
              </div>
              <div style={{
                background: 'rgba(34,197,94,0.2)',
                color: '#86efac',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'inline-block'
              }}>
                {t('dashboard.optimal')}
              </div>
            </div>

            {/* Oksygen */}
            <div style={{
              background: 'var(--bg)',
              borderRadius: '10px',
              padding: '20px',
              textAlign: 'center',
              border: '1px solid var(--border)'
            }}>
              <div style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
                92%
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '8px' }}>
                {t('dashboard.oxygen')}
              </div>
              <div style={{
                background: 'rgba(34,197,94,0.2)',
                color: '#86efac',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'inline-block'
              }}>
                {t('dashboard.optimal')}
              </div>
            </div>

            {/* Salinitet */}
            <div style={{
              background: 'var(--bg)',
              borderRadius: '10px',
              padding: '20px',
              textAlign: 'center',
              border: '1px solid var(--border)'
            }}>
              <div style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
                34.2‰
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '8px' }}>
                {t('dashboard.salinity')}
              </div>
              <div style={{
                background: 'rgba(34,197,94,0.2)',
                color: '#86efac',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'inline-block'
              }}>
                {t('dashboard.optimal')}
              </div>
            </div>

            {/* pH Nivå */}
            <div style={{
              background: 'var(--bg)',
              borderRadius: '10px',
              padding: '20px',
              textAlign: 'center',
              border: '1px solid var(--border)'
            }}>
              <div style={{ color: 'var(--text)', fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
                7.8
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '8px' }}>
                {t('dashboard.phLevel')}
              </div>
              <div style={{
                background: 'rgba(245,158,11,0.2)',
                color: '#fcd34d',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'inline-block'
              }}>
                {t('dashboard.low')}
              </div>
            </div>
          </div>

          {/* Bottom Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text)', fontSize: '32px', fontWeight: 700 }}>1,951,400</div>
              <div style={{ color: 'var(--muted)', fontSize: '13px' }}>{t('dashboard.totalFish')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text)', fontSize: '32px', fontWeight: 700 }}>604.01 g</div>
              <div style={{ color: 'var(--muted)', fontSize: '13px' }}>{t('dashboard.avgWeightLabel')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text)', fontSize: '32px', fontWeight: 700 }}>1,178.95 t</div>
              <div style={{ color: 'var(--muted)', fontSize: '13px' }}>{t('dashboard.totalBiomass')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#22c55e', fontSize: '32px', fontWeight: 700 }}>82%</div>
              <div style={{ color: 'var(--muted)', fontSize: '13px' }}>{t('dashboard.mtbUtilization')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Modal */}
      {showFilter && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowFilter(false)}
        >
          <div
            style={{
              background: 'var(--panel, #1e293b)',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '100%',
              padding: '24px',
              border: '1px solid var(--border, #334155)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text, white)' }}>
                {t('dashboard.filter')}
              </h2>
              <button
                onClick={() => setShowFilter(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--muted, #94a3b8)'
                }}
              >
                x
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--muted, #94a3b8)', fontSize: '14px' }}>
                  {t('dashboard.location')}
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border, #334155)',
                    background: 'var(--bg, #0f172a)',
                    color: 'var(--text, white)',
                    fontSize: '14px'
                  }}
                >
                  {locations.map(loc => (
                    <option key={loc.name || loc.lokalitet} value={loc.name || loc.lokalitet}>
                      {loc.name || loc.lokalitet}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--muted, #94a3b8)', fontSize: '14px' }}>
                  {t('dashboard.dateRange')}
                </label>
                <input
                  type="date"
                  value={viewDate}
                  onChange={(e) => setViewDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border, #334155)',
                    background: 'var(--bg, #0f172a)',
                    color: 'var(--text, white)',
                    fontSize: '14px'
                  }}
                />
              </div>

              <button
                onClick={() => setShowFilter(false)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--primary, #1e40af) 0%, var(--secondary, #3b82f6) 100%)',
                  color: 'var(--text)',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginTop: '8px'
                }}
              >
                {language === 'en' ? 'Apply Filter' : 'Bruk filter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
