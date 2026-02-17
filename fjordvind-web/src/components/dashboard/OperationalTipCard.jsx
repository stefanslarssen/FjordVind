export default function OperationalTipCard({ tip, onShowDetails }) {
  if (!tip) return null

  return (
    <div style={{
      background: '#4a9fb5',
      color: 'white',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
        {tip.title}
      </div>
      <div style={{ fontSize: '12px', lineHeight: 1.6, marginBottom: '12px' }}>
        {tip.message}
      </div>
      <div style={{
        fontSize: '13px',
        fontWeight: 600,
        marginBottom: '12px',
        background: 'rgba(255,255,255,0.15)',
        padding: '8px',
        borderRadius: '4px'
      }}>
        Potensial besparelse: {tip.savings}
      </div>
      <button
        onClick={onShowDetails}
        style={{
          background: 'rgba(255,255,255,0.2)',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          width: '100%',
          fontWeight: 600,
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
        onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
      >
        Vis meg hvordan →
      </button>
    </div>
  )
}
