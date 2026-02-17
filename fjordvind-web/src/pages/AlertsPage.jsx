import { useState, useEffect } from 'react'
import { supabase, fetchAlerts } from '../services/supabase'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([])
  const [counts, setCounts] = useState({ critical: 0, warning: 0, info: 0, unread: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadAlerts()
  }, [])

  async function loadAlerts() {
    try {
      setLoading(true)

      // Fetch alerts from Supabase
      const { alerts: alertsData } = await fetchAlerts({ limit: 100 })

      // Transform data to expected format
      const transformedAlerts = (alertsData || []).map(a => ({
        id: a.id,
        title: a.title,
        message: a.message,
        severity: a.severity,
        alertType: a.alert_type,
        locality: a.locality || a.merds?.lokalitet,
        merdName: a.merds?.navn,
        recommendedAction: a.recommended_action,
        isRead: a.is_read,
        acknowledgedAt: a.acknowledged_at,
        createdAt: a.created_at
      }))

      setAlerts(transformedAlerts)

      // Calculate counts
      const critical = transformedAlerts.filter(a => a.severity === 'CRITICAL').length
      const warning = transformedAlerts.filter(a => a.severity === 'WARNING').length
      const info = transformedAlerts.filter(a => a.severity === 'INFO').length
      const unread = transformedAlerts.filter(a => !a.isRead).length

      setCounts({ critical, warning, info, unread })
    } catch (error) {
      console.error('Failed to load alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function markAsRead(alertId) {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', alertId)

      if (error) throw error
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, isRead: true } : a))
      setCounts({ ...counts, unread: Math.max(0, counts.unread - 1) })
    } catch (error) {
      console.error('Failed to mark alert as read:', error)
    }
  }

  async function acknowledgeAlert(alertId) {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({
          is_read: true,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId)

      if (error) throw error
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, isRead: true, acknowledgedAt: new Date().toISOString() } : a))
      setCounts({ ...counts, unread: Math.max(0, counts.unread - 1) })
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    }
  }

  const filteredAlerts = filter === 'all'
    ? alerts
    : filter === 'unread'
      ? alerts.filter(a => !a.isRead)
      : alerts.filter(a => a.severity === filter)

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} min siden`
    if (diffHours < 24) return `${diffHours} timer siden`
    if (diffDays < 7) return `${diffDays} dager siden`
    return date.toLocaleDateString('nb-NO')
  }

  // SVG Icons
  const icons = {
    critical: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    warning: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    info: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    ),
    unread: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
    check: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    lice: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="3"/><circle cx="6" cy="8" r="2"/><circle cx="18" cy="8" r="2"/>
        <circle cx="6" cy="16" r="2"/><circle cx="18" cy="16" r="2"/><circle cx="12" cy="6" r="1.5"/>
        <circle cx="12" cy="18" r="1.5"/>
      </svg>
    ),
    treatment: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      </svg>
    ),
    mortality: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    )
  }

  const getAlertIcon = (alertType, severity) => {
    if (alertType?.includes('LICE')) return icons.lice
    if (alertType?.includes('TREATMENT')) return icons.treatment
    if (alertType?.includes('MORTALITY')) return icons.mortality
    if (severity === 'CRITICAL') return icons.critical
    if (severity === 'WARNING') return icons.warning
    return icons.info
  }

  const severityConfig = {
    CRITICAL: {
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
      color: '#ef4444',
      bgLight: 'rgba(239, 68, 68, 0.08)',
      label: 'Kritisk'
    },
    WARNING: {
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
      color: '#f59e0b',
      bgLight: 'rgba(245, 158, 11, 0.08)',
      label: 'Advarsel'
    },
    INFO: {
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
      color: '#3b82f6',
      bgLight: 'rgba(59, 130, 246, 0.08)',
      label: 'Info'
    }
  }

  if (loading) {
    return (
      <div style={{
        padding: '80px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ color: '#64748b' }}>Laster varsler...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 24px 24px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 0',
        borderBottom: '1px solid var(--border)',
        marginBottom: '28px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '600', color: 'var(--foreground)' }}>
            Varsler
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--muted)' }}>
            Overvåk kritiske hendelser og varsler for dine anlegg
          </p>
        </div>
        <button
          onClick={loadAlerts}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            background: 'var(--card)',
            color: 'var(--foreground)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
            <path d="M16 16h5v5"/>
          </svg>
          Oppdater
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        {[
          { key: 'critical', label: 'Kritiske', value: counts.critical, color: '#ef4444', icon: icons.critical },
          { key: 'warning', label: 'Advarsler', value: counts.warning, color: '#f59e0b', icon: icons.warning },
          { key: 'info', label: 'Informasjon', value: counts.info, color: '#3b82f6', icon: icons.info },
          { key: 'unread', label: 'Uleste', value: counts.unread, color: '#8b5cf6', icon: icons.unread }
        ].map(stat => (
          <div
            key={stat.key}
            onClick={() => setFilter(stat.key === 'unread' ? 'unread' : stat.key.toUpperCase())}
            style={{
              background: 'var(--card)',
              borderRadius: '16px',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: `${stat.color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: stat.color,
              flexShrink: 0
            }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '2px' }}>{stat.label}</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Pills */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {[
          { key: 'all', label: 'Alle varsler', count: alerts.length },
          { key: 'unread', label: 'Uleste', count: counts.unread },
          { key: 'CRITICAL', label: 'Kritiske', count: counts.critical },
          { key: 'WARNING', label: 'Advarsler', count: counts.warning },
          { key: 'INFO', label: 'Info', count: counts.info }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '10px 18px',
              borderRadius: '100px',
              border: filter === f.key ? 'none' : '1px solid var(--border)',
              background: filter === f.key
                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                : 'var(--card)',
              color: filter === f.key ? 'white' : 'var(--foreground)',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: filter === f.key
                ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                : '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            {f.label}
            <span style={{
              background: filter === f.key ? 'rgba(255,255,255,0.25)' : 'var(--border)',
              padding: '2px 8px',
              borderRadius: '100px',
              fontSize: '11px',
              fontWeight: '600'
            }}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredAlerts.map(alert => {
          const config = severityConfig[alert.severity] || severityConfig.INFO

          return (
            <div
              key={alert.id}
              style={{
                background: 'var(--card)',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid var(--border)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                opacity: alert.acknowledgedAt ? 0.7 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {/* Alert Header */}
              <div style={{
                background: config.gradient,
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    flexShrink: 0
                  }}>
                    {getAlertIcon(alert.alertType, alert.severity)}
                  </div>
                  <div>
                    <h3 style={{
                      margin: 0,
                      fontWeight: '600',
                      color: 'white',
                      fontSize: '16px',
                      lineHeight: 1.3
                    }}>
                      {alert.title}
                    </h3>
                    <div style={{
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.85)',
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      {alert.merdName && (
                        <>
                          <span style={{
                            background: 'rgba(255,255,255,0.15)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}>
                            {alert.merdName}
                          </span>
                          <span style={{ opacity: 0.6 }}>•</span>
                        </>
                      )}
                      <span>{alert.locality}</span>
                      <span style={{ opacity: 0.6 }}>•</span>
                      <span>{formatDate(alert.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  {!alert.isRead && (
                    <span style={{
                      background: 'white',
                      color: config.color,
                      padding: '5px 12px',
                      borderRadius: '100px',
                      fontSize: '11px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Ny
                    </span>
                  )}
                  <span style={{
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    padding: '5px 12px',
                    borderRadius: '100px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'white',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {config.label}
                  </span>
                </div>
              </div>

              {/* Alert Body */}
              <div style={{ padding: '20px' }}>
                <p style={{
                  margin: '0 0 16px 0',
                  lineHeight: '1.7',
                  color: 'var(--foreground)',
                  fontSize: '14px'
                }}>
                  {alert.message}
                </p>

                {alert.recommendedAction && (
                  <div style={{
                    background: config.bgLight,
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '16px',
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: config.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      flexShrink: 0
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{
                        fontSize: '11px',
                        color: config.color,
                        fontWeight: '700',
                        marginBottom: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Anbefalt handling
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--foreground)', lineHeight: 1.5 }}>
                        {alert.recommendedAction}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}>
                  {!alert.isRead && (
                    <button
                      onClick={() => markAsRead(alert.id)}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--foreground)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      Marker som lest
                    </button>
                  )}
                  {!alert.acknowledgedAt && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {icons.check}
                      Bekreft mottatt
                    </button>
                  )}
                  {alert.acknowledgedAt && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#22c55e',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      Bekreftet {formatDate(alert.acknowledgedAt)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Empty State */}
        {filteredAlerts.length === 0 && (
          <div style={{
            padding: '80px 40px',
            textAlign: 'center',
            background: 'var(--card)',
            borderRadius: '20px',
            border: '1px solid var(--border)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #22c55e15 0%, #16a34a15 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto'
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--foreground)'
            }}>
              Ingen varsler
            </h3>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: 'var(--muted)',
              maxWidth: '300px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              Alt ser bra ut! Du har ingen aktive varsler for øyeblikket.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
