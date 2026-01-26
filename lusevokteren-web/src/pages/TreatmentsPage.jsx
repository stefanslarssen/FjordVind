import { useState, useEffect } from 'react'
import { useToast } from '../components/Toast'
import { validateForm, rules, formatApiError } from '../utils/validation'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function TreatmentsPage() {
  const toast = useToast()
  const [treatments, setTreatments] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [merds, setMerds] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('upcoming')

  // Modal states
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedRecommendation, setSelectedRecommendation] = useState(null)
  const [selectedTreatment, setSelectedTreatment] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [formErrors, setFormErrors] = useState({})

  // Form states
  const [planForm, setPlanForm] = useState({
    treatmentType: 'THERMOLICER',
    scheduledDate: '',
    scheduledTime: '',
    notes: ''
  })

  const [completeForm, setCompleteForm] = useState({
    liceAfter: '',
    mortalityPercent: '',
    costNok: '',
    notes: ''
  })

  const [newForm, setNewForm] = useState({
    merdId: '',
    treatmentType: 'THERMOLICER',
    scheduledDate: '',
    scheduledTime: '',
    liceBefore: '',
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [treatmentsRes, recommendationsRes, merdsRes] = await Promise.all([
        fetch(`${API_URL}/api/treatments`),
        fetch(`${API_URL}/api/treatments/recommendations`),
        fetch(`${API_URL}/api/merds`)
      ])

      if (treatmentsRes.ok) {
        const data = await treatmentsRes.json()
        setTreatments(data.treatments || [])
      }

      if (recommendationsRes.ok) {
        const data = await recommendationsRes.json()
        setRecommendations(data.recommendations || [])
      }

      if (merdsRes.ok) {
        const data = await merdsRes.json()
        setMerds(data || [])
      }
    } catch (error) {
      console.error('Failed to load treatments:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createTreatment(data) {
    setIsSaving(true)
    setSaveError('')
    setFormErrors({})
    try {
      const response = await fetch(`${API_URL}/api/treatments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle validation errors from backend
        if (result.error?.errors && Array.isArray(result.error.errors)) {
          const errorMessage = result.error.errors.join('. ')
          setSaveError(errorMessage)
          toast.error(errorMessage, { title: 'Valideringsfeil' })
        } else {
          const errorMessage = result.error?.message || 'Kunne ikke opprette behandling'
          setSaveError(errorMessage)
          toast.error(errorMessage)
        }
        return false
      }

      toast.success('Behandling opprettet', { title: 'Suksess' })
      await loadData()
      return true
    } catch (error) {
      const errorMessage = formatApiError(error)
      setSaveError(errorMessage)
      toast.error(errorMessage)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function updateTreatment(id, data) {
    setIsSaving(true)
    setSaveError('')
    setFormErrors({})
    try {
      const response = await fetch(`${API_URL}/api/treatments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle validation errors from backend
        if (result.error?.errors && Array.isArray(result.error.errors)) {
          const errorMessage = result.error.errors.join('. ')
          setSaveError(errorMessage)
          toast.error(errorMessage, { title: 'Valideringsfeil' })
        } else {
          const errorMessage = result.error?.message || 'Kunne ikke oppdatere behandling'
          setSaveError(errorMessage)
          toast.error(errorMessage)
        }
        return false
      }

      toast.success('Behandling oppdatert', { title: 'Suksess' })
      await loadData()
      return true
    } catch (error) {
      const errorMessage = formatApiError(error)
      setSaveError(errorMessage)
      toast.error(errorMessage)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function handlePlanFromRecommendation() {
    if (!selectedRecommendation) return

    // Client-side validation
    if (!planForm.scheduledDate) {
      toast.warning('Velg en dato for behandlingen', { title: 'Mangler dato' })
      setFormErrors({ scheduledDate: 'Dato er påkrevd' })
      return
    }

    setFormErrors({})
    const success = await createTreatment({
      merdId: selectedRecommendation.merdId,
      treatmentType: planForm.treatmentType || selectedRecommendation.recommendedTreatment,
      scheduledDate: planForm.scheduledDate,
      scheduledTime: planForm.scheduledTime || null,
      liceBefore: selectedRecommendation.currentLice,
      notes: planForm.notes,
      recommendationSource: 'AI',
      urgency: selectedRecommendation.urgency
    })

    if (success) {
      setShowPlanModal(false)
      setSelectedRecommendation(null)
      setPlanForm({ treatmentType: 'THERMOLICER', scheduledDate: '', scheduledTime: '', notes: '' })
    }
  }

  async function handleCompleteTreatment() {
    if (!selectedTreatment) return

    const effectivenessPercent = selectedTreatment.liceBefore && completeForm.liceAfter
      ? ((selectedTreatment.liceBefore - parseFloat(completeForm.liceAfter)) / selectedTreatment.liceBefore * 100)
      : null

    const success = await updateTreatment(selectedTreatment.id, {
      status: 'COMPLETED',
      completedDate: new Date().toISOString().split('T')[0],
      liceAfter: completeForm.liceAfter ? parseFloat(completeForm.liceAfter) : null,
      effectivenessPercent,
      mortalityPercent: completeForm.mortalityPercent ? parseFloat(completeForm.mortalityPercent) : null,
      costNok: completeForm.costNok ? parseFloat(completeForm.costNok) : null,
      notes: completeForm.notes || selectedTreatment.notes
    })

    if (success) {
      setShowCompleteModal(false)
      setSelectedTreatment(null)
      setCompleteForm({ liceAfter: '', mortalityPercent: '', costNok: '', notes: '' })
    }
  }

  async function handleCreateNew() {
    // Client-side validation
    const validationSchema = {
      merdId: [rules.required],
      treatmentType: [rules.required],
      scheduledDate: [rules.required, rules.date]
    }

    const { valid, errors } = validateForm({
      merdId: newForm.merdId,
      treatmentType: newForm.treatmentType,
      scheduledDate: newForm.scheduledDate
    }, validationSchema)

    if (!valid) {
      setFormErrors(errors)
      const errorMessages = Object.values(errors).filter(Boolean)
      toast.warning(errorMessages.join('. '), { title: 'Fyll ut påkrevde felt' })
      return
    }

    setFormErrors({})
    const success = await createTreatment({
      merdId: newForm.merdId,
      treatmentType: newForm.treatmentType,
      scheduledDate: newForm.scheduledDate,
      scheduledTime: newForm.scheduledTime || null,
      liceBefore: newForm.liceBefore ? parseFloat(newForm.liceBefore) : null,
      notes: newForm.notes,
      recommendationSource: 'MANUAL',
      urgency: 'MEDIUM'
    })

    if (success) {
      setShowNewModal(false)
      setNewForm({ merdId: '', treatmentType: 'THERMOLICER', scheduledDate: '', scheduledTime: '', liceBefore: '', notes: '' })
    }
  }

  async function handleCancelTreatment(treatment) {
    if (!confirm(`Er du sikker på at du vil avlyse behandlingen for ${treatment.merdName}?`)) return
    const success = await updateTreatment(treatment.id, { status: 'CANCELLED' })
    if (success) {
      toast.info(`Behandling for ${treatment.merdName} ble avlyst`)
    }
  }

  const filteredTreatments = filter === 'upcoming'
    ? treatments.filter(t => ['PLANNED', 'CONFIRMED'].includes(t.status))
    : filter === 'completed'
      ? treatments.filter(t => t.status === 'COMPLETED')
      : treatments

  const getStatusColor = (status) => {
    switch (status) {
      case 'PLANNED': return '#6366f1'
      case 'CONFIRMED': return '#3b82f6'
      case 'IN_PROGRESS': return '#f59e0b'
      case 'COMPLETED': return '#22c55e'
      case 'CANCELLED': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PLANNED': return 'Planlagt'
      case 'CONFIRMED': return 'Bekreftet'
      case 'IN_PROGRESS': return 'Pågår'
      case 'COMPLETED': return 'Fullført'
      case 'CANCELLED': return 'Kansellert'
      default: return status
    }
  }

  const getTreatmentTypeLabel = (type) => {
    switch (type) {
      case 'THERMOLICER': return 'Thermolicer'
      case 'HYDROLICER': return 'Hydrolicer'
      case 'OPTILICER': return 'Optilicer'
      case 'LUSESKJORT': return 'Luseskjørt'
      case 'RENSEFISK': return 'Rensefisk'
      case 'MEDIKAMENTELL': return 'Medikamentell'
      case 'FERSKVANN': return 'Ferskvann'
      case 'LASER': return 'Laser'
      case 'ANNET': return 'Annet'
      default: return type
    }
  }

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'IMMEDIATE': return '#dc2626'
      case 'HIGH': return '#f59e0b'
      case 'MEDIUM': return '#eab308'
      case 'LOW': return '#22c55e'
      default: return '#6b7280'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border, #ddd)',
    background: 'var(--bg, white)',
    color: 'var(--text, #333)',
    fontSize: '14px',
    boxSizing: 'border-box'
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '500',
    fontSize: '14px',
    color: 'var(--text, #333)'
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Laster behandlinger...</div>
  }

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
          <h1 style={{ margin: 0, fontSize: '20px' }}>Behandlingsplanlegging</h1>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Planlegg og spor behandlinger basert på AI-anbefalinger</span>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          + Ny behandling
        </button>
      </div>

      {/* AI Recommendations Section */}
      {recommendations.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #1a2d45 100%)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '25px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ fontSize: '16px', color: '#5fa9bd', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              AI Behandlingsanbefalinger
              <span style={{
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '700',
                color: 'white'
              }}>
                AI-DREVET
              </span>
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '10px',
                  padding: '15px',
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr 150px 100px 130px',
                  alignItems: 'center',
                  gap: '15px'
                }}
              >
                <div style={{ fontWeight: '600', color: '#5fa9bd' }}>{rec.merdName}</div>
                <div style={{ color: '#ccc', fontSize: '13px' }}>
                  Lusenivå {rec.currentLice?.toFixed(2)} → <strong style={{ color: rec.predictedLice >= 0.5 ? '#ef4444' : '#fff' }}>
                    {rec.predictedLice?.toFixed(2)}
                  </strong> om 7 dager
                </div>
                <div style={{ color: '#8ba3b5', fontSize: '12px' }}>
                  Anbefalt:
                  <div style={{ color: '#fff', fontWeight: '500' }}>{getTreatmentTypeLabel(rec.recommendedTreatment)}</div>
                </div>
                <div style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  background: `${getUrgencyColor(rec.urgency)}20`,
                  color: getUrgencyColor(rec.urgency),
                  fontSize: '11px',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  {rec.urgencyText}
                </div>
                <button
                  onClick={() => {
                    setSelectedRecommendation(rec)
                    setPlanForm({
                      treatmentType: rec.recommendedTreatment,
                      scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      scheduledTime: '08:00',
                      notes: `AI-anbefalt behandling. Forventet lusenivå: ${rec.predictedLice?.toFixed(2)}`
                    })
                    setShowPlanModal(true)
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#2d9bc4',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  Planlegg
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        {[
          { key: 'upcoming', label: 'Kommende', count: treatments.filter(t => ['PLANNED', 'CONFIRMED'].includes(t.status)).length },
          { key: 'all', label: 'Alle', count: treatments.length },
          { key: 'completed', label: 'Fullførte', count: treatments.filter(t => t.status === 'COMPLETED').length }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: filter === f.key ? 'none' : '1px solid var(--border, #ddd)',
              background: filter === f.key ? '#2d9bc4' : 'var(--panel, white)',
              color: filter === f.key ? 'white' : 'var(--text, #333)',
              cursor: 'pointer',
              fontWeight: filter === f.key ? '600' : '400',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {f.label}
            <span style={{
              background: filter === f.key ? 'rgba(255,255,255,0.2)' : 'var(--bg, #e5e7eb)',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '12px'
            }}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Treatments Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Merd</th>
              <th>Type</th>
              <th style={{ textAlign: 'center' }}>Dato</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Lus før</th>
              <th style={{ textAlign: 'center' }}>Lus etter</th>
              <th style={{ textAlign: 'center' }}>Effektivitet</th>
              <th style={{ textAlign: 'center' }}>Handlinger</th>
            </tr>
          </thead>
          <tbody>
            {filteredTreatments.map(treatment => (
              <tr key={treatment.id}>
                <td>
                  <div style={{ fontWeight: '500' }}>{treatment.merdName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted, #666)' }}>{treatment.locality}</div>
                </td>
                <td>
                  {getTreatmentTypeLabel(treatment.treatmentType)}
                  {treatment.recommendationSource === 'AI' && (
                    <span style={{
                      marginLeft: '8px',
                      background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '9px',
                      fontWeight: '600',
                      color: 'white'
                    }}>
                      AI
                    </span>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>{formatDate(treatment.scheduledDate)}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`badge ${treatment.status === 'COMPLETED' ? 'ok' : treatment.status === 'CANCELLED' ? '' : 'warn'}`}>
                    {getStatusLabel(treatment.status)}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>{treatment.liceBefore?.toFixed(2) || '-'}</td>
                <td style={{ textAlign: 'center', color: treatment.liceAfter < treatment.liceBefore ? '#22c55e' : 'inherit' }}>
                  {treatment.liceAfter?.toFixed(2) || '-'}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {treatment.effectivenessPercent ? (
                    <span style={{ color: treatment.effectivenessPercent >= 80 ? '#22c55e' : '#f59e0b', fontWeight: '600' }}>
                      {treatment.effectivenessPercent.toFixed(0)}%
                    </span>
                  ) : '-'}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {['PLANNED', 'CONFIRMED'].includes(treatment.status) && (
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        onClick={() => {
                          setSelectedTreatment(treatment)
                          setCompleteForm({ liceAfter: '', mortalityPercent: '', costNok: '', notes: treatment.notes || '' })
                          setShowCompleteModal(true)
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          border: 'none',
                          background: '#22c55e',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: '500'
                        }}
                      >
                        Fullfør
                      </button>
                      <button
                        onClick={() => handleCancelTreatment(treatment)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          border: '1px solid var(--border, #ddd)',
                          background: 'transparent',
                          color: 'var(--muted, #666)',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        Avlys
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTreatments.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted, #666)' }}>
            Ingen behandlinger funnet
          </div>
        )}
      </div>

      {/* Treatment Statistics */}
      {treatments.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>Behandlingsstatistikk</h2>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Totalt behandlinger</div>
              <div className="stat-value">{treatments.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Fullført</div>
              <div className="stat-value ok">{treatments.filter(t => t.status === 'COMPLETED').length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Planlagt</div>
              <div className="stat-value warn">{treatments.filter(t => ['PLANNED', 'CONFIRMED'].includes(t.status)).length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Snitt effektivitet</div>
              <div className="stat-value ok">
                {(() => {
                  const completed = treatments.filter(t => t.effectivenessPercent)
                  if (completed.length === 0) return '-'
                  const avg = completed.reduce((sum, t) => sum + t.effectivenessPercent, 0) / completed.length
                  return `${avg.toFixed(0)}%`
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan from Recommendation Modal */}
      {showPlanModal && selectedRecommendation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowPlanModal(false)}>
          <div style={{
            background: 'var(--panel, white)',
            borderRadius: '12px',
            padding: '30px',
            width: '500px',
            maxWidth: '90%'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: 'var(--text, #333)' }}>
              Planlegg behandling for {selectedRecommendation.merdName}
            </h2>

            {saveError && (
              <div style={{ padding: '10px', background: '#fef2f2', color: '#dc2626', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
                {saveError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Behandlingstype</label>
                <select value={planForm.treatmentType} onChange={e => setPlanForm({ ...planForm, treatmentType: e.target.value })} style={inputStyle}>
                  <option value="THERMOLICER">Thermolicer</option>
                  <option value="HYDROLICER">Hydrolicer</option>
                  <option value="OPTILICER">Optilicer</option>
                  <option value="LUSESKJORT">Luseskjørt</option>
                  <option value="RENSEFISK">Rensefisk</option>
                  <option value="MEDIKAMENTELL">Medikamentell</option>
                  <option value="FERSKVANN">Ferskvann</option>
                  <option value="LASER">Laser</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Dato</label>
                  <input type="date" value={planForm.scheduledDate} onChange={e => setPlanForm({ ...planForm, scheduledDate: e.target.value })} style={inputStyle} required />
                </div>
                <div>
                  <label style={labelStyle}>Tidspunkt</label>
                  <input type="time" value={planForm.scheduledTime} onChange={e => setPlanForm({ ...planForm, scheduledTime: e.target.value })} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Notater</label>
                <textarea value={planForm.notes} onChange={e => setPlanForm({ ...planForm, notes: e.target.value })} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="Valgfrie notater..." />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button onClick={() => setShowPlanModal(false)} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid var(--border, #ddd)', background: 'transparent', color: 'var(--text, #333)', cursor: 'pointer' }}>Avbryt</button>
              <button onClick={handlePlanFromRecommendation} disabled={isSaving || !planForm.scheduledDate} className="btn btn-primary" style={{ opacity: isSaving || !planForm.scheduledDate ? 0.7 : 1 }}>
                {isSaving ? 'Lagrer...' : 'Bekreft planlegging'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Treatment Modal */}
      {showCompleteModal && selectedTreatment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowCompleteModal(false)}>
          <div style={{
            background: 'var(--panel, white)',
            borderRadius: '12px',
            padding: '30px',
            width: '500px',
            maxWidth: '90%'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: 'var(--text, #333)' }}>
              Fullfør behandling - {selectedTreatment.merdName}
            </h2>

            <div style={{ background: 'var(--bg, #f8fafc)', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', color: 'var(--muted, #666)' }}>
                {getTreatmentTypeLabel(selectedTreatment.treatmentType)} - {formatDate(selectedTreatment.scheduledDate)}
              </div>
              {selectedTreatment.liceBefore && (
                <div style={{ fontSize: '14px', marginTop: '4px' }}>Lusenivå før: <strong>{selectedTreatment.liceBefore.toFixed(2)}</strong></div>
              )}
            </div>

            {saveError && (
              <div style={{ padding: '10px', background: '#fef2f2', color: '#dc2626', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>{saveError}</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Lusenivå etter</label>
                  <input type="number" step="0.01" value={completeForm.liceAfter} onChange={e => setCompleteForm({ ...completeForm, liceAfter: e.target.value })} style={inputStyle} placeholder="0.00" />
                </div>
                <div>
                  <label style={labelStyle}>Dødelighet (%)</label>
                  <input type="number" step="0.1" value={completeForm.mortalityPercent} onChange={e => setCompleteForm({ ...completeForm, mortalityPercent: e.target.value })} style={inputStyle} placeholder="0.0" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Kostnad (NOK)</label>
                <input type="number" value={completeForm.costNok} onChange={e => setCompleteForm({ ...completeForm, costNok: e.target.value })} style={inputStyle} placeholder="0" />
              </div>

              <div>
                <label style={labelStyle}>Notater</label>
                <textarea value={completeForm.notes} onChange={e => setCompleteForm({ ...completeForm, notes: e.target.value })} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="Observasjoner, avvik, etc..." />
              </div>

              {selectedTreatment.liceBefore && completeForm.liceAfter && (
                <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#166534', fontSize: '14px' }}>Beregnet effektivitet:</span>
                  <span style={{ color: '#166534', fontWeight: '700', fontSize: '18px' }}>
                    {((selectedTreatment.liceBefore - parseFloat(completeForm.liceAfter)) / selectedTreatment.liceBefore * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button onClick={() => setShowCompleteModal(false)} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid var(--border, #ddd)', background: 'transparent', color: 'var(--text, #333)', cursor: 'pointer' }}>Avbryt</button>
              <button onClick={handleCompleteTreatment} disabled={isSaving} style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#22c55e', color: 'white', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: '500', opacity: isSaving ? 0.7 : 1 }}>
                {isSaving ? 'Lagrer...' : 'Marker som fullført'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Treatment Modal */}
      {showNewModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowNewModal(false)}>
          <div style={{
            background: 'var(--panel, white)',
            borderRadius: '12px',
            padding: '30px',
            width: '500px',
            maxWidth: '90%'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: 'var(--text, #333)' }}>Ny behandling</h2>

            {saveError && (
              <div style={{ padding: '10px', background: '#fef2f2', color: '#dc2626', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>{saveError}</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Merd *</label>
                <select
                  value={newForm.merdId}
                  onChange={e => { setNewForm({ ...newForm, merdId: e.target.value }); setFormErrors({ ...formErrors, merdId: null }) }}
                  style={{ ...inputStyle, borderColor: formErrors.merdId ? '#ef4444' : undefined }}
                  required
                >
                  <option value="">Velg merd...</option>
                  {merds.map(merd => (
                    <option key={merd.id} value={merd.id}>{merd.cage_name || merd.name} - {merd.locality || merd.lokalitet}</option>
                  ))}
                </select>
                {formErrors.merdId && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{formErrors.merdId}</div>}
              </div>

              <div>
                <label style={labelStyle}>Behandlingstype *</label>
                <select value={newForm.treatmentType} onChange={e => setNewForm({ ...newForm, treatmentType: e.target.value })} style={inputStyle}>
                  <option value="THERMOLICER">Thermolicer</option>
                  <option value="HYDROLICER">Hydrolicer</option>
                  <option value="OPTILICER">Optilicer</option>
                  <option value="LUSESKJORT">Luseskjørt</option>
                  <option value="RENSEFISK">Rensefisk</option>
                  <option value="MEDIKAMENTELL">Medikamentell</option>
                  <option value="FERSKVANN">Ferskvann</option>
                  <option value="LASER">Laser</option>
                  <option value="ANNET">Annet</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Dato *</label>
                  <input
                    type="date"
                    value={newForm.scheduledDate}
                    onChange={e => { setNewForm({ ...newForm, scheduledDate: e.target.value }); setFormErrors({ ...formErrors, scheduledDate: null }) }}
                    style={{ ...inputStyle, borderColor: formErrors.scheduledDate ? '#ef4444' : undefined }}
                    required
                  />
                  {formErrors.scheduledDate && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{formErrors.scheduledDate}</div>}
                </div>
                <div>
                  <label style={labelStyle}>Tidspunkt</label>
                  <input type="time" value={newForm.scheduledTime} onChange={e => setNewForm({ ...newForm, scheduledTime: e.target.value })} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Nåværende lusenivå (valgfritt)</label>
                <input type="number" step="0.01" value={newForm.liceBefore} onChange={e => setNewForm({ ...newForm, liceBefore: e.target.value })} style={inputStyle} placeholder="0.00" />
              </div>

              <div>
                <label style={labelStyle}>Notater</label>
                <textarea value={newForm.notes} onChange={e => setNewForm({ ...newForm, notes: e.target.value })} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="Valgfrie notater..." />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button onClick={() => setShowNewModal(false)} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid var(--border, #ddd)', background: 'transparent', color: 'var(--text, #333)', cursor: 'pointer' }}>Avbryt</button>
              <button onClick={handleCreateNew} disabled={isSaving || !newForm.merdId || !newForm.scheduledDate} className="btn btn-primary" style={{ opacity: isSaving || !newForm.merdId || !newForm.scheduledDate ? 0.7 : 1 }}>
                {isSaving ? 'Lagrer...' : 'Opprett behandling'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
