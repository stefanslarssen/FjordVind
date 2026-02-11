import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function DodlighetPage() {
  const { user } = useAuth()
  const [summaries, setSummaries] = useState([])
  const [merds, setMerds] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [selectedMerd, setSelectedMerd] = useState('')
  const [antallDode, setAntallDode] = useState('')
  const [arsak, setArsak] = useState('Ukjent')
  const [notat, setNotat] = useState('')
  const [saving, setSaving] = useState(false)

  const arsaker = ['Ukjent', 'Sykdom', 'Haandtering', 'Predator', 'Miljoe', 'Behandling', 'Annet']

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // Load merds
      const { data: merdsData } = await supabase
        .from('merds')
        .select('id, merd_id, navn, lokalitet')
        .eq('is_active', true)

      setMerds(merdsData || [])

      // Load mortality records
      const { data: mortalityData } = await supabase
        .from('mortality_records')
        .select('merd_id, antall_dode')

      // Calculate totals per merd
      const totalsMap = {}
      ;(mortalityData || []).forEach(r => {
        totalsMap[r.merd_id] = (totalsMap[r.merd_id] || 0) + r.antall_dode
      })

      // Create summaries for all merds
      const summaryList = (merdsData || []).map(m => ({
        merd_id: m.id,
        merd_navn: m.navn || m.merd_id,
        lokalitet: m.lokalitet || '',
        total_dode: totalsMap[m.id] || 0,
      }))

      setSummaries(summaryList)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedMerd || !antallDode) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('mortality_records')
        .insert({
          merd_id: selectedMerd,
          user_id: user?.id,
          dato: new Date().toISOString().split('T')[0],
          antall_dode: parseInt(antallDode),
          arsak: arsak,
          notat: notat || null,
        })

      if (error) throw error

      // Reset form and reload
      setSelectedMerd('')
      setAntallDode('')
      setArsak('Ukjent')
      setNotat('')
      setShowForm(false)
      loadData()
    } catch (error) {
      console.error('Error saving:', error)
      alert('Kunne ikke lagre: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const getTotal = () => summaries.reduce((sum, s) => sum + s.total_dode, 0)

  return (
    <div style={{ padding: '0 16px 16px 16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid var(--border)',
        marginBottom: '20px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px' }}>Dodlighet</h1>
        </div>
        <button
          className="btn"
          style={{ background: '#ef4444', color: '#fff' }}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Avbryt' : '+ Registrer'}
        </button>
      </div>

      {loading ? (
        <p>Laster...</p>
      ) : (
        <>
          {/* Merd oversikt - alltid synlig */}
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '12px'
          }}>
            {summaries.map(s => (
              <div
                key={s.merd_id}
                style={{
                  background: 'var(--panel)',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  textAlign: 'center'
                }}
              >
                <div style={{ color: 'var(--text)', fontWeight: '500', marginBottom: '4px' }}>
                  {s.merd_navn}
                </div>
                <div style={{ color: '#ef4444', fontSize: '24px', fontWeight: 'bold' }}>
                  {s.total_dode}
                </div>
              </div>
            ))}
          </div>

          {/* Oppsummering */}
          <div style={{
            background: '#ef4444',
            borderRadius: '8px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#fff',
            marginBottom: '20px'
          }}>
            <span style={{ fontSize: '16px', fontWeight: '500' }}>Oppsummering</span>
            <span style={{ fontSize: '28px', fontWeight: 'bold' }}>{getTotal()}</span>
          </div>

          {/* Registration Form */}
          {showForm && (
            <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
              <h3 style={{ marginTop: 0 }}>Registrer dodlighet</h3>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Merd</label>
                    <select
                      value={selectedMerd}
                      onChange={(e) => setSelectedMerd(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                      required
                    >
                      <option value="">Velg merd...</option>
                      {merds.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.lokalitet} - {m.navn || m.merd_id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Antall dode</label>
                    <input
                      type="number"
                      value={antallDode}
                      onChange={(e) => setAntallDode(e.target.value)}
                      placeholder="0"
                      min="1"
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                      required
                    />
                  </div>
                </div>

                {/* Quick buttons */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {[1, 5, 10, 25, 50, 100].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setAntallDode(prev => (parseInt(prev || '0') + num).toString())}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'var(--panel)',
                        color: 'var(--text)',
                        cursor: 'pointer'
                      }}
                    >
                      +{num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAntallDode('')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'transparent',
                      color: 'var(--muted)',
                      cursor: 'pointer'
                    }}
                  >
                    Nullstill
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Arsak</label>
                    <select
                      value={arsak}
                      onChange={(e) => setArsak(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                    >
                      {arsaker.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Notat</label>
                    <input
                      type="text"
                      value={notat}
                      onChange={(e) => setNotat(e.target.value)}
                      placeholder="Valgfritt..."
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn"
                  style={{ background: '#ef4444', color: '#fff', width: '100%', padding: '12px' }}
                >
                  {saving ? 'Lagrer...' : 'Lagre dodlighet'}
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  )
}
