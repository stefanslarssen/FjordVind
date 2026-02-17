import Modal from './Modal'

export default function FeedingPlanModal({ isOpen, cage, onClose, onSave }) {
  if (!cage) return null

  const handleSave = () => {
    onSave?.()
    alert('Fôringsplan oppdatert!')
    onClose()
  }

  // Note: zIndex 1003 to appear above CageDetailsModal (1000)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Fôringsplan - ${cage.name}`} maxWidth="700px" zIndex={1003}>
      <div style={{
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#166534' }}>
          Gjeldende plan
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px', color: '#15803d' }}>
          <div>
            <strong>Daglig fôr:</strong> {(cage.feedStorageKg / 14 / 1000).toFixed(1)} tonn/dag
          </div>
          <div>
            <strong>Fôrtider:</strong> 06:00, 14:00, 18:00
          </div>
          <div>
            <strong>Fôrtype:</strong> Premium Polar 9mm
          </div>
          <div>
            <strong>FCR mål:</strong> 1.15
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
          Daglig fôrmengde (kg)
        </label>
        <input
          type="number"
          defaultValue={(cage.feedStorageKg / 14).toFixed(0)}
          min="0"
          step="10"
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
          Antall fôringer per dag
        </label>
        <select
          defaultValue="3"
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        >
          <option value="2">2 ganger</option>
          <option value="3">3 ganger</option>
          <option value="4">4 ganger</option>
          <option value="5">5 ganger</option>
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
          Fôrtype
        </label>
        <select style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px'
        }}>
          <option>Premium Polar 6mm</option>
          <option>Premium Polar 9mm</option>
          <option>Premium Polar 12mm</option>
          <option>Rapid 9mm</option>
        </select>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
          Fôrtider
        </label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input type="time" defaultValue="06:00" style={{
            flex: 1,
            padding: '10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px'
          }} />
          <input type="time" defaultValue="14:00" style={{
            flex: 1,
            padding: '10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px'
          }} />
          <input type="time" defaultValue="18:00" style={{
            flex: 1,
            padding: '10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px'
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleSave}
          style={{
            flex: 1,
            padding: '12px',
            background: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Lagre plan
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
