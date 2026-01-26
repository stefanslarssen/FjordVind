import React, { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Fix for Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Map controller for centering
function MapController({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView(center, zoom)
    }
  }, [center, zoom, map])
  return null
}

const UserMapView = ({ userLocalities = [], companyId }) => {
  const [areaLocalities, setAreaLocalities] = useState([])
  const [showArea, setShowArea] = useState(true)
  const [areaRadius, setAreaRadius] = useState(10) // km
  const [loading, setLoading] = useState(false)

  // Beregn senter basert pa brukerens anlegg
  const center = useMemo(() => {
    if (userLocalities.length === 0) {
      return [62.0, 6.0] // Default: Vestlandet
    }
    const avgLat = userLocalities.reduce((sum, l) => sum + parseFloat(l.latitude), 0) / userLocalities.length
    const avgLng = userLocalities.reduce((sum, l) => sum + parseFloat(l.longitude), 0) / userLocalities.length
    return [avgLat, avgLng]
  }, [userLocalities])

  // Hent anlegg i omradet fra BarentsWatch
  useEffect(() => {
    const fetchAreaLocalities = async () => {
      if (!showArea || userLocalities.length === 0) {
        setAreaLocalities([])
        return
      }

      setLoading(true)
      try {
        const response = await fetch(
          `${API_URL}/api/barentswatch/nearby?lat=${center[0]}&lng=${center[1]}&radius=${areaRadius}`
        )

        if (!response.ok) {
          throw new Error('Kunne ikke hente omradedata')
        }

        const data = await response.json()

        // Filtrer ut brukerens egne anlegg
        const userLocalityNos = userLocalities.map(l => parseInt(l.locality_no))
        const filtered = data.filter(l => !userLocalityNos.includes(l.localityNo))

        setAreaLocalities(filtered)
      } catch (error) {
        console.error('Feil ved henting av omrade-data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAreaLocalities()
  }, [center, areaRadius, showArea, userLocalities])

  // Bestem farge basert pa luseniva
  const getStatusColor = (lice) => {
    if (lice === null || lice === undefined) return '#3399ff'
    if (lice >= 0.10) return '#f44336'
    if (lice >= 0.08) return '#ff9800'
    return '#4CAF50'
  }

  const getStatusText = (lice) => {
    if (lice === null || lice === undefined) return 'Ikke rapportert'
    if (lice >= 0.10) return 'FARE'
    if (lice >= 0.08) return 'ADVARSEL'
    return 'OK'
  }

  // Beregn omrade-statistikk
  const areaStats = useMemo(() => {
    const allLocalities = [...areaLocalities]
    const withLice = allLocalities.filter(l => l.avgAdultFemaleLice !== null && l.avgAdultFemaleLice !== undefined)

    return {
      total: allLocalities.length,
      ok: withLice.filter(l => l.avgAdultFemaleLice < 0.08).length,
      warning: withLice.filter(l => l.avgAdultFemaleLice >= 0.08 && l.avgAdultFemaleLice < 0.10).length,
      danger: withLice.filter(l => l.avgAdultFemaleLice >= 0.10).length,
      average: withLice.length > 0
        ? (withLice.reduce((sum, l) => sum + l.avgAdultFemaleLice, 0) / withLice.length).toFixed(3)
        : 'N/A'
    }
  }, [areaLocalities])

  // Lag custom marker ikon
  const createUserMarkerIcon = (lice) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 30px;
          height: 30px;
          background-color: ${getStatusColor(lice)};
          border: 4px solid #1e3a5f;
          border-radius: 50%;
          box-shadow: 0 3px 8px rgba(0,0,0,0.4);
        "></div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    })
  }

  const createAreaMarkerIcon = (lice) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 18px;
          height: 18px;
          background-color: ${getStatusColor(lice)};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          opacity: 0.9;
        "></div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    })
  }

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={center}
        zoom={userLocalities.length > 0 ? 10 : 6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapController center={center} zoom={userLocalities.length > 0 ? 10 : 6} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {/* Radius-sirkel rundt senter */}
        {showArea && userLocalities.length > 0 && (
          <Circle
            center={center}
            radius={areaRadius * 1000}
            pathOptions={{
              color: '#1976d2',
              fillColor: '#1976d2',
              fillOpacity: 0.05,
              weight: 2,
              dashArray: '5, 10'
            }}
          />
        )}

        {/* Brukerens egne anlegg - storre markorer */}
        {userLocalities.map((locality) => (
          <Marker
            key={`user-${locality.id}`}
            position={[parseFloat(locality.latitude), parseFloat(locality.longitude)]}
            icon={createUserMarkerIcon(locality.avgAdultFemaleLice)}
          >
            <Popup>
              <div style={{ minWidth: '250px' }}>
                <div style={{
                  background: '#1e3a5f',
                  color: 'white',
                  padding: '12px',
                  margin: '-12px -12px 12px -12px',
                  borderRadius: '4px 4px 0 0'
                }}>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>
                    {locality.name}
                  </h3>
                  <small>Ditt anlegg</small>
                </div>

                <p><strong>Lokalitetsnr:</strong> {locality.locality_no}</p>
                <p><strong>Kommune:</strong> {locality.municipality}</p>

                <div style={{
                  backgroundColor: `${getStatusColor(locality.avgAdultFemaleLice)}22`,
                  padding: '12px',
                  borderRadius: '6px',
                  borderLeft: `4px solid ${getStatusColor(locality.avgAdultFemaleLice)}`,
                  marginTop: '12px'
                }}>
                  <p style={{ margin: '0 0 4px 0' }}>
                    <strong>Luseniva:</strong>
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: getStatusColor(locality.avgAdultFemaleLice)
                  }}>
                    {locality.avgAdultFemaleLice?.toFixed(3) || 'Ikke registrert'}
                    <span style={{ fontSize: '14px', marginLeft: '8px' }}>
                      {getStatusText(locality.avgAdultFemaleLice)}
                    </span>
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Anlegg i omradet - mindre markorer */}
        {showArea && areaLocalities.map((locality) => (
          <Marker
            key={`area-${locality.localityNo}`}
            position={[locality.latitude, locality.longitude]}
            icon={createAreaMarkerIcon(locality.avgAdultFemaleLice)}
          >
            <Popup>
              <div style={{ minWidth: '220px' }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#333' }}>
                  {locality.name}
                </h3>

                <p><strong>Lokalitetsnr:</strong> {locality.localityNo}</p>
                <p><strong>Kommune:</strong> {locality.municipality}</p>
                <p><strong>Selskap:</strong> {locality.company || 'Ukjent'}</p>

                <div style={{
                  backgroundColor: `${getStatusColor(locality.avgAdultFemaleLice)}22`,
                  padding: '10px',
                  borderRadius: '6px',
                  borderLeft: `4px solid ${getStatusColor(locality.avgAdultFemaleLice)}`,
                  marginTop: '12px'
                }}>
                  <p style={{ margin: 0 }}>
                    <strong>Luseniva:</strong>{' '}
                    <span style={{
                      fontWeight: 'bold',
                      color: getStatusColor(locality.avgAdultFemaleLice)
                    }}>
                      {locality.avgAdultFemaleLice?.toFixed(3) || 'Ikke rapportert'}
                    </span>
                  </p>
                </div>

                <p style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
                  Kilde: BarentsWatch
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Kontrollpanel */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {/* Toggle omrade-visning */}
        <button
          onClick={() => setShowArea(!showArea)}
          style={{
            padding: '10px 16px',
            backgroundColor: showArea ? '#4CAF50' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px'
          }}
        >
          {showArea ? 'Skjul naboer' : 'Vis naboer'}
        </button>

        {/* Radius-velger */}
        {showArea && (
          <div style={{
            backgroundColor: 'white',
            padding: '12px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666' }}>
              Radius: {areaRadius} km
            </label>
            <input
              type="range"
              min="1"
              max="30"
              value={areaRadius}
              onChange={(e) => setAreaRadius(parseInt(e.target.value))}
              style={{ width: '100%', marginTop: '6px' }}
            />
          </div>
        )}
      </div>

      {/* Omrade-statistikk panel */}
      {showArea && userLocalities.length > 0 && (
        <AreaStatsPanel stats={areaStats} loading={loading} />
      )}

      {/* Legend */}
      <LegendPanel userCount={userLocalities.length} areaCount={areaLocalities.length} />
    </div>
  )
}

// Omrade-statistikk komponent
const AreaStatsPanel = ({ stats, loading }) => {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      zIndex: 1000,
      backgroundColor: 'white',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      overflow: 'hidden',
      minWidth: '260px'
    }}>
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '14px 16px',
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '15px', color: 'white' }}>
            Omrade
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.9)' }}>
            {stats.total} anlegg i narheten
          </div>
        </div>
        <div style={{
          fontSize: '18px',
          color: 'white',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s'
        }}>
          &#9660;
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div style={{ padding: '12px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              Laster data...
            </div>
          ) : (
            <>
              {/* Statistikk-bokser */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <StatBox color="#4CAF50" label="OK" count={stats.ok} threshold="< 0.08" />
                <StatBox color="#ff9800" label="Advarsel" count={stats.warning} threshold="0.08-0.10" />
                <StatBox color="#f44336" label="Fare" count={stats.danger} threshold=">= 0.10" />
              </div>

              {/* Gjennomsnitt */}
              <div style={{
                marginTop: '12px',
                padding: '10px',
                backgroundColor: '#f5f5f5',
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Gjennomsnitt i omradet</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e3a5f' }}>
                  {stats.average}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Statistikk-boks komponent
const StatBox = ({ color, label, count, threshold }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: `${color}15`,
    border: `2px solid ${color}`
  }}>
    <div style={{
      width: '16px',
      height: '16px',
      backgroundColor: color,
      borderRadius: '50%',
      marginRight: '10px'
    }} />
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: '600', color: color, fontSize: '13px' }}>{label}</div>
      <div style={{ fontSize: '11px', color: '#666' }}>{threshold}</div>
    </div>
    <div style={{
      backgroundColor: color,
      color: 'white',
      padding: '4px 12px',
      borderRadius: '12px',
      fontWeight: 'bold',
      fontSize: '14px'
    }}>
      {count}
    </div>
  </div>
)

// Legend komponent
const LegendPanel = ({ userCount, areaCount }) => (
  <div style={{
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    zIndex: 1000,
    backgroundColor: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    fontSize: '12px'
  }}>
    <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
      Tegnforklaring
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
      <div style={{
        width: '20px',
        height: '20px',
        backgroundColor: '#4CAF50',
        border: '3px solid #1e3a5f',
        borderRadius: '50%'
      }} />
      <span>Dine anlegg ({userCount})</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '14px',
        height: '14px',
        backgroundColor: '#4CAF50',
        border: '2px solid white',
        borderRadius: '50%',
        marginLeft: '3px',
        marginRight: '3px'
      }} />
      <span>Anlegg i omradet ({areaCount})</span>
    </div>
  </div>
)

export default UserMapView
