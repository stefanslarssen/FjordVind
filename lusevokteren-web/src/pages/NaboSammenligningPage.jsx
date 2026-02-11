import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useLanguage } from '../contexts/LanguageContext'
import { fetchLocations, fetchCages } from '../services/supabase'

/**
 * NaboSammenligningPage - Områdeoversikt og sammenligning med nabooppdrett
 */
export default function NaboSammenligningPage() {
  const { t, language } = useLanguage()
  const [locations, setLocations] = useState([])
  const [selectedLocation, setSelectedLocation] = useState('')
  const [nearbyFarms, setNearbyFarms] = useState([])
  const [ownData, setOwnData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [radius, setRadius] = useState(10) // km
  const [historicalData, setHistoricalData] = useState([])
  const [viewMode, setViewMode] = useState('table') // table, chart, map

  useEffect(() => {
    loadLocations()
  }, [])

  useEffect(() => {
    if (selectedLocation) {
      loadComparisonData()
    }
  }, [selectedLocation, radius])

  async function loadLocations() {
    try {
      const data = await fetchLocations()
      setLocations(data.map(l => ({ id: l.id, name: l.name })))
    } catch (error) {
      console.error('Failed to load locations:', error)
      setLocations([])
    }
  }

  async function loadComparisonData() {
    setLoading(true)
    try {
      // Hent egne merder for valgt lokalitet fra Supabase
      const merdsData = await fetchCages(selectedLocation)

      if (merdsData.length > 0) {
        // Beregn egen gjennomsnittlig luseverdi
        const avgOwn = merdsData.reduce((sum, m) => sum + (m.avg_adult_female || 0), 0) / merdsData.length
        setOwnData({
          name: selectedLocation,
          avgLice: avgOwn,
          merdCount: merdsData.length,
          merds: merdsData
        })

        // Nabooppdrett er ikke tilgjengelig i standalone modus
        setNearbyFarms([])

        // Generer historiske data for sammenligning
        generateHistoricalComparison(avgOwn, [])
      } else {
        // No data - show empty state
        setOwnData(null)
        setNearbyFarms([])
        setHistoricalData([])
      }
    } catch (error) {
      console.error('Failed to load comparison data:', error)
      // Show empty state on error
      setOwnData(null)
      setNearbyFarms([])
      setHistoricalData([])
    }
    setLoading(false)
  }

  function generateHistoricalComparison(ownAvg, neighbors) {
    if (!ownAvg) {
      setHistoricalData([])
      return
    }

    const weeks = []
    const now = new Date()
    const weekLabel = language === 'en' ? 'Week' : 'Uke'

    for (let i = 11; i >= 0; i--) {
      const weekDate = new Date(now)
      weekDate.setDate(weekDate.getDate() - (i * 7))
      const weekNum = getWeekNumber(weekDate)

      // Calculate neighbor average if available
      const neighborAvg = neighbors.length > 0
        ? neighbors.reduce((sum, n) => sum + (n.avgAdultFemaleLice || 0), 0) / neighbors.length
        : null

      weeks.push({
        week: `${weekLabel} ${weekNum}`,
        egenLokalitet: ownAvg.toFixed(2),
        naboGjennomsnitt: neighborAvg ? neighborAvg.toFixed(2) : null,
        grense: 0.5
      })
    }

    setHistoricalData(weeks)
  }

  function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  }

  function getStatusColor(value) {
    if (value >= 0.5) return '#f44336' // Kritisk
    if (value >= 0.2) return '#ff9800' // Advarsel
    return '#4CAF50' // OK
  }

  function getStatusText(value) {
    if (value >= 0.5) return t('area.critical')
    if (value >= 0.2) return t('area.warning')
    return t('area.ok')
  }

  // Beregn statistikk
  const neighborAvg = nearbyFarms.length > 0
    ? nearbyFarms.reduce((sum, n) => sum + (n.avgAdultFemaleLice || 0), 0) / nearbyFarms.length
    : 0

  const aboveLimit = nearbyFarms.filter(n => n.avgAdultFemaleLice >= 0.5).length
  const comparison = ownData ? (ownData.avgLice - neighborAvg) : 0

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
        <h1 style={{ margin: 0, fontSize: '20px' }}>{t('area.title')}</h1>
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{t('area.subtitle')}</span>
      </div>

      {/* Filter */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Velg lokalitet */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              {t('area.selectYourLocation')}
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="">{t('area.selectLocation')}</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>

          {/* Radius */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              {t('area.searchRadius')}: {radius} km
            </label>
            <input
              type="range"
              min="5"
              max="30"
              step="5"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Visningstype */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              {t('area.display')}
            </label>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button
                className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('table')}
              >
                {t('area.table')}
              </button>
              <button
                className={`btn ${viewMode === 'chart' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('chart')}
              >
                {t('area.chart')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>{t('area.loadingData')}</p>
        </div>
      ) : !selectedLocation ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
          <p style={{ fontSize: '18px', color: '#666', margin: 0 }}>
            {t('area.noData')}
          </p>
        </div>
      ) : (
        <>
          {/* Oppsummering */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            {/* Din lokalitet */}
            <div className="card" style={{ textAlign: 'center', background: '#e3f2fd' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#1565c0' }}>{t('area.yourLocation')}</h3>
              <div style={{
                fontSize: '36px',
                fontWeight: 'bold',
                color: getStatusColor(ownData?.avgLice || 0)
              }}>
                {(ownData?.avgLice || 0).toFixed(2)}
              </div>
              <p style={{ margin: '5px 0 0', color: '#666' }}>{t('area.adultFemaleLice')}</p>
            </div>

            {/* Område gjennomsnitt */}
            <div className="card" style={{ textAlign: 'center', background: '#fff3e0' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#e65100' }}>{t('area.areaAverage')}</h3>
              <div style={{
                fontSize: '36px',
                fontWeight: 'bold',
                color: getStatusColor(neighborAvg)
              }}>
                {neighborAvg.toFixed(2)}
              </div>
              <p style={{ margin: '5px 0 0', color: '#666' }}>{nearbyFarms.length} {t('area.farmsInArea')} ({radius} km)</p>
            </div>

            {/* Sammenligning */}
            <div className="card" style={{
              textAlign: 'center',
              background: comparison < 0 ? '#e8f5e9' : comparison > 0 ? '#ffebee' : '#f5f5f5'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>{t('area.difference')}</h3>
              <div style={{
                fontSize: '36px',
                fontWeight: 'bold',
                color: comparison < 0 ? '#4CAF50' : comparison > 0 ? '#f44336' : '#666'
              }}>
                {comparison >= 0 ? '+' : ''}{comparison.toFixed(2)}
              </div>
              <p style={{ margin: '5px 0 0', color: '#666' }}>
                {comparison < 0 ? t('area.betterThanNeighbors') : comparison > 0 ? t('area.higherThanNeighbors') : t('area.sameAsNeighbors')}
              </p>
            </div>

            {/* Over grensen */}
            <div className="card" style={{
              textAlign: 'center',
              background: aboveLimit > 0 ? '#ffebee' : '#e8f5e9'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>{t('area.aboveLimitCard')}</h3>
              <div style={{
                fontSize: '36px',
                fontWeight: 'bold',
                color: aboveLimit > 0 ? '#f44336' : '#4CAF50'
              }}>
                {aboveLimit}
              </div>
              <p style={{ margin: '5px 0 0', color: '#666' }}>{t('area.neighborsAbove')}</p>
            </div>
          </div>

          {/* Historisk trend */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>{t('area.historicalComparison')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 0.8]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={0.5} stroke="#f44336" strokeDasharray="5 5" label={`${t('area.limit')} 0.5`} />
                <Line
                  type="monotone"
                  dataKey="egenLokalitet"
                  name={t('area.yourLocationLabel')}
                  stroke="#2196F3"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="naboGjennomsnitt"
                  name={t('area.neighborAverage')}
                  stroke="#ff9800"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Detaljert visning */}
          {viewMode === 'table' ? (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>{t('area.nearbyFarms')} ({nearbyFarms.length} {t('area.pcs')})</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>{t('area.location')}</th>
                      <th>{t('area.municipality')}</th>
                      <th>{t('area.distance')}</th>
                      <th>{t('area.liceLevel')}</th>
                      <th>{t('area.status')}</th>
                      <th>{t('area.vsYours')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nearbyFarms.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                          {t('area.noNeighborsFound')} {radius} km
                        </td>
                      </tr>
                    ) : (
                      nearbyFarms.map((farm, idx) => {
                        const diff = (farm.avgAdultFemaleLice || 0) - (ownData?.avgLice || 0)
                        return (
                          <tr key={idx}>
                            <td><strong>{farm.name || t('area.unknown')}</strong></td>
                            <td>{farm.municipality || t('area.unknown')}</td>
                            <td>{(farm.distance || 0).toFixed(1)} km</td>
                            <td>
                              <span style={{
                                padding: '4px 12px',
                                borderRadius: '20px',
                                background: getStatusColor(farm.avgAdultFemaleLice || 0),
                                color: 'white',
                                fontWeight: 'bold'
                              }}>
                                {(farm.avgAdultFemaleLice || 0).toFixed(2)}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: getStatusColor(farm.avgAdultFemaleLice || 0) }}>
                                {getStatusText(farm.avgAdultFemaleLice || 0)}
                              </span>
                            </td>
                            <td style={{
                              color: diff > 0 ? '#4CAF50' : diff < 0 ? '#f44336' : '#666',
                              fontWeight: 'bold'
                            }}>
                              {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                              {diff > 0 ? ` (${t('area.higher')})` : diff < 0 ? ` (${t('area.lower')})` : ` (${t('area.same')})`}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>{t('area.liceStatusComparison')}</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={[
                    { name: t('area.yourLocation'), lice: ownData?.avgLice || 0, fill: '#2196F3' },
                    ...nearbyFarms.map(f => ({
                      name: f.name?.substring(0, 15) || t('area.unknown'),
                      lice: f.avgAdultFemaleLice || 0,
                      fill: getStatusColor(f.avgAdultFemaleLice || 0)
                    }))
                  ]}
                  layout="vertical"
                  margin={{ left: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 0.8]} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <ReferenceLine x={0.5} stroke="#f44336" strokeDasharray="5 5" label={t('area.limit')} />
                  <Bar dataKey="lice" name={t('area.liceLevel')}>
                    {[
                      { name: t('area.yourLocation'), lice: ownData?.avgLice || 0 },
                      ...nearbyFarms
                    ].map((entry, index) => (
                      <rect key={index} fill={index === 0 ? '#2196F3' : getStatusColor(entry.lice || entry.avgAdultFemaleLice || 0)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Risikovurdering */}
          <div className="card" style={{ marginTop: '20px' }}>
            <h3 style={{ marginTop: 0 }}>{t('area.areaAnalysis')}</h3>
            <div style={{
              padding: '15px',
              background: aboveLimit > nearbyFarms.length / 2 ? '#ffebee' : aboveLimit > 0 ? '#fff3e0' : '#e8f5e9',
              borderRadius: '8px',
              borderLeft: `4px solid ${aboveLimit > nearbyFarms.length / 2 ? '#f44336' : aboveLimit > 0 ? '#ff9800' : '#4CAF50'}`
            }}>
              {aboveLimit > nearbyFarms.length / 2 ? (
                <>
                  <h4 style={{ margin: '0 0 10px', color: '#c62828' }}>{t('area.highRiskTitle')}</h4>
                  <p style={{ margin: 0 }}>
                    {t('area.highRiskText')}
                  </p>
                </>
              ) : aboveLimit > 0 ? (
                <>
                  <h4 style={{ margin: '0 0 10px', color: '#e65100' }}>{t('area.moderateRiskTitle')}</h4>
                  <p style={{ margin: 0 }}>
                    {t('area.moderateRiskText')}
                  </p>
                </>
              ) : (
                <>
                  <h4 style={{ margin: '0 0 10px', color: '#2e7d32' }}>{t('area.lowRiskTitle')}</h4>
                  <p style={{ margin: 0 }}>
                    {t('area.lowRiskText')}
                  </p>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
