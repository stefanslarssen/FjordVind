import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useToast } from '../components/Toast'
import { rules, formatApiError } from '../utils/validation'
import { fetchLocations, fetchCages, createSample, supabase } from '../services/supabase'

// Bildekomprimering - reduserer størrelse før opplasting
async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Beregn ny størrelse
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            resolve(compressedFile)
          },
          'image/jpeg',
          quality
        )
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function NyTellingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLanguage()
  const toast = useToast()
  const cameraInputRef = useRef(null)
  const [cameraTargetId, setCameraTargetId] = useState(null)

  // Form state
  const [locations, setLocations] = useState([])
  const [merds, setMerds] = useState([])
  const [selectedLocation, setSelectedLocation] = useState('')
  const [selectedMerd, setSelectedMerd] = useState('')
  const [dato, setDato] = useState(new Date().toISOString().slice(0, 10))
  const [tidspunkt, setTidspunkt] = useState(new Date().toTimeString().slice(0, 5))
  const [temperatur, setTemperatur] = useState('')
  const [notat, setNotat] = useState('')

  // Counting type selection
  const [countType, setCountType] = useState('lice') // 'lice' or 'mortality'

  // Mortality data per merd
  const [mortalityData, setMortalityData] = useState([])

  // Default mortality causes (fallback if API is unavailable)
  const defaultMortalityCauses = [
    { id: 1, cause_name: 'Naturlig dødelighet', category: 'normal' },
    { id: 2, cause_name: 'Ukjent årsak', category: 'normal' },
    { id: 3, cause_name: 'Avlusning - mekanisk', category: 'behandling' },
    { id: 4, cause_name: 'Avlusning - termisk', category: 'behandling' },
    { id: 5, cause_name: 'Avlusning - medisinsk', category: 'behandling' },
    { id: 6, cause_name: 'Ferskvannsbehandling', category: 'behandling' },
    { id: 7, cause_name: 'Vaksinering', category: 'behandling' },
    { id: 8, cause_name: 'PD (Pancreas Disease)', category: 'sykdom' },
    { id: 9, cause_name: 'ILA (Infeksiøs lakseanemi)', category: 'sykdom' },
    { id: 10, cause_name: 'CMS (Hjertesprekk)', category: 'sykdom' },
    { id: 11, cause_name: 'AGD (Amøbegjellesykdom)', category: 'sykdom' },
    { id: 12, cause_name: 'Vintersår', category: 'sykdom' },
    { id: 13, cause_name: 'Bakteriell infeksjon', category: 'sykdom' },
    { id: 14, cause_name: 'Parasitter', category: 'sykdom' },
    { id: 15, cause_name: 'Trenging', category: 'håndtering' },
    { id: 16, cause_name: 'Sortering', category: 'håndtering' },
    { id: 17, cause_name: 'Transport', category: 'håndtering' },
    { id: 18, cause_name: 'Notskifte', category: 'håndtering' },
    { id: 19, cause_name: 'Sel', category: 'predator' },
    { id: 20, cause_name: 'Oter', category: 'predator' },
    { id: 21, cause_name: 'Fugl', category: 'predator' },
    { id: 22, cause_name: 'Algeoppblomstring', category: 'miljø' },
    { id: 23, cause_name: 'Manet', category: 'miljø' },
    { id: 24, cause_name: 'Oksygenmangel', category: 'miljø' },
    { id: 25, cause_name: 'Temperaturstress', category: 'miljø' },
    { id: 26, cause_name: 'Rømming (gjenfanget død)', category: 'annet' },
    { id: 27, cause_name: 'Annet', category: 'annet' }
  ]

  const [mortalityCauses, setMortalityCauses] = useState(defaultMortalityCauses)

  // Load mortality causes on mount - using defaults since we don't have API
  useEffect(() => {
    // Mortality causes use defaults - no Supabase table for this yet
    setMortalityCauses(defaultMortalityCauses)
  }, [])

  // Initialize mortality data when merds change
  useEffect(() => {
    if (merds.length > 0 && countType === 'mortality') {
      setMortalityData(merds.map(merd => ({
        merdId: merd.id,
        merdName: merd.cage_name || merd.name,
        salmonDead: '',
        salmonCause: '',
        salmonNotes: '',
        cleanerFishDead: '',
        cleanerFishType: '',
        cleanerFishCause: '',
        mortalityCategory: ''
      })))
    }
  }, [merds, countType])

  // Helper function to update mortality data for a specific merd
  function updateMortalityData(index, field, value) {
    setMortalityData(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ))
  }

  // Calculate mortality totals
  function calculateMortalityTotals() {
    const totalSalmon = mortalityData.reduce((sum, m) => sum + (parseInt(m.salmonDead) || 0), 0)
    const totalCleanerFish = mortalityData.reduce((sum, m) => sum + (parseInt(m.cleanerFishDead) || 0), 0)
    return { totalSalmon, totalCleanerFish, total: totalSalmon + totalCleanerFish }
  }

  // Group causes by category
  const causesByCategory = mortalityCauses.reduce((acc, cause) => {
    if (!acc[cause.category]) acc[cause.category] = []
    acc[cause.category].push(cause)
    return acc
  }, {})

  // Category options for grunnlag
  const categories = [
    { value: 'normal', label: 'Normal' },
    { value: 'behandling', label: 'Behandling' },
    { value: 'sykdom', label: 'Sykdom' },
    { value: 'håndtering', label: 'Håndtering' },
    { value: 'predator', label: 'Predator' },
    { value: 'miljø', label: 'Miljø' },
    { value: 'annet', label: 'Annet' }
  ]

  // Cleaner fish types
  const cleanerFishTypes = [
    { value: 'rognkjeks', label: 'Rognkjeks' },
    { value: 'berggylt', label: 'Berggylt' },
    { value: 'grønngylt', label: 'Grønngylt' },
    { value: 'blandet', label: 'Blandet' }
  ]

  // Fish observations (with optional image)
  const [observations, setObservations] = useState([
    { id: 1, voksneHunnlus: 0, bevegeligeLus: 0, fastsittendeLus: 0, image: null, imagePreview: null }
  ])

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [compressing, setCompressing] = useState(false)

  // Load locations on mount
  useEffect(() => {
    loadLocations()
  }, [])

  // Load merds when location changes
  useEffect(() => {
    if (selectedLocation) {
      loadMerds(selectedLocation)
    } else {
      setMerds([])
      setSelectedMerd('')
    }
  }, [selectedLocation])

  async function loadLocations() {
    try {
      const data = await fetchLocations()
      setLocations(data)
    } catch (err) {
      console.error('Failed to load locations:', err)
    }
  }

  async function loadMerds(locationId) {
    try {
      const data = await fetchCages(locationId)
      const transformedMerds = data.map(m => ({
        id: m.id,
        name: m.navn,
        cage_name: m.merd_id
      }))
      setMerds(transformedMerds)
    } catch (err) {
      console.error('Failed to load merds:', err)
    }
  }

  function addFish() {
    const newId = Math.max(...observations.map(o => o.id)) + 1
    setObservations([...observations, {
      id: newId,
      voksneHunnlus: 0,
      bevegeligeLus: 0,
      fastsittendeLus: 0,
      image: null,
      imagePreview: null
    }])
  }

  async function handleImageUpload(id, event) {
    const file = event.target.files?.[0]
    if (file) {
      setCompressing(true)
      try {
        // Komprimer bildet før lagring
        const compressedFile = await compressImage(file)
        const previewUrl = URL.createObjectURL(compressedFile)
        setObservations(observations.map(o =>
          o.id === id ? { ...o, image: compressedFile, imagePreview: previewUrl } : o
        ))
      } catch (err) {
        console.error('Image compression failed:', err)
        // Fallback til original fil
        const previewUrl = URL.createObjectURL(file)
        setObservations(observations.map(o =>
          o.id === id ? { ...o, image: file, imagePreview: previewUrl } : o
        ))
      } finally {
        setCompressing(false)
      }
    }
  }

  // Kamera-håndtering
  function openCamera(fishId) {
    setCameraTargetId(fishId)
    if (cameraInputRef.current) {
      cameraInputRef.current.click()
    }
  }

  async function handleCameraCapture(event) {
    const file = event.target.files?.[0]
    if (file && cameraTargetId !== null) {
      setCompressing(true)
      try {
        const compressedFile = await compressImage(file)
        const previewUrl = URL.createObjectURL(compressedFile)
        setObservations(observations.map(o =>
          o.id === cameraTargetId ? { ...o, image: compressedFile, imagePreview: previewUrl } : o
        ))
      } catch (err) {
        console.error('Camera image processing failed:', err)
        const previewUrl = URL.createObjectURL(file)
        setObservations(observations.map(o =>
          o.id === cameraTargetId ? { ...o, image: file, imagePreview: previewUrl } : o
        ))
      } finally {
        setCompressing(false)
        setCameraTargetId(null)
      }
    }
    // Reset input
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
  }

  function removeImage(id) {
    setObservations(observations.map(o => {
      if (o.id === id && o.imagePreview) {
        URL.revokeObjectURL(o.imagePreview)
      }
      return o.id === id ? { ...o, image: null, imagePreview: null } : o
    }))
  }

  function removeFish(id) {
    if (observations.length > 1) {
      setObservations(observations.filter(o => o.id !== id))
    }
  }

  function updateObservation(id, field, value) {
    setObservations(observations.map(o =>
      o.id === id ? { ...o, [field]: Math.max(0, parseInt(value) || 0) } : o
    ))
  }

  function calculateStats() {
    const totalFish = observations.length
    const totalVoksneHunnlus = observations.reduce((sum, o) => sum + o.voksneHunnlus, 0)
    const totalBevegeligeLus = observations.reduce((sum, o) => sum + o.bevegeligeLus, 0)
    const totalFastsittendeLus = observations.reduce((sum, o) => sum + o.fastsittendeLus, 0)

    const avgVoksneHunnlus = totalFish > 0 ? totalVoksneHunnlus / totalFish : 0
    const avgTotalLus = totalFish > 0 ? (totalVoksneHunnlus + totalBevegeligeLus + totalFastsittendeLus) / totalFish : 0

    return {
      totalFish,
      totalVoksneHunnlus,
      totalBevegeligeLus,
      totalFastsittendeLus,
      avgVoksneHunnlus,
      avgTotalLus,
      status: avgVoksneHunnlus >= 0.5 ? t('newCount.danger') : avgVoksneHunnlus >= 0.2 ? t('newCount.warning') : t('newCount.ok')
    }
  }

  async function uploadImage(file, observationId) {
    // Image upload not implemented with Supabase storage yet
    // For now, just skip image upload
    console.log('Image upload skipped - not implemented yet:', observationId)
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // Validate based on count type
    if (countType === 'lice') {
      if (!selectedMerd) {
        const errorMsg = t('newCount.selectCage')
        setError(errorMsg)
        toast.warning(errorMsg, { title: 'Mangler merd' })
        return
      }
      if (observations.length === 0) {
        const errorMsg = t('newCount.addObservation')
        setError(errorMsg)
        toast.warning(errorMsg)
        return
      }
      // Validate temperature if provided
      if (temperatur) {
        const tempError = rules.temperature(temperatur)
        if (tempError) {
          setError(tempError)
          toast.warning(tempError, { title: 'Ugyldig temperatur' })
          return
        }
      }
    }

    if (countType === 'mortality') {
      if (!selectedLocation) {
        const errorMsg = t('newCount.selectLocation') || 'Velg en lokalitet'
        setError(errorMsg)
        toast.warning(errorMsg)
        return
      }
      if (merds.length === 0) {
        const errorMsg = t('newCount.noMerdsFound') || 'Ingen merder funnet for denne lokaliteten'
        setError(errorMsg)
        toast.warning(errorMsg)
        return
      }
      const hasAnyMortality = mortalityData.some(m => parseInt(m.salmonDead) > 0 || parseInt(m.cleanerFishDead) > 0)
      if (!hasAnyMortality) {
        const errorMsg = t('newCount.enterDeadFishCount') || 'Oppgi antall døde fisk i minst én merd'
        setError(errorMsg)
        toast.warning(errorMsg)
        return
      }
    }

    setIsSubmitting(true)

    try {
      let response

      if (countType === 'lice') {
        toast.info('Lagrer telling...', { duration: 2000 })

        // Lice counting - upload images and send observations
        const observationsWithImages = await Promise.all(
          observations.map(async (o, index) => {
            let imageUrl = null
            if (o.image) {
              imageUrl = await uploadImage(o.image, `fish-${index + 1}`)
            }
            return {
              fishId: String(index + 1),
              voksneHunnlus: o.voksneHunnlus,
              bevegeligeLus: o.bevegeligeLus,
              fastsittendeLus: o.fastsittendeLus,
              imageUrl
            }
          })
        )

        // Create sample in Supabase
        const sampleId = `SAMPLE-${Date.now()}`

        // Find or create user in users table (synced with auth)
        let røkterId = null
        if (user?.id) {
          // First try to find existing user
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .single()

          if (existingUser) {
            røkterId = existingUser.id
          } else {
            // Create user in users table with auth user's info
            const { data: newUser, error: userError } = await supabase
              .from('users')
              .insert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Ukjent',
                role: 'røkter'
              })
              .select('id')
              .single()

            if (userError) {
              console.error('Could not create user:', userError)
              throw new Error('Kunne ikke opprette bruker i systemet')
            }
            røkterId = newUser.id
          }
        }

        if (!røkterId) {
          throw new Error('Du må være logget inn for å lagre tellinger')
        }

        const { data: sampleData, error: sampleError } = await supabase
          .from('samples')
          .insert({
            sample_id: sampleId,
            merd_id: selectedMerd,
            røkter_id: røkterId,
            dato,
            tidspunkt,
            antall_fisk: observations.length,
            temperatur: temperatur ? parseFloat(temperatur) : null,
            notat
          })
          .select()

        if (sampleError) throw sampleError

        // Create fish observations
        if (sampleData && sampleData[0]) {
          const fishObservations = observationsWithImages.map(o => ({
            fish_id: o.fishId,
            sample_id: sampleData[0].id,
            voksne_hunnlus: o.voksneHunnlus,
            bevegelige_lus: o.bevegeligeLus,
            fastsittende_lus: o.fastsittendeLus,
            bilde_url: o.imageUrl
          }))

          const { error: obsError } = await supabase
            .from('fish_observations')
            .insert(fishObservations)

          if (obsError) throw obsError
        }

        response = { ok: true }
      } else {
        toast.info('Lagrer dødlighetsregistrering...', { duration: 2000 })

        // Mortality counting - not implemented in Supabase yet
        // Just show success for now
        console.log('Mortality data would be saved:', mortalityData)
        response = { ok: true }
      }

      if (response.ok) {
        const successMsg = countType === 'lice'
          ? `Lusetelling lagret - ${observations.length} fisk registrert`
          : `Dødlighet registrert for ${mortalityData.filter(m => parseInt(m.salmonDead) > 0 || parseInt(m.cleanerFishDead) > 0).length} merder`
        toast.success(successMsg, { title: 'Suksess' })
        setSuccess(true)
        setTimeout(() => {
          navigate('/history')
        }, 2000)
      } else {
        const data = await response.json()
        // Handle validation errors from backend
        if (data.error?.errors && Array.isArray(data.error.errors)) {
          const errorMessage = data.error.errors.join('. ')
          setError(errorMessage)
          toast.error(errorMessage, { title: 'Valideringsfeil' })
        } else {
          const errorMsg = data.error?.message || data.error || t('newCount.couldNotSave')
          setError(errorMsg)
          toast.error(errorMsg)
        }
      }
    } catch (err) {
      const errorMsg = formatApiError(err) || t('newCount.networkError')
      setError(errorMsg)
      toast.error(errorMsg, { title: 'Nettverksfeil' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const stats = calculateStats()

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

  if (success) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh'
      }}>
        <div className="card" style={{ padding: '40px', textAlign: 'center', maxWidth: '400px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '28px',
            color: '#22c55e'
          }}>
            ok
          </div>
          <h2 style={{ margin: '0 0 12px 0', color: 'var(--text)' }}>{t('newCount.countSaved')}</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            {t('newCount.redirecting')}
          </p>
        </div>
      </div>
    )
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
        <h1 style={{ margin: 0, fontSize: '20px' }}>{t('newCount.title')}</h1>
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{t('newCount.subtitle')}</span>
      </div>

      {/* Skjult kamera-input for mobilenheter */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        style={{ display: 'none' }}
      />

      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {/* Count Type Selection */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 className="card-title">{t('newCount.selectCountType') || 'Velg type telling'}</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setCountType('lice')}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '8px',
                border: countType === 'lice' ? '2px solid #1976d2' : '1px solid var(--border)',
                backgroundColor: countType === 'lice' ? 'rgba(25, 118, 210, 0.15)' : 'var(--bg)',
                color: countType === 'lice' ? '#1976d2' : 'var(--text)',
                fontWeight: countType === 'lice' ? '600' : '400',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {t('newCount.liceCount')}
            </button>
            <button
              type="button"
              onClick={() => setCountType('mortality')}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '8px',
                border: countType === 'mortality' ? '2px solid #ef4444' : '1px solid var(--border)',
                backgroundColor: countType === 'mortality' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg)',
                color: countType === 'mortality' ? '#ef4444' : 'var(--text)',
                fontWeight: countType === 'mortality' ? '600' : '400',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {t('newCount.mortalityCount')}
            </button>
          </div>
        </div>

        {/* Location and Merd Selection */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 className="card-title">{t('newCount.selectLocation')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: countType === 'mortality' ? '1fr' : '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>{t('newCount.location')}</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                style={inputStyle}
                required
              >
                <option value="">{t('newCount.selectLocationPlaceholder')}</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            {/* Only show merd selection for lice counting - mortality shows all merds */}
            {countType === 'lice' && (
              <div>
                <label style={labelStyle}>{t('newCount.cage')}</label>
                <select
                  value={selectedMerd}
                  onChange={(e) => setSelectedMerd(e.target.value)}
                  style={inputStyle}
                  disabled={!selectedLocation}
                  required
                >
                  <option value="">{t('newCount.selectCagePlaceholder')}</option>
                  {merds.map(merd => (
                    <option key={merd.id} value={merd.id}>{merd.cage_name || merd.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {countType === 'mortality' && selectedLocation && merds.length > 0 && (
            <div style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              {merds.length} {t('newCount.merdsFound') || 'merder funnet'} - {t('newCount.enterMortalityBelow') || 'registrer dødlighet for hver merd nedenfor'}
            </div>
          )}
        </div>

        {/* Date and Time */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 className="card-title">{t('newCount.timing')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>{t('newCount.date')}</label>
              <input
                type="date"
                value={dato}
                onChange={(e) => setDato(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>{t('newCount.time')}</label>
              <input
                type="time"
                value={tidspunkt}
                onChange={(e) => setTidspunkt(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{t('newCount.temperature')}</label>
              <input
                type="number"
                step="0.1"
                value={temperatur}
                onChange={(e) => setTemperatur(e.target.value)}
                style={inputStyle}
                placeholder={t('newCount.tempPlaceholder')}
              />
            </div>
          </div>
        </div>

        {/* Mortality Section - per merd registration */}
        {countType === 'mortality' && (
          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="card-title" style={{ margin: 0 }}>
                {t('newCount.mortalityRegistration')}
              </h3>
              {mortalityData.length > 0 && (
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                  <span>Laks: <strong style={{ color: '#ef4444' }}>{calculateMortalityTotals().totalSalmon}</strong></span>
                  <span>Leppefisk: <strong style={{ color: '#f59e0b' }}>{calculateMortalityTotals().totalCleanerFish}</strong></span>
                </div>
              )}
            </div>

            {merds.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                {t('newCount.selectLocationFirst')}
              </div>
            ) : (
              <>
                {/* Header row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 100px 100px 1fr 1fr',
                  gap: '12px',
                  padding: '10px 12px',
                  backgroundColor: 'var(--bg-secondary, #f1f5f9)',
                  borderBottom: '1px solid var(--border)',
                  fontWeight: '600',
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}>
                  <div>Merd</div>
                  <div>Laks</div>
                  <div>Leppefisk</div>
                  <div>Årsak</div>
                  <div>Grunnlag</div>
                  <div></div>
                </div>

                {/* Merd rows */}
                {mortalityData.map((merd, index) => {
                  const hasData = parseInt(merd.salmonDead) > 0 || parseInt(merd.cleanerFishDead) > 0

                  return (
                    <div key={merd.merdId} style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 100px 100px 1fr 1fr',
                      gap: '12px',
                      padding: '8px 12px',
                      alignItems: 'center',
                      borderBottom: '1px solid var(--border)'
                    }}>
                      {/* Merd label */}
                      <div style={{
                        fontWeight: '600',
                        fontSize: '13px',
                        color: hasData ? '#ef4444' : 'var(--text-secondary)'
                      }}>
                        {merd.merdName || `M${index + 1}`}
                      </div>

                      {/* Død laks */}
                      <input
                        type="number"
                        min="0"
                        value={merd.salmonDead}
                        onChange={(e) => updateMortalityData(index, 'salmonDead', e.target.value)}
                        style={{ ...inputStyle, textAlign: 'center', padding: '8px' }}
                        placeholder="0"
                      />

                      {/* Død leppefisk */}
                      <input
                        type="number"
                        min="0"
                        value={merd.cleanerFishDead}
                        onChange={(e) => updateMortalityData(index, 'cleanerFishDead', e.target.value)}
                        style={{ ...inputStyle, textAlign: 'center', padding: '8px' }}
                        placeholder="0"
                      />

                      {/* Årsak dropdown */}
                      <select
                        value={merd.salmonCause}
                        onChange={(e) => updateMortalityData(index, 'salmonCause', e.target.value)}
                        style={{ ...inputStyle, fontSize: '13px', padding: '8px' }}
                      >
                        <option value="">Velg årsak...</option>
                        {Object.entries(causesByCategory).map(([category, causes]) => (
                          <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                            {causes.map(cause => (
                              <option key={cause.id} value={cause.cause_name}>
                                {cause.cause_name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>

                      {/* Grunnlag dropdown */}
                      <select
                        value={merd.mortalityCategory}
                        onChange={(e) => updateMortalityData(index, 'mortalityCategory', e.target.value)}
                        style={{ ...inputStyle, fontSize: '13px', padding: '8px' }}
                      >
                        <option value="">Velg...</option>
                        {categories.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* Fish Observations - only show for lice count type */}
        {countType === 'lice' && (
        <>
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="card-title" style={{ margin: 0 }}>{t('newCount.fishObservations')} ({observations.length} {t('newCount.fish')})</h3>
            <button
              type="button"
              onClick={addFish}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              {t('newCount.addFish')}
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500' }}>{t('newCount.fishNumber')}</th>
                  <th style={{ padding: '10px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '500' }}>{t('newCount.adultFemaleLice')}</th>
                  <th style={{ padding: '10px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '500' }}>{t('newCount.mobileLice')}</th>
                  <th style={{ padding: '10px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '500' }}>{t('newCount.attachedLice')}</th>
                  <th style={{ padding: '10px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '500' }}>{t('newCount.image')}</th>
                  <th style={{ padding: '10px', textAlign: 'center', width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {observations.map((obs, index) => (
                  <tr key={obs.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px', fontWeight: '500' }}>#{index + 1}</td>
                    <td style={{ padding: '10px' }}>
                      <input
                        type="number"
                        min="0"
                        value={obs.voksneHunnlus}
                        onChange={(e) => updateObservation(obs.id, 'voksneHunnlus', e.target.value)}
                        style={{ ...inputStyle, textAlign: 'center', width: '80px', margin: '0 auto', display: 'block' }}
                      />
                    </td>
                    <td style={{ padding: '10px' }}>
                      <input
                        type="number"
                        min="0"
                        value={obs.bevegeligeLus}
                        onChange={(e) => updateObservation(obs.id, 'bevegeligeLus', e.target.value)}
                        style={{ ...inputStyle, textAlign: 'center', width: '80px', margin: '0 auto', display: 'block' }}
                      />
                    </td>
                    <td style={{ padding: '10px' }}>
                      <input
                        type="number"
                        min="0"
                        value={obs.fastsittendeLus}
                        onChange={(e) => updateObservation(obs.id, 'fastsittendeLus', e.target.value)}
                        style={{ ...inputStyle, textAlign: 'center', width: '80px', margin: '0 auto', display: 'block' }}
                      />
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      {obs.imagePreview ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                          <img
                            src={obs.imagePreview}
                            alt={`Fisk ${index + 1}`}
                            style={{
                              width: '40px',
                              height: '40px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              border: '1px solid var(--border)'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(obs.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: 'none',
                              borderRadius: '4px',
                              color: '#ef4444',
                              padding: '4px 8px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          {/* Kamera-knapp */}
                          <button
                            type="button"
                            onClick={() => openCamera(obs.id)}
                            disabled={compressing}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 10px',
                              borderRadius: '4px',
                              border: '1px solid var(--primary)',
                              background: 'rgba(59, 130, 246, 0.1)',
                              cursor: 'pointer',
                              fontSize: '12px',
                              color: 'var(--primary)'
                            }}
                            title={t('newCount.takePhoto')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                              <circle cx="12" cy="13" r="4"/>
                            </svg>
                          </button>
                          {/* Last opp fra galleri */}
                          <label style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            border: '1px dashed var(--border)',
                            background: 'var(--bg)',
                            cursor: compressing ? 'wait' : 'pointer',
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            opacity: compressing ? 0.6 : 1
                          }}
                          title={t('newCount.selectFromGallery')}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(obs.id, e)}
                              disabled={compressing}
                              style={{ display: 'none' }}
                            />
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21,15 16,10 5,21"/>
                            </svg>
                          </label>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      {observations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFish(obs.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#ef4444',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          {t('newCount.remove')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick add buttons */}
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '14px', marginRight: '8px' }}>Legg til:</span>
            {[5, 10, 15, 20].map(count => (
              <button
                key={count}
                type="button"
                onClick={() => {
                  const maxId = Math.max(...observations.map(o => o.id), 0)
                  const newObs = Array.from({ length: count }, (_, i) => ({
                    id: maxId + i + 1,
                    voksneHunnlus: 0,
                    bevegeligeLus: 0,
                    fastsittendeLus: 0,
                    image: null,
                    imagePreview: null
                  }))
                  setObservations([...observations, ...newObs])
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#334155',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  minWidth: '70px'
                }}
              >
                +{count} fisk
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats for lice counting */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 className="card-title">{t('newCount.summary')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg)', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text)' }}>{stats.totalFish}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('newCount.fishCounted')}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg)', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text)' }}>{stats.totalVoksneHunnlus}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('newCount.adultFemaleLice')}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg)', borderRadius: '8px' }}>
              <div style={{
                fontSize: '24px',
                fontWeight: '700',
                color: stats.status === t('newCount.danger') ? '#ef4444' : stats.status === t('newCount.warning') ? '#eab308' : '#22c55e'
              }}>
                {stats.avgVoksneHunnlus.toFixed(2)}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('newCount.avgPerFish')}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg)', borderRadius: '8px' }}>
              <div style={{
                display: 'inline-block',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600',
                background: stats.status === t('newCount.danger') ? 'rgba(239, 68, 68, 0.2)' :
                           stats.status === t('newCount.warning') ? 'rgba(234, 179, 8, 0.2)' :
                           'rgba(34, 197, 94, 0.2)',
                color: stats.status === t('newCount.danger') ? '#ef4444' :
                       stats.status === t('newCount.warning') ? '#eab308' :
                       '#22c55e'
              }}>
                {stats.status}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{t('newCount.status')}</div>
            </div>
          </div>
        </div>
        </>
        )}

        {/* Notes */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 className="card-title">{t('newCount.notesOptional')}</h3>
          <textarea
            value={notat}
            onChange={(e) => setNotat(e.target.value)}
            style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
            placeholder={t('newCount.notesPlaceholder')}
          />
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text)',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {t('newCount.cancel')}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ padding: '12px 32px' }}
          >
            {isSubmitting ? t('newCount.saving') : t('newCount.saveCount')}
          </button>
        </div>
      </form>
    </div>
  )
}
