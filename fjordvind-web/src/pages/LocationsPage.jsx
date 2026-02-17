import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { fetchLocations, fetchCages, fetchLiceCounts, createLocation, deleteLocation, createCage, deleteCage } from '../services/supabase'

export default function LocationsPage() {
  const { t, language } = useLanguage()
  const [allLocalities, setAllLocalities] = useState([])
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [companySites, setCompanySites] = useState([])
  const [selectedLocality, setSelectedLocality] = useState(null)
  const [cages, setCages] = useState([])
  const [liceCounts, setLiceCounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [companySearch, setCompanySearch] = useState('')
  const [localitySearch, setLocalitySearch] = useState('')

  // Form states
  const [showLocationForm, setShowLocationForm] = useState(false)
  const [showCageForm, setShowCageForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const [locationForm, setLocationForm] = useState({
    name: '',
    lokalitetsnummer: '',
    latitude: '',
    longitude: '',
    municipality: '',
    owner: ''
  })

  const [cageForm, setCageForm] = useState({
    name: '',
    merdId: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedCompany && selectedCompany !== 'all') {
      loadCompanySites(selectedCompany)
    } else {
      setCompanySites([])
    }
  }, [selectedCompany])

  useEffect(() => {
    if (selectedLocality) {
      loadLocalityDetails(selectedLocality)
    }
  }, [selectedLocality])

  async function loadData() {
    try {
      setLoading(true)

      // Fetch locations from Supabase
      const locations = await fetchLocations()
      setAllLocalities(locations.map(l => ({ name: l.name, id: l.id })))

      // Companies - for now we don't have a companies table, so leave empty
      setCompanies([])

    } catch (e) {
      console.error('Failed to load data:', e)
    } finally {
      setLoading(false)
    }
  }

  async function loadCompanySites(companyName) {
    // Not implemented with Supabase yet
    setCompanySites([])
  }

  async function loadLocalityDetails(localityName) {
    try {
      // Fetch cages for this locality
      const cagesData = await fetchCages(localityName)
      const transformedCages = cagesData.map(c => ({
        id: c.id,
        name: c.navn,
        merd_id: c.merd_id
      }))
      setCages(transformedCages)

      // Fetch lice counts for this locality
      const samples = await fetchLiceCounts({ locationId: localityName })
      const counts = samples.map(s => ({
        id: s.id,
        cageName: s.merds?.navn || 'Ukjent',
        date: s.dato,
        fish_examined: s.antall_fisk || 0,
        adult_female_lice: s.voksne_hunnlus || 0,
        observations: s.fish_observations || []
      }))
      setLiceCounts(counts)

    } catch (err) {
      console.error('Failed to load locality details:', err)
    }
  }

  async function handleCreateLocation(e) {
    e.preventDefault()
    setFormError(null)

    if (!locationForm.name.trim()) {
      setFormError('Navn er pakrevd')
      return
    }

    setSaving(true)
    try {
      await createLocation({
        name: locationForm.name.trim(),
        lokalitetsnummer: locationForm.lokalitetsnummer || null,
        latitude: locationForm.latitude ? parseFloat(locationForm.latitude) : null,
        longitude: locationForm.longitude ? parseFloat(locationForm.longitude) : null,
        municipality: locationForm.municipality || null,
        owner: locationForm.owner || null
      })

      setLocationForm({ name: '', lokalitetsnummer: '', latitude: '', longitude: '', municipality: '', owner: '' })
      setShowLocationForm(false)
      await loadData()
    } catch (error) {
      console.error('Failed to create location:', error)
      setFormError('Kunne ikke opprette lokasjon: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteLocation(id, name) {
    if (!confirm(`Er du sikker pa at du vil slette "${name}"? Dette vil ogsa slette alle merder og data knyttet til lokasjonen.`)) return

    try {
      await deleteLocation(id)
      await loadData()
    } catch (error) {
      console.error('Failed to delete location:', error)
      alert('Kunne ikke slette lokasjon: ' + error.message)
    }
  }

  async function handleCreateCage(e) {
    e.preventDefault()
    setFormError(null)

    if (!cageForm.name.trim()) {
      setFormError('Navn er pakrevd')
      return
    }

    setSaving(true)
    try {
      const locality = allLocalities.find(l => l.name === selectedLocality)
      await createCage({
        name: cageForm.name.trim(),
        merdId: cageForm.merdId || null,
        locationName: selectedLocality,
        locationId: locality?.id || null
      })

      setCageForm({ name: '', merdId: '' })
      setShowCageForm(false)
      await loadLocalityDetails(selectedLocality)
    } catch (error) {
      console.error('Failed to create cage:', error)
      setFormError('Kunne ikke opprette merd: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteCage(id, name) {
    if (!confirm(`Er du sikker pa at du vil slette "${name}"?`)) return

    try {
      await deleteCage(id)
      await loadLocalityDetails(selectedLocality)
    } catch (error) {
      console.error('Failed to delete cage:', error)
      alert('Kunne ikke slette merd: ' + error.message)
    }
  }

  // Filter companies based on search
  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  )

  // Filter localities based on selected company AND locality search
  let filteredLocalities = selectedCompany === 'all'
    ? allLocalities
    : allLocalities.filter(loc => companySites.includes(loc.localityNo))

  // Apply locality name search filter
  if (localitySearch.trim()) {
    filteredLocalities = filteredLocalities.filter(loc =>
      loc.name.toLowerCase().includes(localitySearch.toLowerCase()) ||
      loc.municipality?.toLowerCase().includes(localitySearch.toLowerCase())
    )
  }

  // Calculate statistics
  const stats = {
    total: filteredLocalities.length,
    danger: filteredLocalities.filter(l => l.avgAdultFemaleLice >= 0.10).length,
    warning: filteredLocalities.filter(l => l.avgAdultFemaleLice >= 0.08 && l.avgAdultFemaleLice < 0.10).length,
    ok: filteredLocalities.filter(l => l.avgAdultFemaleLice < 0.08 && l.avgAdultFemaleLice !== null).length,
    noReport: filteredLocalities.filter(l => !l.hasReported || l.avgAdultFemaleLice === null).length,
  }

  function getStatusLevel(avgLice) {
    if (!avgLice && avgLice !== 0) return 'unknown'
    if (avgLice >= 0.10) return 'danger'
    if (avgLice >= 0.08) return 'warn'
    return 'ok'
  }

  if (loading) {
    return <div>{t('common.loading')}</div>
  }

  // If locality is selected, show detailed view
  if (selectedLocality) {
    const locality = allLocalities.find(l => l.name === selectedLocality)

    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => {
              setSelectedLocality(null)
              setCages([])
              setLiceCounts([])
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontSize: 14,
              marginBottom: 16,
              padding: 0
            }}
          >
            {t('locations.backToOverview')}
          </button>
          <h1 className="page-title">{selectedLocality}</h1>
          <p className="page-subtitle">
            {locality?.municipality} • {t('locations.locationNo')}: {locality?.localityNo}
          </p>
        </div>

        {/* Add Cage Button and Form */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => setShowCageForm(!showCageForm)}
            style={{
              background: showCageForm ? '#6b7280' : '#0d9488',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {showCageForm ? 'Avbryt' : '+ Ny merd'}
          </button>
        </div>

        {showCageForm && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>Opprett ny merd</h3>

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

            <form onSubmit={handleCreateCage}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                    Navn *
                  </label>
                  <input
                    type="text"
                    value={cageForm.name}
                    onChange={(e) => setCageForm({ ...cageForm, name: e.target.value })}
                    placeholder="f.eks. Merd 1"
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
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                    Merd-ID (valgfritt)
                  </label>
                  <input
                    type="text"
                    value={cageForm.merdId}
                    onChange={(e) => setCageForm({ ...cageForm, merdId: e.target.value })}
                    placeholder="f.eks. M001"
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

              <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: '#0d9488',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: saving ? 'wait' : 'pointer',
                    opacity: saving ? 0.6 : 1
                  }}
                >
                  {saving ? 'Oppretter...' : 'Opprett merd'}
                </button>
              </div>
            </form>
          </div>
        )}

        {cages.length === 0 ? (
          <div className="card">
            <p style={{ color: 'var(--muted)' }}>
              Ingen merder registrert enna. Klikk "+ Ny merd" for a legge til.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {cages.map(cage => {
              // Get lice counts for this cage
              const cageCounts = liceCounts.filter(c => c.cageName === cage.name)
              const latestCount = cageCounts.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
              const avgLice = (latestCount?.fish_examined > 0) ? (latestCount.adult_female_lice / latestCount.fish_examined) : 0
              const level = getStatusLevel(avgLice)

              return (
                <div key={cage.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 18 }}>{t('locations.cage')}: {cage.name}</h3>
                      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
                        {cageCounts.length} {t('locations.registeredCounts')}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {latestCount && (
                        <span className={`badge ${level}`}>
                          {(avgLice || 0).toFixed(3)}
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteCage(cage.id, cage.name) }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                        title="Slett merd"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {latestCount ? (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                        <div>
                          <div style={{ color: 'var(--muted)', fontSize: 12 }}>{t('locations.fishExamined')}</div>
                          <div style={{ fontWeight: 600 }}>{latestCount.fish_examined || 0}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--muted)', fontSize: 12 }}>{t('locations.adultFemale')}</div>
                          <div style={{ fontWeight: 600 }}>{latestCount.adult_female_lice || 0}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--muted)', fontSize: 12 }}>{t('locations.lastCount')}</div>
                          <div style={{ fontWeight: 600 }}>{new Date(latestCount.date).toLocaleDateString(language === 'en' ? 'en-US' : 'nb-NO')}</div>
                        </div>
                      </div>

                      {/* Historical counts */}
                      {cageCounts.length > 1 && (
                        <details style={{ marginTop: 12 }}>
                          <summary style={{ cursor: 'pointer', color: 'var(--primary)', fontSize: 13 }}>
                            {t('locations.showHistory')} ({cageCounts.length} {t('locations.counts')})
                          </summary>
                          <div style={{ marginTop: 12, maxHeight: 300, overflowY: 'auto' }}>
                            <table style={{ width: '100%', fontSize: 12 }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                  <th style={{ textAlign: 'left', padding: '8px' }}>{t('locations.date')}</th>
                                  <th style={{ textAlign: 'right', padding: '8px' }}>{t('locations.fish')}</th>
                                  <th style={{ textAlign: 'right', padding: '8px' }}>{t('locations.adultFemale')}</th>
                                  <th style={{ textAlign: 'right', padding: '8px' }}>{t('locations.avg')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cageCounts.map((count, idx) => {
                                  const avg = count.fish_examined > 0 ? (count.adult_female_lice / count.fish_examined) : 0
                                  const lvl = getStatusLevel(avg)
                                  return (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                      <td style={{ padding: '8px' }}>{new Date(count.date).toLocaleDateString(language === 'en' ? 'en-US' : 'nb-NO')}</td>
                                      <td style={{ textAlign: 'right', padding: '8px' }}>{count.fish_examined || 0}</td>
                                      <td style={{ textAlign: 'right', padding: '8px' }}>{count.adult_female_lice || 0}</td>
                                      <td style={{ textAlign: 'right', padding: '8px' }}>
                                        <span className={`badge ${lvl}`} style={{ fontSize: 11 }}>
                                          {avg.toFixed(3)}
                                        </span>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      )}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--muted)', fontSize: 13 }}>{t('locations.noCountsRegistered')}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Default view - list of localities
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
          <h1 style={{ margin: 0, fontSize: '20px' }}>{t('locations.title')}</h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{t('locations.subtitle')}</span>
        </div>
        <button
          onClick={() => setShowLocationForm(!showLocationForm)}
          style={{
            background: showLocationForm ? '#6b7280' : '#0d9488',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          {showLocationForm ? 'Avbryt' : '+ Ny lokasjon'}
        </button>
      </div>

      {/* Create Location Form */}
      {showLocationForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>Opprett ny lokasjon</h3>

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

          <form onSubmit={handleCreateLocation}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                  Navn *
                </label>
                <input
                  type="text"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  placeholder="f.eks. Nordfjord Vest"
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
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                  Lokalitetsnummer
                </label>
                <input
                  type="text"
                  value={locationForm.lokalitetsnummer}
                  onChange={(e) => setLocationForm({ ...locationForm, lokalitetsnummer: e.target.value })}
                  placeholder="f.eks. 12345"
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

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                  Kommune
                </label>
                <input
                  type="text"
                  value={locationForm.municipality}
                  onChange={(e) => setLocationForm({ ...locationForm, municipality: e.target.value })}
                  placeholder="f.eks. Bergen"
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

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                  Eier/Selskap
                </label>
                <input
                  type="text"
                  value={locationForm.owner}
                  onChange={(e) => setLocationForm({ ...locationForm, owner: e.target.value })}
                  placeholder="f.eks. Nordlaks AS"
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

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                  Breddegrad (lat)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={locationForm.latitude}
                  onChange={(e) => setLocationForm({ ...locationForm, latitude: e.target.value })}
                  placeholder="f.eks. 60.3913"
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

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                  Lengdegrad (lon)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={locationForm.longitude}
                  onChange={(e) => setLocationForm({ ...locationForm, longitude: e.target.value })}
                  placeholder="f.eks. 5.3221"
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
                {saving ? 'Oppretter...' : 'Opprett lokasjon'}
              </button>
              <button
                type="button"
                onClick={() => setShowLocationForm(false)}
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

      {/* Search and filter */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Locality name search - always visible */}
          <div style={{ flex: '1 1 300px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
              {t('locations.searchLocation')}
            </label>
            <input
              type="text"
              placeholder={t('locations.searchPlaceholder')}
              value={localitySearch}
              onChange={(e) => setLocalitySearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                fontSize: 14,
                background: 'var(--bg)',
                color: 'var(--text)'
              }}
            />
            {localitySearch && (
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {t('locations.showing')} {filteredLocalities.length} {t('locations.of')} {allLocalities.length} {t('locations.localities')}
              </p>
            )}
          </div>

          {/* Company filter - only show if companies are available */}
          {companies.length > 0 && (
            <div style={{ flex: '1 1 300px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
                {t('locations.filterByCompany')}
              </label>
              <input
                type="text"
                placeholder={t('locations.companyPlaceholder')}
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: 14,
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  marginBottom: 8
                }}
              />
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                size={6}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: 13,
                  background: 'var(--bg)',
                  color: 'var(--text)'
                }}
              >
                <option value="all">{t('locations.allCompanies')} ({allLocalities.length} {t('locations.localities')})</option>
                {filteredCompanies.map(company => (
                  <option key={company.name} value={company.name}>
                    {company.name}
                  </option>
                ))}
              </select>
              {companySearch && (
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  {t('locations.showing')} {filteredCompanies.length} {t('locations.showingCompanies')}
                </p>
              )}
            </div>
          )}

          {/* Stats summary */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{stats.total}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('locations.total')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#f44336' }}>{stats.danger}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('locations.danger')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#ff9800' }}>{stats.warning}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('locations.warning')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#4CAF50' }}>{stats.ok}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('locations.ok')}</div>
            </div>
          </div>
        </div>
      </div>

      {filteredLocalities.length === 0 ? (
        <div className="card">
          <p style={{ color: 'var(--muted)' }}>
            {selectedCompany === 'all'
              ? t('locations.noLocations')
              : `${t('locations.noLocationsFor')} ${selectedCompany}`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {filteredLocalities.map(loc => {
            const avgLice = loc.avgAdultFemaleLice
            const level = getStatusLevel(avgLice)

            return (
              <div
                key={loc.id || loc.localityNo}
                className="card"
                style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', position: 'relative' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteLocation(loc.id, loc.name) }}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '4px',
                    opacity: 0.5,
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                  title="Slett lokasjon"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  </svg>
                </button>

                <div onClick={() => setSelectedLocality(loc.name)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingRight: '24px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 18 }}>{loc.name}</h3>
                      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
                        {loc.municipality}
                      </p>
                    </div>
                    <span className={`badge ${level}`}>
                      {avgLice !== null && avgLice !== undefined ? avgLice.toFixed(3) : 'N/A'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ color: 'var(--muted)', fontSize: 12 }}>{t('locations.status')}</div>
                      <div style={{ fontWeight: 600 }}>
                        {loc.isFallow ? `🛑 ${t('locations.fallow')}` : loc.hasReported ? `✅ ${t('locations.reported')}` : `⚠️ ${t('locations.notReported')}`}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--muted)', fontSize: 12 }}>{t('locations.locationNo')}</div>
                      <div style={{ fontWeight: 600 }}>{loc.localityNo || loc.id}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, fontSize: 13, color: 'var(--primary)', fontWeight: 500 }}>
                    {t('locations.clickToSeeCages')}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
