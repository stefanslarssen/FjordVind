import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function EnvironmentPage() {
  const [readings, setReadings] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState('all')

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    try {
      const [readingsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/environment`),
        fetch(`${API_URL}/api/environment/summary`)
      ])

      if (readingsRes.ok) {
        const data = await readingsRes.json()
        setReadings(data.readings || [])
      }

      if (summaryRes.ok) {
        const data = await summaryRes.json()
        setSummary(data.last24Hours)
      }
    } catch (error) {
      console.error('Failed to load environment data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTemperatureStatus = (temp) => {
    if (temp >= 8 && temp <= 14) return { status: 'Optimal', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' }
    if (temp < 5 || temp > 18) return { status: 'Kritisk', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' }
    return { status: 'Advarsel', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' }
  }

  const getOxygenStatus = (oxygen) => {
    if (oxygen >= 80) return { status: 'Optimal', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' }
    if (oxygen >= 60) return { status: 'Advarsel', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' }
    return { status: 'Kritisk', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' }
  }

  const getSalinityStatus = (salinity) => {
    if (salinity >= 30 && salinity <= 36) return { status: 'Optimal', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' }
    if (salinity < 28 || salinity > 38) return { status: 'Kritisk', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' }
    return { status: 'Advarsel', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' }
  }

  const getPhStatus = (ph) => {
    if (ph >= 7.8 && ph <= 8.4) return { status: 'Optimal', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' }
    if (ph < 7.5 || ph > 8.6) return { status: 'Kritisk', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' }
    return { status: 'Advarsel', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' }
  }

  // Get unique locations for filter
  const locations = [...new Set(readings.map(r => r.locality))].filter(Boolean)

  // Filter readings by location
  const filteredReadings = selectedLocation === 'all'
    ? readings
    : readings.filter(r => r.locality === selectedLocation)

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Laster miljodata...
      </div>
    )
  }

  return (
    <div style={{ padding: '0 16px 16px 16px' }}>
      {/* Header med linje */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        padding: '12px 0',
        borderBottom: '1px solid var(--border)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            Miljodata
            <span style={{
              background: 'var(--primary)',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              color: 'white'
            }}>LIVE</span>
          </h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Sanntids overvaking av vannkvalitet</span>
        </div>
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'var(--panel)',
            color: 'var(--text)',
            fontSize: '14px'
          }}
        >
          <option value="all">Alle lokasjoner</option>
          {locations.map(loc => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="stat-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-label">Vanntemperatur (snitt)</div>
            <div className="stat-value" style={{ color: getTemperatureStatus(summary.avgTemperature).color }}>
              {summary.avgTemperature?.toFixed(1)}°C
            </div>
            <div style={{
              marginTop: '8px',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '500',
              display: 'inline-block',
              background: getTemperatureStatus(summary.avgTemperature).bg,
              color: getTemperatureStatus(summary.avgTemperature).color
            }}>
              {getTemperatureStatus(summary.avgTemperature).status}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Oksygen O2 (snitt)</div>
            <div className="stat-value" style={{ color: getOxygenStatus(summary.avgOxygen).color }}>
              {summary.avgOxygen?.toFixed(0)}%
            </div>
            <div style={{
              marginTop: '8px',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '500',
              display: 'inline-block',
              background: getOxygenStatus(summary.avgOxygen).bg,
              color: getOxygenStatus(summary.avgOxygen).color
            }}>
              {getOxygenStatus(summary.avgOxygen).status}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Salinitet (snitt)</div>
            <div className="stat-value" style={{ color: getSalinityStatus(summary.avgSalinity).color }}>
              {summary.avgSalinity?.toFixed(1)}
            </div>
            <div style={{
              marginTop: '8px',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '500',
              display: 'inline-block',
              background: getSalinityStatus(summary.avgSalinity).bg,
              color: getSalinityStatus(summary.avgSalinity).color
            }}>
              {getSalinityStatus(summary.avgSalinity).status}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">pH-niva (snitt)</div>
            <div className="stat-value" style={{ color: getPhStatus(summary.avgPh).color }}>
              {summary.avgPh?.toFixed(1)}
            </div>
            <div style={{
              marginTop: '8px',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '500',
              display: 'inline-block',
              background: getPhStatus(summary.avgPh).bg,
              color: getPhStatus(summary.avgPh).color
            }}>
              {getPhStatus(summary.avgPh).status}
            </div>
          </div>
        </div>
      )}

      {/* Alert Banner */}
      {summary && summary.lowOxygenCount > 0 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
            fontWeight: '700',
            fontSize: '18px'
          }}>!</div>
          <div>
            <div style={{ fontWeight: '600', color: '#ef4444', marginBottom: '4px' }}>
              {summary.lowOxygenCount} maling(er) med lavt oksygenniva
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Minimum oksygen siste 24 timer: {summary.minOxygen?.toFixed(0)}%
            </div>
          </div>
        </div>
      )}

      {/* Readings Table */}
      <div className="card">
        <h3 className="card-title">Malinger per merd</h3>
        {filteredReadings.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
            Ingen miljodata tilgjengelig
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Merd</th>
                <th>Lokasjon</th>
                <th style={{ textAlign: 'center' }}>Temp</th>
                <th style={{ textAlign: 'center' }}>O2</th>
                <th style={{ textAlign: 'center' }}>Salinitet</th>
                <th style={{ textAlign: 'center' }}>pH</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right' }}>Tidspunkt</th>
              </tr>
            </thead>
            <tbody>
              {filteredReadings.map(reading => {
                const hasAnomaly = reading.isAnomaly ||
                  getOxygenStatus(reading.oxygenPercent).status === 'Kritisk' ||
                  getTemperatureStatus(reading.temperature).status === 'Kritisk'

                return (
                  <tr key={reading.id} style={{ background: hasAnomaly ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                    <td style={{ fontWeight: '500' }}>{reading.merdName || 'Ukjent'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{reading.locality}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ color: getTemperatureStatus(reading.temperature).color, fontWeight: '500' }}>
                        {reading.temperature?.toFixed(1)}°C
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ color: getOxygenStatus(reading.oxygenPercent).color, fontWeight: '500' }}>
                        {reading.oxygenPercent?.toFixed(0)}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ color: getSalinityStatus(reading.salinity).color, fontWeight: '500' }}>
                        {reading.salinity?.toFixed(1)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ color: getPhStatus(reading.ph).color, fontWeight: '500' }}>
                        {reading.ph?.toFixed(1)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {hasAnomaly ? (
                        <span className="badge danger">Avvik</span>
                      ) : (
                        <span className="badge ok">Normal</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {new Date(reading.timestamp).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Reference Values */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 className="card-title">Referanseverdier for lakseoppdrett</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Parameter</th>
              <th style={{ textAlign: 'center' }}>Enhet</th>
              <th style={{ textAlign: 'center' }}>Optimal</th>
              <th style={{ textAlign: 'center' }}>Advarsel</th>
              <th style={{ textAlign: 'center' }}>Kritisk</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Temperatur</td>
              <td style={{ textAlign: 'center' }}>°C</td>
              <td style={{ textAlign: 'center', color: '#22c55e' }}>8 - 14</td>
              <td style={{ textAlign: 'center', color: '#f59e0b' }}>5-8 / 14-18</td>
              <td style={{ textAlign: 'center', color: '#ef4444' }}>&lt;5 / &gt;18</td>
            </tr>
            <tr>
              <td>Oksygen (O2)</td>
              <td style={{ textAlign: 'center' }}>%</td>
              <td style={{ textAlign: 'center', color: '#22c55e' }}>&gt;80</td>
              <td style={{ textAlign: 'center', color: '#f59e0b' }}>60 - 80</td>
              <td style={{ textAlign: 'center', color: '#ef4444' }}>&lt;60</td>
            </tr>
            <tr>
              <td>Salinitet</td>
              <td style={{ textAlign: 'center' }}>ppt</td>
              <td style={{ textAlign: 'center', color: '#22c55e' }}>30 - 36</td>
              <td style={{ textAlign: 'center', color: '#f59e0b' }}>28-30 / 36-38</td>
              <td style={{ textAlign: 'center', color: '#ef4444' }}>&lt;28 / &gt;38</td>
            </tr>
            <tr>
              <td>pH</td>
              <td style={{ textAlign: 'center' }}>-</td>
              <td style={{ textAlign: 'center', color: '#22c55e' }}>7.8 - 8.4</td>
              <td style={{ textAlign: 'center', color: '#f59e0b' }}>7.5-7.8 / 8.4-8.6</td>
              <td style={{ textAlign: 'center', color: '#ef4444' }}>&lt;7.5 / &gt;8.6</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
