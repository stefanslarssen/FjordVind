import { useNavigate } from 'react-router-dom'
import { useDashboard } from '../hooks/useDashboard'
import PredictiveAnalysisBanner from '../components/PredictiveAnalysisBanner'

// Dashboard components
import DashboardHeader from '../components/dashboard/DashboardHeader'
import ActionBar from '../components/dashboard/ActionBar'
import CageGrid from '../components/dashboard/CageGrid'
import ChartsGrid from '../components/dashboard/ChartsGrid'
import StatusSidebar from '../components/dashboard/StatusSidebar'
import HistoricalTrendsSection from '../components/dashboard/HistoricalTrendsSection'
import BottomSummaryBar from '../components/dashboard/BottomSummaryBar'

// Modal components
import CageDetailsModal from '../components/dashboard/modals/CageDetailsModal'
import TipDetailsModal from '../components/dashboard/modals/TipDetailsModal'
import RegistrationModal from '../components/dashboard/modals/RegistrationModal'
import ImportExportModal from '../components/dashboard/modals/ImportExportModal'
import ReportsModal from '../components/dashboard/modals/ReportsModal'
import FilterModal from '../components/dashboard/modals/FilterModal'
import HistoryModal from '../components/dashboard/modals/HistoryModal'
import TreatmentModal from '../components/dashboard/modals/TreatmentModal'
import FeedingPlanModal from '../components/dashboard/modals/FeedingPlanModal'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { state, actions } = useDashboard()

  // Loading state
  if (state.loading) {
    return (
      <div style={{ background: '#0f172a', minHeight: '100vh', padding: '20px' }}>
        <PredictiveAnalysisBanner
          onPlanTreatment={() => navigate('/treatments')}
          onSeeDetails={() => navigate('/predictions')}
        />
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #334155',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          Laster dashboard data...
        </div>
      </div>
    )
  }

  // Error state with retry button
  if (state.error) {
    return (
      <div style={{ background: '#0f172a', minHeight: '100vh', padding: '20px' }}>
        <PredictiveAnalysisBanner
          onPlanTreatment={() => navigate('/treatments')}
          onSeeDetails={() => navigate('/predictions')}
        />
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#94a3b8',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>
            ⚠️
          </div>
          <div style={{ fontSize: '18px', marginBottom: '8px', color: '#f87171' }}>
            {state.error.message}
          </div>
          <div style={{ fontSize: '14px', marginBottom: '24px', color: '#64748b' }}>
            {state.error.details}
          </div>
          <button
            onClick={actions.retry}
            style={{
              padding: '12px 24px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              marginRight: '12px'
            }}
          >
            Prøv igjen
          </button>
          <button
            onClick={actions.clearError}
            style={{
              padding: '12px 24px',
              background: '#334155',
              color: '#94a3b8',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Avbryt
          </button>
        </div>
      </div>
    )
  }

  // No data state
  if (!state.overview) {
    return (
      <div style={{ background: '#0f172a', minHeight: '100vh', padding: '20px' }}>
        <PredictiveAnalysisBanner
          onPlanTreatment={() => navigate('/treatments')}
          onSeeDetails={() => navigate('/predictions')}
        />
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: '18px', marginBottom: '12px' }}>Ingen data tilgjengelig</div>
          <div style={{ fontSize: '14px' }}>Sjekk at API-serveren kjører på port 3000</div>
        </div>
      </div>
    )
  }

  // Calculate filter status
  const totalCages = state.localityData?.cages?.length || 0
  const filteredCount = state.filteredCages?.length || 0
  const isFiltered = filteredCount < totalCages

  return (
    <div style={{ background: '#f0f4f8', minHeight: '100vh', padding: 0 }}>
      <DashboardHeader
        selectedLocality={state.selectedLocality}
        localities={state.localities}
        totalFish={state.overview.totalFish}
        onLocalityChange={actions.setSelectedLocality}
      />

      <ActionBar
        viewDate={state.viewDate}
        onDateChange={actions.setViewDate}
        onOpenRegistration={() => actions.openModal('registration')}
        onOpenFilter={() => actions.openModal('filter')}
        onNavigateReports={() => navigate('/rapporter')}
        isFiltered={isFiltered}
        filterCount={filteredCount}
        totalCount={totalCages}
      />

      <PredictiveAnalysisBanner
        onPlanTreatment={() => navigate('/treatments')}
        onSeeDetails={() => navigate('/predictions')}
      />

      {state.localityData && (
        <div className="dashboard-content">
          <div style={{ flex: 1 }}>
            {/* Filter indicator */}
            {isFiltered && (
              <div style={{
                background: '#dbeafe',
                border: '1px solid #93c5fd',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: '#1e40af', fontSize: '14px' }}>
                  Viser {filteredCount} av {totalCages} merder (filtrert)
                </span>
                <button
                  onClick={() => actions.setFilterSettings({
                    welfareScores: ['A', 'B', 'C', 'D'],
                    liceLevels: ['OK', 'WARNING', 'DANGER'],
                    minBiomass: 0,
                    maxBiomass: 500000
                  })}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Nullstill filter
                </button>
              </div>
            )}

            <CageGrid
              cages={state.filteredCages}
              selectedCage={state.selectedCage}
              onSelectCage={actions.selectCage}
            />
            {state.chartData && (
              <ChartsGrid
                chartData={state.chartData}
                localityData={state.localityData}
              />
            )}
          </div>
          <StatusSidebar
            overview={state.overview}
            currentTip={state.currentTip}
            onShowTipDetails={() => actions.openModal('tipDetails')}
          />
        </div>
      )}

      {state.chartData && state.localityData && (
        <HistoricalTrendsSection
          chartData={state.chartData}
          selectedLocality={state.selectedLocality}
        />
      )}

      {state.localityData && (
        <BottomSummaryBar localityData={state.localityData} />
      )}

      {/* Modals */}
      <CageDetailsModal
        isOpen={state.modals.cageDetails}
        cage={state.selectedCage}
        onClose={() => {
          actions.closeModal('cageDetails')
          actions.clearSelectedCage()
        }}
        onShowHistory={() => actions.openModal('history')}
        onShowRegistration={() => actions.openRegistrationFromCage(state.selectedCage)}
        onShowTreatment={() => actions.openModal('treatment')}
        onShowFeedingPlan={() => actions.openModal('feedingPlan')}
      />

      <TipDetailsModal
        isOpen={state.modals.tipDetails}
        tip={state.currentTip}
        onClose={() => actions.closeModal('tipDetails')}
      />

      <RegistrationModal
        isOpen={state.modals.registration}
        cages={state.localityData?.cages}
        selectedMerdId={state.selectedMerdForRegistration}
        viewDate={state.viewDate}
        onClose={() => actions.closeModal('registration')}
        onSave={(data) => {
          alert(`Lusetelling lagret!\nMerd: ${data.merdName}\nAntall fisk: ${data.fishCount}\nGjennomsnitt: ${data.average.toFixed(2)} lus per fisk`)
        }}
      />

      <ImportExportModal
        isOpen={state.modals.importExport}
        selectedLocality={state.selectedLocality}
        onClose={() => actions.closeModal('importExport')}
      />

      <ReportsModal
        isOpen={state.modals.reports}
        onClose={() => actions.closeModal('reports')}
      />

      <FilterModal
        isOpen={state.modals.filter}
        filterSettings={state.filterSettings}
        onFilterChange={actions.setFilterSettings}
        onClose={() => actions.closeModal('filter')}
      />

      <HistoryModal
        isOpen={state.modals.history}
        cage={state.selectedCage}
        onClose={() => actions.closeModal('history')}
      />

      <TreatmentModal
        isOpen={state.modals.treatment}
        cage={state.selectedCage}
        viewDate={state.viewDate}
        onClose={() => actions.closeModal('treatment')}
        onSave={() => {}}
      />

      <FeedingPlanModal
        isOpen={state.modals.feedingPlan}
        cage={state.selectedCage}
        onClose={() => actions.closeModal('feedingPlan')}
        onSave={() => {}}
      />
    </div>
  )
}
