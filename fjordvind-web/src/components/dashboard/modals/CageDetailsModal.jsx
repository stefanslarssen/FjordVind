import Modal from './Modal'
import { getWelfareColor } from '../../../utils/tipGenerators'

export default function CageDetailsModal({
  isOpen,
  cage,
  onClose,
  onShowHistory,
  onShowRegistration,
  onShowTreatment,
  onShowFeedingPlan
}) {
  if (!cage) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${cage.name} - Detaljer`} maxWidth="800px">
      <div className="modal-grid-3" style={{ marginBottom: '24px' }}>
        <div style={{
          background: '#f3f4f6',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
            Velferdsscore
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: 700,
            color: getWelfareColor(cage.welfareScore)
          }}>
            {cage.welfareScore}
          </div>
        </div>

        <div style={{
          background: '#f3f4f6',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
            Antall fisk
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937' }}>
            {cage.fishCount.toLocaleString()}
          </div>
        </div>

        <div style={{
          background: '#f3f4f6',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
            Biomasse
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937' }}>
            {(cage.biomassKg / 1000).toFixed(1)} tonn
          </div>
        </div>

        <div style={{
          background: '#f3f4f6',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
            Snitt vekt
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>
            {cage.avgWeightGrams.toFixed(1)} g
          </div>
        </div>

        <div style={{
          background: '#f3f4f6',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
            Dødelighet
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>
            {cage.mortalityRate.toFixed(2)}%
          </div>
        </div>

        <div style={{
          background: '#f3f4f6',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
            Vekstrate
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
            {cage.growthRate.toFixed(0)}
          </div>
        </div>

        <div style={{
          background: '#f3f4f6',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
            Temperatur
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>
            {cage.temperatureCelsius.toFixed(1)}°C
          </div>
        </div>

        <div style={{
          background: '#f3f4f6',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
            Oksygen
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
            {cage.oxygenPercent.toFixed(1)}%
          </div>
        </div>

        <div style={{
          background: '#f3f4f6',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
            Fôrlagring
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6' }}>
            {(cage.feedStorageKg / 1000).toFixed(1)} tonn
          </div>
        </div>
      </div>

      <div style={{
        background: cage.liceLevel === 'DANGER' ? '#fef2f2' :
                    cage.liceLevel === 'WARNING' ? '#fffbeb' : '#f0fdf4',
        border: `2px solid ${
          cage.liceLevel === 'DANGER' ? '#ef4444' :
          cage.liceLevel === 'WARNING' ? '#f59e0b' : '#10b981'
        }`,
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          color: cage.liceLevel === 'DANGER' ? '#991b1b' :
                 cage.liceLevel === 'WARNING' ? '#92400e' : '#065f46',
          marginBottom: '8px'
        }}>
          Lusestatus: {cage.liceLevel}
        </div>
        <div style={{
          fontSize: '13px',
          color: cage.liceLevel === 'DANGER' ? '#7f1d1d' :
                 cage.liceLevel === 'WARNING' ? '#78350f' : '#064e3b'
        }}>
          {cage.liceLevel === 'DANGER' && 'Kritisk nivå - handling kreves umiddelbart'}
          {cage.liceLevel === 'WARNING' && 'Forhøyet nivå - monitorering anbefales'}
          {cage.liceLevel === 'OK' && 'Normalt nivå - fortsett monitorering'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={onShowHistory}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600
          }}>
          Se historikk
        </button>
        <button
          onClick={onShowRegistration}
          style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600
          }}>
          Registrer telling
        </button>
        <button
          onClick={onShowTreatment}
          style={{
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600
          }}>
          Registrer behandling
        </button>
        <button
          onClick={onShowFeedingPlan}
          style={{
            background: '#8b5cf6',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600
          }}>
          Fôringsplan
        </button>
      </div>
    </Modal>
  )
}
