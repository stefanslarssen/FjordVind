/**
 * Utility functions for generating operational tips and welfare calculations
 */

export function getWelfareColor(score) {
  switch (score) {
    case 'A': return '#10b981'
    case 'B': return '#f59e0b'
    case 'C': return '#ef4444'
    default: return '#6b7280'
  }
}

export function calculateDensity(biomassKg, capacityTonnes) {
  if (!capacityTonnes || capacityTonnes === 0) return 0
  // Assume standard cage volume, density = kg/m³
  const volumeM3 = capacityTonnes * 40 // rough estimate: 1 tonne capacity ≈ 40m³
  return biomassKg / volumeM3
}

export function generateOperationalTip(localityData) {
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
