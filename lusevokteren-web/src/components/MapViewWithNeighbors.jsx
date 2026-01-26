import React, { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * MapViewWithNeighbors - Kartvisning med nabooppdrett og lusenivå
 *
 * Viser:
 * - Egne merder med koordinater
 * - Nabooppdrett fra BarentsWatch
 * - Fargekoding basert på lusenivå
 * - Avstand til naboer
 */
export default function MapViewWithNeighbors({ selectedLocation = null }) {
  const [ownCages, setOwnCages] = useState([])
  const [nearbyFarms, setNearbyFarms] = useState([])
  const [center, setCenter] = useState({ lat: 60.5833, lng: 5.4167 }) // Klongsholmen
  const [radius, setRadius] = useState(10) // km
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadMapData()
  }, [selectedLocation, radius])

  async function loadMapData() {
    try {
      setLoading(true)

      // Hent egne merder
      const cagesUrl = selectedLocation
        ? `${API_URL}/api/merds?locationId=${encodeURIComponent(selectedLocation)}`
        : `${API_URL}/api/merds`

      const cagesResponse = await fetch(cagesUrl)
      if (!cagesResponse.ok) throw new Error('Failed to fetch cages')
      const cagesData = await cagesResponse.json()

      setOwnCages(cagesData)

      // Finn senter basert på første merd med koordinater
      const firstCageWithCoords = cagesData.find(c => c.latitude && c.longitude)
      if (firstCageWithCoords) {
        const newCenter = {
          lat: parseFloat(firstCageWithCoords.latitude),
          lng: parseFloat(firstCageWithCoords.longitude)
        }
        setCenter(newCenter)

        // Hent nabooppdrett rundt dette senteret
        const nearbyUrl = `${API_URL}/api/nearby-farms?latitude=${newCenter.lat}&longitude=${newCenter.lng}&radius=${radius}`
        const nearbyResponse = await fetch(nearbyUrl)

        if (nearbyResponse.ok) {
          const nearbyData = await nearbyResponse.json()
          setNearbyFarms(nearbyData)
        } else {
          console.warn('Could not fetch nearby farms, using only own cages')
          setNearbyFarms([])
        }
      }

      setLoading(false)
    } catch (err) {
      console.error('Failed to load map data:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  function getColorByLiceLevel(avgLice) {
    if (!avgLice) return '#999' // Grå (ukjent)
    if (avgLice >= 0.10) return '#f44336' // Rød (fare)
    if (avgLice >= 0.08) return '#ff9800' // Oransje (advarsel)
    return '#4CAF50' // Grønn (OK)
  }

  function getStatusText(avgLice) {
    if (!avgLice) return 'Ukjent'
    if (avgLice >= 0.10) return '🔴 FARE'
    if (avgLice >= 0.08) return '🟠 ADVARSEL'
    return '🟢 OK'
  }

  if (loading) {
    return <div style={{ padding: '20px' }}>Laster kartdata...</div>
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Feil: {error}</div>
  }

  // Kombiner egne merder og nabooppdrett for å vise på kart
  const allSites = [
    ...ownCages.map(cage => ({
      ...cage,
      isOwn: true,
      latitude: parseFloat(cage.latitude),
      longitude: parseFloat(cage.longitude),
      avgLice: cage.avg_adult_female,
    })),
    ...nearbyFarms.map(farm => ({
      ...farm,
      isOwn: false,
      avgLice: farm.avgAdultFemaleLice,
    }))
  ].filter(site => site.latitude && site.longitude)

  return (
    <div className="map-container">
      {/* Header */}
      <div style={{
        marginBottom: '20px',
        padding: '20px',
        background: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <h2 style={{ margin: '0 0 15px 0' }}>🗺️ Kart: Lusesituasjon i nærområdet</h2>

        {/* Kontroller */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div>
            <label htmlFor="radius-slider" style={{ fontWeight: 'bold', marginRight: '10px' }}>
              Søkeradius: {radius} km
            </label>
            <input
              id="radius-slider"
              type="range"
              min="5"
              max="30"
              step="5"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              style={{ width: '200px' }}
            />
          </div>

          <div style={{ marginLeft: 'auto' }}>
            <button
              onClick={loadMapData}
              style={{
                padding: '8px 16px',
                background: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🔄 Oppdater
            </button>
          </div>
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex',
          gap: '15px',
          marginTop: '15px',
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              background: '#4CAF50',
              border: '2px solid #333',
              borderRadius: '50%'
            }}></div>
            <span>Egne merder (OK)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              background: '#ff9800',
              border: '2px solid #333',
              borderRadius: '50%'
            }}></div>
            <span>Advarsel (&ge;0.08)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              background: '#f44336',
              border: '2px solid #333',
              borderRadius: '50%'
            }}></div>
            <span>Fare (&ge;0.10)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              background: '#ddd',
              border: '2px solid #666',
              borderRadius: '50%'
            }}></div>
            <span>Nabooppdrett</span>
          </div>
        </div>
      </div>

      {/* Kart (SVG) */}
      <div style={{
        width: '100%',
        height: '600px',
        background: '#e3f2fd',
        position: 'relative',
        border: '1px solid #ccc',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <svg width="100%" height="100%" viewBox="0 0 1000 600">
          {/* Bakgrunn */}
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#d0e8ff" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="1000" height="600" fill="url(#grid)" />

          {/* Tegn alle lokaliteter */}
          {allSites.map((site, idx) => {
            // Konverter lat/lng til SVG-koordinater
            const scale = 3000
            const x = 500 + (site.longitude - center.lng) * scale
            const y = 300 - (site.latitude - center.lat) * scale

            const color = getColorByLiceLevel(site.avgLice)
            const isOwn = site.isOwn
            const size = isOwn ? 16 : 12

            return (
              <g key={idx}>
                {/* Marker */}
                <circle
                  cx={x}
                  cy={y}
                  r={size}
                  fill={color}
                  stroke={isOwn ? '#000' : '#666'}
                  strokeWidth={isOwn ? 3 : 2}
                  opacity="0.85"
                />

                {/* Label */}
                <text
                  x={x}
                  y={y - size - 5}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isOwn ? 'bold' : 'normal'}
                  fill="#000"
                >
                  {site.name || site.cage_name || site.lokalitet}
                </text>

                {/* Lusetall */}
                {site.avgLice !== null && site.avgLice !== undefined && (
                  <text
                    x={x}
                    y={y + size + 15}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#333"
                  >
                    {site.avgLice.toFixed(2)}
                  </text>
                )}

                {/* Avstand (kun for naboer) */}
                {!isOwn && site.distance && (
                  <text
                    x={x}
                    y={y + size + 27}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#666"
                  >
                    {site.distance.toFixed(1)} km
                  </text>
                )}
              </g>
            )
          })}

          {/* Senterpunkt */}
          <circle
            cx="500"
            cy="300"
            r="4"
            fill="#2196F3"
            stroke="#fff"
            strokeWidth="2"
          />
        </svg>

        {/* Info-panel */}
        <div style={{
          position: 'absolute',
          top: '15px',
          right: '15px',
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          maxWidth: '280px',
          fontSize: '13px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '15px' }}>📍 Området</h3>
          <p><strong>Senter:</strong> {center.lat.toFixed(4)}°N, {center.lng.toFixed(4)}°E</p>
          <p><strong>Egne merder:</strong> {ownCages.length}</p>
          <p><strong>Nabooppdrett:</strong> {nearbyFarms.length}</p>
          <p><strong>Radius:</strong> {radius} km</p>
        </div>
      </div>

      {/* Liste over nabooppdrett */}
      <div style={{ marginTop: '30px' }}>
        <h3>🏢 Nabooppdrett (innenfor {radius} km)</h3>

        {nearbyFarms.length === 0 ? (
          <p style={{ color: '#666' }}>Ingen nabooppdrett funnet innenfor søkeradiusen.</p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '15px',
            marginTop: '15px'
          }}>
            {nearbyFarms.map((farm, idx) => (
              <div key={idx} style={{
                padding: '15px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                background: '#f9f9f9'
              }}>
                <h4 style={{ margin: '0 0 10px 0' }}>{farm.name}</h4>
                <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                  <p>📍 {farm.distance?.toFixed(1)} km unna</p>
                  <p>🏷️ Lokalitet: {farm.localityNo}</p>
                  <p>🏘️ Kommune: {farm.municipality}</p>
                  <p>🏢 Eier: {farm.owner || 'Ukjent'}</p>
                  <p>
                    🐟 Lusenivå: <strong>{farm.avgAdultFemaleLice?.toFixed(2) || 'N/A'}</strong> {' '}
                    {getStatusText(farm.avgAdultFemaleLice)}
                  </p>
                  <p style={{ fontSize: '11px', color: '#666' }}>
                    {farm.latitude?.toFixed(4)}°N, {farm.longitude?.toFixed(4)}°E
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Advarsel om høyt lusenivå hos naboer */}
      {nearbyFarms.filter(f => f.avgAdultFemaleLice >= 0.10).length > 0 && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#ffebee',
          border: '1px solid #f44336',
          borderRadius: '8px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#c62828' }}>⚠️ Advarsel</h3>
          <p>
            {nearbyFarms.filter(f => f.avgAdultFemaleLice >= 0.10).length} nabooppdrett
            har høyt lusenivå (&ge;0.10). Økt risiko for smitte i området.
          </p>
        </div>
      )}
    </div>
  )
}
