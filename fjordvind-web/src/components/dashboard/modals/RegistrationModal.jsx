import { useState, useEffect } from 'react'
import Modal from './Modal'

export default function RegistrationModal({
  isOpen,
  cages,
  selectedMerdId,
  viewDate,
  onClose,
  onSave
}) {
  const [liceCountsPerFish, setLiceCountsPerFish] = useState([])
  const [currentLiceCount, setCurrentLiceCount] = useState('')
  const [selectedMerd, setSelectedMerd] = useState(selectedMerdId || '')

  // Sync selectedMerd when selectedMerdId prop changes
  useEffect(() => {
    if (selectedMerdId) {
      setSelectedMerd(selectedMerdId)
    }
  }, [selectedMerdId])

  const addFish = () => {
    const liceCount = parseFloat(currentLiceCount)
    if (!isNaN(liceCount) && liceCount >= 0) {
      setLiceCountsPerFish([...liceCountsPerFish, liceCount])
      setCurrentLiceCount('')
    }
  }

  const removeFish = (index) => {
    setLiceCountsPerFish(liceCountsPerFish.filter((_, i) => i !== index))
  }

  const calculateAverage = () => {
    if (liceCountsPerFish.length === 0) return 0
    const sum = liceCountsPerFish.reduce((acc, count) => acc + count, 0)
    return sum / liceCountsPerFish.length
  }

  const handleSave = () => {
    if (liceCountsPerFish.length === 0) {
      alert('Vennligst legg til minst én fisk før du lagrer.')
      return
    }
    if (!selectedMerd) {
      alert('Vennligst velg en merd.')
      return
    }
    const cage = cages?.find(c => c.id === parseInt(selectedMerd))
    onSave?.({
      merdId: selectedMerd,
      merdName: cage?.name,
      fishCount: liceCountsPerFish.length,
      average: calculateAverage(),
      counts: liceCountsPerFish
    })
    setLiceCountsPerFish([])
    setCurrentLiceCount('')
    setSelectedMerd('')
    onClose()
  }

  const handleClose = () => {
    setLiceCountsPerFish([])
    setCurrentLiceCount('')
    setSelectedMerd('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Registrer Lusetelling" zIndex={1002}>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
          Velg merd
        </label>
        <select
          value={selectedMerd}
          onChange={(e) => setSelectedMerd(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        >
          <option value="">Velg en merd...</option>
          {cages?.map(cage => (
            <option key={cage.id} value={cage.id}>{cage.name}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
          Dato
        </label>
        <input
          type="date"
          value={viewDate}
          readOnly
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
      </div>

      {/* Individual fish entry section */}
      <div style={{
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px'
      }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
          Tell lus per fisk
        </label>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px', marginTop: 0 }}>
          Anbefalt utvalg: 10-20 fisk
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="number"
            value={currentLiceCount}
            onChange={(e) => setCurrentLiceCount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addFish()
              }
            }}
            placeholder="Antall lus på fisken"
            min="0"
            step="1"
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
          <button
            onClick={addFish}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Legg til fisk
          </button>
        </div>

        {/* Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '11px', color: '#1e40af', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
              Antall fisk telt
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e40af' }}>
              {liceCountsPerFish.length}
            </div>
          </div>
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '11px', color: '#15803d', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
              Gjennomsnitt
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#15803d' }}>
              {liceCountsPerFish.length > 0 ? calculateAverage().toFixed(2) : '0.00'}
            </div>
          </div>
        </div>

        {/* List of entered fish */}
        {liceCountsPerFish.length > 0 && (
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            background: 'white'
          }}>
            {liceCountsPerFish.map((count, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderBottom: index < liceCountsPerFish.length - 1 ? '1px solid #f3f4f6' : 'none'
                }}
              >
                <span style={{ fontSize: '14px', color: '#1f2937' }}>
                  Fisk #{index + 1}: <strong>{count}</strong> lus
                </span>
                <button
                  onClick={() => removeFish(index)}
                  style={{
                    background: '#fee2e2',
                    color: '#991b1b',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Fjern
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleSave}
          disabled={liceCountsPerFish.length === 0 || !selectedMerd}
          style={{
            flex: 1,
            padding: '12px',
            background: liceCountsPerFish.length === 0 || !selectedMerd ? '#d1d5db' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: liceCountsPerFish.length === 0 || !selectedMerd ? 'not-allowed' : 'pointer'
          }}
        >
          Lagre
        </button>
        <button
          onClick={handleClose}
          style={{
            padding: '12px 24px',
            background: '#e5e7eb',
            color: '#1f2937',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Avbryt
        </button>
      </div>
    </Modal>
  )
}
