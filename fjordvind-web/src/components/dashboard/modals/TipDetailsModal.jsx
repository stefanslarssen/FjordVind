import Modal from './Modal'

export default function TipDetailsModal({ isOpen, tip, onClose }) {
  if (!tip) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={tip.title} maxWidth="700px" zIndex={1001}>
      <div style={{
        background: '#f0fdf4',
        border: '2px solid #10b981',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ fontSize: '14px', color: '#065f46', fontWeight: 600, marginBottom: '4px' }}>
          Estimert besparelse
        </div>
        <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981' }}>
          {tip.savings}
        </div>
      </div>

      {/* Cost Breakdown Section */}
      {tip.details.costBreakdown && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '12px' }}>
            Kostnadsanalyse
          </h3>
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {tip.details.costBreakdown.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '16px',
                  borderBottom: idx < tip.details.costBreakdown.length - 1 ? '1px solid #e5e7eb' : 'none',
                  background: item.isSaving ? '#f0fdf4' : 'white'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '4px'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
                    {item.label}
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: item.isSaving ? '#10b981' : (item.amount < 0 ? '#10b981' : '#1f2937'),
                    whiteSpace: 'nowrap',
                    marginLeft: '16px'
                  }}>
                    {item.isSaving ? '-' : ''}{Math.abs(item.amount).toLocaleString()} NOK
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.5 }}>
                  {item.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '12px' }}>
          Berørte merder
        </h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {tip.details.affectedCages.map((cageName, idx) => (
            <div
              key={idx}
              style={{
                background: '#e5e7eb',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#1f2937',
                fontWeight: 500
              }}
            >
              {cageName}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '12px' }}>
          Hva som må gjøres
        </h3>
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <p style={{ fontSize: '14px', color: '#92400e', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line' }}>
            {tip.details.recommendation}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '12px' }}>
          Forventet effekt
        </h3>
        <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.6, margin: 0 }}>
          {tip.details.impact}
        </p>
      </div>

      <div style={{
        background: '#f3f4f6',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
          Estimert tidsramme
        </div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
          {tip.details.estimatedTime}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onClose}
          style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            flex: 1
          }}
        >
          {tip.action}
        </button>
        <button
          onClick={onClose}
          style={{
            background: '#e5e7eb',
            color: '#1f2937',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600
          }}
        >
          Lukk
        </button>
      </div>
    </Modal>
  )
}
