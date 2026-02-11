import { useState, useEffect, useMemo } from 'react'
import { generateOperationalTip } from '../utils/tipGenerators'
import { supabase, fetchDashboardStats, fetchCages, fetchLiceCounts } from '../services/supabase'

export function useDashboard() {
  // Core data state
  const [overview, setOverview] = useState(null)
  const [localities, setLocalities] = useState([])
  const [selectedLocality, setSelectedLocality] = useState(null)
  const [localityData, setLocalityData] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // UI state
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedCage, setSelectedCage] = useState(null)
  const [currentTip, setCurrentTip] = useState(null)
  const [selectedMerdForRegistration, setSelectedMerdForRegistration] = useState('')

  // Filter state
  const [filterSettings, setFilterSettings] = useState({
    welfareScores: ['A', 'B', 'C', 'D'],
    liceLevels: ['OK', 'WARNING', 'DANGER'],
    minBiomass: 0,
    maxBiomass: 500000
  })

  // Modal states
  const [modals, setModals] = useState({
    cageDetails: false,
    tipDetails: false,
    registration: false,
    importExport: false,
    reports: false,
    filter: false,
    history: false,
    treatment: false,
    feedingPlan: false
  })

  // Computed: filtered cages based on filterSettings
  const filteredCages = useMemo(() => {
    if (!localityData?.cages) return []

    return localityData.cages.filter(cage => {
      // Filter by welfare score
      if (!filterSettings.welfareScores.includes(cage.welfareScore)) {
        return false
      }

      // Filter by lice level
      if (!filterSettings.liceLevels.includes(cage.liceLevel)) {
        return false
      }

      // Filter by biomass range
      if (cage.biomassKg < filterSettings.minBiomass ||
          cage.biomassKg > filterSettings.maxBiomass) {
        return false
      }

      return true
    })
  }, [localityData?.cages, filterSettings])

  // Load overview on mount
  useEffect(() => {
    loadOverview()
  }, [])

  // Load locality data when selected locality changes
  useEffect(() => {
    if (selectedLocality) {
      loadLocalityData(selectedLocality)
      loadChartData(selectedLocality)
    }
  }, [selectedLocality])

  // Generate tip when locality data changes
  useEffect(() => {
    if (localityData) {
      const tip = generateOperationalTip(localityData)
      setCurrentTip(tip)
    }
  }, [localityData])

  // API calls using Supabase directly
  async function loadOverview() {
    setLoading(true)
    setError(null)
    try {
      const stats = await fetchDashboardStats()

      // Build overview
      const overviewData = {
        totalLocations: stats.totalLocations,
        totalMerds: stats.totalMerds,
        totalSamples: stats.totalSamples,
        activeAlerts: stats.activeAlerts
      }
      setOverview(overviewData)

      // Build localities from merds
      const localityList = stats.locations.map(name => ({
        name,
        merdCount: stats.merds?.filter(m => m.lokalitet === name).length || 0
      }))
      setLocalities(localityList)

      // Auto-select first locality
      if (localityList.length > 0) {
        setSelectedLocality(localityList[0].name)
      }
    } catch (err) {
      console.error('Failed to load overview:', err)
      setError({
        message: 'Kunne ikke laste dashboard data',
        details: err.message,
        retry: loadOverview
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadLocalityData(localityName) {
    try {
      const cages = await fetchCages(localityName)
      const samples = await fetchLiceCounts({ locationId: localityName })

      // Transform cages to expected format
      const transformedCages = cages.map(cage => {
        const cageSamples = samples.filter(s => s.merds?.merd_id === cage.merd_id)
        const latestSample = cageSamples[0]
        const observations = latestSample?.fish_observations || []

        // Calculate average lice
        let avgLice = 0
        if (observations.length > 0) {
          const totalLice = observations.reduce((sum, obs) =>
            sum + (obs.voksne_hunnlus || 0), 0)
          avgLice = totalLice / observations.length
        }

        return {
          id: cage.id,
          merdId: cage.merd_id,
          name: cage.navn,
          avgLice: avgLice,
          liceLevel: avgLice > 0.5 ? 'DANGER' : avgLice > 0.2 ? 'WARNING' : 'OK',
          welfareScore: avgLice > 0.5 ? 'D' : avgLice > 0.3 ? 'C' : avgLice > 0.1 ? 'B' : 'A',
          lastCount: latestSample?.dato || null,
          fishCount: latestSample?.antall_fisk || 0,
          biomassKg: cage.capacity_tonnes ? cage.capacity_tonnes * 1000 : 50000
        }
      })

      setLocalityData({
        name: localityName,
        cages: transformedCages,
        summary: {
          totalCages: cages.length,
          avgLice: transformedCages.reduce((sum, c) => sum + c.avgLice, 0) / (transformedCages.length || 1)
        }
      })
    } catch (err) {
      console.error('Failed to load locality data:', err)
      setError({
        message: `Kunne ikke laste data for ${localityName}`,
        details: err.message,
        retry: () => loadLocalityData(localityName)
      })
    }
  }

  async function loadChartData(localityName) {
    try {
      const samples = await fetchLiceCounts({ locationId: localityName })

      // Build chart data from samples
      const chartDataPoints = samples.slice(0, 30).reverse().map(sample => {
        const observations = sample.fish_observations || []
        const avgLice = observations.length > 0
          ? observations.reduce((sum, obs) => sum + (obs.voksne_hunnlus || 0), 0) / observations.length
          : 0

        return {
          date: sample.dato,
          avgLice: avgLice,
          sampleCount: observations.length
        }
      })

      setChartData({ trendData: chartDataPoints })
    } catch (err) {
      console.error('Failed to load chart data:', err)
      // Chart errors are less critical, don't set global error
    }
  }

  // Modal handlers
  function openModal(modalName) {
    setModals(prev => ({ ...prev, [modalName]: true }))
  }

  function closeModal(modalName) {
    setModals(prev => ({ ...prev, [modalName]: false }))
  }

  // Cage selection
  function selectCage(cage) {
    setSelectedCage(cage)
    openModal('cageDetails')
  }

  function clearSelectedCage() {
    setSelectedCage(null)
  }

  // Registration flow from cage details
  function openRegistrationFromCage(cage) {
    setSelectedMerdForRegistration(cage.id.toString())
    closeModal('cageDetails')
    openModal('registration')
  }

  // Clear error
  function clearError() {
    setError(null)
  }

  return {
    // State
    state: {
      overview,
      localities,
      selectedLocality,
      localityData,
      chartData,
      loading,
      error,
      viewDate,
      selectedCage,
      currentTip,
      filterSettings,
      filteredCages,
      modals,
      selectedMerdForRegistration
    },
    // Actions
    actions: {
      setSelectedLocality,
      setViewDate,
      setFilterSettings,
      selectCage,
      clearSelectedCage,
      openModal,
      closeModal,
      openRegistrationFromCage,
      setSelectedMerdForRegistration,
      clearError,
      retry: error?.retry || (() => {})
    }
  }
}
