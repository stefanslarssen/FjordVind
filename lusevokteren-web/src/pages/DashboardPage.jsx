import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area, ReferenceLine } from 'recharts'
import PredictiveAnalysisBanner from '../components/PredictiveAnalysisBanner'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState(null)
  const [localities, setLocalities] = useState([])
  const [selectedLocality, setSelectedLocality] = useState(null)
  const [localityData, setLocalityData] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedCage, setSelectedCage] = useState(null)
  const [showCageDetails, setShowCageDetails] = useState(false)
  const [showTipDetails, setShowTipDetails] = useState(false)
  const [currentTip, setCurrentTip] = useState(null)
  const [showRegistration, setShowRegistration] = useState(false)
  const [showImportExport, setShowImportExport] = useState(false)
  const [showReports, setShowReports] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showTreatment, setShowTreatment] = useState(false)
  const [showFeedingPlan, setShowFeedingPlan] = useState(false)
  const [showHistoricalTrends, setShowHistoricalTrends] = useState(false)
  const [filterSettings, setFilterSettings] = useState({
    welfareScores: ['A', 'B', 'C', 'D'],
    liceLevels: ['OK', 'WARNING', 'DANGER'],
    minBiomass: 0,
    maxBiomass: 500000
  })
  const [liceCountsPerFish, setLiceCountsPerFish] = useState([])
  const [currentLiceCount, setCurrentLiceCount] = useState('')
  const [selectedMerdForRegistration, setSelectedMerdForRegistration] = useState('')

  // Helper functions for individual fish registration
  const addFish = () => {
    const liceCount = parseFloat(currentLiceCount)
    if (!isNaN(liceCount) && liceCount >= 0) {
      setLiceCountsPerFish([...liceCountsPerFish, liceCount])
      setCurrentLiceCount('')
    }
  }

  const removeFish = (index) => {
    setLiceCountsPerFish(liceCountsPerFish.filter((_, i) => i !== index))
  }

  const calculateAverage = () => {
    if (liceCountsPerFish.length === 0) return 0
    const sum = liceCountsPerFish.reduce((acc, count) => acc + count, 0)
    return sum / liceCountsPerFish.length
  }

  useEffect(() => {
    loadOverview()
  }, [])

  useEffect(() => {
    if (selectedLocality) {
      loadLocalityData(selectedLocality)
      loadChartData(selectedLocality)
    }
  }, [selectedLocality])

  async function loadOverview() {
    try {
      const response = await fetch(`${API_URL}/api/dashboard/overview`)
      const data = await response.json()
      setOverview(data.overview)
      setLocalities(data.localities)

      // Auto-select first locality
      if (data.localities.length > 0) {
        setSelectedLocality(data.localities[0].name)
      }
    } catch (error) {
      console.error('Failed to load overview:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadLocalityData(localityName) {
    try {
      const response = await fetch(`${API_URL}/api/dashboard/locality/${encodeURIComponent(localityName)}`)
      const data = await response.json()
      setLocalityData(data)
    } catch (error) {
      console.error('Failed to load locality data:', error)
    }
  }

  async function loadChartData(localityName) {
    try {
      const response = await fetch(`${API_URL}/api/dashboard/charts/${encodeURIComponent(localityName)}`)
      const data = await response.json()
      setChartData(data)
    } catch (error) {
      console.error('Failed to load chart data:', error)
    }
  }

  function getWelfareColor(score) {
    switch (score) {
      case 'A': return '#10b981'
      case 'B': return '#f59e0b'
      case 'C': return '#ef4444'
      default: return '#6b7280'
    }
  }

  function calculateDensity(biomassKg, capacityTonnes) {
    if (!capacityTonnes || capacityTonnes === 0) return 0
    // Assume standard cage volume, density = kg/m³
    const volumeM3 = capacityTonnes * 40 // rough estimate: 1 tonne capacity ≈ 40m³
    return biomassKg / volumeM3
  }

  function generateOperationalTip(localityData) {
    if (!localityData || !localityData.cages || localityData.cages.length === 0) {
      return null
    }

    const cages = localityData.cages

    // Analyze lice levels
    const dangerCages = cages.filter(c => c.liceLevel === 'DANGER')
    const warningCages = cages.filter(c => c.liceLevel === 'WARNING')

    // Analyze growth rates
    const lowGrowthCages = cages.filter(c => c.growthRate < 110)
    const avgGrowth = cages.reduce((sum, c) => sum + c.growthRate, 0) / cages.length

    // Analyze mortality
    const avgMortality = cages.reduce((sum, c) => sum + c.mortalityRate, 0) / cages.length
    const highMortalityCages = cages.filter(c => c.mortalityRate > 1.5)

    // Generate tip based on most critical issue
    if (dangerCages.length > 0) {
      const treatmentCost = dangerCages.length * 85000 // Termisk/mekanisk behandling per merd
      const potentialFines = dangerCages.length * 30000 // Gjennomsnittlig bot ved overskridelse grenseverdier
      const productionLoss = dangerCages.length * 10000 // Tapt tilvekst under behandling (redusert fôring)
      const estimatedCost = treatmentCost + potentialFines + productionLoss

      return {
        title: 'Kritisk lusenivå oppdaget',
        message: `${dangerCages.length} merd(er) har kritisk lusenivå. Umiddelbar behandling kreves for å unngå bøter og redusere spredningsrisiko med opptil 85%.`,
        savings: `${(estimatedCost / 1000).toFixed(0)} 000 NOK`,
        action: 'Planlegg lusebehandling',
        details: {
          affectedCages: dangerCages.map(c => c.name),
          recommendation: `AKSJONSPLAN:

1. UMIDDELBAR HANDLING (innen 24 timer):
   • Varsle behandlingsansvarlig og veterinær
   • Bestill utstyr for termisk/mekanisk avlusning
   • Informer personell om behandlingsplan

2. FORBEREDELSER (dag 1-2):
   • Reduser fôring til 50% dagen før behandling
   • Sjekk værmelding - unngå behandling ved dårlig vær
   • Klargjør behandlingsutstyr og personell
   • Sikre at notposisjon er optimal

3. GJENNOMFØRING (dag 2-3):
   • Start termisk avlusning ved 28-34°C i 20-30 sekunder
   • Alternativt: mekanisk avlusning med børstepumpe
   • Behandle ${dangerCages.length} merd(er): ${dangerCages.map(c => c.name).join(', ')}
   • Dokumenter behandling og eventuelle observasjoner

4. OPPFØLGING (dag 4-7):
   • Utfør ny lusetelling 3-5 dager etter behandling
   • Vurder behov for oppfølgingsbehandling
   • Rapporter resultater til Barentswatch`,
          impact: 'Reduserer risiko for bøter og spredning til naboanlegg. Forbedrer fiskevelferd og vekst.',
          estimatedTime: '2-4 dager avhengig av metode',
          costBreakdown: [
            { label: 'Behandlingskostnad', amount: treatmentCost, description: `${dangerCages.length} merd(er) × 85 000 NOK (termisk/mekanisk avlusning)` },
            { label: 'Potensielle bøter', amount: potentialFines, description: `${dangerCages.length} merd(er) × 30 000 NOK (overskridelse grenseverdier)` },
            { label: 'Produksjonstap', amount: productionLoss, description: `${dangerCages.length} merd(er) × 10 000 NOK (redusert tilvekst under behandling)` }
          ]
        }
      }
    } else if (warningCages.length > 0) {
      const monitoringCost = warningCages.length * 8000 // Økt tellingsfrekvens
      const preventiveMeasures = warningCages.length * 15000 // Leppefisk, økt strøm etc.
      const avoidedTreatment = warningCages.length * 125000 // Kostnad ved å unngå full behandling
      const netSavings = avoidedTreatment - (monitoringCost + preventiveMeasures)

      return {
        title: 'Forhøyet lusenivå',
        message: `${warningCages.length} merd(er) har forhøyet lusenivå. Forebyggende tiltak nå kan spare deg for ${(netSavings / 1000).toFixed(0)} 000 NOK i behandlingskostnader.`,
        savings: `${(netSavings / 1000).toFixed(0)} 000 NOK`,
        action: 'Iverksett forebygging',
        details: {
          affectedCages: warningCages.map(c => c.name),
          recommendation: `FOREBYGGENDE PLAN:

1. ØKT OVERVÅKING (start umiddelbart):
   • Utfør lusetelling 2x per uke (mandag og torsdag)
   • Registrer resultater i Barentswatch
   • Følg nøye med på utviklingen
   • Merder: ${warningCages.map(c => c.name).join(', ')}

2. BIOLOGISK AVLUSNING (uke 1-2):
   • Bestill 15-20 leppefisk per 1000 laks
   • Sett ut leppefisk i berørte merder
   • Estimert kostnad: ${(warningCages.length * 15000).toLocaleString()} NOK

3. MILJØTILPASNINGER:
   • Vurder å øke vanngjennomstrømming med 10-15%
   • Optimaliser notposisjon for bedre strøm
   • Sikre god vannkvalitet (min 80% O₂-metning)

4. OPPFØLGING:
   • Evaluer effekt etter 2 uker
   • Ved fortsatt økning: planlegg full behandling
   • Forventet resultat: stabilisering eller reduksjon av lusenivå`,
          impact: 'Forhindrer kostbar behandling senere. Minimerer stress på fisken.',
          estimatedTime: '1-2 uker monitorering',
          costBreakdown: [
            { label: 'Økt monitorering', amount: monitoringCost, description: `${warningCages.length} merd(er) × 8 000 NOK (ekstra tellinger)` },
            { label: 'Forebyggende tiltak', amount: preventiveMeasures, description: `${warningCages.length} × 15 000 NOK (leppefisk, økt vannstrøm)` },
            { label: 'Unngått behandling', amount: -avoidedTreatment, description: `Sparer ${(avoidedTreatment / 1000).toFixed(0)} 000 NOK i behandlingskostnader`, isSaving: true }
          ]
        }
      }
    } else if (lowGrowthCages.length > 0 && avgGrowth < 115) {
      const feedIncrease = lowGrowthCages.length * 2.5 // tonn per merd
      const feedCost = feedIncrease * 15000 // 15 NOK/kg fôr
      const growthImprovement = (115 - avgGrowth) * 0.5
      const timeSaved = Math.round(growthImprovement * 2) // weeks
      const operationalSavings = timeSaved * 45000 * lowGrowthCages.length // Daglige driftskostnader
      const netSavings = operationalSavings - feedCost

      return {
        title: 'Optimaliser vekst',
        message: `${lowGrowthCages.length} merd(er) vokser under forventet. Ved å justere fôringsplan kan du øke RGI med ${growthImprovement.toFixed(1)} poeng og redusere sjøfase med ${timeSaved} uker.`,
        savings: `${(netSavings / 1000).toFixed(0)} 000 NOK`,
        action: 'Juster fôringsplan',
        details: {
          affectedCages: lowGrowthCages.map(c => c.name),
          recommendation: `VEKSTOPTIMERING:

1. FÔRJUSTERING (start denne uken):
   • Øk daglig fôrmengde med 3-5%
   • Total økning: ${feedIncrease.toFixed(1)} tonn over perioden
   • Fordel økningen jevnt over alle fôringer
   • Merder: ${lowGrowthCages.map(c => c.name).join(', ')}

2. OPTIMALISER FÔRTIDER:
   • Morgenfôring: 06:00-07:00 (40% av daglig fôr)
   • Middagsfôring: 14:00-15:00 (30% av daglig fôr)
   • Kveldsfôring: 18:00-19:00 (30% av daglig fôr)
   • Tilpass fôrhastighet etter appetitt

3. KVALITETSKONTROLL:
   • Sjekk fôrkvalitet - bruk riktig pelletstørrelse
   • Kontroller at fôr ikke flyter utenfor nota
   • Sikre at fôrspredningen er jevn

4. OPPFØLGING OG MÅLING:
   • Veie prøveuttak ukentlig (min 50 fisk per merd)
   • Beregn FCR (Fôrfaktor) hver uke
   • Målsetting: FCR < 1.20
   • Forventet RGI-økning: ${growthImprovement.toFixed(1)} poeng på ${timeSaved} uker`,
          impact: 'Forbedret vekstrate og kortere tid til slakt. Bedre utnyttelse av produksjonskapasitet.',
          estimatedTime: '3-4 uker før synlig forbedring',
          costBreakdown: [
            { label: 'Ekstra fôrkostnad', amount: feedCost, description: `${feedIncrease.toFixed(1)} tonn × 15 NOK/kg` },
            { label: 'Redusert sjøfase', amount: -operationalSavings, description: `${timeSaved} uker × ${lowGrowthCages.length} merd(er) × 45 000 NOK/uke`, isSaving: true }
          ]
        }
      }
    } else if (highMortalityCages.length > 0) {
      const avgFishValue = 180 // NOK per kg salgspris
      const avgSlaughterWeight = 5 // kg
      const fishValue = avgFishValue * avgSlaughterWeight // 900 NOK per fisk ved slakt
      const annualLoss = (avgMortality / 100) * localityData.aggregated.totalFish * fishValue
      const investigationCost = 25000 // Vannprøver, veterinær etc.
      const potentialSavings = annualLoss * 0.3 // Konservativt estimat: reduser dødelighet med 30%
      const netSavings = potentialSavings - investigationCost

      return {
        title: 'Høy dødelighet',
        message: `Gjennomsnittlig dødelighet er ${avgMortality.toFixed(2)}%. ${highMortalityCages.length} merd(er) ligger over 1.5%. Dette koster deg ca ${(annualLoss / 1000).toFixed(0)} 000 NOK årlig i tapt produksjon.`,
        savings: `${(netSavings / 1000).toFixed(0)} 000 NOK`,
        action: 'Undersøk årsaker',
        details: {
          affectedCages: highMortalityCages.map(c => c.name),
          recommendation: `DØDELIGHETSANALYSE:

1. UMIDDELBAR KARTLEGGING (dag 1-2):
   • Merder med høyest dødelighet: ${highMortalityCages.map(c => c.name).join(', ')}
   • Nåværende tap: ${(avgMortality).toFixed(2)}% = ${((avgMortality / 100) * localityData.aggregated.totalFish).toFixed(0)} fisk årlig
   • Ta ut dødfisk daglig og loggfør dødsårsak
   • Kontakt fiskehelseveterinær for vurdering

2. VANNKVALITETSANALYSE (uke 1):
   • Mål oksygen 2x daglig (mål: >80% metning)
   • Sjekk temperatur (optimalt: 8-14°C)
   • Ta vannprøver for analyse (pH, salinitet, hydrogen sulfid)
   • Kostnad: ~15 000 NOK

3. MILJØ OG TETTHET (uke 1-2):
   • Sjekk strømforhold - sikre min 0.3 knop
   • Vurder biomasse/tetthet i hver merd
   • Inspiser not for hull og slitasje
   • Vurder sortering av fisk

4. HELSEKONTROLL (uke 2):
   • Veterinær helsekontroll (10 000 NOK)
   • Sjekk for sykdomstegn (AGD, hjertesprekk, etc.)
   • Vurder behov for behandling

5. FORVENTET RESULTAT:
   • Målsetting: Reduser dødelighet til <1.0%
   • Potensial: Spare ${((annualLoss * 0.3) / 1000).toFixed(0)} 000 NOK årlig
   • Bedre fiskevelferd og kvalitet ved slakt`,
          impact: 'Redusert dødelighet øker total biomasse og inntekter ved slakt.',
          estimatedTime: '1-2 uker undersøkelse',
          costBreakdown: [
            { label: 'Årlig tap ved nåværende dødelighet', amount: annualLoss, description: `${(avgMortality).toFixed(2)}% × ${localityData.aggregated.totalFish.toLocaleString()} fisk × 900 NOK/fisk` },
            { label: 'Undersøkelseskostnad', amount: investigationCost, description: 'Vannprøver, veterinær, analyser' },
            { label: 'Potensial besparelse (30% reduksjon)', amount: -potentialSavings, description: `Reduserer årlig tap til ${((annualLoss * 0.7) / 1000).toFixed(0)} 000 NOK`, isSaving: true }
          ]
        }
      }
    } else {
      // All good - general optimization tip
      const totalBiomass = localityData.aggregated.totalBiomassKg
      const optimizationPotential = totalBiomass * 0.025 * 0.9 // 2.5% forbedret FCR × 90 NOK/kg

      return {
        title: 'God drift',
        message: `Alle merder har tilfredsstillende parametere. For å optimalisere ytterligere, vurder finjustering av fôringstider basert på aktivitetsmønstre.`,
        savings: `${(optimizationPotential / 1000).toFixed(0)} 000 NOK`,
        action: 'Optimaliser videre',
        details: {
          affectedCages: ['Alle merder'],
          recommendation: `KONTINUERLIG FORBEDRING:

1. DATAINNSAMLING (pågående):
   • Fortsett daglig registrering av fôring
   • Logg appetitt og fôrspill
   • Registrer miljødata (temp, strøm, vær)
   • Ukentlig veiing for vekstoppfølging

2. ANALYSER MØNSTRE (månedlig):
   • Identifiser optimale fôringstider
   • Finn sammenhenger mellom vær og appetitt
   • Analyser FCR-utvikling per merd
   • Sammenlign med bransjesnitt

3. FINJUSTER DRIFT:
   • Optimaliser fôrhastighet og -mengde
   • Tilpass fôrtider til fiskeaktivitet
   • Potensial: 2-3% forbedret FCR
   • Estimert økt margin: ${(optimizationPotential / 1000).toFixed(0)} 000 NOK

4. PLANLEGG FREMOVER:
   • Vurder investeringer i automatisering
   • Oppdater beredskapsplaner
   • Vedlikehold utstyr proaktivt`,
          impact: 'Marginale forbedringer i FCR og vekstrate over tid. Bedre lønnsomhet og bærekraft.',
          estimatedTime: 'Kontinuerlig forbedring',
          costBreakdown: [
            { label: 'Nåværende biomasse', amount: 0, description: `${(totalBiomass / 1000).toFixed(0)} tonn × 90 NOK/kg = ${((totalBiomass * 90) / 1000000).toFixed(1)} mill NOK verdi` },
            { label: 'FCR-forbedring (2.5%)', amount: -optimizationPotential, description: 'Redusert fôrforbruk og bedre tilvekst', isSaving: true }
          ]
        }
      }
    }
  }

  // Generate tip when locality data changes
  useEffect(() => {
    if (localityData) {
      const tip = generateOperationalTip(localityData)
      setCurrentTip(tip)
    }
  }, [localityData])

  if (loading) {
    return (
      <div style={{ background: '#0f172a', minHeight: '100vh', padding: '20px' }}>
        <PredictiveAnalysisBanner
          onPlanTreatment={() => navigate('/treatments')}
          onSeeDetails={() => navigate('/predictions')}
        />
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          Laster dashboard data...
        </div>
      </div>
    )
  }

  if (!overview) {
    return (
      <div style={{ background: '#0f172a', minHeight: '100vh', padding: '20px' }}>
        <PredictiveAnalysisBanner
          onPlanTreatment={() => navigate('/treatments')}
          onSeeDetails={() => navigate('/predictions')}
        />
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: '18px', marginBottom: '12px' }}>Kunne ikke laste dashboard data</div>
          <div style={{ fontSize: '14px' }}>Sjekk at API-serveren kjører på port 3000</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: '#f0f4f8',
      minHeight: '100vh',
      padding: 0
    }}>
      {/* Top Navigation Bar */}
      <div style={{
        background: '#37626b',
        color: 'white',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 600 }}>LUSEVOKTEREN Farmer</div>
          <select
            value={selectedLocality || ''}
            onChange={(e) => setSelectedLocality(e.target.value)}
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
          {overview.totalFish.toLocaleString()} fisk
        </div>
      </div>

      {/* Action Bar */}
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
          onClick={() => setShowRegistration(true)}
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
          onClick={() => navigate('/rapporter')}
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
          onClick={() => setShowFilter(true)}
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
            onChange={(e) => setViewDate(e.target.value)}
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

      {/* Predictive Analysis Banner */}
      <PredictiveAnalysisBanner
        onPlanTreatment={() => navigate('/treatments')}
        onSeeDetails={() => navigate('/predictions')}
      />

      {/* Main Content */}
      {localityData && (
        <div style={{ padding: '24px', display: 'flex', gap: '24px' }}>
          {/* Left: Cages Grid */}
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              {localityData.cages.map((cage, idx) => {
                const cageNumber = idx + 1
                const welfareColor = getWelfareColor(cage.welfareScore)
                const density = calculateDensity(cage.biomassKg, cage.capacityTonnes || 250)

                return (
                  <div
                    key={cage.id}
                    onClick={() => {
                      setSelectedCage(cage)
                      setShowCageDetails(true)
                    }}
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

            {/* Charts Grid */}
            {chartData && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px'
              }}>
                {/* Lice Count */}
                <div style={{
                  background: '#4a9fb5',
                  borderRadius: '8px',
                  padding: '20px',
                  color: 'white'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                        Lusetelling ↘
                      </div>
                      <div style={{ fontSize: '11px', opacity: 0.8 }}>
                        Minst lus i Merd 2 og 3
                      </div>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700 }}>
                      0.45
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={chartData.liceCount}>
                      <Bar dataKey="avgLicePerFish" fill="rgba(255,255,255,0.7)" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '10px',
                    opacity: 0.8,
                    marginTop: '8px'
                  }}>
                    <div>Minst lus i Merd 2 og 3</div>
                    <div>Mest lus i Merd 7 og 10</div>
                  </div>
                </div>

                {/* Mortality */}
                <div style={{
                  background: '#4a5568',
                  borderRadius: '8px',
                  padding: '20px',
                  color: 'white'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                        Dødelighet ↗
                      </div>
                      <div style={{ fontSize: '11px', opacity: 0.8 }}>
                        Fisk tapt til himmel
                      </div>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700 }}>
                      {localityData.aggregated.avgMortalityRate.toFixed(2)}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={chartData.mortality}>
                      <Bar dataKey="rate" fill="rgba(255,255,255,0.7)" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '10px',
                    opacity: 0.8,
                    marginTop: '8px'
                  }}>
                    <div>Minst dødelighet i Merd 1 og 3</div>
                    <div>Mest dødelighet i Merd 7 og 9</div>
                  </div>
                </div>

                {/* Growth */}
                <div style={{
                  background: '#5cb592',
                  borderRadius: '8px',
                  padding: '20px',
                  color: 'white'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                        Relativ vekstindeks →
                      </div>
                      <div style={{ fontSize: '11px', opacity: 0.8 }}>
                        Best i august
                      </div>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700 }}>
                      121
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={chartData.growth}>
                      <Line
                        type="monotone"
                        dataKey="index"
                        stroke="rgba(255,255,255,0.9)"
                        strokeWidth={3}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '10px',
                    opacity: 0.8,
                    marginTop: '8px'
                  }}>
                    <div>Best i august</div>
                    <div>Verst i januar</div>
                  </div>
                </div>

                {/* Feed Storage */}
                <div style={{
                  background: '#7c5295',
                  borderRadius: '8px',
                  padding: '20px',
                  color: 'white'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                        Fôrlagring
                      </div>
                      <div style={{ fontSize: '11px', opacity: 0.8 }}>
                        Du har nok i 14 dager
                      </div>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700 }}>
                      {(localityData.cages.reduce((sum, c) => sum + c.feedStorageKg, 0) / 1000).toFixed(0)}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={localityData.cages.map((c, i) => ({
                      name: `${i+1}`,
                      feed: c.feedStorageKg / 1000
                    }))}>
                      <Bar dataKey="feed" fill="rgba(255,255,255,0.7)" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '10px',
                    opacity: 0.8,
                    marginTop: '8px'
                  }}>
                    <div>Premium Polar</div>
                    <div>Rapid</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div style={{ width: '280px' }}>
            {/* Status Summary */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
                Status oversikt
              </div>

              <div style={{
                background: getWelfareColor('A'),
                color: 'white',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>A {overview.scoreACount}</div>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>
                  {((overview.scoreACount / overview.totalCages) * 100).toFixed(0)}%
                </div>
              </div>

              <div style={{
                background: getWelfareColor('B'),
                color: 'white',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>B {overview.scoreBCount}</div>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>
                  {((overview.scoreBCount / overview.totalCages) * 100).toFixed(0)}%
                </div>
              </div>

              <div style={{
                background: getWelfareColor('C'),
                color: 'white',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>C {overview.scoreCCount}</div>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>
                  {((overview.scoreCCount / overview.totalCages) * 100).toFixed(0)}%
                </div>
              </div>

              <div style={{
                background: '#6b7280',
                color: 'white',
                padding: '12px',
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>D {overview.scoreDCount}</div>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>
                  {overview.totalCages > 0 ? ((overview.scoreDCount / overview.totalCages) * 100).toFixed(0) : 0}%
                </div>
              </div>
            </div>

            {/* Operational Tip */}
            {currentTip && (
              <div style={{
                background: '#4a9fb5',
                color: 'white',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                  {currentTip.title}
                </div>
                <div style={{ fontSize: '12px', lineHeight: 1.6, marginBottom: '12px' }}>
                  {currentTip.message}
                </div>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '12px',
                  background: 'rgba(255,255,255,0.15)',
                  padding: '8px',
                  borderRadius: '4px'
                }}>
                  Potensial besparelse: {currentTip.savings}
                </div>
                <button
                  onClick={() => setShowTipDetails(true)}
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
            )}
          </div>
        </div>
      )}

      {/* Historical Trends Section */}
      {chartData && localityData && (
        <div style={{ padding: '0 24px 24px 24px' }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {/* Header with toggle */}
            <div
              style={{
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer'
              }}
              onClick={() => setShowHistoricalTrends(!showHistoricalTrends)}
            >
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>Historiske Trender</div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                  Siste 8 uker - {selectedLocality}
                </div>
              </div>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.3s'
              }}>
                <span style={{
                  transform: showHistoricalTrends ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                  display: 'inline-block'
                }}>▼</span>
              </div>
            </div>

            {/* Expandable content */}
            {showHistoricalTrends && (
              <div style={{ padding: '24px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '24px'
                }}>
                  {/* Lice Count Trend */}
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: '8px',
                    padding: '20px'
                  }}>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e3a5f' }}>
                        Lusetelling per fisk
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Grenseverdi: 0.5 voksne hunnlus
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={chartData.liceCount}>
                        <defs>
                          <linearGradient id="liceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="week"
                          tickFormatter={(v) => `Uke ${v}`}
                          tick={{ fontSize: 11, fill: '#64748b' }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          domain={[0, 'auto']}
                        />
                        <Tooltip
                          formatter={(value) => [value.toFixed(2), 'Lus/fisk']}
                          labelFormatter={(label) => `Uke ${label}`}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                        <ReferenceLine y={0.5} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Grense', position: 'right', fontSize: 10, fill: '#ef4444' }} />
                        <Area
                          type="monotone"
                          dataKey="avgLicePerFish"
                          stroke="#0d9488"
                          strokeWidth={2}
                          fill="url(#liceGradient)"
                          dot={{ fill: '#0d9488', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#0d9488', strokeWidth: 2, fill: 'white' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Mortality Trend */}
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: '8px',
                    padding: '20px'
                  }}>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e3a5f' }}>
                        Dødelighet (%)
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Ukentlig dødelighetsrate
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={chartData.mortality}>
                        <defs>
                          <linearGradient id="mortalityGradientFull" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="week"
                          tickFormatter={(v) => `Uke ${v}`}
                          tick={{ fontSize: 11, fill: '#64748b' }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip
                          formatter={(value) => [`${value.toFixed(2)}%`, 'Dødelighet']}
                          labelFormatter={(label) => `Uke ${label}`}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="rate"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          fill="url(#mortalityGradientFull)"
                          dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2, fill: 'white' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Growth Index Trend */}
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: '8px',
                    padding: '20px'
                  }}>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e3a5f' }}>
                        Vekstindeks
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Relativ vekst (100 = normal)
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData.growth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="week"
                          tickFormatter={(v) => `Uke ${v}`}
                          tick={{ fontSize: 11, fill: '#64748b' }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          domain={[90, 140]}
                        />
                        <Tooltip
                          formatter={(value) => [value.toFixed(1), 'Indeks']}
                          labelFormatter={(label) => `Uke ${label}`}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                        <ReferenceLine y={100} stroke="#94a3b8" strokeDasharray="5 5" label={{ value: 'Normal', position: 'right', fontSize: 10, fill: '#94a3b8' }} />
                        <Line
                          type="monotone"
                          dataKey="index"
                          stroke="#10b981"
                          strokeWidth={3}
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: 'white' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Combined Overview */}
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: '8px',
                    padding: '20px'
                  }}>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e3a5f' }}>
                        Sammenligning
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Normalisert visning av alle trender
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData.liceCount.map((d, i) => ({
                        week: d.week,
                        lice: (d.avgLicePerFish / 0.5) * 100,
                        mortality: chartData.mortality[i]?.rate ? (chartData.mortality[i].rate / 2) * 100 : 0,
                        growth: chartData.growth[i]?.index || 100
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="week"
                          tickFormatter={(v) => `Uke ${v}`}
                          tick={{ fontSize: 11, fill: '#64748b' }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          domain={[0, 150]}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                          labelFormatter={(label) => `Uke ${label}`}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: '11px' }}
                          formatter={(value) => {
                            const labels = { lice: 'Lus (% av grense)', mortality: 'Dødelighet', growth: 'Vekst' }
                            return labels[value] || value
                          }}
                        />
                        <Line type="monotone" dataKey="lice" stroke="#0d9488" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="mortality" stroke="#f59e0b" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="growth" stroke="#10b981" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Summary stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '16px',
                  marginTop: '24px',
                  paddingTop: '24px',
                  borderTop: '1px solid #e2e8f0'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#0d9488' }}>
                      {chartData.liceCount.length > 0
                        ? (chartData.liceCount.reduce((sum, d) => sum + d.avgLicePerFish, 0) / chartData.liceCount.length).toFixed(2)
                        : '0.00'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Snitt lus/fisk</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>
                      {chartData.mortality.length > 0
                        ? (chartData.mortality.reduce((sum, d) => sum + d.rate, 0) / chartData.mortality.length).toFixed(2)
                        : '0.00'}%
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Snitt dødelighet</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
                      {chartData.growth.length > 0
                        ? Math.round(chartData.growth.reduce((sum, d) => sum + d.index, 0) / chartData.growth.length)
                        : 100}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Snitt vekstindeks</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: chartData.liceCount.some(d => d.avgLicePerFish > 0.5) ? '#ef4444' : '#10b981' }}>
                      {chartData.liceCount.filter(d => d.avgLicePerFish > 0.5).length}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Uker over grense</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Summary Bar */}
      {localityData && (
        <div style={{
          background: '#2d4f57',
          color: 'white',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center'
        }}>
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
      )}

      {/* Cage Details Modal */}
      {showCageDetails && selectedCage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => {
            setShowCageDetails(false)
            setSelectedCage(null)
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '32px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowCageDetails(false)
                setSelectedCage(null)
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px'
              }}
            >
              ✕
            </button>

            <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', color: '#1f2937' }}>
              {selectedCage.name} - Detaljer
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                background: '#f3f4f6',
                padding: '16px',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  Velferdsscore
                </div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: getWelfareColor(selectedCage.welfareScore)
                }}>
                  {selectedCage.welfareScore}
                </div>
              </div>

              <div style={{
                background: '#f3f4f6',
                padding: '16px',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  Antall fisk
                </div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937' }}>
                  {selectedCage.fishCount.toLocaleString()}
                </div>
              </div>

              <div style={{
                background: '#f3f4f6',
                padding: '16px',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  Biomasse
                </div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937' }}>
                  {(selectedCage.biomassKg / 1000).toFixed(1)} tonn
                </div>
              </div>

              <div style={{
                background: '#f3f4f6',
                padding: '16px',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  Snitt vekt
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>
                  {selectedCage.avgWeightGrams.toFixed(1)} g
                </div>
              </div>

              <div style={{
                background: '#f3f4f6',
                padding: '16px',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  Dødelighet
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>
                  {selectedCage.mortalityRate.toFixed(2)}%
                </div>
              </div>

              <div style={{
                background: '#f3f4f6',
                padding: '16px',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  Vekstrate
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
                  {selectedCage.growthRate.toFixed(0)}
                </div>
              </div>

              <div style={{
                background: '#f3f4f6',
                padding: '16px',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  Temperatur
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>
                  {selectedCage.temperatureCelsius.toFixed(1)}°C
                </div>
              </div>

              <div style={{
                background: '#f3f4f6',
                padding: '16px',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  Oksygen
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
                  {selectedCage.oxygenPercent.toFixed(1)}%
                </div>
              </div>

              <div style={{
                background: '#f3f4f6',
                padding: '16px',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  Fôrlagring
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6' }}>
                  {(selectedCage.feedStorageKg / 1000).toFixed(1)} tonn
                </div>
              </div>
            </div>

            <div style={{
              background: selectedCage.liceLevel === 'DANGER' ? '#fef2f2' :
                          selectedCage.liceLevel === 'WARNING' ? '#fffbeb' : '#f0fdf4',
              border: `2px solid ${
                selectedCage.liceLevel === 'DANGER' ? '#ef4444' :
                selectedCage.liceLevel === 'WARNING' ? '#f59e0b' : '#10b981'
              }`,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: selectedCage.liceLevel === 'DANGER' ? '#991b1b' :
                       selectedCage.liceLevel === 'WARNING' ? '#92400e' : '#065f46',
                marginBottom: '8px'
              }}>
                Lusestatus: {selectedCage.liceLevel}
              </div>
              <div style={{
                fontSize: '13px',
                color: selectedCage.liceLevel === 'DANGER' ? '#7f1d1d' :
                       selectedCage.liceLevel === 'WARNING' ? '#78350f' : '#064e3b'
              }}>
                {selectedCage.liceLevel === 'DANGER' && 'Kritisk nivå - handling kreves umiddelbart'}
                {selectedCage.liceLevel === 'WARNING' && 'Forhøyet nivå - monitorering anbefales'}
                {selectedCage.liceLevel === 'OK' && 'Normalt nivå - fortsett monitorering'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowHistory(true)}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}>
                Se historikk
              </button>
              <button
                onClick={() => {
                  setSelectedMerdForRegistration(selectedCage.id.toString())
                  setShowCageDetails(false)
                  setShowRegistration(true)
                }}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}>
                Registrer telling
              </button>
              <button
                onClick={() => setShowTreatment(true)}
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}>
                Registrer behandling
              </button>
              <button
                onClick={() => setShowFeedingPlan(true)}
                style={{
                  background: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}>
                Fôringsplan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tip Details Modal */}
      {showTipDetails && currentTip && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: '20px'
          }}
          onClick={() => setShowTipDetails(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '32px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTipDetails(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px'
              }}
            >
              ✕
            </button>

            <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#1f2937' }}>
              {currentTip.title}
            </h2>

            <div style={{
              background: '#f0fdf4',
              border: '2px solid #10b981',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '14px', color: '#065f46', fontWeight: 600, marginBottom: '4px' }}>
                Estimert besparelse
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981' }}>
                {currentTip.savings}
              </div>
            </div>

            {/* Cost Breakdown Section */}
            {currentTip.details.costBreakdown && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '12px' }}>
                  Kostnadsanalyse
                </h3>
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  {currentTip.details.costBreakdown.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '16px',
                        borderBottom: idx < currentTip.details.costBreakdown.length - 1 ? '1px solid #e5e7eb' : 'none',
                        background: item.isSaving ? '#f0fdf4' : 'white'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '4px'
                      }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
                          {item.label}
                        </div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: item.isSaving ? '#10b981' : (item.amount < 0 ? '#10b981' : '#1f2937'),
                          whiteSpace: 'nowrap',
                          marginLeft: '16px'
                        }}>
                          {item.isSaving ? '-' : ''}{Math.abs(item.amount).toLocaleString()} NOK
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.5 }}>
                        {item.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '12px' }}>
                Berørte merder
              </h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {currentTip.details.affectedCages.map((cageName, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#e5e7eb',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#1f2937',
                      fontWeight: 500
                    }}
                  >
                    {cageName}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '12px' }}>
                Hva som må gjøres
              </h3>
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <p style={{ fontSize: '14px', color: '#92400e', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line' }}>
                  {currentTip.details.recommendation}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '12px' }}>
                Forventet effekt
              </h3>
              <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.6, margin: 0 }}>
                {currentTip.details.impact}
              </p>
            </div>

            <div style={{
              background: '#f3f4f6',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Estimert tidsramme
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                {currentTip.details.estimatedTime}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowTipDetails(false)
                  // Her kan vi senere legge til funksjonalitet for å navigere til riktig side
                }}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  flex: 1
                }}
              >
                {currentTip.action}
              </button>
              <button
                onClick={() => setShowTipDetails(false)}
                style={{
                  background: '#e5e7eb',
                  color: '#1f2937',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                Lukk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      {showRegistration && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1002,
            padding: '20px'
          }}
          onClick={() => setShowRegistration(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              padding: '32px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowRegistration(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              ✕
            </button>

            <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', color: '#1f2937' }}>
              Registrer Lusetelling
            </h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                Velg merd
              </label>
              <select
                value={selectedMerdForRegistration}
                onChange={(e) => setSelectedMerdForRegistration(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Velg en merd...</option>
                {localityData?.cages.map(cage => (
                  <option key={cage.id} value={cage.id}>{cage.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                Dato
              </label>
              <input
                type="date"
                value={viewDate}
                onChange={(e) => setViewDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Individual fish entry section */}
            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                Tell lus per fisk
              </label>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px', marginTop: 0 }}>
                Anbefalt utvalg: 10-20 fisk
              </p>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="number"
                  value={currentLiceCount}
                  onChange={(e) => setCurrentLiceCount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addFish()
                    }
                  }}
                  placeholder="Antall lus på fisken"
                  min="0"
                  step="1"
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={addFish}
                  style={{
                    padding: '10px 20px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Legg til fisk
                </button>
              </div>

              {/* Summary */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  padding: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: '#1e40af', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                    Antall fisk telt
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e40af' }}>
                    {liceCountsPerFish.length}
                  </div>
                </div>
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  padding: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: '#15803d', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                    Gjennomsnitt
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#15803d' }}>
                    {liceCountsPerFish.length > 0 ? calculateAverage().toFixed(2) : '0.00'}
                  </div>
                </div>
              </div>

              {/* List of entered fish */}
              {liceCountsPerFish.length > 0 && (
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  background: 'white'
                }}>
                  {liceCountsPerFish.map((count, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderBottom: index < liceCountsPerFish.length - 1 ? '1px solid #f3f4f6' : 'none'
                      }}
                    >
                      <span style={{ fontSize: '14px', color: '#1f2937' }}>
                        Fisk #{index + 1}: <strong>{count}</strong> lus
                      </span>
                      <button
                        onClick={() => removeFish(index)}
                        style={{
                          background: '#fee2e2',
                          color: '#991b1b',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        Fjern
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  if (liceCountsPerFish.length === 0) {
                    alert('Vennligst legg til minst én fisk før du lagrer.')
                    return
                  }
                  if (!selectedMerdForRegistration) {
                    alert('Vennligst velg en merd.')
                    return
                  }
                  alert(`Lusetelling lagret!\nMerd: ${localityData.cages.find(c => c.id === parseInt(selectedMerdForRegistration))?.name}\nAntall fisk: ${liceCountsPerFish.length}\nGjennomsnitt: ${calculateAverage().toFixed(2)} lus per fisk`)
                  setLiceCountsPerFish([])
                  setCurrentLiceCount('')
                  setSelectedMerdForRegistration('')
                  setShowRegistration(false)
                }}
                disabled={liceCountsPerFish.length === 0 || !selectedMerdForRegistration}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: liceCountsPerFish.length === 0 || !selectedMerdForRegistration ? '#d1d5db' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: liceCountsPerFish.length === 0 || !selectedMerdForRegistration ? 'not-allowed' : 'pointer'
                }}
              >
                Lagre
              </button>
              <button
                onClick={() => {
                  setShowRegistration(false)
                  setLiceCountsPerFish([])
                  setCurrentLiceCount('')
                  setSelectedMerdForRegistration('')
                }}
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
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import/Export Modal */}
      {showImportExport && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1002,
            padding: '20px'
          }}
          onClick={() => setShowImportExport(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              padding: '32px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowImportExport(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              ✕
            </button>

            <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', color: '#1f2937' }}>
              Import/Export Data
            </h2>

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
          </div>
        </div>
      )}

      {/* Reports Modal */}
      {showReports && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1002,
            padding: '20px'
          }}
          onClick={() => setShowReports(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: '32px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowReports(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              ✕
            </button>

            <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', color: '#1f2937' }}>
              Rapporter
            </h2>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div
                onClick={() => alert('Åpner ukentlig luserapport...')}
                style={{
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                  Ukentlig Luserapport
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                  Sammendrag av lusetellinger siste 7 dager
                </p>
              </div>

              <div
                onClick={() => alert('Åpner månedlig produksjonsrapport...')}
                style={{
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                  Månedlig Produksjonsrapport
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                  Biomasse, vekst, dødelighet og fôrforbruk
                </p>
              </div>

              <div
                onClick={() => alert('Åpner velferdsrapport...')}
                style={{
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                  Velferdsrapport
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                  Velferdsscore og nøkkelindikatorer per merd
                </p>
              </div>

              <div
                onClick={() => alert('Åpner behandlingshistorikk...')}
                style={{
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                  Behandlingshistorikk
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                  Oversikt over alle lusebehandlinger
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilter && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1002,
            padding: '20px'
          }}
          onClick={() => setShowFilter(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '100%',
              padding: '32px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowFilter(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              ✕
            </button>

            <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', color: '#1f2937' }}>
              Filtrer Merder
            </h2>

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
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilterSettings({
                            ...filterSettings,
                            welfareScores: [...filterSettings.welfareScores, score]
                          })
                        } else {
                          setFilterSettings({
                            ...filterSettings,
                            welfareScores: filterSettings.welfareScores.filter(s => s !== score)
                          })
                        }
                      }}
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
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilterSettings({
                            ...filterSettings,
                            liceLevels: [...filterSettings.liceLevels, level.value]
                          })
                        } else {
                          setFilterSettings({
                            ...filterSettings,
                            liceLevels: filterSettings.liceLevels.filter(l => l !== level.value)
                          })
                        }
                      }}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '14px' }}>{level.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => {
                  alert('Filter anvendt!')
                  setShowFilter(false)
                }}
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
                onClick={() => {
                  setFilterSettings({
                    welfareScores: ['A', 'B', 'C', 'D'],
                    liceLevels: ['OK', 'WARNING', 'DANGER'],
                    minBiomass: 0,
                    maxBiomass: 500000
                  })
                }}
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
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && selectedCage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1003,
            padding: '20px'
          }}
          onClick={() => setShowHistory(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: '32px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowHistory(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              ✕
            </button>

            <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', color: '#1f2937' }}>
              Historikk - {selectedCage.name}
            </h2>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1f2937' }}>
                Lusetellinger siste 30 dager
              </h3>
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f9fafb' }}>
                    <tr>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Dato</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Antall lus/fisk</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Antall fisk telt</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontSize: '14px' }}>23.01.2026</td>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600 }}>0.45</td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>20</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          background: '#dcfce7',
                          color: '#166534',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>OK</span>
                      </td>
                    </tr>
                    <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontSize: '14px' }}>16.01.2026</td>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600 }}>0.38</td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>15</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          background: '#dcfce7',
                          color: '#166534',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>OK</span>
                      </td>
                    </tr>
                    <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontSize: '14px' }}>09.01.2026</td>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600 }}>0.52</td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>18</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          background: '#dcfce7',
                          color: '#166534',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>OK</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1f2937' }}>
                Behandlinger
              </h3>
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f9fafb' }}>
                    <tr>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Dato</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Type</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Resultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontSize: '14px' }}>02.01.2026</td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>Termisk</td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#10b981', fontWeight: 600 }}>God effekt</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <button
              onClick={() => setShowHistory(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#e5e7eb',
                color: '#1f2937',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Lukk
            </button>
          </div>
        </div>
      )}

      {/* Treatment Modal */}
      {showTreatment && selectedCage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1003,
            padding: '20px'
          }}
          onClick={() => setShowTreatment(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              padding: '32px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTreatment(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              ✕
            </button>

            <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', color: '#1f2937' }}>
              Registrer behandling - {selectedCage.name}
            </h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                Type behandling
              </label>
              <select style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}>
                <option>Velg behandlingstype...</option>
                <option>Termisk avlusning</option>
                <option>Mekanisk avlusning</option>
                <option>Medikamentell behandling</option>
                <option>Ferskvann</option>
                <option>Hydrogen peroksid</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                Dato
              </label>
              <input
                type="date"
                value={viewDate}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                Varighet (timer)
              </label>
              <input
                type="number"
                placeholder="4"
                min="0"
                step="0.5"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                Notater
              </label>
              <textarea
                placeholder="Legg til kommentarer eller observasjoner..."
                rows="4"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  alert('Behandling registrert!')
                  setShowTreatment(false)
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Lagre
              </button>
              <button
                onClick={() => setShowTreatment(false)}
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
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feeding Plan Modal */}
      {showFeedingPlan && selectedCage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1003,
            padding: '20px'
          }}
          onClick={() => setShowFeedingPlan(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: '32px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowFeedingPlan(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              ✕
            </button>

            <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', color: '#1f2937' }}>
              Fôringsplan - {selectedCage.name}
            </h2>

            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#166534' }}>
                Gjeldende plan
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px', color: '#15803d' }}>
                <div>
                  <strong>Daglig fôr:</strong> {(selectedCage.feedStorageKg / 14 / 1000).toFixed(1)} tonn/dag
                </div>
                <div>
                  <strong>Fôrtider:</strong> 06:00, 14:00, 18:00
                </div>
                <div>
                  <strong>Fôrtype:</strong> Premium Polar 9mm
                </div>
                <div>
                  <strong>FCR mål:</strong> 1.15
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                Daglig fôrmengde (kg)
              </label>
              <input
                type="number"
                defaultValue={(selectedCage.feedStorageKg / 14).toFixed(0)}
                min="0"
                step="10"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                Antall fôringer per dag
              </label>
              <select style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}>
                <option value="2">2 ganger</option>
                <option value="3" selected>3 ganger</option>
                <option value="4">4 ganger</option>
                <option value="5">5 ganger</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                Fôrtype
              </label>
              <select style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}>
                <option>Premium Polar 6mm</option>
                <option>Premium Polar 9mm</option>
                <option>Premium Polar 12mm</option>
                <option>Rapid 9mm</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                Fôrtider
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input type="time" defaultValue="06:00" style={{
                  flex: 1,
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }} />
                <input type="time" defaultValue="14:00" style={{
                  flex: 1,
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }} />
                <input type="time" defaultValue="18:00" style={{
                  flex: 1,
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  alert('Fôringsplan oppdatert!')
                  setShowFeedingPlan(false)
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Lagre plan
              </button>
              <button
                onClick={() => setShowFeedingPlan(false)}
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
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
