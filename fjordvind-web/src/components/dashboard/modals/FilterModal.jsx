import PropTypes from 'prop-types'
import Modal from './Modal'

export default function FilterModal({ isOpen, filterSettings, onFilterChange, onClose }) {
  const handleWelfareChange = (score, checked) => {
    if (checked) {
      onFilterChange({
        ...filterSettings,
        welfareScores: [...filterSettings.welfareScores, score]
      })
    } else {
      onFilterChange({
        ...filterSettings,
        welfareScores: filterSettings.welfareScores.filter(s => s !== score)
      })
    }
  }

  const handleLiceLevelChange = (level, checked) => {
    if (checked) {
      onFilterChange({
        ...filterSettings,
        liceLevels: [...filterSettings.liceLevels, level]
      })
    } else {
      onFilterChange({
        ...filterSettings,
        liceLevels: filterSettings.liceLevels.filter(l => l !== level)
      })
    }
  }

  const handleReset = () => {
    onFilterChange({
      welfareScores: ['A', 'B', 'C', 'D'],
      liceLevels: ['OK', 'WARNING', 'DANGER'],
      minBiomass: 0,
      maxBiomass: 500000
    })
  }

  const handleApply = () => {
    // Filter is applied in real-time via onFilterChange
    // Just close the modal
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Filtrer Merder" maxWidth="500px" zIndex={1002}>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
          Velferdsscore
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['A', 'B', 'C', 'D'].map(score => (
            <label key={score} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filterSettings.welfareScores.includes(score)}
                onChange={(e) => handleWelfareChange(score, e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '14px' }}>Score {score}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
          Lusenivå
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { value: 'OK', label: 'OK' },
            { value: 'WARNING', label: 'Forhøyet' },
            { value: 'DANGER', label: 'Kritisk' }
          ].map(level => (
            <label key={level.value} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filterSettings.liceLevels.includes(level.value)}
                onChange={(e) => handleLiceLevelChange(level.value, e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '14px' }}>{level.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <button
          onClick={handleApply}
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
          Bruk filter
        </button>
        <button
          onClick={handleReset}
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
          Tilbakestill
        </button>
      </div>
    </Modal>
  )
}

FilterModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  filterSettings: PropTypes.shape({
    welfareScores: PropTypes.arrayOf(PropTypes.oneOf(['A', 'B', 'C', 'D'])).isRequired,
    liceLevels: PropTypes.arrayOf(PropTypes.oneOf(['OK', 'WARNING', 'DANGER'])).isRequired,
    minBiomass: PropTypes.number.isRequired,
    maxBiomass: PropTypes.number.isRequired
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
}
