import { useState, useEffect, useRef } from 'react'

/**
 * MapSearch - Søkefelt for lokaliteter på kartet
 * Med debouncing for bedre ytelse
 */
export default function MapSearch({ localities, onSelect, localityBoundaries }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState([])
  const searchRef = useRef(null)

  // Debounce søketerm (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

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

  // Filter results based on debounced search term
  useEffect(() => {
    if (debouncedTerm.length < 2) {
      setResults([])
      return
    }

    const term = debouncedTerm.toLowerCase()
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
  }, [debouncedTerm, localityBoundaries])

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
      left: '50%',
      transform: 'translateX(-50%)',
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
        aria-label="Søk etter lokalitet"
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
