import { useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Legend
} from 'recharts'

export default function HistoricalTrendsSection({ chartData, selectedLocality }) {
  const [showHistoricalTrends, setShowHistoricalTrends] = useState(false)

  if (!chartData) return null

  return (
    <div style={{ padding: '0 24px 24px 24px' }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {/* Header with toggle */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer'
          }}
          onClick={() => setShowHistoricalTrends(!showHistoricalTrends)}
        >
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>Historiske Trender</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              Siste 8 uker - {selectedLocality}
            </div>
          </div>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.3s'
          }}>
            <span style={{
              transform: showHistoricalTrends ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s',
              display: 'inline-block'
            }}>▼</span>
          </div>
        </div>

        {/* Expandable content */}
        {showHistoricalTrends && (
          <div style={{ padding: '24px' }}>
            <div className="responsive-grid-2" style={{ gap: '24px' }}>
              {/* Lice Count Trend */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '8px',
                padding: '20px'
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e3a5f' }}>
                    Lusetelling per fisk
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Grenseverdi: 0.5 voksne hunnlus
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData.liceCount}>
                    <defs>
                      <linearGradient id="liceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="week"
                      tickFormatter={(v) => `Uke ${v}`}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      domain={[0, 'auto']}
                    />
                    <Tooltip
                      formatter={(value) => [value.toFixed(2), 'Lus/fisk']}
                      labelFormatter={(label) => `Uke ${label}`}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <ReferenceLine y={0.5} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Grense', position: 'right', fontSize: 10, fill: '#ef4444' }} />
                    <Area
                      type="monotone"
                      dataKey="avgLicePerFish"
                      stroke="#0d9488"
                      strokeWidth={2}
                      fill="url(#liceGradient)"
                      dot={{ fill: '#0d9488', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#0d9488', strokeWidth: 2, fill: 'white' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Mortality Trend */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '8px',
                padding: '20px'
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e3a5f' }}>
                    Dødelighet (%)
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Ukentlig dødelighetsrate
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData.mortality}>
                    <defs>
                      <linearGradient id="mortalityGradientFull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="week"
                      tickFormatter={(v) => `Uke ${v}`}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      formatter={(value) => [`${value.toFixed(2)}%`, 'Dødelighet']}
                      labelFormatter={(label) => `Uke ${label}`}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="rate"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fill="url(#mortalityGradientFull)"
                      dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2, fill: 'white' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Growth Index Trend */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '8px',
                padding: '20px'
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e3a5f' }}>
                    Vekstindeks
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Relativ vekst (100 = normal)
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData.growth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="week"
                      tickFormatter={(v) => `Uke ${v}`}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      domain={[90, 140]}
                    />
                    <Tooltip
                      formatter={(value) => [value.toFixed(1), 'Indeks']}
                      labelFormatter={(label) => `Uke ${label}`}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <ReferenceLine y={100} stroke="#94a3b8" strokeDasharray="5 5" label={{ value: 'Normal', position: 'right', fontSize: 10, fill: '#94a3b8' }} />
                    <Line
                      type="monotone"
                      dataKey="index"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: 'white' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Combined Overview */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '8px',
                padding: '20px'
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e3a5f' }}>
                    Sammenligning
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Normalisert visning av alle trender
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData.liceCount.map((d, i) => ({
                    week: d.week,
                    lice: (d.avgLicePerFish / 0.5) * 100,
                    mortality: chartData.mortality[i]?.rate ? (chartData.mortality[i].rate / 2) * 100 : 0,
                    growth: chartData.growth[i]?.index || 100
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="week"
                      tickFormatter={(v) => `Uke ${v}`}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      domain={[0, 150]}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      labelFormatter={(label) => `Uke ${label}`}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px' }}
                      formatter={(value) => {
                        const labels = { lice: 'Lus (% av grense)', mortality: 'Dødelighet', growth: 'Vekst' }
                        return labels[value] || value
                      }}
                    />
                    <Line type="monotone" dataKey="lice" stroke="#0d9488" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="mortality" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="growth" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Summary stats */}
            <div className="responsive-grid-4" style={{
              marginTop: '24px',
              paddingTop: '24px',
              borderTop: '1px solid #e2e8f0'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#0d9488' }}>
                  {chartData.liceCount.length > 0
                    ? (chartData.liceCount.reduce((sum, d) => sum + d.avgLicePerFish, 0) / chartData.liceCount.length).toFixed(2)
                    : '0.00'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Snitt lus/fisk</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>
                  {chartData.mortality.length > 0
                    ? (chartData.mortality.reduce((sum, d) => sum + d.rate, 0) / chartData.mortality.length).toFixed(2)
                    : '0.00'}%
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Snitt dødelighet</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
                  {chartData.growth.length > 0
                    ? Math.round(chartData.growth.reduce((sum, d) => sum + d.index, 0) / chartData.growth.length)
                    : 100}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Snitt vekstindeks</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: chartData.liceCount.some(d => d.avgLicePerFish > 0.5) ? '#ef4444' : '#10b981' }}>
                  {chartData.liceCount.filter(d => d.avgLicePerFish > 0.5).length}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Uker over grense</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
