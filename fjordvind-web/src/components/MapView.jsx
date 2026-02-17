import React, { useEffect, useState } from 'react'
import { fetchLocations, fetchCages } from '../services/supabase'

/**
 * MapView - Kartvisning av oppdrettslokaliteter
 *
 * Viser:
 * - Egne lokaliteter/merder på kart
 * - Nabooppdrett i nærheten
 * - Integrasjon med BarentsWatch data
 * - Lusestatus per lokalitet
 */
export default function MapView({ selectedLocation = null }) {
  const [locations, setLocations] = useState([])
  const [cages, setCages] = useState([])
  const [center, setCenter] = useState({ lat: 60.5833, lng: 5.4167 }) // Klongsholmen default
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadMapData()
  }, [selectedLocation])

  async function loadMapData() {
    try {
      setLoading(true)
      const [locationsData, cagesData] = await Promise.all([
        fetchLocations(),
        fetchCages(selectedLocation)
      ])

      setLocations(locationsData)
      setCages(cagesData)

      // Sentrer kartet på valgt lokalitet eller første merd med koordinater
      if (cagesData && cagesData.length > 0) {
        const firstCageWithCoords = cagesData.find(c => c.latitude && c.longitude)
        if (firstCageWithCoords) {
          setCenter({
            lat: parseFloat(firstCageWithCoords.latitude),
            lng: parseFloat(firstCageWithCoords.longitude)
          })
        }
      }

      setLoading(false)
    } catch (err) {
      console.error('Failed to load map data:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="map-loading">Laster kart...</div>
  }

  if (error) {
    return <div className="map-error">Kunne ikke laste kart: {error}</div>
  }

  return (
    <div className="map-container">
      <div className="map-header">
        <h2>Kartvisning - Oppdrettslokaliteter</h2>
        <div className="map-legend">
          <div className="legend-item">
            <span className="marker marker-own"></span>
            <span>Egne merder</span>
          </div>
          <div className="legend-item">
            <span className="marker marker-neighbor"></span>
            <span>Nabooppdrett</span>
          </div>
          <div className="legend-item">
            <span className="marker marker-danger"></span>
            <span>Høyt lusenivå</span>
          </div>
        </div>
      </div>

      {/* Midlertidig: Enkel kartvisning med SVG */}
      {/* TODO: Integrer med ekte karttjeneste (Leaflet/Mapbox) */}
      <div className="map-canvas" style={{
        width: '100%',
        height: '500px',
        background: '#e6f3ff',
        position: 'relative',
        border: '1px solid #ccc',
        borderRadius: '8px'
      }}>
        <svg width="100%" height="100%" viewBox="0 0 800 500">
          {/* Bakgrunnsraster */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d0e8ff" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="800" height="500" fill="url(#grid)" />

          {/* Tegn merder */}
          {cages.map((cage, idx) => {
            if (!cage.latitude || !cage.longitude) return null

            // Konverter lat/lng til SVG-koordinater (forenklet)
            const x = 400 + (cage.longitude - center.lng) * 2000
            const y = 250 - (cage.latitude - center.lat) * 2000

            // Bestem farge basert på lusestatus
            let color = '#4CAF50' // Grønn (OK)
            if (cage.avg_adult_female >= 0.10) color = '#f44336' // Rød (Fare)
            else if (cage.avg_adult_female >= 0.08) color = '#ff9800' // Oransje (Advarsel)

            return (
              <g key={cage.id || idx}>
                {/* Merd-marker */}
                <circle
                  cx={x}
                  cy={y}
                  r="12"
                  fill={color}
                  stroke="#333"
                  strokeWidth="2"
                  opacity="0.8"
                />
                {/* Label */}
                <text
                  x={x}
                  y={y - 20}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="bold"
                  fill="#333"
                >
                  {cage.cage_name || cage.navn}
                </text>
              </g>
            )
          })}

          {/* Senterpunkt */}
          <circle
            cx="400"
            cy="250"
            r="3"
            fill="#2196F3"
            stroke="#fff"
            strokeWidth="2"
          />
          <text x="400" y="270" textAnchor="middle" fontSize="10" fill="#666">
            Senter: {center.lat.toFixed(4)}°N, {center.lng.toFixed(4)}°E
          </text>
        </svg>

        {/* Info-panel */}
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          maxWidth: '250px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Lokalitetsinformasjon</h3>
          <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
            <p><strong>Lokalitet:</strong> {selectedLocation || 'Alle'}</p>
            <p><strong>Antall merder:</strong> {cages.length}</p>
            <p><strong>Koordinater:</strong><br/>
              {center.lat.toFixed(4)}°N<br/>
              {center.lng.toFixed(4)}°E
            </p>
          </div>
        </div>
      </div>

      {/* Liste over merder */}
      <div className="cage-list" style={{ marginTop: '20px' }}>
        <h3>Merder på valgt lokalitet</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
          {cages.map((cage) => (
            <div key={cage.id} style={{
              padding: '15px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              background: '#f9f9f9'
            }}>
              <h4 style={{ margin: '0 0 10px 0' }}>{cage.cage_name || cage.navn}</h4>
              <div style={{ fontSize: '13px', color: '#666' }}>
                {cage.latitude && cage.longitude && (
                  <p>📍 {cage.latitude.toFixed(4)}°N, {cage.longitude.toFixed(4)}°E</p>
                )}
                <p>🏷️ Merd ID: {cage.merd_id}</p>
                <p>📊 Status: {
                  !cage.avg_adult_female ? 'Ingen data' :
                  cage.avg_adult_female >= 0.10 ? '🔴 Høyt' :
                  cage.avg_adult_female >= 0.08 ? '🟠 Advarsel' : '🟢 OK'
                }</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BarentsWatch integrasjon info */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        background: '#f0f7ff',
        borderRadius: '8px',
        border: '1px solid #2196F3'
      }}>
        <h3>🗺️ BarentsWatch Integrasjon</h3>
        <p>
          For å vise nabooppdrett og detaljert kartdata, kan vi integrere med <strong>BarentsWatch Fish Health API</strong>.
        </p>
        <ul style={{ fontSize: '14px', lineHeight: '1.8' }}>
          <li>📍 Alle oppdrettslokaliteter i Norge med koordinater</li>
          <li>🐟 Lusestatus for nabooppdrett</li>
          <li>📊 Historisk data tilbake til 2012</li>
          <li>🚢 Båttrafikk ved anlegg</li>
          <li>⚠️ Rømming og sykdomsdata</li>
        </ul>
        <p style={{ fontSize: '13px', color: '#666', marginTop: '10px' }}>
          <strong>Neste steg:</strong> Registrer applikasjon hos BarentsWatch og hent API-nøkkel fra{' '}
          <a href="https://developer.barentswatch.no" target="_blank" rel="noopener noreferrer">
            developer.barentswatch.no
          </a>
        </p>
      </div>
    </div>
  )
}
