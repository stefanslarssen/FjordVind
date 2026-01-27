export default function BottomSummaryBar({ localityData }) {
  if (!localityData) return null

  return (
    <div className="summary-bar">
      <div>
        <span style={{ fontSize: '28px', fontWeight: 700 }}>
          {localityData.aggregated.totalFish.toLocaleString()}
        </span>
        <span style={{ fontSize: '13px', opacity: 0.8, marginLeft: '8px' }}>fisk</span>
      </div>
      <div>
        <span style={{ opacity: 0.8, fontSize: '13px', marginRight: '8px' }}>Snitt vekt</span>
        <span style={{ fontSize: '28px', fontWeight: 700 }}>
          {localityData.aggregated.avgWeightGrams.toFixed(2)}
        </span>
        <span style={{ fontSize: '13px', opacity: 0.8, marginLeft: '4px' }}>gram</span>
      </div>
      <div>
        <span style={{ opacity: 0.8, fontSize: '13px', marginRight: '8px' }}>Biomasse</span>
        <span style={{ fontSize: '28px', fontWeight: 700 }}>
          {(localityData.aggregated.totalBiomassKg / 1000).toLocaleString()}
        </span>
        <span style={{ fontSize: '13px', opacity: 0.8, marginLeft: '4px' }}>tonn</span>
      </div>
      <div>
        <span style={{ opacity: 0.8, fontSize: '13px', marginRight: '8px' }}>MTB</span>
        <span style={{ fontSize: '28px', fontWeight: 700 }}>82</span>
        <span style={{ fontSize: '13px', opacity: 0.8 }}>%</span>
      </div>
    </div>
  )
}
