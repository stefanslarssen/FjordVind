export default function DashboardHeader({
  selectedLocality,
  localities,
  totalFish,
  onLocalityChange
}) {
  return (
    <div className="header-row" style={{
      background: '#37626b',
      color: 'white',
      padding: '12px 24px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '18px', fontWeight: 600 }}>LUSEVOKTEREN Farmer</div>
        <select
          value={selectedLocality || ''}
          onChange={(e) => onLocalityChange(e.target.value)}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: 'none',
            background: '#2d4f57',
            color: 'white',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          {localities.map(loc => (
            <option key={loc.name} value={loc.name}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>
      <div style={{ fontSize: '14px', fontWeight: 500 }}>
        {totalFish?.toLocaleString()} fisk
      </div>
    </div>
  )
}
