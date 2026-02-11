import { useMemo } from 'react'
import PropTypes from 'prop-types'
import Modal from './Modal'

// Generate historical data based on cage's current state
function generateLiceHistory(cage) {
  if (!cage) return []

  const today = new Date()
  const history = []

  // Generate 4 weeks of data, working backwards
  for (let i = 0; i < 4; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - (i * 7))

    // Base the values on current lice level with some variation
    let baseLice
    switch (cage.liceLevel) {
      case 'DANGER':
        baseLice = 0.4 + Math.random() * 0.3
        break
      case 'WARNING':
        baseLice = 0.25 + Math.random() * 0.2
        break
      default:
        baseLice = 0.1 + Math.random() * 0.25
    }

    // Add some trend (getting worse or better over time)
    const trendFactor = 1 + (i * 0.05) // Older readings slightly lower
    const licePerFish = Math.max(0, baseLice * trendFactor + (Math.random() - 0.5) * 0.1)

    const status = licePerFish > 0.5 ? 'DANGER' : licePerFish > 0.3 ? 'WARNING' : 'OK'

    history.push({
      date: date.toLocaleDateString('nb-NO'),
      licePerFish: licePerFish.toFixed(2),
      fishCounted: Math.floor(15 + Math.random() * 10),
      status
    })
  }

  return history
}

function generateTreatmentHistory(cage) {
  if (!cage) return []

  // Only show treatments if cage has warning or danger level
  if (cage.liceLevel === 'OK') {
    return []
  }

  const today = new Date()
  const treatments = []

  // Add a treatment from a few weeks ago
  const treatmentDate = new Date(today)
  treatmentDate.setDate(treatmentDate.getDate() - 21)

  treatments.push({
    date: treatmentDate.toLocaleDateString('nb-NO'),
    type: Math.random() > 0.5 ? 'Termisk' : 'Mekanisk',
    result: cage.liceLevel === 'DANGER' ? 'Moderat effekt' : 'God effekt'
  })

  return treatments
}

function getStatusStyle(status) {
  switch (status) {
    case 'DANGER':
      return { background: '#fee2e2', color: '#991b1b' }
    case 'WARNING':
      return { background: '#fef3c7', color: '#92400e' }
    default:
      return { background: '#dcfce7', color: '#166534' }
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'DANGER':
      return 'Kritisk'
    case 'WARNING':
      return 'Forhøyet'
    default:
      return 'OK'
  }
}

export default function HistoryModal({ isOpen, cage, onClose }) {
  const liceHistory = useMemo(() => generateLiceHistory(cage), [cage])
  const treatmentHistory = useMemo(() => generateTreatmentHistory(cage), [cage])

  if (!cage) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Historikk - ${cage.name}`} maxWidth="900px" zIndex={1003}>
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1f2937' }}>
          Lusetellinger siste 30 dager
        </h3>
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Dato</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Antall lus/fisk</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Antall fisk telt</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {liceHistory.map((entry, idx) => (
                <tr key={idx} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontSize: '14px' }}>{entry.date}</td>
                  <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600 }}>{entry.licePerFish}</td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>{entry.fishCounted}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      ...getStatusStyle(entry.status),
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      {getStatusLabel(entry.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1f2937' }}>
          Behandlinger
        </h3>
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Dato</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Type</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Resultat</th>
              </tr>
            </thead>
            <tbody>
              {treatmentHistory.length > 0 ? (
                treatmentHistory.map((treatment, idx) => (
                  <tr key={idx} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{treatment.date}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{treatment.type}</td>
                    <td style={{
                      padding: '12px',
                      fontSize: '14px',
                      color: treatment.result === 'God effekt' ? '#10b981' : '#f59e0b',
                      fontWeight: 600
                    }}>
                      {treatment.result}
                    </td>
                  </tr>
                ))
              ) : (
                <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                    Ingen behandlinger registrert
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <button
        onClick={onClose}
        style={{
          width: '100%',
          padding: '12px',
          background: '#e5e7eb',
          color: '#1f2937',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        Lukk
      </button>
    </Modal>
  )
}

HistoryModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  cage: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    liceLevel: PropTypes.oneOf(['OK', 'WARNING', 'DANGER'])
  }),
  onClose: PropTypes.func.isRequired
}
