import Modal from './Modal'

export default function TreatmentModal({ isOpen, cage, viewDate, onClose, onSave }) {
  if (!cage) return null

  const handleSave = () => {
    onSave?.()
    alert('Behandling registrert!')
    onClose()
  }

  // Note: zIndex 1003 to appear above CageDetailsModal (1000)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Registrer behandling - ${cage.name}`} zIndex={1003}>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
          Type behandling
        </label>
        <select style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px'
        }}>
          <option>Velg behandlingstype...</option>
          <option>Termisk avlusning</option>
          <option>Mekanisk avlusning</option>
          <option>Medikamentell behandling</option>
          <option>Ferskvann</option>
          <option>Hydrogen peroksid</option>
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
          Dato
        </label>
        <input
          type="date"
          defaultValue={viewDate}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
          Varighet (timer)
        </label>
        <input
          type="number"
          placeholder="4"
          min="0"
          step="0.5"
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
          Notater
        </label>
        <textarea
          placeholder="Legg til kommentarer eller observasjoner..."
          rows="4"
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleSave}
          style={{
            flex: 1,
            padding: '12px',
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Lagre
        </button>
        <button
          onClick={onClose}
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
