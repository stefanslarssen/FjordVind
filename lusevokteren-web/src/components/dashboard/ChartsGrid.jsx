import { BarChart, Bar, LineChart, Line, ResponsiveContainer } from 'recharts'

export default function ChartsGrid({ chartData, localityData }) {
  if (!chartData) return null

  const totalFeed = localityData?.cages?.reduce((sum, c) => sum + c.feedStorageKg, 0) || 0
  const feedChartData = localityData?.cages?.map((c, i) => ({
    name: `${i+1}`,
    feed: c.feedStorageKg / 1000
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
              Lusetelling ↘
            </div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>
              Minst lus i Merd 2 og 3
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>
            0.45
          </div>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={chartData.liceCount}>
            <Bar dataKey="avgLicePerFish" fill="rgba(255,255,255,0.7)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          opacity: 0.8,
          marginTop: '8px'
        }}>
          <div>Minst lus i Merd 2 og 3</div>
          <div>Mest lus i Merd 7 og 10</div>
        </div>
      </div>

      {/* Mortality */}
      <div style={{
        background: '#4a5568',
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
              Dødelighet ↗
            </div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>
              Fisk tapt til himmel
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>
            {localityData?.aggregated?.avgMortalityRate?.toFixed(2) || '0.00'}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={chartData.mortality}>
            <Bar dataKey="rate" fill="rgba(255,255,255,0.7)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          opacity: 0.8,
          marginTop: '8px'
        }}>
          <div>Minst dødelighet i Merd 1 og 3</div>
          <div>Mest dødelighet i Merd 7 og 9</div>
        </div>
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
              Relativ vekstindeks →
            </div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>
              Best i august
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>
            121
          </div>
        </div>
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
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          opacity: 0.8,
          marginTop: '8px'
        }}>
          <div>Best i august</div>
          <div>Verst i januar</div>
        </div>
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
              Fôrlagring
            </div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>
              Du har nok i 14 dager
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>
            {(totalFeed / 1000).toFixed(0)}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={feedChartData}>
            <Bar dataKey="feed" fill="rgba(255,255,255,0.7)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          opacity: 0.8,
          marginTop: '8px'
        }}>
          <div>Premium Polar</div>
          <div>Rapid</div>
        </div>
      </div>
    </div>
  )
}
