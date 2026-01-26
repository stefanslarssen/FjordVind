import React, { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import CompanyRegistration from '../components/company/CompanyRegistration'
import LocalitySearch from '../components/locality/LocalitySearch'
import UserMapView from '../components/map/UserMapView'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * MyFarmsPage - Side for a registrere og se egne anlegg
 * Brukeren kan:
 * 1. Registrere sitt selskap
 * 2. Soke etter og legge til anlegg fra BarentsWatch
 * 3. Se egne anlegg pa kartet med naboer
 */
export default function MyFarmsPage() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState('map') // 'map', 'register', 'add'
  const [company, setCompany] = useState(null)
  const [userLocalities, setUserLocalities] = useState([])
  const [loading, setLoading] = useState(true)

  // Last inn selskap og lokaliteter ved oppstart
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // Sjekk om det finnes et registrert selskap
      // For na, bruk localStorage for a lagre selskap-id
      const storedCompanyId = localStorage.getItem('fjordvind_company_id')

      if (storedCompanyId) {
        // Hent brukerens lokaliteter
        const response = await fetch(`${API_URL}/api/user-localities?company_id=${storedCompanyId}`)
        if (response.ok) {
          const data = await response.json()
          setUserLocalities(data.localities || [])
          setCompany({ id: storedCompanyId })
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompanyRegistered = (newCompany) => {
    setCompany(newCompany)
    localStorage.setItem('fjordvind_company_id', newCompany.id)
    setActiveTab('add')
  }

  const handleLocalityAdded = (locality) => {
    setUserLocalities([...userLocalities, locality])
    // Etter a ha lagt til et anlegg, vis kartet
    if (userLocalities.length === 0) {
      setActiveTab('map')
    }
  }

  const tabs = [
    { id: 'map', label: 'Kart', icon: '🗺️' },
    { id: 'add', label: 'Legg til anlegg', icon: '➕' },
    { id: 'register', label: company ? 'Mitt selskap' : 'Registrer selskap', icon: '🏢' },
  ]

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        Laster...
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 80px)',
      padding: '0 16px 16px 16px'
    }}>
      {/* Header med tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '12px 0',
        borderBottom: '1px solid var(--border)',
        marginBottom: '12px'
      }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>Mine anlegg</h1>

        <div style={{ display: 'flex', gap: '8px' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === tab.id ? '#1976d2' : 'var(--bg, #f5f5f5)',
                color: activeTab === tab.id ? 'white' : 'var(--text, #333)',
                fontWeight: activeTab === tab.id ? '600' : '400',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Status info */}
        <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--muted)' }}>
          {company ? (
            <span>{userLocalities.length} anlegg registrert</span>
          ) : (
            <span style={{ color: '#f59e0b' }}>Ikke registrert</span>
          )}
        </div>
      </div>

      {/* Innhold basert pa aktiv tab */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {activeTab === 'map' && (
          <>
            {userLocalities.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: '24px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '80px' }}>🤷‍♂️</div>
                <div>
                  <h2 style={{ margin: '0 0 8px 0', color: 'var(--text)' }}>
                    Ingen anlegg registrert
                  </h2>
                  <p style={{ margin: 0, color: 'var(--muted)', maxWidth: '400px' }}>
                    {company
                      ? 'Legg til dine anlegg for a se dem pa kartet sammen med naboer i omradet.'
                      : 'Registrer ditt selskap for a komme i gang.'}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab(company ? 'add' : 'register')}
                  style={{
                    padding: '14px 28px',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {company ? 'Legg til anlegg' : 'Registrer selskap'}
                </button>
              </div>
            ) : (
              <UserMapView
                userLocalities={userLocalities}
                companyId={company?.id}
              />
            )}
          </>
        )}

        {activeTab === 'add' && (
          <div style={{ padding: '24px 0' }}>
            {!company ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                backgroundColor: 'var(--bg)',
                borderRadius: '12px'
              }}>
                <h3 style={{ margin: '0 0 12px 0' }}>Du ma registrere et selskap forst</h3>
                <button
                  onClick={() => setActiveTab('register')}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Registrer selskap
                </button>
              </div>
            ) : (
              <>
                <LocalitySearch
                  onSelectLocality={handleLocalityAdded}
                  companyId={company.id}
                />

                {/* Liste over registrerte anlegg */}
                {userLocalities.length > 0 && (
                  <div style={{
                    marginTop: '32px',
                    maxWidth: '600px',
                    margin: '32px auto 0'
                  }}>
                    <h3 style={{ marginBottom: '16px' }}>Dine registrerte anlegg</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {userLocalities.map(loc => (
                        <div
                          key={loc.id}
                          style={{
                            padding: '12px 16px',
                            backgroundColor: 'var(--bg)',
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <strong>{loc.name}</strong>
                            <span style={{ marginLeft: '8px', color: 'var(--muted)', fontSize: '13px' }}>
                              #{loc.locality_no}
                            </span>
                          </div>
                          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                            {loc.municipality}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'register' && (
          <div style={{ padding: '24px 0' }}>
            <CompanyRegistration
              onSubmit={handleCompanyRegistered}
              onCancel={company ? () => setActiveTab('map') : undefined}
            />
          </div>
        )}
      </div>
    </div>
  )
}
