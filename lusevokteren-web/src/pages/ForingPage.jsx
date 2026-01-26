import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function ForingPage() {
  const { t } = useLanguage()
  const [feedingData, setFeedingData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [feedStorageData, setFeedStorageData] = useState(null)
  const [monthlyStats, setMonthlyStats] = useState(null)
  const [locations, setLocations] = useState([])
  const [cages, setCages] = useState([])

  // Manual feeding form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showBoatOrder, setShowBoatOrder] = useState(false)
  const [boatOrders, setBoatOrders] = useState([])
  const [boatOrderForm, setBoatOrderForm] = useState({
    locationId: '',
    requestedDate: '',
    amount: '',
    notes: ''
  })
  const [formData, setFormData] = useState({
    locationId: '',
    merdId: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    feedType: '',
    status: 'completed',
    notes: ''
  })

  useEffect(() => {
    loadAllData()
  }, [])

  useEffect(() => {
    if (formData.locationId) {
      loadCagesForLocation(formData.locationId)
    } else {
      setCages([])
    }
  }, [formData.locationId])

  async function loadAllData() {
    try {
      setLoading(true)
      setError(null)

      const [feedingRes, storageRes, locationsRes, monthlyRes] = await Promise.all([
        fetch(`${API_URL}/api/feeding`),
        fetch(`${API_URL}/api/dashboard/feed-storage`),
        fetch(`${API_URL}/api/locations`),
        fetch(`${API_URL}/api/dashboard/monthly-stats`)
      ])

      if (feedingRes.ok) {
        const feedingJson = await feedingRes.json()
        setFeedingData(feedingJson.feedingLogs || [])
      }

      if (storageRes.ok) {
        const storageJson = await storageRes.json()
        setFeedStorageData(storageJson)
      }

      if (locationsRes.ok) {
        const locationsJson = await locationsRes.json()
        setLocations(locationsJson.locations || locationsJson || [])
      }

      if (monthlyRes.ok) {
        const monthlyJson = await monthlyRes.json()
        setMonthlyStats(monthlyJson)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
      setError(t('feeding.couldNotLoadData'))
    } finally {
      setLoading(false)
    }
  }

  async function loadCagesForLocation(locationId) {
    try {
      const res = await fetch(`${API_URL}/api/locations/${locationId}/cages`)
      if (res.ok) {
        const data = await res.json()
        setCages(data.cages || data || [])
      }
    } catch (err) {
      console.error('Failed to load cages:', err)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.locationId || !formData.amount) return

    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/feeding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: formData.locationId,
          merdId: formData.merdId || null,
          date: formData.date,
          amount: parseFloat(formData.amount),
          feedType: formData.feedType || null,
          status: formData.status,
          notes: formData.notes || null
        })
      })

      if (res.ok) {
        setShowAddForm(false)
        setFormData({
          locationId: '',
          merdId: '',
          date: new Date().toISOString().split('T')[0],
          amount: '',
          feedType: '',
          status: 'completed',
          notes: ''
        })
        loadAllData()
      } else {
        setError(t('feeding.couldNotSave'))
      }
    } catch (err) {
      console.error('Failed to save feeding:', err)
      setError(t('feeding.couldNotSave'))
    } finally {
      setSaving(false)
    }
  }

  async function handleBoatOrderSubmit(e) {
    e.preventDefault()
    if (!boatOrderForm.locationId || !boatOrderForm.requestedDate || !boatOrderForm.amount) return

    setSaving(true)
    try {
      // In a real app, this would POST to an API
      const newOrder = {
        id: Date.now(),
        ...boatOrderForm,
        status: 'pending',
        createdAt: new Date().toISOString()
      }
      setBoatOrders([newOrder, ...boatOrders])
      setShowBoatOrder(false)
      setBoatOrderForm({ locationId: '', requestedDate: '', amount: '', notes: '' })
    } catch (err) {
      console.error('Failed to submit boat order:', err)
    } finally {
      setSaving(false)
    }
  }

  const totalFeed = feedingData.reduce((sum, item) => sum + (item.amount || 0), 0)
  const completedFeedings = feedingData.filter(f => f.status === 'completed').length
  const scheduledFeedings = feedingData.filter(f => f.status === 'scheduled').length

  // Generate weekly consumption data for chart
  const weeklyConsumption = (() => {
    const days = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn']
    const today = new Date()
    const data = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayFeedings = feedingData.filter(f => f.date === dateStr)
      const total = dayFeedings.reduce((sum, f) => sum + (f.amount || 0), 0)
      data.push({
        day: days[(date.getDay() + 6) % 7],
        date: dateStr,
        amount: total
      })
    }
    return data
  })()

  const maxConsumption = Math.max(...weeklyConsumption.map(d => d.amount), 1)

  // Feed storage from API
  const feedStorage = feedStorageData?.feedTypes || []
  const totalFeedStorage = feedStorageData?.totalKg || 0
  const daysRemaining = feedStorageData?.daysRemaining || 0
  const maxFeedAmount = feedStorage.length > 0 ? Math.max(...feedStorage.map(f => f.amount)) : 1

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
        <h1 style={{ margin: 0, fontSize: '20px' }}>{t('feeding.title')}</h1>
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{t('feeding.subtitle')}</span>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#991b1b' }}>
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            background: showAddForm ? '#6b7280' : '#0d9488',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {showAddForm ? t('common.cancel') : `+ ${t('feeding.addManualFeeding')}`}
        </button>
        <button
          onClick={() => setShowBoatOrder(!showBoatOrder)}
          style={{
            background: showBoatOrder ? '#6b7280' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {showBoatOrder ? t('common.cancel') : t('feeding.orderFeedBoat')}
        </button>
      </div>

      {/* Manual Feeding Form */}
      {showAddForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 className="card-title">{t('feeding.addManualFeeding')}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {/* Location */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                  {t('feeding.location')} *
                </label>
                <select
                  value={formData.locationId}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value, merdId: '' })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    fontSize: '14px'
                  }}
                >
                  <option value="">{t('feeding.selectLocation')}</option>
                  {locations.map(loc => (
                    <option key={loc.id || loc.lokalitetsnummer} value={loc.id || loc.lokalitetsnummer}>
                      {loc.name || loc.lokalitetsnavn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cage */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                  {t('feeding.cage')}
                </label>
                <select
                  value={formData.merdId}
                  onChange={(e) => setFormData({ ...formData, merdId: e.target.value })}
                  disabled={!formData.locationId}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    fontSize: '14px'
                  }}
                >
                  <option value="">{t('feeding.allCages')}</option>
                  {cages.map(cage => (
                    <option key={cage.id || cage.merdnummer} value={cage.id || cage.merdnummer}>
                      {cage.name || cage.merdnavn || `Merd ${cage.merdnummer}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                  {t('feeding.date')} *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Amount */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                  {t('feeding.amountKg')} *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="0.1"
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Feed Type */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                  {t('feeding.feedType')}
                </label>
                <input
                  type="text"
                  value={formData.feedType}
                  onChange={(e) => setFormData({ ...formData, feedType: e.target.value })}
                  placeholder={t('feeding.feedTypePlaceholder')}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Status */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                  {t('feeding.status')}
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    fontSize: '14px'
                  }}
                >
                  <option value="completed">{t('feeding.completedStatus')}</option>
                  <option value="scheduled">{t('feeding.scheduledStatus')}</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                {t('feeding.notes')}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('feeding.notesPlaceholder')}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Submit Button */}
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={saving || !formData.locationId || !formData.amount}
                style={{
                  background: '#0d9488',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: saving ? 'wait' : 'pointer',
                  opacity: saving || !formData.locationId || !formData.amount ? 0.6 : 1
                }}
              >
                {saving ? t('feeding.saving') : t('feeding.saveFeeding')}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{
                  background: 'transparent',
                  color: 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Boat Order Form */}
      {showBoatOrder && (
        <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid #3b82f6' }}>
          <h3 className="card-title">{t('feeding.orderFeedBoat')}</h3>
          <form onSubmit={handleBoatOrderSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                  {t('feeding.location')} *
                </label>
                <select
                  value={boatOrderForm.locationId}
                  onChange={(e) => setBoatOrderForm({ ...boatOrderForm, locationId: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '14px' }}
                >
                  <option value="">{t('feeding.selectLocation')}</option>
                  {locations.map(loc => (
                    <option key={loc.id || loc.lokalitetsnummer} value={loc.id || loc.lokalitetsnummer}>
                      {loc.name || loc.lokalitetsnavn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                  {t('feeding.requestedDate')} *
                </label>
                <input
                  type="date"
                  value={boatOrderForm.requestedDate}
                  onChange={(e) => setBoatOrderForm({ ...boatOrderForm, requestedDate: e.target.value })}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                  {t('feeding.amountTons')} *
                </label>
                <input
                  type="number"
                  value={boatOrderForm.amount}
                  onChange={(e) => setBoatOrderForm({ ...boatOrderForm, amount: e.target.value })}
                  placeholder="0"
                  min="1"
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                  {t('feeding.notes')}
                </label>
                <input
                  type="text"
                  value={boatOrderForm.notes}
                  onChange={(e) => setBoatOrderForm({ ...boatOrderForm, notes: e.target.value })}
                  placeholder={t('feeding.boatOrderNotesPlaceholder')}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '14px' }}
                />
              </div>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {t('feeding.submitOrder')}
              </button>
            </div>
          </form>

          {/* Pending Orders */}
          {boatOrders.length > 0 && (
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px' }}>{t('feeding.pendingOrders')}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {boatOrders.map(order => (
                  <div key={order.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px',
                    background: 'var(--bg)',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}>
                    <span>{locations.find(l => l.id === order.locationId)?.name || order.locationId}</span>
                    <span>{order.requestedDate}</span>
                    <span style={{ fontWeight: 600 }}>{order.amount} {t('units.tons')}</span>
                    <span className="badge warn">{t('feeding.pendingStatus')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feed Consumption Trend Chart */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 className="card-title">{t('feeding.weeklyConsumption')}</h3>
        {weeklyConsumption.reduce((s, d) => s + d.amount, 0) === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '120px',
            color: 'var(--muted)',
            fontSize: '14px'
          }}>
            <div style={{ marginBottom: '8px', opacity: 0.6 }}>{t('feeding.noDataThisWeek')}</div>
            <div style={{ fontSize: '12px', opacity: 0.4 }}>{t('feeding.addFeedingToSeeStats')}</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px', padding: '10px 0' }}>
              {weeklyConsumption.map((day, idx) => (
                <div key={idx} style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                    {day.amount > 0 ? `${(day.amount / 1000).toFixed(1)}t` : ''}
                  </div>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '40px',
                      background: day.amount > 0 ? 'linear-gradient(180deg, #0d9488 0%, #115e59 100%)' : 'var(--border)',
                      borderRadius: '4px 4px 0 0',
                      height: `${day.amount > 0 ? Math.max((day.amount / maxConsumption) * 80, 10) : 4}px`,
                      transition: 'height 0.3s ease'
                    }}
                  />
                  <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '6px' }}>{day.day}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: 'var(--muted)' }}>
              <span>{t('feeding.totalWeek')}: {(weeklyConsumption.reduce((s, d) => s + d.amount, 0) / 1000).toFixed(1)} {t('units.tons')}</span>
              <span>{t('feeding.avgPerDay')}: {(weeklyConsumption.reduce((s, d) => s + d.amount, 0) / 7 / 1000).toFixed(2)} {t('units.tons')}</span>
            </div>
          </>
        )}
      </div>

      {/* FCR and Analytics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* FCR Card */}
        <div className="card" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: 'white' }}>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>{t('feeding.fcr')}</div>
          <div style={{ fontSize: '36px', fontWeight: 700 }}>{feedStorageData?.fcr?.toFixed(2) || '1.15'}</div>
          <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>{t('feeding.fcrDescription')}</div>
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span>{t('feeding.target')}: 1.10</span>
            <span style={{ color: (feedStorageData?.fcr || 1.15) <= 1.15 ? '#86efac' : '#fca5a5' }}>
              {(feedStorageData?.fcr || 1.15) <= 1.15 ? '✓ ' + t('feeding.onTarget') : '↑ ' + t('feeding.aboveTarget')}
            </span>
          </div>
        </div>

        {/* Feed Cost Card */}
        <div className="card">
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>{t('feeding.feedCost')}</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{((totalFeed * 12.5) / 1000).toFixed(0)}k kr</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{t('feeding.estimatedCost')}</div>
          <div style={{ marginTop: '12px', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <span>{t('feeding.pricePerKg')}: 12.50 kr</span>
          </div>
        </div>

        {/* Temperature Recommendation */}
        <div className="card">
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>{t('feeding.recommendedFeeding')}</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>2.1%</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{t('feeding.ofBiomassPerDay')}</div>
          <div style={{ marginTop: '12px', fontSize: '11px', padding: '8px', background: 'var(--bg)', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>{t('feeding.waterTemp')}:</span>
              <span style={{ fontWeight: 600 }}>12.5°C</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('feeding.avgFishWeight')}:</span>
              <span style={{ fontWeight: 600 }}>4.2 kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feed Storage and Growth Index Cards */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {/* Feed Storage Card */}
        <div style={{
          background: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
          borderRadius: '12px',
          padding: '20px',
          color: 'white',
          minWidth: '300px',
          flex: '1',
          maxWidth: '400px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>{t('feeding.feedStorage')}</div>
              <div style={{ fontSize: '32px', fontWeight: 700 }}>{totalFeedStorage.toLocaleString()} kg</div>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>{daysRemaining > 0 ? t('feeding.lastsForDays').replace('{days}', daysRemaining) : t('feeding.noData')}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '60px', marginTop: '16px' }}>
            {feedStorage.length > 0 ? feedStorage.map((feed, idx) => (
              <div key={idx} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '9px', opacity: 0.8, marginBottom: '4px' }}>
                  {(feed.amount / 1000).toFixed(0)}k
                </div>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.6)',
                    borderRadius: '4px 4px 0 0',
                    height: `${(feed.amount / maxFeedAmount) * 50}px`,
                    margin: '0 auto'
                  }}
                />
              </div>
            )) : (
              <div style={{ flex: 1, opacity: 0.5, textAlign: 'center', fontSize: '11px', paddingTop: '20px' }}>
                {t('feeding.noStorageData')}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            {feedStorage.map((feed, idx) => (
              <div key={idx} style={{ flex: 1, fontSize: '8px', opacity: 0.7, textAlign: 'center' }}>
                {feed.name?.split(' ')[0] || `Type ${idx + 1}`}
              </div>
            ))}
          </div>
        </div>

        {/* Growth Index Card */}
        <div style={{
          background: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
          borderRadius: '12px',
          padding: '20px',
          color: 'white',
          minWidth: '300px',
          flex: '1',
          maxWidth: '500px'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>{t('feeding.relativeGrowthIndex')}</div>
            <div style={{ fontSize: '48px', fontWeight: 700 }}>
              {monthlyStats?.growth?.index ?? 100}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>
              {(monthlyStats?.growth?.index ?? 100) >= 100 ? t('feeding.goodGrowth') : t('feeding.belowTarget')}
            </div>
          </div>

          {/* Monthly Chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px', marginTop: '16px' }}>
            {(monthlyStats?.growth?.monthlyData || []).length > 0 ? (
              monthlyStats.growth.monthlyData.map((val, idx) => {
                const maxVal = Math.max(...monthlyStats.growth.monthlyData, 1)
                return (
                  <div key={idx} style={{ flex: 1, textAlign: 'center' }}>
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.5)',
                        borderRadius: '2px 2px 0 0',
                        height: `${(val / maxVal) * 50}px`,
                        minHeight: '2px',
                        margin: '0 auto'
                      }}
                    />
                  </div>
                )
              })
            ) : (
              <div style={{ flex: 1, opacity: 0.5, textAlign: 'center', fontSize: '11px', paddingTop: '20px' }}>
                {t('feeding.noData')}
              </div>
            )}
          </div>

          {/* Month labels */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
            {(monthlyStats?.months || ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']).map((month, idx) => (
              <div key={idx} style={{ flex: 1, fontSize: '8px', opacity: 0.6, textAlign: 'center' }}>
                {month}
              </div>
            ))}
          </div>

          {/* Best/Worst */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '11px' }}>
            <div>
              <span style={{ opacity: 0.7 }}>{t('feeding.bestIn')}</span>{' '}
              <span style={{ fontWeight: 600 }}>{monthlyStats?.growth?.best || '-'}</span>
            </div>
            <div>
              <span style={{ opacity: 0.7 }}>{t('feeding.worstIn')}</span>{' '}
              <span style={{ fontWeight: 600 }}>{monthlyStats?.growth?.worst || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">{t('feeding.totalFeedToday')}</div>
          <div className="stat-value">{totalFeed.toLocaleString()} kg</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('feeding.completed')}</div>
          <div className="stat-value ok">{completedFeedings}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('feeding.scheduled')}</div>
          <div className="stat-value warn">{scheduledFeedings}</div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">{t('feeding.feedingLog')}</h3>
        {loading ? (
          <p>{t('feeding.loadingData')}</p>
        ) : feedingData.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>{t('feeding.noFeedingData')}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('feeding.location')}</th>
                <th>{t('feeding.cage')}</th>
                <th>{t('feeding.date')}</th>
                <th>{t('feeding.amountKg')}</th>
                <th>{t('feeding.feedType')}</th>
                <th>{t('feeding.status')}</th>
              </tr>
            </thead>
            <tbody>
              {feedingData.map(item => (
                <tr key={item.id}>
                  <td>{item.location || '-'}</td>
                  <td>{item.merdName || '-'}</td>
                  <td>{item.date || '-'}</td>
                  <td>{(item.amount || 0).toLocaleString()}</td>
                  <td>{item.feedType || '-'}</td>
                  <td>
                    <span className={`badge ${item.status === 'completed' ? 'ok' : 'warn'}`}>
                      {item.status === 'completed' ? t('feeding.completedStatus') : t('feeding.scheduledStatus')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
