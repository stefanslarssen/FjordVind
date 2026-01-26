import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

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

      // Fetch all localities from BarentsWatch
      const localitiesResponse = await fetch(`${API_URL}/api/barentswatch/all-localities`)
      if (localitiesResponse.ok) {
        const data = await localitiesResponse.json()
        setAllLocalities(data.localities || [])
      }

      // Fetch all companies
      const companiesResponse = await fetch(`${API_URL}/api/companies`)
      if (companiesResponse.ok) {
        const data = await companiesResponse.json()
        setCompanies(data.companies || [])
      }

    } catch (e) {
      console.error('Failed to load data:', e)
    } finally {
      setLoading(false)
    }
  }

  async function loadCompanySites(companyName) {
    try {
      const encodedName = encodeURIComponent(companyName)
      const response = await fetch(`${API_URL}/api/companies/${encodedName}/sites`)
      if (response.ok) {
        const data = await response.json()
        setCompanySites(data.siteNumbers || [])
      }
    } catch (err) {
      console.error('Failed to load company sites:', err)
    }
  }

  async function loadLocalityDetails(localityName) {
    try {
      // Fetch cages for this locality
      const cagesResponse = await fetch(`${API_URL}/api/merds?locationId=${encodeURIComponent(localityName)}`)
      if (cagesResponse.ok) {
        const cagesData = await cagesResponse.json()
        setCages(cagesData)

        // Fetch lice counts for each cage
        const counts = []
        for (const cage of cagesData) {
          const countsResponse = await fetch(`${API_URL}/api/lice-counts?merdId=${cage.id}`)
          if (countsResponse.ok) {
            const countsData = await countsResponse.json()
            counts.push(...countsData.map(c => ({ ...c, cageName: cage.name })))
          }
        }
        setLiceCounts(counts)
      }
    } catch (err) {
      console.error('Failed to load locality details:', err)
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

        {cages.length === 0 ? (
          <div className="card">
            <p style={{ color: 'var(--muted)' }}>{t('locations.noCages')}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {cages.map(cage => {
              // Get lice counts for this cage
              const cageCounts = liceCounts.filter(c => c.cageName === cage.name)
              const latestCount = cageCounts.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
              const avgLice = latestCount?.adult_female_lice / latestCount?.fish_examined || 0
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
                    {latestCount && (
                      <span className={`badge ${level}`}>
                        {avgLice.toFixed(3)}
                      </span>
                    )}
                  </div>

                  {latestCount ? (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                        <div>
                          <div style={{ color: 'var(--muted)', fontSize: 12 }}>{t('locations.fishExamined')}</div>
                          <div style={{ fontWeight: 600 }}>{latestCount.fish_examined}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--muted)', fontSize: 12 }}>{t('locations.adultFemale')}</div>
                          <div style={{ fontWeight: 600 }}>{latestCount.adult_female_lice}</div>
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
                                  const avg = count.adult_female_lice / count.fish_examined
                                  const lvl = getStatusLevel(avg)
                                  return (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                      <td style={{ padding: '8px' }}>{new Date(count.date).toLocaleDateString(language === 'en' ? 'en-US' : 'nb-NO')}</td>
                                      <td style={{ textAlign: 'right', padding: '8px' }}>{count.fish_examined}</td>
                                      <td style={{ textAlign: 'right', padding: '8px' }}>{count.adult_female_lice}</td>
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
        gap: '24px',
        padding: '12px 0',
        borderBottom: '1px solid var(--border)',
        marginBottom: '20px'
      }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>{t('locations.title')}</h1>
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{t('locations.subtitle')}</span>
      </div>

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
                key={loc.localityNo}
                className="card"
                onClick={() => setSelectedLocality(loc.name)}
                style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18 }}>{loc.name}</h3>
                    <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
                      {loc.municipality}
                    </p>
                  </div>
                  <span className={`badge ${level}`}>
                    {avgLice !== null ? avgLice.toFixed(3) : 'N/A'}
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
                    <div style={{ fontWeight: 600 }}>{loc.localityNo}</div>
                  </div>
                </div>

                <div style={{ marginTop: 12, fontSize: 13, color: 'var(--primary)', fontWeight: 500 }}>
                  {t('locations.clickToSeeCages')}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
