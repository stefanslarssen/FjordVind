import Modal from './Modal'

export default function ImportExportModal({ isOpen, selectedLocality, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import/Export Data">
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#1f2937' }}>
          Eksporter data
        </h3>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
          Last ned data for {selectedLocality} som CSV eller Excel fil.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => alert('Eksporterer til CSV...')}
            style={{
              flex: 1,
              padding: '12px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Eksporter CSV
          </button>
          <button
            onClick={() => alert('Eksporterer til Excel...')}
            style={{
              flex: 1,
              padding: '12px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Eksporter Excel
          </button>
        </div>
      </div>

      <div style={{
        borderTop: '1px solid #e5e7eb',
        paddingTop: '24px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#1f2937' }}>
          Importer data
        </h3>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
          Last opp CSV eller Excel fil med lusedata.
        </p>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{
            width: '100%',
            padding: '12px',
            border: '2px dashed #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            marginBottom: '16px',
            cursor: 'pointer'
          }}
        />
        <button
          onClick={() => alert('Importerer data...')}
          style={{
            width: '100%',
            padding: '12px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Importer
        </button>
      </div>
    </Modal>
  )
}
