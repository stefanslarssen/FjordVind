import React, { useState, useEffect } from 'react'
import InteractiveMap from '../components/InteractiveMap'
import { useLanguage } from '../contexts/LanguageContext'
import { fetchLocalitiesFromFiskeridir, extractCompanies } from '../services/publicApis'

/**
 * MapPage - Side for kartvisning av oppdrettslokaliteter
 */
export default function MapPage() {
  const { t, language } = useLanguage()
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState('')
  const [locations, setLocations] = useState([])
  const [allLocations, setAllLocations] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllData()
  }, [])

  useEffect(() => {
    if (selectedCompany) {
      // Filter locations by company
      const filtered = allLocations.filter(loc =>
        loc.owner?.toLowerCase().includes(selectedCompany.toLowerCase())
      )
      setLocations(filtered)
    } else {
      setLocations(allLocations)
    }
  }, [selectedCompany, allLocations])

  async function loadAllData() {
    try {
      // Fetch all localities from Fiskeridirektoratet WFS
      const data = await fetchLocalitiesFromFiskeridir()

      // Convert to location format for dropdown
      const allWFSLocations = (data.features || []).map(f => ({
        id: f.properties.loknr?.toString() || '',
        name: f.properties.name || 'Ukjent',
        loknr: f.properties.loknr,
        owner: f.properties.owner
      })).filter(loc => loc.id && loc.name)

      // Sort alphabetically
      allWFSLocations.sort((a, b) => (a.name || '').localeCompare(b.name || ''))

      setAllLocations(allWFSLocations)
      setLocations(allWFSLocations)

      // Extract companies from locality data
      const companiesList = extractCompanies(data)
      setCompanies(companiesList)

      setLoading(false)
    } catch (error) {
      console.error('Failed to load locations:', error)
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 80px)',
      padding: '0 16px 16px 16px'
    }}>
      {/* Kompakt header med filter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '12px 0',
        flexWrap: 'wrap',
        borderBottom: '1px solid var(--border)',
        marginBottom: '12px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px' }}>{t('map.title')}</h1>
        </div>

        {/* Selskap-filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="company-select" style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {t('map.selectCompany')}:
          </label>
          <select
            id="company-select"
            value={selectedCompany}
            onChange={(e) => {
              setSelectedCompany(e.target.value)
              setSelectedLocation(null)
            }}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              fontSize: '13px',
              minWidth: '200px',
              background: 'var(--bg)',
              color: 'var(--text)'
            }}
          >
            <option value="">{t('map.allCompanies')}</option>
            {companies.map((company) => (
              <option key={company.name} value={company.name}>
                {company.name} ({company.count})
              </option>
            ))}
          </select>
        </div>

        {/* Lokalitet-filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="location-select" style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {t('map.selectLocation')}:
          </label>
          <select
            id="location-select"
            value={selectedLocation || ''}
            onChange={(e) => setSelectedLocation(e.target.value || null)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              fontSize: '13px',
              minWidth: '220px',
              background: 'var(--bg)',
              color: 'var(--text)'
            }}
          >
            <option value="">{t('map.allLocations')}</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        {selectedCompany && (
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            {locations.length} {t('map.locations')}
          </span>
        )}

        {/* Mine anlegg knapp - helt til høyre */}
        <a
          href="/mine-anlegg"
          style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            backgroundColor: '#1e3a5f',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          Mine anlegg
        </a>
      </div>

      {/* Kartvisning - fyller resten av skjermen */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>{t('common.loading')}</div>
        ) : (
          <InteractiveMap selectedLocation={selectedLocation} selectedCompany={selectedCompany} />
        )}
      </div>
    </div>
  )
}
