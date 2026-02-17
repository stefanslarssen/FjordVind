import PropTypes from 'prop-types'
import { getWelfareColor, calculateDensity } from '../../utils/tipGenerators'

export default function CageGrid({ cages = [], selectedCage, onSelectCage }) {
  if (!cages || cages.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#6b7280',
        background: '#f9fafb',
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        Ingen merder å vise
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    }}>
      {cages.map((cage, idx) => {
        const cageNumber = idx + 1
        const welfareColor = getWelfareColor(cage.welfareScore)
        const density = calculateDensity(cage.biomassKg, cage.capacityTonnes || 250)

        return (
          <div
            key={cage.id}
            onClick={() => onSelectCage(cage)}
            style={{
              background: selectedCage?.id === cage.id ? '#2d4f57' : '#3d6975',
              borderRadius: '8px',
              padding: '16px',
              position: 'relative',
              color: 'white',
              boxShadow: selectedCage?.id === cage.id
                ? '0 4px 12px rgba(0,0,0,0.3)'
                : '0 2px 4px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              transform: selectedCage?.id === cage.id ? 'translateY(-2px)' : 'translateY(0)',
              border: selectedCage?.id === cage.id ? '2px solid #fff' : '2px solid transparent'
            }}
            onMouseEnter={(e) => {
              if (selectedCage?.id !== cage.id) {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)'
              }
            }}
            onMouseLeave={(e) => {
              if (selectedCage?.id !== cage.id) {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
              }
            }}
          >
            {/* Top badges */}
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 700
            }}>
              {cageNumber}
            </div>

            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              display: 'flex',
              gap: '4px'
            }}>
              {cage.liceLevel !== 'OK' && (
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: cage.liceLevel === 'DANGER' ? '#ef4444' : '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700
                }}>
                  !
                </div>
              )}
            </div>

            {/* Status Circle */}
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: welfareColor,
              margin: '32px auto 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 700,
              border: '4px solid rgba(255,255,255,0.2)'
            }}>
              {cage.welfareScore}
            </div>

            {/* Density Bar */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '10px',
                opacity: 0.8,
                marginBottom: '4px',
                textTransform: 'uppercase'
              }}>
                TETTHET
              </div>
              <div style={{
                height: '6px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  background: 'white',
                  width: `${Math.min((density / 30) * 100, 100)}%`
                }}></div>
              </div>
              <div style={{ fontSize: '11px', marginTop: '2px' }}>
                {density.toFixed(1)} kg/m³
              </div>
            </div>

            {/* Stats */}
            <div style={{
              fontSize: '20px',
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: '4px'
            }}>
              {cage.fishCount.toLocaleString()}
            </div>
            <div style={{
              fontSize: '11px',
              opacity: 0.8,
              textAlign: 'center',
              marginBottom: '12px'
            }}>
              Fisk
            </div>

            <div style={{
              fontSize: '13px',
              opacity: 0.9,
              textAlign: 'center',
              marginBottom: '2px'
            }}>
              Snitt vekt {cage.avgWeightGrams.toFixed(1)} gram
            </div>
            <div style={{
              fontSize: '13px',
              opacity: 0.9,
              textAlign: 'center'
            }}>
              Biomasse {(cage.biomassKg / 1000).toFixed(0)} tonn
            </div>
          </div>
        )
      })}
    </div>
  )
}

CageGrid.propTypes = {
  cages: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string,
    fishCount: PropTypes.number.isRequired,
    biomassKg: PropTypes.number.isRequired,
    avgWeightGrams: PropTypes.number.isRequired,
    welfareScore: PropTypes.oneOf(['A', 'B', 'C', 'D']).isRequired,
    liceLevel: PropTypes.oneOf(['OK', 'WARNING', 'DANGER']).isRequired,
    capacityTonnes: PropTypes.number
  })),
  selectedCage: PropTypes.object,
  onSelectCage: PropTypes.func.isRequired
}
