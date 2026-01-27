import { getWelfareColor } from '../../utils/tipGenerators'
import OperationalTipCard from './OperationalTipCard'

export default function StatusSidebar({ overview, currentTip, onShowTipDetails }) {
  return (
    <div className="status-sidebar">
      {/* Status Summary */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
          Status oversikt
        </div>

        <div style={{
          background: getWelfareColor('A'),
          color: 'white',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>A {overview.scoreACount}</div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>
            {((overview.scoreACount / overview.totalCages) * 100).toFixed(0)}%
          </div>
        </div>

        <div style={{
          background: getWelfareColor('B'),
          color: 'white',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>B {overview.scoreBCount}</div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>
            {((overview.scoreBCount / overview.totalCages) * 100).toFixed(0)}%
          </div>
        </div>

        <div style={{
          background: getWelfareColor('C'),
          color: 'white',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>C {overview.scoreCCount}</div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>
            {((overview.scoreCCount / overview.totalCages) * 100).toFixed(0)}%
          </div>
        </div>

        <div style={{
          background: '#6b7280',
          color: 'white',
          padding: '12px',
          borderRadius: '6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>D {overview.scoreDCount}</div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>
            {overview.totalCages > 0 ? ((overview.scoreDCount / overview.totalCages) * 100).toFixed(0) : 0}%
          </div>
        </div>
      </div>

      {/* Operational Tip */}
      {currentTip && (
        <OperationalTipCard tip={currentTip} onShowDetails={onShowTipDetails} />
      )}
    </div>
  )
}
