import { useLanguage } from '../../contexts/LanguageContext'

/**
 * StatCard - Gjenbrukbar statistikk-kort komponent
 */
export default function StatCard({
  title,
  value,
  subtitle,
  chartData = [],
  chartType = 'bar', // 'bar' | 'line' | 'area'
  months = [],
  bottomLeft,
  bottomRight,
  gradient = 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
  valueColor = 'inherit'
}) {
  const { t } = useLanguage()
  const maxVal = chartData.length > 0 ? Math.max(...chartData, 1) : 1

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div style={{ flex: 1, opacity: 0.5, textAlign: 'center', fontSize: '11px', paddingTop: '15px' }}>
          {t('common.noData')}
        </div>
      )
    }

    if (chartType === 'bar') {
      return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '50px' }}>
          {chartData.map((val, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.6)',
                borderRadius: '2px 2px 0 0',
                height: `${(val / maxVal) * 100}%`,
                minHeight: val > 0 ? '4px' : '0'
              }}
            />
          ))}
        </div>
      )
    }

    if (chartType === 'line' || chartType === 'area') {
      const points = chartData.map((v, i) =>
        `${(i / (chartData.length - 1 || 1)) * 100},${50 - (v / maxVal) * 45}`
      ).join(' L')

      return (
        <svg width="100%" height="50" viewBox="0 0 100 50" preserveAspectRatio="none">
          {chartType === 'area' && (
            <>
              <defs>
                <linearGradient id={`gradient-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
                </linearGradient>
              </defs>
              <path
                d={`M0,${50 - (chartData[0] / maxVal) * 45} L${points} L100,50 L0,50 Z`}
                fill={`url(#gradient-${title})`}
              />
            </>
          )}
          <path
            d={`M0,${50 - (chartData[0] / maxVal) * 45} L${points}`}
            fill="none"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="2"
          />
        </svg>
      )
    }

    return null
  }

  return (
    <div style={{
      background: gradient,
      borderRadius: '12px',
      padding: '20px',
      color: 'var(--text)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>{title}</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: valueColor }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          {subtitle && <div style={{ fontSize: '11px', opacity: 0.8 }}>{subtitle}</div>}
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        {renderChart()}
      </div>

      {months.length > 0 && (
        <div style={{ display: 'flex', fontSize: '9px', opacity: 0.7, justifyContent: 'space-between' }}>
          {months.map(m => <span key={m}>{m}</span>)}
        </div>
      )}

      {(bottomLeft || bottomRight) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '10px' }}>
          {bottomLeft && (
            <div>
              <div style={{ opacity: 0.7 }}>{bottomLeft.label}</div>
              <div style={{ fontWeight: 600 }}>{bottomLeft.value}</div>
            </div>
          )}
          {bottomRight && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ opacity: 0.7 }}>{bottomRight.label}</div>
              <div style={{ fontWeight: 600 }}>{bottomRight.value}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
