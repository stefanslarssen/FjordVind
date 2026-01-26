import React, { useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const CompanyRegistration = ({ onSubmit, onCancel }) => {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    name: '',
    orgNumber: '',
    contactName: '',
    contactEmail: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          org_number: formData.orgNumber,
          contact_name: formData.contactName,
          contact_email: formData.contactEmail
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kunne ikke registrere selskap')
      }

      const data = await response.json()
      onSubmit?.(data.company)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      maxWidth: '500px',
      margin: '0 auto',
      padding: '24px',
      backgroundColor: 'var(--card-bg, white)',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ marginBottom: '24px', color: 'var(--text, #1e3a5f)' }}>
        Registrer ditt selskap
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

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
            Selskapsnavn *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border, #ddd)',
              fontSize: '14px',
              background: 'var(--bg, white)',
              color: 'var(--text, #333)'
            }}
            placeholder="F.eks. Fjordlaks AS"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
            Organisasjonsnummer
          </label>
          <input
            type="text"
            value={formData.orgNumber}
            onChange={(e) => setFormData({ ...formData, orgNumber: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border, #ddd)',
              fontSize: '14px',
              background: 'var(--bg, white)',
              color: 'var(--text, #333)'
            }}
            placeholder="912 345 678"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
            Kontaktperson
          </label>
          <input
            type="text"
            value={formData.contactName}
            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border, #ddd)',
              fontSize: '14px',
              background: 'var(--bg, white)',
              color: 'var(--text, #333)'
            }}
            placeholder="Ola Nordmann"
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
            E-post *
          </label>
          <input
            type="email"
            value={formData.contactEmail}
            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
            required
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border, #ddd)',
              fontSize: '14px',
              background: 'var(--bg, white)',
              color: 'var(--text, #333)'
            }}
            placeholder="ola@fjordlaks.no"
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '14px',
                backgroundColor: 'var(--bg, #f5f5f5)',
                color: 'var(--text, #333)',
                border: '1px solid var(--border, #ddd)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Avbryt
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              padding: '14px',
              backgroundColor: loading ? '#93c5fd' : '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Registrerer...' : 'Registrer selskap'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CompanyRegistration
