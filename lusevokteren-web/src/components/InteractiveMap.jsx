import React, { useEffect, useState, useMemo, useRef } from 'react'
import { MapContainer, Popup, CircleMarker, useMap, useMapEvents, ZoomControl, Polygon, Circle, Marker } from 'react-leaflet'
import OfflineTileLayer from './OfflineTileLayer'
import MarkerClusterGroup from 'react-leaflet-cluster'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import L from 'leaflet'
import {
  fetchLocalitiesFromFiskeridir,
  fetchLocalityPolygons,
  fetchFishHealthData,
  enrichWithFishHealth,
  generateMockFishHealthData
} from '../services/publicApis'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

// Fix for default marker icons in Leaflet with React
// Bruker node_modules-ikoner som blir bundlet, fungerer offline
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// Hjelpefunksjon for å beregne ukenummer
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

// Sykdomsstatistikk sidepanel (som BarentsWatch)
const DiseaseStatsPanel = ({ localityBoundaries, week, year }) => {
  const stats = useMemo(() => {
    const features = localityBoundaries?.features || []
    const diseaseCount = { pd: 0, ila: 0, bkd: 0, francisellose: 0, other: 0 }
    const liceStats = { overLimit: 0, underLimit: 0, total: 0 }

    features.forEach(f => {
      const diseases = f.properties?.diseases || []
      const lice = f.properties?.avgAdultFemaleLice

      // Sykdomstelling
      diseases.forEach(d => {
        if (d === 'PANKREASSYKDOM') diseaseCount.pd++
        else if (d === 'INFEKSIOES_LAKSEANEMI') diseaseCount.ila++
        else if (d === 'BAKTERIELL_NYRESYKE') diseaseCount.bkd++
        else if (d === 'FRANCISELLOSE') diseaseCount.francisellose++
        else diseaseCount.other++
      })

      // Lusetelling
      if (lice !== null && lice !== undefined) {
        liceStats.total++
        if (lice >= 0.5) liceStats.overLimit++
        else liceStats.underLimit++
      }
    })

    return { diseaseCount, liceStats, totalLocalities: features.length }
  }, [localityBoundaries])

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      width: '320px',
      maxHeight: 'calc(100% - 80px)',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: '#1a3a5c',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontWeight: 600, fontSize: '16px' }}>{stats.totalLocalities} lokaliteter</span>
        <button style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', fontSize: '12px' }}>Valgt uke</button>
      </div>

      {/* Uke info */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', background: '#f8f9fa' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#1a3a5c', fontWeight: 600 }}>UKE {week || 5}</span>
          <span style={{ color: '#666', fontSize: '13px' }}>{year || 2026}</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
        {/* Lusegrensestatus */}
        <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#333' }}>Lusegrensestatus</h3>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f44336' }}>{stats.liceStats.overLimit}</div>
              <div style={{ fontSize: '11px', color: '#666' }}>Over lusegrensen</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4CAF50' }}>{stats.liceStats.underLimit}</div>
              <div style={{ fontSize: '11px', color: '#666' }}>Under lusegrensen</div>
            </div>
          </div>
        </div>

        {/* Sykdomsstatus */}
        <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#333' }}>Sykdomsstatus</h3>

          {stats.diseaseCount.pd > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#7B68EE', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '14px'
              }}>{stats.diseaseCount.pd}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Pankreassykdom (PD)</div>
                <div style={{ fontSize: '11px', color: '#666' }}>{stats.diseaseCount.pd} av lokalitetene har mistanke om eller diagnosen pankreassykdom</div>
              </div>
            </div>
          )}

          {stats.diseaseCount.ila > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#20B2AA', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '14px'
              }}>{stats.diseaseCount.ila}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Infeksiøs lakseanemi (ILA)</div>
                <div style={{ fontSize: '11px', color: '#666' }}>{stats.diseaseCount.ila} av lokalitetene har mistanke om eller diagnosen infeksiøs lakseanemi</div>
              </div>
            </div>
          )}

          {stats.diseaseCount.bkd > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#FF6347', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '14px'
              }}>{stats.diseaseCount.bkd}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Bakteriell nyresyke (BKD)</div>
                <div style={{ fontSize: '11px', color: '#666' }}>{stats.diseaseCount.bkd} av lokalitetene har mistanke om eller diagnosen bakteriell nyresyke</div>
              </div>
            </div>
          )}

          {stats.diseaseCount.francisellose > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#FF6347', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '14px'
              }}>{stats.diseaseCount.francisellose}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Francisellose</div>
                <div style={{ fontSize: '11px', color: '#666' }}>{stats.diseaseCount.francisellose} av lokalitetene har diagnosen francisellose</div>
              </div>
            </div>
          )}

          {stats.diseaseCount.pd === 0 && stats.diseaseCount.ila === 0 && stats.diseaseCount.bkd === 0 && stats.diseaseCount.francisellose === 0 && (
            <div style={{ color: '#888', fontSize: '13px' }}>Ingen registrerte sykdommer denne uken</div>
          )}
        </div>

        {/* Datakilder */}
        <div style={{ padding: '16px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#333' }}>Datakilder</h3>
          <div style={{ fontSize: '12px', color: '#666' }}>
            <p style={{ margin: '4px 0' }}>• BarentsWatch Fish Health API</p>
            <p style={{ margin: '4px 0' }}>• Mattilsynet</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Component for re-centering map (only when center changes, not zoom)
function MapController({ center, targetZoom }) {
  const map = useMap()
  const lastCenter = useRef(null)

  useEffect(() => {
    if (center) {
      // Kun flytt kartet hvis senteret faktisk endret seg
      const centerChanged = !lastCenter.current ||
        lastCenter.current.lat !== center.lat ||
        lastCenter.current.lng !== center.lng

      if (centerChanged) {
        lastCenter.current = center
        map.setView([center.lat, center.lng], targetZoom || map.getZoom())
      }
    }
  }, [center, targetZoom, map])
  return null
}

// Component for tracking zoom level changes (for marker sizing only)
function ZoomTracker({ onZoomChange }) {
  const map = useMap()

  useEffect(() => {
    // Set initial zoom
    onZoomChange(map.getZoom())
  }, [])

  useMapEvents({
    zoomend: (e) => {
      onZoomChange(e.target.getZoom())
    }
  })
  return null
}

// Calculate marker radius based on zoom level
function getMarkerRadius(zoom, hasDisease = false) {
  // Zoom levels: 5 (country) to 18 (street level)
  // At zoom 5-6: very small markers (3-4px)
  // At zoom 7-9: small markers (5-6px)
  // At zoom 10-12: medium markers (7-8px)
  // At zoom 13+: large markers (9-10px)
  const baseRadius = hasDisease ? 2 : 1
  if (zoom <= 6) return baseRadius + 2
  if (zoom <= 8) return baseRadius + 4
  if (zoom <= 10) return baseRadius + 5
  if (zoom <= 12) return baseRadius + 6
  return baseRadius + 8
}

// Search Component with autocomplete
const MapSearch = ({ localities, onSelect, localityBoundaries }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState([])
  const searchRef = useRef(null)

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter results based on search term
  useEffect(() => {
    if (searchTerm.length < 2) {
      setResults([])
      return
    }

    const term = searchTerm.toLowerCase()
    const features = localityBoundaries?.features || []

    const filtered = features
      .filter(f => {
        const name = (f.properties?.name || '').toLowerCase()
        const loknr = (f.properties?.loknr || '').toString()
        const owner = (f.properties?.owner || '').toLowerCase()
        const municipality = (f.properties?.municipality || '').toLowerCase()
        return name.includes(term) || loknr.includes(term) || owner.includes(term) || municipality.includes(term)
      })
      .slice(0, 10)
      .map(f => ({
        loknr: f.properties?.loknr,
        name: f.properties?.name,
        owner: f.properties?.owner,
        municipality: f.properties?.municipality,
        lice: f.properties?.avgAdultFemaleLice,
        coordinates: f.geometry?.type === 'Point' ? f.geometry.coordinates : null
      }))

    setResults(filtered)
  }, [searchTerm, localityBoundaries])

  const handleSelect = (result) => {
    setSearchTerm(result.name)
    setShowResults(false)
    if (result.coordinates) {
      onSelect({
        loknr: result.loknr,
        lat: result.coordinates[1],
        lng: result.coordinates[0]
      })
    }
  }

  return (
    <div ref={searchRef} style={{
      position: 'absolute',
      top: '10px',
      left: '150px',
      zIndex: 1001,
      width: '300px'
    }}>
      <input
        type="text"
        placeholder="Søk lokalitet, selskap, kommune..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value)
          setShowResults(true)
        }}
        onFocus={() => searchTerm.length >= 2 && setShowResults(true)}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: '8px',
          border: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          fontSize: '14px',
          outline: 'none'
        }}
      />
      {showResults && results.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          marginTop: '4px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {results.map((r, idx) => (
            <div
              key={r.loknr || idx}
              onClick={() => handleSelect(r)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                borderBottom: idx < results.length - 1 ? '1px solid #eee' : 'none',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
              onMouseLeave={(e) => e.target.style.background = 'white'}
            >
              <div style={{ fontWeight: 600, fontSize: '13px' }}>{r.name}</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                {r.owner} • {r.municipality} • Lok: {r.loknr}
                {r.lice !== null && r.lice !== undefined && (
                  <span style={{
                    marginLeft: '8px',
                    color: r.lice >= 0.10 ? '#f44336' : r.lice >= 0.08 ? '#ff9800' : '#4CAF50',
                    fontWeight: 600
                  }}>
                    {r.lice.toFixed(2)} lus
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Collapsible Controls Component
const CollapsibleControls = ({
  showPolygons, setShowPolygons,
  showActualPolygons, setShowActualPolygons,
  filterStatus, setFilterStatus,
  localityBoundaries,
  allLocalities,
  selectedCompany,
  showDiseaseZones, setShowDiseaseZones,
  showProtectedAreas, setShowProtectedAreas,
  diseaseZones,
  protectedAreas,
  diseaseFilter, setDiseaseFilter,
  onExportCSV
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false)

  const filteredCount = localityBoundaries?.features?.filter(f => {
    const plassering = (f.properties?.plassering || '').toUpperCase()
    const vannmiljo = (f.properties?.vannmiljo || '').toUpperCase()
    const lice = f.properties?.avgAdultFemaleLice
    const owner = (f.properties?.owner || '').toLowerCase()

    // Selskapsfilter
    if (selectedCompany && !owner.includes(selectedCompany.toLowerCase())) {
      return false
    }

    // Kun sjøanlegg (fokus på lus-relevant data)
    const isSeaFarm = plassering === 'SJØ' || (plassering === '' && vannmiljo !== 'FERSKVANN')
    if (!isSeaFarm) return false

    // Lusestatus filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'ok' && (lice === null || lice === undefined || lice >= 0.08)) return false
      if (filterStatus === 'warning' && (lice < 0.08 || lice >= 0.10)) return false
      if (filterStatus === 'danger' && lice < 0.10) return false
    }

    return true
  }).length || 0

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      zIndex: 1000,
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      maxWidth: '260px',
      fontSize: '12px',
      color: '#222'
    }}>
      {/* Header - alltid synlig */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '10px 12px',
          background: '#1565c0',
          borderRadius: isExpanded ? '8px 8px 0 0' : '8px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'white'
        }}
      >
        <span style={{ fontWeight: 600 }}>Kartinnstillinger</span>
        <span style={{ fontSize: '10px' }}>{isExpanded ? '▲' : '▼'}</span>
      </div>

      {/* Kompakt info - alltid synlig */}
      {!isExpanded && (
        <div style={{ padding: '8px 12px', display: 'flex', gap: '12px', fontSize: '11px', color: '#333', fontWeight: 500 }}>
          <span>{filteredCount} lok.</span>
          <span style={{ color: '#f44336' }}>{allLocalities.filter(f => f.avgAdultFemaleLice >= 0.10).length} fare</span>
          {selectedCompany && <span style={{ color: '#1565c0' }}>{selectedCompany}</span>}
        </div>
      )}

      {/* Utvidet innhold */}
      {isExpanded && (
        <div style={{ padding: '12px', color: '#222' }}>
          {/* Vis markører */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showPolygons}
              onChange={(e) => setShowPolygons(e.target.checked)}
            />
            <span>Vis lokaliteter (punkter)</span>
          </label>

          {/* Vis faktiske polygoner */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showActualPolygons}
              onChange={(e) => setShowActualPolygons(e.target.checked)}
            />
            <span>Vis lokalitetsgrenser</span>
          </label>

          {/* Vis sykdomssoner */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showDiseaseZones}
              onChange={(e) => setShowDiseaseZones(e.target.checked)}
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', background: '#D4A574', borderRadius: '50%', border: '1px solid #8B6914' }}></span>
              Sykdomssoner
            </span>
          </label>

          {/* Vis verneområder */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showProtectedAreas}
              onChange={(e) => setShowProtectedAreas(e.target.checked)}
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', background: 'rgba(46,139,46,0.2)', border: '2px solid #2E8B2E' }}></span>
              Verneområder
            </span>
          </label>

          {/* Lusestatus filter */}
          <div style={{ marginBottom: '10px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
            <div style={{ fontWeight: 500, marginBottom: '6px' }}>Lusestatus</div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px', background: 'white', color: '#222' }}
            >
              <option value="all">Alle</option>
              <option value="ok">OK (&lt;0.08)</option>
              <option value="warning">Advarsel (0.08-0.10)</option>
              <option value="danger">Fare (≥0.10)</option>
            </select>
          </div>

          {/* Sykdomsfilter */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontWeight: 500, marginBottom: '6px' }}>Sykdomsstatus</div>
            <select
              value={diseaseFilter}
              onChange={(e) => setDiseaseFilter(e.target.value)}
              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px', background: 'white', color: '#222' }}
            >
              <option value="all">Alle lokaliteter</option>
              <option value="any">Kun med sykdom</option>
              <option value="none">Kun uten sykdom</option>
              <option value="pd">Pankreassykdom (PD)</option>
              <option value="ila">Infeksiøs lakseanemi (ILA)</option>
              <option value="bkd">Bakteriell nyresyke (BKD)</option>
              <option value="francisellose">Francisellose</option>
            </select>
          </div>

          {/* Statistikk */}
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
            {selectedCompany && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#1565c0' }}>
                <span>Selskap:</span>
                <span style={{ fontWeight: 600 }}>{selectedCompany}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Viser:</span>
              <span style={{ fontWeight: 600 }}>{filteredCount} lok.</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#f44336' }}>
              <span>Fare (≥0.10):</span>
              <span style={{ fontWeight: 600 }}>{allLocalities.filter(f => f.avgAdultFemaleLice >= 0.10).length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#ff9800' }}>
              <span>Advarsel:</span>
              <span style={{ fontWeight: 600 }}>{allLocalities.filter(f => f.avgAdultFemaleLice >= 0.08 && f.avgAdultFemaleLice < 0.10).length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4CAF50' }}>
              <span>OK:</span>
              <span style={{ fontWeight: 600 }}>{allLocalities.filter(f => f.avgAdultFemaleLice < 0.08 && f.avgAdultFemaleLice !== null).length}</span>
            </div>
          </div>

          {/* Eksport-knapp */}
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
            <button
              onClick={onExportCSV}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '4px',
                border: 'none',
                background: '#1565c0',
                color: 'white',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>📥</span>
              Eksporter til CSV
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Compact Legend Component - øverst til høyre
const CompactLegend = ({ localities, localityBoundaries }) => {
  const [isExpanded, setIsExpanded] = React.useState(false)

  const stats = React.useMemo(() => {
    if (!localities || localities.length === 0) {
      return { ok: 0, warning: 0, danger: 0, fallow: 0, noReport: 0, total: 0, pd: 0, ila: 0, bkd: 0 }
    }

    return localities.reduce((acc, loc) => {
      const lice = loc.avgAdultFemaleLice
      if (loc.isFallow) acc.fallow++
      else if (lice === null || lice === undefined) acc.noReport++
      else if (lice >= 0.10) acc.danger++
      else if (lice >= 0.08) acc.warning++
      else acc.ok++
      acc.total++
      return acc
    }, { ok: 0, warning: 0, danger: 0, fallow: 0, noReport: 0, total: 0, pd: 0, ila: 0, bkd: 0 })
  }, [localities])

  // Beregn sykdomsstatistikk fra lokalitetsdata
  const diseaseStats = React.useMemo(() => {
    const features = localityBoundaries?.features || []
    return features.reduce((acc, f) => {
      const diseases = f.properties?.diseases || []
      diseases.forEach(d => {
        if (d === 'PANKREASSYKDOM') acc.pd++
        else if (d === 'INFEKSIOES_LAKSEANEMI') acc.ila++
        else if (d === 'BAKTERIELL_NYRESYKE') acc.bkd++
        else if (d === 'FRANCISELLOSE') acc.francisellose++
      })
      return acc
    }, { pd: 0, ila: 0, bkd: 0, francisellose: 0 })
  }, [localityBoundaries])

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      zIndex: 1000,
      fontSize: '12px',
      minWidth: '180px',
      color: '#222'
    }}>
      {/* Kompakt header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '10px 12px',
          background: '#1565c0',
          borderRadius: isExpanded ? '8px 8px 0 0' : '8px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'white'
        }}
      >
        <span style={{ fontWeight: 600 }}>Tegnforklaring</span>
        <span style={{ fontSize: '10px', opacity: 0.8, marginLeft: '8px' }}>
          {stats.total} lok.
        </span>
        <span style={{ marginLeft: '8px', fontSize: '10px' }}>{isExpanded ? '▲' : '▼'}</span>
      </div>

      {/* Alltid synlig: kompakt status-bar */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '8px',
        borderBottom: isExpanded ? '1px solid #eee' : 'none',
        background: isExpanded ? 'white' : 'white',
        borderRadius: isExpanded ? '0' : '0 0 8px 8px',
        color: '#222'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
          <div style={{ width: '12px', height: '12px', background: '#4CAF50', borderRadius: '50%' }}></div>
          <span style={{ fontWeight: 600 }}>{stats.ok}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
          <div style={{ width: '12px', height: '12px', background: '#ff9800', borderRadius: '50%' }}></div>
          <span style={{ fontWeight: 600 }}>{stats.warning}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
          <div style={{ width: '12px', height: '12px', background: '#f44336', borderRadius: '50%' }}></div>
          <span style={{ fontWeight: 600 }}>{stats.danger}</span>
        </div>
      </div>

      {/* Utvidet innhold */}
      {isExpanded && (
        <div style={{ padding: '8px', color: '#222' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '14px', height: '14px', background: '#4CAF50', borderRadius: '50%', border: '2px solid #2e7d32' }}></div>
              <span>OK (&lt;0.08)</span>
              <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{stats.ok}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '14px', height: '14px', background: '#ff9800', borderRadius: '50%', border: '2px solid #e65100' }}></div>
              <span>Advarsel (0.08-0.10)</span>
              <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{stats.warning}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '14px', height: '14px', background: '#f44336', borderRadius: '50%', border: '2px solid #c62828' }}></div>
              <span>Fare (≥0.10)</span>
              <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{stats.danger}</span>
            </div>
            <div style={{ height: '1px', background: '#eee', margin: '4px 0' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#444' }}>
              <div style={{ width: '14px', height: '14px', background: '#9e9e9e', borderRadius: '50%' }}></div>
              <span>Brakklagt</span>
              <span style={{ marginLeft: 'auto' }}>{stats.fallow}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#444' }}>
              <div style={{ width: '14px', height: '14px', background: '#3399ff', borderRadius: '50%' }}></div>
              <span>Ikke rapportert</span>
              <span style={{ marginLeft: 'auto' }}>{stats.noReport}</span>
            </div>
            <div style={{ height: '1px', background: '#eee', margin: '6px 0' }}></div>
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#666', marginBottom: '4px' }}>Sykdomsstatus</div>
            {diseaseStats.pd > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#444' }}>
                <div style={{ width: '20px', height: '20px', background: '#7B68EE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 'bold' }}>{diseaseStats.pd}</div>
                <span>Pankreassykdom (PD)</span>
              </div>
            )}
            {diseaseStats.ila > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#444', marginTop: '4px' }}>
                <div style={{ width: '20px', height: '20px', background: '#20B2AA', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 'bold' }}>{diseaseStats.ila}</div>
                <span>Infeksiøs lakseanemi (ILA)</span>
              </div>
            )}
            {diseaseStats.bkd > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#444', marginTop: '4px' }}>
                <div style={{ width: '20px', height: '20px', background: '#FF6347', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 'bold' }}>{diseaseStats.bkd}</div>
                <span>Bakteriell nyresyke (BKD)</span>
              </div>
            )}
            {diseaseStats.pd === 0 && diseaseStats.ila === 0 && diseaseStats.bkd === 0 && (
              <div style={{ color: '#888', fontSize: '11px' }}>Ingen registrerte sykdommer</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Uke-velger komponent for historiske data med tidslinje-animasjon
const WeekSelector = ({ selectedYear, selectedWeek, onYearChange, onWeekChange }) => {
  const currentYear = new Date().getFullYear()
  const currentWeek = getWeekNumber(new Date())
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [animationSpeed, setAnimationSpeed] = React.useState(1000) // millisekunder per uke
  const animationRef = React.useRef(null)

  // Generer liste over tilgjengelige uker (1-52/53)
  const weeks = Array.from({ length: 52 }, (_, i) => i + 1)

  // Tilgjengelige år (2020 til nå)
  const years = Array.from({ length: currentYear - 2019 }, (_, i) => 2020 + i)

  const isCurrentWeek = selectedYear === currentYear && selectedWeek === currentWeek

  // Beregn total antall uker fra 2020 uke 1 til nå
  const totalWeeks = (currentYear - 2020) * 52 + currentWeek
  const currentPosition = (selectedYear - 2020) * 52 + selectedWeek

  // Animasjon logikk
  React.useEffect(() => {
    if (isPlaying) {
      animationRef.current = setInterval(() => {
        // Gå til neste uke
        if (selectedWeek < 52 && !(selectedYear === currentYear && selectedWeek >= currentWeek)) {
          onWeekChange(selectedWeek + 1)
        } else if (selectedYear < currentYear) {
          // Gå til neste år
          onYearChange(selectedYear + 1)
          onWeekChange(1)
        } else {
          // Animasjonen er ferdig
          setIsPlaying(false)
        }
      }, animationSpeed)
    }

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current)
      }
    }
  }, [isPlaying, selectedYear, selectedWeek, animationSpeed, currentYear, currentWeek, onYearChange, onWeekChange])

  // Stopp animasjon når nåværende uke er nådd
  React.useEffect(() => {
    if (isCurrentWeek && isPlaying) {
      setIsPlaying(false)
    }
  }, [isCurrentWeek, isPlaying])

  const handleSliderChange = (e) => {
    const position = parseInt(e.target.value)
    const year = 2020 + Math.floor((position - 1) / 52)
    const week = ((position - 1) % 52) + 1
    onYearChange(year)
    onWeekChange(week)
  }

  const togglePlay = () => {
    if (isCurrentWeek) {
      // Start fra begynnelsen hvis vi er på slutten
      onYearChange(selectedYear)
      onWeekChange(1)
      setIsPlaying(true)
    } else {
      setIsPlaying(!isPlaying)
    }
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      padding: '10px 16px',
      minWidth: '500px'
    }}>
      {/* Øvre rad med kontroller */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', fontSize: '13px' }}>
        {/* Play/Pause knapp */}
        <button
          onClick={togglePlay}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: 'none',
            background: isPlaying ? '#f44336' : '#1565c0',
            color: 'white',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={isPlaying ? 'Pause' : 'Spill av tidslinje'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <span style={{ fontWeight: 600, color: '#1a3a5c' }}>Uke:</span>

        <select
          value={selectedYear}
          onChange={(e) => onYearChange(parseInt(e.target.value))}
          disabled={isPlaying}
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '13px',
            cursor: isPlaying ? 'not-allowed' : 'pointer',
            opacity: isPlaying ? 0.6 : 1
          }}
        >
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <select
          value={selectedWeek}
          onChange={(e) => onWeekChange(parseInt(e.target.value))}
          disabled={isPlaying}
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '13px',
            cursor: isPlaying ? 'not-allowed' : 'pointer',
            opacity: isPlaying ? 0.6 : 1
          }}
        >
          {weeks.map(week => (
            <option
              key={week}
              value={week}
              disabled={selectedYear === currentYear && week > currentWeek}
            >
              Uke {week}
            </option>
          ))}
        </select>

        {/* Hastighetsvelger */}
        <select
          value={animationSpeed}
          onChange={(e) => setAnimationSpeed(parseInt(e.target.value))}
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '12px',
            cursor: 'pointer'
          }}
          title="Animasjonshastighet"
        >
          <option value={2000}>Sakte</option>
          <option value={1000}>Normal</option>
          <option value={500}>Rask</option>
          <option value={250}>Veldig rask</option>
        </select>

        {!isCurrentWeek && !isPlaying && (
          <button
            onClick={() => {
              onYearChange(currentYear)
              onWeekChange(currentWeek)
            }}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              border: 'none',
              background: '#1565c0',
              color: 'white',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Nå
          </button>
        )}

        {isCurrentWeek && (
          <span style={{ color: '#4CAF50', fontSize: '12px', fontWeight: 500 }}>
            Gjeldende uke
          </span>
        )}
      </div>

      {/* Tidslinje-slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: '#666', minWidth: '50px' }}>2020 U1</span>
        <input
          type="range"
          min={1}
          max={totalWeeks}
          value={currentPosition}
          onChange={handleSliderChange}
          disabled={isPlaying}
          style={{
            flex: 1,
            height: '6px',
            cursor: isPlaying ? 'not-allowed' : 'pointer',
            accentColor: '#1565c0'
          }}
        />
        <span style={{ fontSize: '11px', color: '#666', minWidth: '60px', textAlign: 'right' }}>
          {currentYear} U{currentWeek}
        </span>
      </div>
    </div>
  )
}

/**
 * InteractiveMap - Interaktiv kartvisning inspirert av BarentsWatch
 */
export default function InteractiveMap({ selectedLocation = null, selectedCompany = null }) {
  const { isOnline } = useOnlineStatus()
  const [allLocalities, setAllLocalities] = useState([])
  const [localityBoundaries, setLocalityBoundaries] = useState(null)
  const [polygonBoundaries, setPolygonBoundaries] = useState(null)
  const [center, setCenter] = useState({ lat: 65.0, lng: 12.0 }) // Sentrert på Norge
  const [radius] = useState(10) // Radius for nabovisning
  const [zoom, setZoom] = useState(5) // Zoom ut for å se hele Norge ved oppstart
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false) // Oppdaterer data (ikke første lasting)
  const [error, setError] = useState(null) // Feilmelding til bruker
  const [usingCachedData, setUsingCachedData] = useState(false) // Viser om vi bruker cachet data
  const [showPolygons, setShowPolygons] = useState(true)
  const [showActualPolygons, setShowActualPolygons] = useState(true) // Vis polygon-grenser som standard
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchSelected, setSearchSelected] = useState(null)
  const [diseaseZones, setDiseaseZones] = useState(null)
  const [protectedAreas, setProtectedAreas] = useState(null)
  const [showDiseaseZones, setShowDiseaseZones] = useState(true)
  const [showProtectedAreas, setShowProtectedAreas] = useState(true)
  const [diseaseFilter, setDiseaseFilter] = useState('all') // 'all', 'pd', 'ila', 'bkd', 'any', 'none'

  // Uke-velger for historiske data
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedWeek, setSelectedWeek] = useState(getWeekNumber(new Date()))

  // Progress for BarentsWatch data loading
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStatus, setLoadingStatus] = useState('')

  // Håndter søkeresultat-valg
  const handleSearchSelect = (result) => {
    setSearchSelected(result.loknr)
    setCenter({ lat: result.lat, lng: result.lng })
    setZoom(12)
  }

  // Eksporter filtrerte lokaliteter til CSV
  const handleExportCSV = () => {
    if (!localityBoundaries?.features) return

    // Filtrer lokalitetene basert på gjeldende filter
    const filteredFeatures = localityBoundaries.features.filter(feature => {
      const plassering = (feature.properties?.plassering || '').toUpperCase()
      const vannmiljo = (feature.properties?.vannmiljo || '').toUpperCase()
      const lice = feature.properties?.avgAdultFemaleLice
      const owner = (feature.properties?.owner || '').toLowerCase()
      const diseases = feature.properties?.diseases || []

      // Selskapsfilter
      if (selectedCompany && !owner.includes(selectedCompany.toLowerCase())) return false

      // Kun sjøanlegg
      const isSeaFarm = plassering === 'SJØ' || (plassering === '' && vannmiljo !== 'FERSKVANN')
      if (!isSeaFarm) return false

      // Lusestatus filter
      if (filterStatus !== 'all') {
        if (filterStatus === 'ok' && (lice === null || lice === undefined || lice >= 0.08)) return false
        if (filterStatus === 'warning' && (lice === null || lice === undefined || lice < 0.08 || lice >= 0.10)) return false
        if (filterStatus === 'danger' && (lice === null || lice === undefined || lice < 0.10)) return false
      }

      // Sykdomsfilter
      if (diseaseFilter !== 'all') {
        if (diseaseFilter === 'any' && diseases.length === 0) return false
        if (diseaseFilter === 'none' && diseases.length > 0) return false
        if (diseaseFilter === 'pd' && !diseases.includes('PANKREASSYKDOM')) return false
        if (diseaseFilter === 'ila' && !diseases.includes('INFEKSIOES_LAKSEANEMI')) return false
        if (diseaseFilter === 'bkd' && !diseases.includes('BAKTERIELL_NYRESYKE')) return false
        if (diseaseFilter === 'francisellose' && !diseases.includes('FRANCISELLOSE')) return false
      }

      return true
    })

    // Generer CSV-innhold
    const headers = ['Lokalitetsnr', 'Navn', 'Kommune', 'Eier', 'Lusenivå', 'Sykdommer', 'Breddegrad', 'Lengdegrad']
    const rows = filteredFeatures.map(f => {
      const props = f.properties || {}
      const coords = f.geometry?.type === 'Point' ? f.geometry.coordinates : [null, null]
      return [
        props.loknr || '',
        (props.name || '').replace(/,/g, ' '),
        (props.municipality || '').replace(/,/g, ' '),
        (props.owner || '').replace(/,/g, ' '),
        props.avgAdultFemaleLice !== null && props.avgAdultFemaleLice !== undefined ? props.avgAdultFemaleLice.toFixed(3) : '',
        (props.diseases || []).join('; '),
        coords[1] || '',
        coords[0] || ''
      ].join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')

    // Last ned CSV-fil
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `lokaliteter_uke${selectedWeek}_${selectedYear}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Når en lokalitet velges fra dropdown eller søk, zoom inn automatisk
  // Kun zoom når bruker aktivt velger en lokalitet, ikke ved data-lasting
  useEffect(() => {
    const locationToZoom = selectedLocation || searchSelected
    if (locationToZoom && localityBoundaries?.features) {
      // Finn koordinater for valgt lokalitet
      const selectedFeature = localityBoundaries.features.find(
        f => f.properties?.loknr?.toString() === locationToZoom.toString()
      )
      if (selectedFeature?.geometry?.coordinates) {
        // Håndter både Point og Polygon geometri
        if (selectedFeature.geometry.type === 'Point') {
          const [lng, lat] = selectedFeature.geometry.coordinates
          setCenter({ lat, lng })
          setZoom(12)
        } else {
          // Polygon - beregn senterpunkt
          const coords = selectedFeature.geometry.type === 'MultiPolygon'
            ? selectedFeature.geometry.coordinates[0][0]
            : selectedFeature.geometry.coordinates[0]
          if (coords && coords.length > 0) {
            const avgLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length
            const avgLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length
            setCenter({ lat: avgLat, lng: avgLng })
            setZoom(12)
          }
        }
      }
    }
    // Fjernet auto-reset til Norge-visning - la brukeren beholde sin zoom
  }, [selectedLocation, searchSelected])

  useEffect(() => {
    loadMapData()
  }, [selectedLocation])

  // Fetch point data for ALL localities
  useEffect(() => {
    if (showPolygons) {
      loadPointData()
    }
  }, [showPolygons])

  // Fetch actual polygon boundaries on mount
  useEffect(() => {
    console.log('Loading polygon boundaries from Fiskeridirektoratet...')
    loadActualPolygonBoundaries()
  }, [])

  // Fetch disease zones when enabled
  useEffect(() => {
    if (showDiseaseZones && !diseaseZones) {
      loadDiseaseZones()
    }
  }, [showDiseaseZones])

  // Fetch protected areas when enabled
  useEffect(() => {
    if (showProtectedAreas && !protectedAreas) {
      loadProtectedAreas()
    }
  }, [showProtectedAreas])

  // Reload data when week/year changes
  useEffect(() => {
    loadPointData(selectedYear, selectedWeek)
    loadMapData(selectedYear, selectedWeek)
  }, [selectedYear, selectedWeek])

  async function loadPointData(year = selectedYear, week = selectedWeek) {
    try {
      setLoadingProgress(0)
      setLoadingStatus('Henter lokaliteter fra Fiskeridirektoratet...')

      // Fetch localities from Fiskeridirektoratet WFS (public API)
      const data = await fetchLocalitiesFromFiskeridir()
      setLoadingStatus(`Hentet ${data.features?.length || 0} lokaliteter. Henter lusedata fra BarentsWatch...`)

      // Progress callback for BarentsWatch batch fetching
      const onProgress = (progress, count) => {
        setLoadingProgress(progress)
        setLoadingStatus(`Henter lusedata: ${count} lokaliteter (${progress}%)`)
      }

      // Try to get fish health data from BarentsWatch
      let fishHealthData = await fetchFishHealthData(year, week, onProgress)

      // If no real fish health data available, use mock data for demonstration
      if (!fishHealthData) {
        console.log('Using mock fish health data (BarentsWatch API requires authentication)')
        setLoadingStatus('Bruker simulert lusedata...')
        fishHealthData = generateMockFishHealthData(data)
      }

      // Enrich locality data with fish health information
      const enrichedData = enrichWithFishHealth(data, fishHealthData)

      setLocalityBoundaries(enrichedData)
      setUsingCachedData(false)
      setLoadingProgress(100)
      setLoadingStatus('')
      console.log(`Loaded ${enrichedData.features?.length || 0} localities for week ${week}/${year}`)
    } catch (err) {
      console.error('Failed to load locality data:', err)
      setLoadingStatus('')
      // Sjekk om det er fordi vi er offline
      if (!navigator.onLine) {
        setUsingCachedData(true)
        // Service worker vil returnere cachet data automatisk
        console.log('Offline - bruker cachet lokalitetsdata')
      } else {
        setError('Kunne ikke laste lokalitetsdata. Sjekk internettforbindelsen.')
        setTimeout(() => setError(null), 5000)
      }
    }
  }

  async function loadActualPolygonBoundaries() {
    try {
      // Fetch polygon boundaries from Fiskeridirektoratet WFS
      const data = await fetchLocalityPolygons()
      setPolygonBoundaries(data)
      console.log(`Loaded ${data.features?.length || 0} real polygon boundaries from Fiskeridirektoratet`)
    } catch (err) {
      console.error('Failed to load polygon boundaries:', err)
    }
  }

  async function loadDiseaseZones() {
    // Disease zones are not available from public APIs without authentication
    // For now, we'll show disease status on individual localities instead
    console.log('Disease zones: Using locality-level disease data instead')
    setDiseaseZones({ type: 'FeatureCollection', features: [] })
  }

  async function loadProtectedAreas() {
    // Protected areas would require Miljødirektoratet API
    // For now, skip this layer
    console.log('Protected areas: Not available in this version')
    setProtectedAreas({ type: 'FeatureCollection', features: [] })
  }

  async function loadMapData(year = selectedYear, week = selectedWeek) {
    try {
      const isFirstLoad = allLocalities.length === 0
      if (isFirstLoad) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      // Fetch localities from Fiskeridirektoratet
      const localityData = await fetchLocalitiesFromFiskeridir()

      // Transform to allLocalities format
      const localities = (localityData.features || []).map(f => ({
        loknr: f.properties?.loknr,
        name: f.properties?.name,
        owner: f.properties?.owner,
        municipality: f.properties?.municipality,
        avgAdultFemaleLice: f.properties?.avgAdultFemaleLice,
        diseases: f.properties?.diseases || [],
        isFallow: f.properties?.isFallow
      }))

      setAllLocalities(localities)
      setLoading(false)
      setRefreshing(false)
    } catch (err) {
      console.error('Failed to load map data:', err)
      setLoading(false)
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg, #0f172a)',
        borderRadius: '8px',
        gap: '16px'
      }}>
        {/* Spinner */}
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid var(--border, #334155)',
          borderTopColor: 'var(--primary, #1e40af)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ color: 'var(--text, #e2e8f0)', fontSize: '16px', fontWeight: 500 }}>
          Laster kartdata...
        </div>
        <div style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '13px', textAlign: 'center' }}>
          {loadingStatus || 'Henter data...'}
        </div>
        {loadingProgress > 0 && loadingProgress < 100 && (
          <div style={{ width: '200px', marginTop: '8px' }}>
            <div style={{
              width: '100%',
              height: '8px',
              background: 'var(--border, #334155)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${loadingProgress}%`,
                height: '100%',
                background: 'var(--primary, #1e40af)',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <div style={{
              color: 'var(--text-secondary, #94a3b8)',
              fontSize: '12px',
              textAlign: 'center',
              marginTop: '4px'
            }}>
              {loadingProgress}%
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {/* Loading progress indicator (when refreshing) */}
      {loadingStatus && !loading && (
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1002,
          background: 'rgba(30, 64, 175, 0.95)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          minWidth: '280px'
        }}>
          <div style={{ fontSize: '13px', marginBottom: '8px' }}>{loadingStatus}</div>
          {loadingProgress > 0 && loadingProgress < 100 && (
            <div style={{
              width: '100%',
              height: '6px',
              background: 'rgba(255,255,255,0.3)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${loadingProgress}%`,
                height: '100%',
                background: 'white',
                borderRadius: '3px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          )}
        </div>
      )}

      {/* Offline-indikator */}
      {!isOnline && (
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1002,
          background: 'rgba(245, 158, 11, 0.95)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px',
          fontWeight: 500
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <line x1="12" y1="20" x2="12.01" y2="20"/>
          </svg>
          Offline modus - viser cachet kartdata
        </div>
      )}

      {/* Cachet data indikator */}
      {usingCachedData && isOnline && (
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1002,
          background: 'rgba(59, 130, 246, 0.9)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '12px'
        }}>
          Bruker cachet data fra siste besøk
        </div>
      )}

      {/* Feilmelding banner */}
      {error && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'rgba(220, 38, 38, 0.95)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          maxWidth: '400px'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style={{ flex: 1, fontSize: '14px' }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Oppdaterings-indikator (vises ved uke/år-bytte) */}
      {refreshing && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          background: 'rgba(30, 64, 175, 0.95)',
          color: 'white',
          padding: '10px 16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px'
        }}>
          <div style={{
            width: '18px',
            height: '18px',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: 'white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Oppdaterer data...
        </div>
      )}

      {/* Sykdomsstatistikk sidepanel (BarentsWatch-stil) */}
      <DiseaseStatsPanel localityBoundaries={localityBoundaries} week={selectedWeek} year={selectedYear} />

      {/* Kompakt kontrollpanel - kan minimeres */}
      <CollapsibleControls
        showPolygons={showPolygons}
        setShowPolygons={setShowPolygons}
        showActualPolygons={showActualPolygons}
        setShowActualPolygons={setShowActualPolygons}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        localityBoundaries={localityBoundaries}
        allLocalities={allLocalities}
        selectedCompany={selectedCompany}
        showDiseaseZones={showDiseaseZones}
        setShowDiseaseZones={setShowDiseaseZones}
        showProtectedAreas={showProtectedAreas}
        setShowProtectedAreas={setShowProtectedAreas}
        diseaseZones={diseaseZones}
        protectedAreas={protectedAreas}
        diseaseFilter={diseaseFilter}
        setDiseaseFilter={setDiseaseFilter}
        onExportCSV={handleExportCSV}
      />

      {/* Søkefelt - sentrert øverst */}
      <MapSearch
        localities={allLocalities}
        onSelect={handleSearchSelect}
        localityBoundaries={localityBoundaries}
      />

      {/* Leaflet kart - fyller hele containeren */}
      <MapContainer
        center={[65.0, 12.0]}
        zoom={5}
        style={{ height: '100%', width: '100%', borderRadius: '8px' }}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <MapController center={center} targetZoom={null} />
        <ZoomTracker onZoomChange={setZoom} />
        <ZoomControl position="bottomleft" />

        {/* Kartfliser fra OpenStreetMap med offline-støtte */}
        <OfflineTileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Verneområder - grønne polygon-grenser */}
        {showProtectedAreas && protectedAreas?.features?.map((feature, idx) => {
          if (!feature.geometry) return null

          const props = feature.properties
          const areaType = (props?.areaType || '').toLowerCase()

          // Stil basert på type verneområde
          let strokeColor = '#2E8B2E'
          let dashArray = null
          if (areaType.includes('dyrelivsfredning') || areaType.includes('dyreliv')) {
            strokeColor = '#228B22'
            dashArray = '5,5'
          }

          // Konverter koordinater til Leaflet format
          let positions = []
          try {
            if (feature.geometry.type === 'Polygon') {
              positions = feature.geometry.coordinates[0].map(c => [c[1], c[0]])
            } else if (feature.geometry.type === 'MultiPolygon') {
              positions = feature.geometry.coordinates[0][0].map(c => [c[1], c[0]])
            }
          } catch (e) {
            return null
          }

          if (positions.length === 0) return null

          return (
            <Polygon
              key={`protected-${props?.id || idx}`}
              positions={positions}
              pathOptions={{
                fillColor: '#2E8B2E',
                fillOpacity: 0.1,
                color: strokeColor,
                weight: 2,
                dashArray: dashArray
              }}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#2E8B2E' }}>
                    {props?.name || 'Verneområde'}
                  </h3>
                  <p><strong>Type:</strong> {props?.areaType || 'Ukjent'}</p>
                  {props?.establishedYear && <p><strong>Vernet:</strong> {props.establishedYear}</p>}
                  {props?.areaKm2 && <p><strong>Areal:</strong> {props.areaKm2} km²</p>}
                  {props?.municipality && <p><strong>Kommune:</strong> {props.municipality}</p>}
                  {props?.regulation && <p style={{ fontSize: '11px', color: '#666' }}>{props.regulation}</p>}
                </div>
              </Popup>
            </Polygon>
          )
        })}

        {/* Sykdomssoner - oransje/brune sirkler */}
        {showDiseaseZones && diseaseZones?.features?.map((feature, idx) => {
          const props = feature.properties
          const diseaseType = (props?.diseaseType || 'ILA').toUpperCase()
          const zoneType = (props?.zoneType || 'surveillance').toLowerCase()

          // Bestem radius (i meter)
          const radiusMeters = (props?.radiusKm || 10) * 1000

          // Bestem posisjon - enten fra center property eller geometry
          let lat, lng
          if (props?.center) {
            lat = props.center.lat
            lng = props.center.lng
          } else if (feature.geometry?.type === 'Point') {
            lng = feature.geometry.coordinates[0]
            lat = feature.geometry.coordinates[1]
          } else {
            return null
          }

          // Stil basert på sykdomstype og sonetype
          let fillColor = '#D4A574' // Standard overvåkningssone (lysere oransje/brun)
          let fillOpacity = 0.4
          let borderColor = '#8B6914'

          if (zoneType === 'protection') {
            // Beskyttelsessone - mørkere
            fillColor = '#C98B4A'
            fillOpacity = 0.5
            borderColor = '#6B4423'
          }

          if (diseaseType === 'PD') {
            // PD-soner har litt annen farge for å skille
            fillColor = zoneType === 'protection' ? '#B87333' : '#CD853F'
          }

          return (
            <Circle
              key={`disease-${props?.id || idx}`}
              center={[lat, lng]}
              radius={radiusMeters}
              pathOptions={{
                fillColor: fillColor,
                fillOpacity: fillOpacity,
                color: borderColor,
                weight: 2
              }}
            >
              <Popup>
                <div style={{ minWidth: '220px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: borderColor }}>
                    {props?.name || `${diseaseType}-sone`}
                  </h3>
                  <p><strong>Sykdom:</strong> {diseaseType}</p>
                  <p><strong>Sonetype:</strong> {zoneType === 'protection' ? 'Beskyttelsessone' : 'Overvåkningssone'}</p>
                  <p><strong>Radius:</strong> {props?.radiusKm || 10} km</p>
                  {props?.validFrom && <p><strong>Gyldig fra:</strong> {props.validFrom}</p>}
                  {props?.municipality && <p><strong>Kommune:</strong> {props.municipality}</p>}
                  {props?.regulation && <p style={{ fontSize: '11px', color: '#666' }}><strong>Forskrift:</strong> {props.regulation}</p>}
                </div>
              </Popup>
            </Circle>
          )
        })}

        {/* Faktiske polygon-grenser */}
        {showActualPolygons && polygonBoundaries?.features?.map((feature, idx) => {
          if (!feature.geometry || feature.geometry.type === 'Point') return null

          const props = feature.properties
          const loknr = props?.loknr?.toString()
          const isSelected = loknr === (selectedLocation || searchSelected)?.toString()

          // BarentsWatch-stil: Lyseblå fyll med mørkere blå kant
          const fillColor = '#8ecae6' // Lyseblå (som BarentsWatch)
          const borderColor = '#219ebc' // Mørkere blå kant

          // Konverter koordinater til Leaflet format
          let positions = []
          try {
            if (feature.geometry.type === 'Polygon') {
              positions = feature.geometry.coordinates[0].map(c => [c[1], c[0]])
            } else if (feature.geometry.type === 'MultiPolygon') {
              positions = feature.geometry.coordinates[0][0].map(c => [c[1], c[0]])
            }
          } catch (e) {
            return null
          }

          if (positions.length === 0) return null

          return (
            <Polygon
              key={`polygon-${loknr || idx}`}
              positions={positions}
              pathOptions={{
                fillColor: fillColor,
                fillOpacity: isSelected ? 0.6 : 0.4,
                color: borderColor,
                weight: isSelected ? 2 : 1
              }}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                    {props?.navn || props?.name || 'Ukjent'}
                  </h3>
                  <p><strong>Lok.nr:</strong> {props?.loknr}</p>
                  <p><strong>Eier:</strong> {props?.organisasjon || props?.owner}</p>
                  <p><strong>Kommune:</strong> {props?.kommune || props?.municipality}</p>
                  <p><strong>Fylke:</strong> {props?.fylke}</p>
                  <p><strong>Status:</strong> {props?.status_lokalitet}</p>
                </div>
              </Popup>
            </Polygon>
          )
        })}


        {/* Lokaliteter fra BarentsWatch - Point geometri med clustering */}
        {showPolygons && localityBoundaries && (() => {
          // Filtrer basert på selskap og lusestatus - kun sjøanlegg
          // Finn koordinatene til valgt lokalitet for radius-beregning
          let selectedLocationCoords = null
          if (selectedLocation) {
            const selectedFeature = localityBoundaries.features.find(
              f => f.properties?.loknr?.toString() === selectedLocation.toString()
            )
            if (selectedFeature?.geometry?.type === 'Point') {
              const [lng, lat] = selectedFeature.geometry.coordinates
              selectedLocationCoords = { lat, lng }
            }
          }

          const filteredFeatures = localityBoundaries.features.filter(feature => {
            const plassering = (feature.properties?.plassering || '').toUpperCase()
            const vannmiljo = (feature.properties?.vannmiljo || '').toUpperCase()
            const loknr = feature.properties?.loknr?.toString()
            const lice = feature.properties?.avgAdultFemaleLice
            const owner = (feature.properties?.owner || '').toLowerCase()

            // Selskapsfilter - vis kun lokaliteter som tilhører valgt selskap
            if (selectedCompany && !owner.includes(selectedCompany.toLowerCase())) {
              return false
            }

            // Hvis en lokalitet er valgt, vis kun den og naboer innen radius
            if (selectedLocation && selectedLocationCoords) {
              if (loknr === selectedLocation.toString()) {
                return true // Alltid vis valgt lokalitet
              }

              // Hent koordinater fra Point geometri
              if (feature.geometry?.type === 'Point') {
                const [lng, lat] = feature.geometry.coordinates
                // Haversine-formel for avstand - bruk valgt lokalitets koordinater
                const R = 6371 // km
                const dLat = (lat - selectedLocationCoords.lat) * Math.PI / 180
                const dLon = (lng - selectedLocationCoords.lng) * Math.PI / 180
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                          Math.cos(selectedLocationCoords.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                          Math.sin(dLon/2) * Math.sin(dLon/2)
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
                const distance = R * c

                if (distance > radius) {
                  return false // Utenfor radius
                }
              }
            }

            // Kun sjøanlegg (fokus på lus-relevant data)
            const isSeaFarm = plassering === 'SJØ' || (plassering === '' && vannmiljo !== 'FERSKVANN')
            if (!isSeaFarm) return false

            // Lusestatus filter
            if (filterStatus !== 'all') {
              if (filterStatus === 'ok' && (lice === null || lice === undefined || lice >= 0.08)) return false
              if (filterStatus === 'warning' && (lice === null || lice === undefined || lice < 0.08 || lice >= 0.10)) return false
              if (filterStatus === 'danger' && (lice === null || lice === undefined || lice < 0.10)) return false
            }

            // Sykdomsfilter
            const diseases = feature.properties?.diseases || []
            if (diseaseFilter !== 'all') {
              if (diseaseFilter === 'any' && diseases.length === 0) return false
              if (diseaseFilter === 'none' && diseases.length > 0) return false
              if (diseaseFilter === 'pd' && !diseases.includes('PANKREASSYKDOM')) return false
              if (diseaseFilter === 'ila' && !diseases.includes('INFEKSIOES_LAKSEANEMI')) return false
              if (diseaseFilter === 'bkd' && !diseases.includes('BAKTERIELL_NYRESYKE')) return false
              if (diseaseFilter === 'francisellose' && !diseases.includes('FRANCISELLOSE')) return false
            }

            return true
          })

          // Render CircleMarkers for all geometry types (Point or calculate center from Polygon)
          const markers = filteredFeatures.map((feature, idx) => {
            let lat, lng

            // Håndter både Point og Polygon/MultiPolygon geometri
            if (feature.geometry?.type === 'Point') {
              [lng, lat] = feature.geometry.coordinates
            } else if (feature.geometry?.type === 'Polygon') {
              // Beregn senterpunkt fra polygon
              const coords = feature.geometry.coordinates[0]
              if (!coords || coords.length === 0) return null
              lng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length
              lat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length
            } else if (feature.geometry?.type === 'MultiPolygon') {
              // Beregn senterpunkt fra første polygon i multipolygon
              const coords = feature.geometry.coordinates[0]?.[0]
              if (!coords || coords.length === 0) return null
              lng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length
              lat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length
            } else {
              return null
            }
            const props = feature.properties
            const lice = props?.avgAdultFemaleLice
            const status = props?.status
            const diseases = props?.diseases || []

            // BarentsWatch-stil: Grå sirkler med fargekant for sykdom
            const hasPD = diseases.includes('PANKREASSYKDOM')
            const hasILA = diseases.includes('INFEKSIOES_LAKSEANEMI')
            const hasBKD = diseases.includes('BAKTERIELL_NYRESYKE')
            const hasFrancisellose = diseases.includes('FRANCISELLOSE')
            const hasDisease = diseases.length > 0

            // Standard grå farge (som BarentsWatch)
            let fillColor = '#6B7280' // Grå
            let borderColor = '#4B5563'

            // Fargekant basert på sykdom (som BarentsWatch)
            if (hasILA) {
              fillColor = '#20B2AA'
              borderColor = '#178a82'
            } else if (hasPD) {
              fillColor = '#7B68EE'
              borderColor = '#5a4fcf'
            } else if (hasBKD || hasFrancisellose) {
              fillColor = '#FF6347'
              borderColor = '#dc4a30'
            } else if (props?.isFallow) {
              fillColor = '#9CA3AF'
              borderColor = '#6B7280'
            }

            const liceText = lice !== null && lice !== undefined
              ? lice.toFixed(2)
              : 'Ikke rapportert'

            // Format disease names for display
            const diseaseNames = {
              'PANKREASSYKDOM': 'Pankreassykdom (PD)',
              'INFEKSIOES_LAKSEANEMI': 'Infeksiøs lakseanemi (ILA)',
              'BAKTERIELL_NYRESYKE': 'Bakteriell nyresyke (BKD)',
              'FRANCISELLOSE': 'Francisellose'
            }

            return (
              <CircleMarker
                key={`point-${props?.loknr || idx}`}
                center={[lat, lng]}
                radius={getMarkerRadius(zoom, hasDisease)}
                pathOptions={{
                  fillColor: fillColor,
                  fillOpacity: 0.7,
                  color: borderColor,
                  weight: zoom <= 8 ? 1 : (hasDisease ? 3 : 2)
                }}
              >
                <Popup>
                  <div style={{ minWidth: '220px' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '15px' }}>
                      {props?.name || 'Ukjent lokalitet'}
                    </h3>
                    <div style={{ fontSize: '13px', lineHeight: 1.8 }}>
                      <p><strong>Lokalitetsnr:</strong> {props?.loknr || 'N/A'}</p>
                      <p><strong>Kommune:</strong> {props?.municipality || 'N/A'}</p>
                      <p><strong>Eier:</strong> {props?.owner || 'Ukjent'}</p>
                      <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #ddd' }} />
                      <p><strong>Lusenivå:</strong> <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{liceText}</span></p>
                      <p><strong>Status:</strong> {props?.status || 'UKJENT'}</p>
                      {props?.isFallow && <p style={{ color: '#444' }}><em>Brakklagt</em></p>}
                      {props?.hasReported === false && <p style={{ color: '#f44336' }}><em>Ikke rapportert denne uken</em></p>}
                      {hasDisease && (
                        <>
                          <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #ddd' }} />
                          <p style={{ fontWeight: 'bold', color: '#d32f2f' }}>Sykdomsstatus:</p>
                          {diseases.map((d, i) => (
                            <p key={i} style={{ margin: '2px 0', color: hasILA ? '#20B2AA' : hasPD ? '#7B68EE' : '#FF6347' }}>
                              • {diseaseNames[d] || d}
                            </p>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })

          // Bruk clustering når zoom er lav (mange markører synlige)
          if (zoom <= 9 && markers.length > 50) {
            return (
              <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={60}
                spiderfyOnMaxZoom={true}
                showCoverageOnHover={false}
                iconCreateFunction={(cluster) => {
                  const count = cluster.getChildCount()
                  let size = 'small'
                  let color = '#4CAF50'

                  if (count > 100) {
                    size = 'large'
                    color = '#1565c0'
                  } else if (count > 30) {
                    size = 'medium'
                    color = '#2196F3'
                  }

                  return L.divIcon({
                    html: `<div style="
                      background: ${color};
                      color: white;
                      border-radius: 50%;
                      width: ${size === 'large' ? 50 : size === 'medium' ? 40 : 30}px;
                      height: ${size === 'large' ? 50 : size === 'medium' ? 40 : 30}px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-weight: bold;
                      font-size: ${size === 'large' ? 14 : 12}px;
                      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    ">${count}</div>`,
                    className: 'custom-cluster-icon',
                    iconSize: L.point(size === 'large' ? 50 : size === 'medium' ? 40 : 30, size === 'large' ? 50 : size === 'medium' ? 40 : 30)
                  })
                }}
              >
                {markers}
              </MarkerClusterGroup>
            )
          }

          return markers
        })()}

      </MapContainer>

      {/* Uke-velger for historiske data */}
      <WeekSelector
        selectedYear={selectedYear}
        selectedWeek={selectedWeek}
        onYearChange={setSelectedYear}
        onWeekChange={setSelectedWeek}
      />
    </div>
  )
}
