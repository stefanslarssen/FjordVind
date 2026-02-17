import { BarChart, Bar, LineChart, Line, ResponsiveContainer } from 'recharts'
import { useLanguage } from '../../contexts/LanguageContext'

export default function ChartsGrid({ chartData, localityData }) {
  const { t } = useLanguage()

  if (!chartData || !localityData) {
    return (
      <div className="responsive-grid-2">
        <div style={{
          background: 'var(--panel)',
          borderRadius: '8px',
          padding: '40px',
          color: 'var(--muted)',
          textAlign: 'center',
          gridColumn: '1 / -1'
        }}>
          {t('common.noData')}
        </div>
      </div>
    )
  }

  const totalFeed = localityData?.cages?.reduce((sum, c) => sum + (c.feedStorageKg || 0), 0) || 0
  const feedChartData = localityData?.cages?.map((c, i) => ({
    name: `${i+1}`,
    feed: (c.feedStorageKg || 0) / 1000
  })) || []

  return (
    <div className="responsive-grid-2">
      {/* Lice Count */}
      <div style={{
        background: '#4a9fb5',
        borderRadius: '8px',
        padding: '20px',
        color: 'white'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
              {t('dashboard.liceCount')}
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>
            {localityData?.aggregated?.avgAdultFemaleLice?.toFixed(2) || '0'}
          </div>
        </div>
        {chartData.liceCount?.length > 0 ? (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData.liceCount}>
              <Bar dataKey="avgLicePerFish" fill="rgba(255,255,255,0.7)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
            {t('common.noData')}
          </div>
        )}
      </div>

      {/* Growth */}
      <div style={{
        background: '#5cb592',
        borderRadius: '8px',
        padding: '20px',
        color: 'white'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
              {t('dashboard.relativeGrowthIndex')}
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>
            {localityData?.aggregated?.growthIndex || '0'}
          </div>
        </div>
        {chartData.growth?.length > 0 ? (
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData.growth}>
              <Line
                type="monotone"
                dataKey="index"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
            {t('common.noData')}
          </div>
        )}
      </div>

      {/* Feed Storage */}
      <div style={{
        background: '#7c5295',
        borderRadius: '8px',
        padding: '20px',
        color: 'white'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
              {t('dashboard.feedStorage')}
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>
            {(totalFeed / 1000).toFixed(0) || '0'}
          </div>
        </div>
        {feedChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={feedChartData}>
              <Bar dataKey="feed" fill="rgba(255,255,255,0.7)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
            {t('common.noData')}
          </div>
        )}
      </div>
    </div>
  )
}
