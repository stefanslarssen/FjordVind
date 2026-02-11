import Modal from './Modal'

export default function ReportsModal({ isOpen, onClose }) {
  const reports = [
    {
      title: 'Ukentlig Luserapport',
      description: 'Sammendrag av lusetellinger siste 7 dager',
      action: () => alert('Åpner ukentlig luserapport...')
    },
    {
      title: 'Månedlig Produksjonsrapport',
      description: 'Biomasse, vekst, dødelighet og fôrforbruk',
      action: () => alert('Åpner månedlig produksjonsrapport...')
    },
    {
      title: 'Velferdsrapport',
      description: 'Velferdsscore og nøkkelindikatorer per merd',
      action: () => alert('Åpner velferdsrapport...')
    },
    {
      title: 'Behandlingshistorikk',
      description: 'Oversikt over alle lusebehandlinger',
      action: () => alert('Åpner behandlingshistorikk...')
    }
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rapporter" maxWidth="700px">
      <div style={{ display: 'grid', gap: '16px' }}>
        {reports.map((report, idx) => (
          <div
            key={idx}
            onClick={report.action}
            style={{
              padding: '16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: 'white'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
              {report.title}
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              {report.description}
            </p>
          </div>
        ))}
      </div>
    </Modal>
  )
}
