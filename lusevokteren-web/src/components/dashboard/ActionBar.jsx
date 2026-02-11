export default function ActionBar({
  viewDate,
  onDateChange,
  onOpenRegistration,
  onOpenFilter,
  onNavigateReports
}) {
  return (
    <div style={{
      background: 'var(--panel)',
      padding: '12px 24px',
      display: 'flex',
      gap: '12px',
      borderBottom: '1px solid var(--border)',
      alignItems: 'center',
      flexWrap: 'wrap'
    }}>
      <button
        onClick={onOpenRegistration}
        style={{
          padding: '8px 16px',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s'
        }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        Registreringer
      </button>
      <button
        onClick={onNavigateReports}
        style={{
          padding: '8px 16px',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s'
        }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        Rapporter
      </button>
      <button
        onClick={onOpenFilter}
        style={{
          padding: '8px 16px',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s'
        }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        </svg>
        Filter
      </button>
      <div style={{ flex: 1 }}></div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: '8px'
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <input
          type="date"
          value={viewDate}
          onChange={(e) => onDateChange(e.target.value)}
          style={{
            padding: '0',
            border: 'none',
            background: 'transparent',
            color: 'var(--text)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        />
      </div>
    </div>
  )
}
