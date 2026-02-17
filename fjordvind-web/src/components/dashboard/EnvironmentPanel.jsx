import { useLanguage } from '../../contexts/LanguageContext'

/**
 * EnvironmentPanel - Viser miljøparametere som temperatur, oksygen, etc.
 */
export default function EnvironmentPanel({ data = {} }) {
  const { t } = useLanguage()

  const hasData = data.temperature || data.oxygen || data.salinity || data.ph

  if (!hasData) {
    return (
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
        </div>
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
          {t('common.noData')}
        </div>
      </div>
    )
  }

  const parameters = [
    {
      value: data.temperature || '-',
      label: t('dashboard.waterTemperature'),
      status: data.temperature ? 'optimal' : 'unknown',
      color: '#22d3ee'
    },
    {
      value: data.oxygen || '-',
      label: t('dashboard.oxygen'),
      status: data.oxygen ? 'optimal' : 'unknown',
      color: 'var(--text)'
    },
    {
      value: data.salinity || '-',
      label: t('dashboard.salinity'),
      status: data.salinity ? 'optimal' : 'unknown',
      color: 'var(--text)'
    },
    {
      value: data.ph || '-',
      label: t('dashboard.phLevel'),
      status: data.ph ? 'optimal' : 'unknown',
      color: 'var(--text)'
    }
  ]

  const summaryStats = [
    { value: data.totalFish || '0', label: t('dashboard.totalFish') },
    { value: data.avgWeight || '0 g', label: t('dashboard.avgWeightLabel') },
    { value: data.totalBiomass || '0 t', label: t('dashboard.totalBiomass') },
    { value: data.mtbUtilization || '0%', label: t('dashboard.mtbUtilization'), color: '#22c55e' }
  ]

  function getStatusStyle(status) {
    if (status === 'optimal') {
      return { background: 'rgba(34,197,94,0.2)', color: '#86efac' }
    }
    if (status === 'low' || status === 'high') {
      return { background: 'rgba(245,158,11,0.2)', color: '#fcd34d' }
    }
    if (status === 'unknown') {
      return { background: 'rgba(100,100,100,0.2)', color: '#999' }
    }
    return { background: 'rgba(239,68,68,0.2)', color: '#fca5a5' }
  }

  function getStatusText(status) {
    if (status === 'optimal') return t('dashboard.optimal')
    if (status === 'low') return t('dashboard.low')
    if (status === 'high') return t('dashboard.high')
    if (status === 'unknown') return '-'
    return status
  }

  return (
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
        {parameters.map((param, idx) => (
          <div
            key={idx}
            style={{
              background: 'var(--bg)',
              borderRadius: '10px',
              padding: '20px',
              textAlign: 'center',
              border: '1px solid var(--border)'
            }}
          >
            <div style={{ color: param.color, fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
              {param.value}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '8px' }}>
              {param.label}
            </div>
            <div style={{
              ...getStatusStyle(param.status),
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
              display: 'inline-block'
            }}>
              {getStatusText(param.status)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {summaryStats.map((stat, idx) => (
          <div key={idx} style={{ textAlign: 'center' }}>
            <div style={{ color: stat.color || 'var(--text)', fontSize: '32px', fontWeight: 700 }}>
              {stat.value}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '13px' }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
