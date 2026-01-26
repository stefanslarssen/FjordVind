import React, { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const LocalitySearch = ({ onSelectLocality, companyId }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [addingLocality, setAddingLocality] = useState(null)

  const searchLocalities = async () => {
    if (searchTerm.length < 2) {
      setError('Skriv minst 2 tegn for a soke')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${API_URL}/api/barentswatch/search?q=${encodeURIComponent(searchTerm)}`
      )

      if (!response.ok) {
        throw new Error('Kunne ikke soke etter lokaliteter')
      }

      const data = await response.json()
      setResults(data)

      if (data.length === 0) {
        setError('Ingen resultater funnet')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddLocality = async (locality) => {
    if (!companyId) {
      setError('Du ma velge et selskap forst')
      return
    }

    setAddingLocality(locality.localityNo)

    try {
      const response = await fetch(`${API_URL}/api/user-localities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          locality_no: locality.localityNo,
          name: locality.name,
          latitude: locality.latitude,
          longitude: locality.longitude,
          municipality: locality.municipality
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kunne ikke legge til lokalitet')
      }

      const data = await response.json()
      onSelectLocality?.(data.locality)

      // Fjern fra resultater
      setResults(results.filter(r => r.localityNo !== locality.localityNo))
    } catch (err) {
      setError(err.message)
    } finally {
      setAddingLocality(null)
    }
  }

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

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '24px',
      backgroundColor: 'var(--card-bg, white)',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ marginBottom: '24px', color: 'var(--text, #1e3a5f)' }}>
        Legg til anlegg
      </h2>

      {error && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchLocalities()}
          placeholder="Sok etter lokalitetsnavn eller nummer..."
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid var(--border, #ddd)',
            fontSize: '14px',
            background: 'var(--bg, white)',
            color: 'var(--text, #333)'
          }}
        />
        <button
          onClick={searchLocalities}
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: loading ? '#93c5fd' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          {loading ? 'Soker...' : 'Sok'}
        </button>
      </div>

      {/* Sokeresultater */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {results.map((locality) => (
          <div
            key={locality.localityNo}
            style={{
              padding: '16px',
              border: '2px solid var(--border, #e0e0e0)',
              borderRadius: '8px',
              backgroundColor: 'var(--bg, #fafafa)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--text, #1e3a5f)' }}>
                  {locality.name}
                </h3>
                <p style={{ margin: '4px 0', color: 'var(--muted, #666)', fontSize: '14px' }}>
                  <strong>Lokalitetsnr:</strong> {locality.localityNo}
                </p>
                <p style={{ margin: '4px 0', color: 'var(--muted, #666)', fontSize: '14px' }}>
                  <strong>Kommune:</strong> {locality.municipality}
                </p>
                <p style={{ margin: '4px 0', color: 'var(--muted, #666)', fontSize: '14px' }}>
                  <strong>Koordinater:</strong> {locality.latitude?.toFixed(4)}N, {locality.longitude?.toFixed(4)}E
                </p>
                {locality.avgAdultFemaleLice !== null && locality.avgAdultFemaleLice !== undefined && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                    <strong>Luseniva:</strong>{' '}
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: getStatusColor(locality.avgAdultFemaleLice),
                      color: 'white',
                      fontWeight: '600'
                    }}>
                      {locality.avgAdultFemaleLice.toFixed(2)} ({getStatusText(locality.avgAdultFemaleLice)})
                    </span>
                  </p>
                )}
                {locality.company && (
                  <p style={{ margin: '4px 0', color: 'var(--muted, #666)', fontSize: '13px' }}>
                    <strong>Registrert pa:</strong> {locality.company}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleAddLocality(locality)}
                disabled={addingLocality === locality.localityNo || !companyId}
                style={{
                  padding: '10px 20px',
                  backgroundColor: addingLocality === locality.localityNo ? '#9ca3af' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: addingLocality === locality.localityNo || !companyId ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  opacity: !companyId ? 0.5 : 1
                }}
              >
                {addingLocality === locality.localityNo ? 'Legger til...' : '+ Legg til'}
              </button>
            </div>
          </div>
        ))}

        {results.length === 0 && searchTerm && !loading && !error && (
          <p style={{ textAlign: 'center', color: 'var(--muted, #999)' }}>
            Ingen resultater funnet. Prov et annet sokeord.
          </p>
        )}
      </div>

      {!companyId && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: '8px',
          color: '#92400e',
          fontSize: '13px'
        }}>
          Du ma registrere et selskap for du kan legge til anlegg.
        </div>
      )}
    </div>
  )
}

export default LocalitySearch
