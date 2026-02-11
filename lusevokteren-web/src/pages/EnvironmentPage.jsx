import { useState, useEffect } from 'react'
import { fetchEnvironmentReadings, fetchLocations, fetchCages, createEnvironmentReading, deleteEnvironmentReading } from '../services/supabase'
import { fetchCompleteEnvironmentData, fetchOceanForecast } from '../services/environmentApi'

export default function EnvironmentPage() {
  const [readings, setReadings] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [dataSource, setDataSource] = useState('supabase') // 'supabase' or 'public'
  const [userLocations, setUserLocations] = useState([])

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [cages, setCages] = useState([])
  const [formData, setFormData] = useState({
    locality: '',
    merdId: '',
    temperature: '',
    oxygen: '',
    salinity: '',
    ph: '',
    timestamp: new Date().toISOString().slice(0, 16) // datetime-local format
  })

  useEffect(() => {
    loadData()
    loadLocationsForForm()
    const interval = setInterval(loadData, 60000) // Refresh every 60 seconds
    return () => clearInterval(interval)
  }, [])

  // Load cages when locality changes in form
  useEffect(() => {
    if (formData.locality) {
      loadCagesForLocality(formData.locality)
    } else {
      setCages([])
    }
  }, [formData.locality])

  async function loadLocationsForForm() {
    try {
      const locs = await fetchLocations()
      setUserLocations(locs)
    } catch (error) {
      console.error('Failed to load locations:', error)
    }
  }

  async function loadCagesForLocality(locationId) {
    try {
      const cagesData = await fetchCages(locationId)
      setCages(cagesData || [])
    } catch (error) {
      console.error('Failed to load cages:', error)
      setCages([])
    }
  }

  async function handleSubmitReading(e) {
    e.preventDefault()
    setFormError(null)

    // Validate - at least one measurement required
    if (!formData.temperature && !formData.oxygen && !formData.salinity && !formData.ph) {
      setFormError('Minst en maling ma fylles ut')
      return
    }

    if (!formData.locality) {
      setFormError('Velg en lokasjon')
      return
    }

    setSaving(true)
    try {
      await createEnvironmentReading({
        locality: formData.locality,
        merdId: formData.merdId || null,
        temperature: formData.temperature ? parseFloat(formData.temperature) : null,
        oxygen: formData.oxygen ? parseFloat(formData.oxygen) : null,
        salinity: formData.salinity ? parseFloat(formData.salinity) : null,
        ph: formData.ph ? parseFloat(formData.ph) : null,
        timestamp: formData.timestamp ? new Date(formData.timestamp).toISOString() : new Date().toISOString()
      })

      // Reset form and reload data
      setFormData({
        locality: '',
        merdId: '',
        temperature: '',
        oxygen: '',
        salinity: '',
        ph: '',
        timestamp: new Date().toISOString().slice(0, 16)
      })
      setShowForm(false)
      await loadData()
    } catch (error) {
      console.error('Failed to save reading:', error)
      setFormError('Kunne ikke lagre maling: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteReading(id) {
    if (!confirm('Er du sikker pa at du vil slette denne malingen?')) return

    try {
      await deleteEnvironmentReading(id)
      await loadData()
    } catch (error) {
      console.error('Failed to delete reading:', error)
    }
  }

  async function loadData() {
    try {
      // First try to load from Supabase
      const data = await fetchEnvironmentReadings()

      if (data && data.length > 0) {
        // We have data in Supabase
        setDataSource('supabase')
        processSupabaseData(data)
      } else {
        // No Supabase data - try public APIs
        setDataSource('public')
        await loadPublicData()
      }
    } catch (error) {
      console.error('Failed to load environment data from Supabase:', error)
      // Fallback to public APIs
      setDataSource('public')
      await loadPublicData()
    } finally {
      setLoading(false)
    }
  }

  function processSupabaseData(data) {
    const transformedReadings = (data || []).map(r => ({
      id: r.id,
      merdName: r.merds?.navn || 'Ukjent',
      locality: r.locality || r.merds?.lokalitet || 'Ukjent',
      temperature: r.temperature_celsius,
      oxygenPercent: r.oxygen_percent,
      salinity: r.salinity_ppt,
      ph: r.ph,
      timestamp: r.timestamp,
      isAnomaly: r.is_anomaly,
      isEstimate: false
    }))
    setReadings(transformedReadings)
    calculateSummary(transformedReadings)
  }

  async function loadPublicData() {
    try {
      // Load user's locations from Supabase
      const locations = await fetchLocations()
      setUserLocations(locations)

      if (locations.length === 0) {
        // No locations - show some default Norwegian coastal points
        const defaultLocations = [
          { id: 'bergen', name: 'Bergen-omradet', lat: 60.39, lon: 5.32 },
          { id: 'trondheim', name: 'Trondheimsfjorden', lat: 63.43, lon: 10.39 },
          { id: 'tromso', name: 'Tromso-omradet', lat: 69.65, lon: 18.96 },
          { id: 'stavanger', name: 'Stavanger-omradet', lat: 58.97, lon: 5.73 }
        ]

        const readings = await fetchReadingsForLocations(defaultLocations)
        setReadings(readings)
        calculateSummary(readings)
      } else {
        // Use user's locations (if they have coordinates)
        const locationsWithCoords = locations.filter(l => l.latitude && l.longitude).map(l => ({
          id: l.id,
          name: l.name || l.lokalitetsnavn,
          lat: l.latitude,
          lon: l.longitude
        }))

        if (locationsWithCoords.length > 0) {
          const readings = await fetchReadingsForLocations(locationsWithCoords)
          setReadings(readings)
          calculateSummary(readings)
        } else {
          // Locations exist but no coordinates - show empty state
          setReadings([])
          setSummary(null)
        }
      }
    } catch (error) {
      console.error('Failed to load public environment data:', error)
      setReadings([])
      setSummary(null)
    }
  }

  async function fetchReadingsForLocations(locations) {
    const readings = []

    for (const loc of locations) {
      try {
        const envData = await fetchCompleteEnvironmentData(loc.lat, loc.lon, loc.name)

        readings.push({
          id: loc.id,
          merdName: '-',
          locality: envData.locationName,
          temperature: envData.data.temperature,
          oxygenPercent: envData.data.oxygen,
          salinity: envData.data.salinity,
          ph: envData.data.ph,
          timestamp: envData.timestamp,
          isAnomaly: false,
          isEstimate: envData.data.temperatureEstimated,
          source: envData.source
        })
      } catch (error) {
        console.error(`Failed to fetch data for ${loc.name}:`, error)
      }
    }

    return readings
  }

  function calculateSummary(transformedReadings) {
    if (transformedReadings.length > 0) {
      const temps = transformedReadings.filter(r => r.temperature).map(r => r.temperature)
      const oxygens = transformedReadings.filter(r => r.oxygenPercent).map(r => r.oxygenPercent)
      const salinities = transformedReadings.filter(r => r.salinity).map(r => r.salinity)
      const phs = transformedReadings.filter(r => r.ph).map(r => r.ph)

      setSummary({
        avgTemperature: temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null,
        avgOxygen: oxygens.length > 0 ? oxygens.reduce((a, b) => a + b, 0) / oxygens.length : null,
        avgSalinity: salinities.length > 0 ? salinities.reduce((a, b) => a + b, 0) / salinities.length : null,
        avgPh: phs.length > 0 ? phs.reduce((a, b) => a + b, 0) / phs.length : null,
        minOxygen: oxygens.length > 0 ? Math.min(...oxygens) : null,
        lowOxygenCount: oxygens.filter(o => o < 60).length
      })
    } else {
      setSummary(null)
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
              background: dataSource === 'supabase' ? 'var(--primary)' : '#f59e0b',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              color: 'white'
            }}>
              {dataSource === 'supabase' ? 'LIVE' : 'OFFENTLIG API'}
            </span>
          </h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            {dataSource === 'supabase'
              ? 'Sanntids overvaking av vannkvalitet'
              : 'Data fra met.no / Havforskningsinstituttet'}
          </span>
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

      {/* Info banner when using public data */}
      {dataSource === 'public' && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <div style={{ fontSize: '13px', color: 'var(--text)' }}>
            <strong>Offentlige data:</strong> Temperatur fra met.no Havvarsel API. Oksygen, salinitet og pH er estimater basert pa sesong og breddegrad.
            For noyaktige malinger, koble til sensorer eller registrer data manuelt.
          </div>
        </div>
      )}

      {/* Add Reading Button */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: showForm ? '#6b7280' : '#0d9488',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {showForm ? 'Avbryt' : '+ Registrer maling'}
        </button>
      </div>

      {/* Manual Reading Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 className="card-title">Registrer miljomaling</h3>

          {formError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px',
              color: '#ef4444',
              fontSize: '14px'
            }}>
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmitReading}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              {/* Locality */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  Lokasjon *
                </label>
                <select
                  value={formData.locality}
                  onChange={(e) => setFormData({ ...formData, locality: e.target.value, merdId: '' })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Velg lokasjon</option>
                  {userLocations.map(loc => (
                    <option key={loc.id} value={loc.name || loc.lokalitetsnavn}>
                      {loc.name || loc.lokalitetsnavn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Merd (optional) */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  Merd (valgfritt)
                </label>
                <select
                  value={formData.merdId}
                  onChange={(e) => setFormData({ ...formData, merdId: e.target.value })}
                  disabled={!formData.locality}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Alle merder / generell</option>
                  {cages.map(cage => (
                    <option key={cage.id} value={cage.id}>
                      {cage.navn || `Merd ${cage.merd_id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Timestamp */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  Tidspunkt
                </label>
                <input
                  type="datetime-local"
                  value={formData.timestamp}
                  onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Temperature */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  Temperatur (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="-2"
                  max="30"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                  placeholder="f.eks. 12.5"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Oxygen */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  Oksygen (%)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="150"
                  value={formData.oxygen}
                  onChange={(e) => setFormData({ ...formData, oxygen: e.target.value })}
                  placeholder="f.eks. 95"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Salinity */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  Salinitet (ppt)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={formData.salinity}
                  onChange={(e) => setFormData({ ...formData, salinity: e.target.value })}
                  placeholder="f.eks. 33.5"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* pH */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  pH
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="6"
                  max="9"
                  value={formData.ph}
                  onChange={(e) => setFormData({ ...formData, ph: e.target.value })}
                  placeholder="f.eks. 8.1"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: '#0d9488',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: saving ? 'wait' : 'pointer',
                  opacity: saving ? 0.6 : 1
                }}
              >
                {saving ? 'Lagrer...' : 'Lagre maling'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Avbryt
              </button>
            </div>
          </form>
        </div>
      )}

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
                {dataSource === 'supabase' && <th style={{ width: '40px' }}></th>}
              </tr>
            </thead>
            <tbody>
              {filteredReadings.map(reading => {
                const hasAnomaly = reading.isAnomaly ||
                  getOxygenStatus(reading.oxygenPercent).status === 'Kritisk' ||
                  getTemperatureStatus(reading.temperature).status === 'Kritisk'

                return (
                  <tr key={reading.id} style={{ background: hasAnomaly ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                    <td style={{ fontWeight: '500' }}>{reading.merdName || '-'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{reading.locality}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ color: getTemperatureStatus(reading.temperature).color, fontWeight: '500' }}>
                        {reading.temperature?.toFixed(1)}°C
                        {reading.isEstimate && reading.source !== 'met.no' && <span style={{ color: 'var(--muted)', fontSize: '10px' }}> *</span>}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ color: getOxygenStatus(reading.oxygenPercent).color, fontWeight: '500' }}>
                        {reading.oxygenPercent?.toFixed(0)}%
                        {reading.isEstimate && <span style={{ color: 'var(--muted)', fontSize: '10px' }}> *</span>}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ color: getSalinityStatus(reading.salinity).color, fontWeight: '500' }}>
                        {reading.salinity?.toFixed(1)}
                        {reading.isEstimate && <span style={{ color: 'var(--muted)', fontSize: '10px' }}> *</span>}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ color: getPhStatus(reading.ph).color, fontWeight: '500' }}>
                        {reading.ph?.toFixed(1)}
                        {reading.isEstimate && <span style={{ color: 'var(--muted)', fontSize: '10px' }}> *</span>}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {reading.isEstimate ? (
                        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>Estimat</span>
                      ) : hasAnomaly ? (
                        <span className="badge danger">Avvik</span>
                      ) : (
                        <span className="badge ok">Normal</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {new Date(reading.timestamp).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    {dataSource === 'supabase' && (
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteReading(reading.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px'
                          }}
                          title="Slett maling"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Footnote for estimates */}
        {dataSource === 'public' && readings.some(r => r.isEstimate) && (
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--muted)' }}>
            * Estimerte verdier basert pa sesong og geografisk plassering
          </div>
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
