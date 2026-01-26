import { useState, useEffect } from 'react'
import { fetchLiceCounts, fetchLocations, updateSample, deleteSample } from '../services/supabase'
import { useLanguage } from '../contexts/LanguageContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function HistoryPage() {
  const { t } = useLanguage()
  const [counts, setCounts] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    locationId: '',
    fromDate: '',
    toDate: '',
  })

  // Edit modal state
  const [editingCount, setEditingCount] = useState(null)
  const [editForm, setEditForm] = useState({
    date: '',
    fish_examined: 0,
    mobile_lice: 0,
    attached_lice: 0,
    adult_female_lice: 0,
    notes: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Image viewer state
  const [viewingImages, setViewingImages] = useState(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  useEffect(() => {
    loadLocations()
    loadCounts()
  }, [])

  async function loadLocations() {
    try {
      const data = await fetchLocations()
      setLocations(data)
    } catch (e) {
      console.error('Failed to load locations:', e)
    }
  }

  async function loadCounts() {
    setLoading(true)
    try {
      const data = await fetchLiceCounts(filters)
      setCounts(data)
    } catch (e) {
      console.error('Failed to load counts:', e)
    } finally {
      setLoading(false)
    }
  }

  function handleFilterChange(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  function applyFilters() {
    loadCounts()
  }

  function exportCsv() {
    const header = ['date', 'location', 'cage', 'fish_examined', 'mobile', 'attached', 'adult_female', 'avg_adult_female']
    const rows = counts.map(c => {
      const avgAdultFemale = c.fish_examined > 0
        ? (c.adult_female_lice / c.fish_examined).toFixed(3)
        : '0'
      return [
        c.date,
        c.location_name,
        c.cage_id,
        c.fish_examined,
        c.mobile_lice,
        c.attached_lice,
        c.adult_female_lice,
        avgAdultFemale,
      ].map(v => `"${v}"`).join(',')
    })

    const csv = [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lusetellinger-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function openEditModal(count) {
    setEditingCount(count)
    setEditForm({
      date: count.date?.slice(0, 10) || '',
      fish_examined: count.fish_examined || 0,
      mobile_lice: count.mobile_lice || 0,
      attached_lice: count.attached_lice || 0,
      adult_female_lice: count.adult_female_lice || 0,
      notes: count.notes || ''
    })
    setSaveError('')
  }

  function closeEditModal() {
    setEditingCount(null)
    setEditForm({
      date: '',
      fish_examined: 0,
      mobile_lice: 0,
      attached_lice: 0,
      adult_female_lice: 0,
      notes: ''
    })
    setSaveError('')
  }

  async function handleSaveEdit() {
    if (!editingCount) return

    setIsSaving(true)
    setSaveError('')

    try {
      // Convert form data to observations format expected by API
      const observations = []
      const fishCount = editForm.fish_examined || 1

      // Distribute lice counts evenly across fish
      const avgAdultPerFish = Math.round(editForm.adult_female_lice / fishCount)
      const avgMobilePerFish = Math.round(editForm.mobile_lice / fishCount)
      const avgAttachedPerFish = Math.round(editForm.attached_lice / fishCount)

      for (let i = 0; i < fishCount; i++) {
        observations.push({
          fishId: String(i + 1),
          voksneHunnlus: i === 0
            ? editForm.adult_female_lice - (avgAdultPerFish * (fishCount - 1))
            : avgAdultPerFish,
          bevegeligeLus: i === 0
            ? editForm.mobile_lice - (avgMobilePerFish * (fishCount - 1))
            : avgMobilePerFish,
          fastsittendeLus: i === 0
            ? editForm.attached_lice - (avgAttachedPerFish * (fishCount - 1))
            : avgAttachedPerFish
        })
      }

      await updateSample(editingCount.id, {
        dato: editForm.date,
        notat: editForm.notes,
        observations
      })

      // Reload counts and close modal
      await loadCounts()
      closeEditModal()
    } catch (error) {
      setSaveError(error.message || t('history.couldNotSave'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id) {
    setIsDeleting(true)
    try {
      await deleteSample(id)
      await loadCounts()
      setDeletingId(null)
    } catch (error) {
      console.error('Failed to delete:', error)
      alert(t('history.couldNotDelete') + ': ' + error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text)',
    fontSize: '14px',
    boxSizing: 'border-box'
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    fontSize: '14px'
  }

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
        <h1 style={{ margin: 0, fontSize: '20px' }}>{t('history.title')}</h1>
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{t('history.subtitle')}</span>
      </div>

      <div className="filter-row">
        <select
          value={filters.locationId}
          onChange={e => handleFilterChange('locationId', e.target.value)}
        >
          <option value="">{t('history.allLocations')}</option>
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.fromDate}
          onChange={e => handleFilterChange('fromDate', e.target.value)}
        />
        <input
          type="date"
          value={filters.toDate}
          onChange={e => handleFilterChange('toDate', e.target.value)}
        />
        <button className="btn btn-primary" onClick={applyFilters}>{t('history.filter')}</button>
        <button className="btn" style={{ background: 'var(--panel)', color: 'var(--text)' }} onClick={exportCsv}>
          {t('history.exportCsv')}
        </button>
      </div>

      <div className="card">
        {loading ? (
          <p>{t('history.loading')}</p>
        ) : counts.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>{t('history.noRecords')}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('history.date')}</th>
                <th>{t('history.location')}</th>
                <th>{t('history.cage')}</th>
                <th>{t('history.fish')}</th>
                <th>{t('history.mobile')}</th>
                <th>{t('history.attached')}</th>
                <th>{t('history.adultFemale')}</th>
                <th>{t('history.avg')}</th>
                <th>{t('history.images')}</th>
                <th style={{ width: '100px' }}>{t('history.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {counts.map(c => {
                const avgAdultFemale = c.fish_examined > 0
                  ? c.adult_female_lice / c.fish_examined
                  : 0
                const level = avgAdultFemale >= 0.10
                  ? 'danger'
                  : avgAdultFemale >= 0.08
                    ? 'warn'
                    : 'ok'
                return (
                  <tr key={c.id}>
                    <td>{c.date?.slice(0, 10)}</td>
                    <td>{c.location_name}</td>
                    <td>{c.cage_id}</td>
                    <td>{c.fish_examined}</td>
                    <td>{c.mobile_lice}</td>
                    <td>{c.attached_lice}</td>
                    <td>{c.adult_female_lice}</td>
                    <td>
                      <span className={`badge ${level}`}>
                        {avgAdultFemale.toFixed(3)}
                      </span>
                    </td>
                    <td>
                      {c.images && c.images.length > 0 ? (
                        <button
                          onClick={() => {
                            setViewingImages(c.images)
                            setSelectedImageIndex(0)
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg)',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21,15 16,10 5,21"/>
                          </svg>
                          {c.images.length}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>-</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => openEditModal(c)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg)',
                            color: 'var(--text)',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                          title={t('history.edit')}
                        >
                          {t('history.edit')}
                        </button>
                        <button
                          onClick={() => setDeletingId(c.id)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                          title={t('history.delete')}
                        >
                          {t('history.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editingCount && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={closeEditModal}
        >
          <div
            style={{
              background: 'var(--panel)',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '24px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: 'var(--text)' }}>{t('history.editCount')}</h2>
              <button
                onClick={closeEditModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                x
              </button>
            </div>

            <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg)', borderRadius: '8px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {editingCount.location_name} - {editingCount.cage_id}
              </div>
            </div>

            {saveError && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                {saveError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>{t('history.date')}</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>{t('history.fishCount')}</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.fish_examined}
                    onChange={(e) => setEditForm({ ...editForm, fish_examined: parseInt(e.target.value) || 0 })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t('history.adultFemaleLice')}</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.adult_female_lice}
                    onChange={(e) => setEditForm({ ...editForm, adult_female_lice: parseInt(e.target.value) || 0 })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>{t('history.mobileLice')}</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.mobile_lice}
                    onChange={(e) => setEditForm({ ...editForm, mobile_lice: parseInt(e.target.value) || 0 })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t('history.attachedLice')}</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.attached_lice}
                    onChange={(e) => setEditForm({ ...editForm, attached_lice: parseInt(e.target.value) || 0 })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>{t('history.notes')}</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                  placeholder={t('history.optionalNotes')}
                />
              </div>

              {/* Preview */}
              <div style={{
                padding: '12px',
                background: 'var(--bg)',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{t('history.avgAdultFemale')}</span>
                <span style={{
                  fontWeight: '600',
                  fontSize: '16px',
                  color: editForm.fish_examined > 0 && (editForm.adult_female_lice / editForm.fish_examined) >= 0.5
                    ? '#ef4444'
                    : editForm.fish_examined > 0 && (editForm.adult_female_lice / editForm.fish_examined) >= 0.2
                      ? '#eab308'
                      : '#22c55e'
                }}>
                  {editForm.fish_examined > 0
                    ? (editForm.adult_female_lice / editForm.fish_examined).toFixed(3)
                    : '0.000'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={closeEditModal}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {t('history.cancel')}
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '12px' }}
                >
                  {isSaving ? t('history.saving') : t('history.saveChanges')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {viewingImages && viewingImages.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setViewingImages(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setViewingImages(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: 'white',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            X
          </button>

          {/* Main image */}
          <div
            style={{
              maxWidth: '90%',
              maxHeight: '70vh',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`${API_URL}${viewingImages[selectedImageIndex]?.url || viewingImages[selectedImageIndex]}`}
              alt={`${t('history.image')} ${selectedImageIndex + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                borderRadius: '8px',
                objectFit: 'contain'
              }}
            />

            {/* Navigation arrows */}
            {viewingImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImageIndex((prev) => (prev - 1 + viewingImages.length) % viewingImages.length)
                  }}
                  style={{
                    position: 'absolute',
                    left: '-60px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    color: 'white',
                    fontSize: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {'<'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImageIndex((prev) => (prev + 1) % viewingImages.length)
                  }}
                  style={{
                    position: 'absolute',
                    right: '-60px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    color: 'white',
                    fontSize: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {'>'}
                </button>
              </>
            )}
          </div>

          {/* Image counter */}
          <div style={{
            marginTop: '16px',
            color: 'white',
            fontSize: '14px'
          }}>
            {selectedImageIndex + 1} / {viewingImages.length}
          </div>

          {/* Thumbnail strip */}
          {viewingImages.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginTop: '16px',
                overflowX: 'auto',
                maxWidth: '90%',
                padding: '8px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {viewingImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '4px',
                    border: idx === selectedImageIndex ? '2px solid white' : '2px solid transparent',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    padding: 0,
                    background: 'transparent',
                    flexShrink: 0
                  }}
                >
                  <img
                    src={`${API_URL}${img?.url || img}`}
                    alt={`${t('history.image')} ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setDeletingId(null)}
        >
          <div
            style={{
              background: 'var(--panel)',
              borderRadius: '12px',
              maxWidth: '400px',
              width: '100%',
              padding: '24px',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '24px',
              color: '#ef4444'
            }}>
              !
            </div>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text)' }}>{t('history.deleteCount')}</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 24px 0', fontSize: '14px' }}>
              {t('history.confirmDelete')}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDeletingId(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {t('history.cancel')}
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: isDeleting ? 0.7 : 1
                }}
              >
                {isDeleting ? t('history.deleting') : t('history.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
