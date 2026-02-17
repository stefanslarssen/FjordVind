import { useLanguage } from '../../contexts/LanguageContext'

/**
 * MerdStatusGrid - Viser status for alle merder i et grid
 */
export default function MerdStatusGrid({ merds = [], onSeeAll }) {
  const { t } = useLanguage()

  function getWelfareColor(score) {
    switch (score) {
      case 'A': return '#22c55e'
      case 'B': return '#f59e0b'
      case 'C': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const displayMerds = merds

  return (
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
          {t('dashboard.merdStatus')} ({displayMerds.length} {t('dashboard.active')})
        </div>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
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
        )}
      </div>

      {displayMerds.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
          {t('common.noData')}
        </div>
      ) : (
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(displayMerds.length, 7)}, 1fr)`,
        gap: '12px'
      }}>
        {displayMerds.slice(0, 7).map(merd => (
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
              background: merd.liceLevel === 'DANGER' ? 'rgba(239,68,68,0.2)' :
                         merd.liceLevel === 'WARNING' ? 'rgba(245,158,11,0.2)' :
                         'rgba(34,197,94,0.2)',
              color: merd.liceLevel === 'DANGER' ? '#fca5a5' :
                     merd.liceLevel === 'WARNING' ? '#fcd34d' :
                     '#86efac',
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
      )}
    </div>
  )
}
