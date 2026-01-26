import { createContext, useContext, useState, useEffect } from 'react'

const SETTINGS_KEY = 'fjordvind_settings'

// All translations
const translations = {
  no: {
    // App name
    appName: 'FjordVind',

    // Navigation
    nav: {
      oversikt: 'Oversikt',
      nyTelling: 'Ny telling',
      historikk: 'Historikk',
      lokasjoner: 'Lokasjoner',
      kart: 'Kart',
      omrade: 'Område',
      miljodata: 'Miljødata',
      foring: 'Fôring',
      behandlinger: 'Behandlinger',
      prediksjoner: 'Prediksjoner',
      rapporter: 'Rapporter',
      varsler: 'Varsler',
      innstillinger: 'Innstillinger',
      loggUt: 'Logg ut',
    },

    // Common
    common: {
      loading: 'Laster...',
      save: 'Lagre',
      cancel: 'Avbryt',
      delete: 'Slett',
      edit: 'Rediger',
      add: 'Legg til',
      search: 'Søk',
      filter: 'Filter',
      all: 'Alle',
      none: 'Ingen',
      yes: 'Ja',
      no: 'Nei',
      ok: 'OK',
      error: 'Feil',
      success: 'Suksess',
      warning: 'Advarsel',
      info: 'Info',
      close: 'Lukk',
      back: 'Tilbake',
      next: 'Neste',
      previous: 'Forrige',
      submit: 'Send inn',
      reset: 'Nullstill',
      export: 'Eksporter',
      import: 'Importer',
      download: 'Last ned',
      upload: 'Last opp',
      date: 'Dato',
      time: 'Tid',
      actions: 'Handlinger',
      status: 'Status',
      name: 'Navn',
      description: 'Beskrivelse',
      type: 'Type',
      value: 'Verdi',
      total: 'Totalt',
      average: 'Gjennomsnitt',
      min: 'Min',
      max: 'Maks',
      from: 'Fra',
      to: 'Til',
      selectAll: 'Velg alle',
      unselectAll: 'Fjern alle',
      noData: 'Ingen data',
      noResults: 'Ingen resultater',
    },

    // Overview page
    overview: {
      title: 'Oversikt',
      subtitle: 'Din daglige oversikt over lusenivåer',
      totalLocations: 'Totalt antall lokasjoner',
      averageLice: 'Gjennomsnittlig lusenivå',
      aboveLimit: 'Over grense',
      lastUpdated: 'Sist oppdatert',
      adultFemaleLice: 'voksne hunnlus/fisk',
      locations: 'lokasjoner',
      recentCounts: 'Siste tellinger',
      noLocations: 'Ingen lokasjoner registrert ennå',
      addFirstLocation: 'Legg til din første lokasjon for å komme i gang',
    },

    // Dashboard
    dashboard: {
      loadingData: 'Laster data...',
      fetchingFromApi: 'Henter informasjon fra API',
      noLocations: 'Ingen lokasjoner',
      reports: 'Rapporter',
      filter: 'Filter',

      // Critical alert
      critical: 'KRITISK',
      approachingLimit: 'nærmer seg lusegrensen',
      predictionShows: 'Prediksjon viser',
      probabilityExceed: 'sannsynlighet for å overskride 0.5 grensen innen 7 dager',
      recommendedAction: 'Anbefalt handling: Planlegg behandling.',
      planTreatment: 'Planlegg behandling',
      seeDetails: 'Se detaljer',

      // Stats cards
      liceCount: 'Lusetelling',
      totalLiceFound: 'Totalt funnet lus',
      mortality: 'Dødelighet',
      totalLoss: 'Totalt tap',
      relativeGrowthIndex: 'Relativ Vekstindeks',
      goodGrowth: 'God vekst!',
      belowTarget: 'Under mål',
      feedStorage: 'Fôr-lager',
      lastsForDays: 'Rekker i {days} dager',
      noStorageData: 'Ingen lagerdata',
      leastLiceIn: 'Minst lus i',
      mostLiceIn: 'Mest lus i',
      leastLossIn: 'Minst tap i',
      mostLossIn: 'Mest tap i',
      bestIn: 'Best i',
      worstIn: 'Svakest i',

      // Predictive analysis
      predictiveAnalysis: 'Prediktiv Analyse',
      aiDriven: 'AI-DREVET',
      updated: 'Oppdatert',
      today: 'I dag',

      licePrediction7Days: 'LUSEPREDIKSJON (7 DAGER)',
      expectedAvgAdultFemale: 'Forventet snitt voksne hunnlus',
      fromToday: 'fra i dag',

      treatmentNeed: 'BEHANDLINGSBEHOV',
      cagesWithin14Days: 'Merder innen 14 dager',

      growthForecast30D: 'VEKSTPROGNOSE (30D)',
      expectedBiomassIncrease: 'Forventet biomasse økning',

      riskScore: 'RISIKOSCORE',
      totalFacilityRisk: 'Samlet anleggsrisiko',
      criticalRisk: 'Kritisk',
      highRisk: 'Høy',
      lowModerateRisk: 'Lav-moderat',
      lowRisk: 'Lav',

      // Merd status
      merdStatus: 'Merd Status',
      active: 'aktive',
      seeAllDetails: 'Se alle detaljer',
      cage: 'Merd',
      fish: 'Fisk',
      avgWeight: 'snitt',
      liceRisk7d: '7d luse-risiko',

      // Treatment recommendations
      treatmentRecommendations: 'Behandlingsanbefalinger',
      newFeature: 'NY FUNKSJON',
      liveData: 'LIVE DATA',
      liceLevel: 'Lusenivå',
      predicted: 'Predikert',
      inDays: 'om {days} dager',
      recommendedMethod: 'Anbefalt metode',
      withinDays: 'Innen {days} dager',
      plan: 'Planlegg',

      // Lice trend
      liceTrend: 'Lusetelling Trend',
      last14Days: 'siste 14 dager',

      // Average lice
      avgLiceLevel: 'Snitt Lusenivå',
      adultFemaleLicePerFish: 'Voksne hunnlus per fisk',
      belowLimit: 'Under grenseverdi (0.5)',
      aboveLimit: 'Over grenseverdi (0.5)',

      // Mortality
      mortalityTitle: 'Dødelighet',
      lossLast30Days: 'Tap siste 30 dager',
      fromLastMonth: 'fra forrige måned',

      // Environment
      environmentParameters: 'Miljøparametere',
      waterTemperature: 'Vanntemperatur',
      oxygen: 'Oksygen (O₂)',
      salinity: 'Salinitet',
      phLevel: 'pH Nivå',
      optimal: 'Optimal',
      low: 'Lav',

      // Bottom stats
      totalFish: 'Total fisk',
      avgWeightLabel: 'Snitt vekt',
      totalBiomass: 'Total biomasse',
      mtbUtilization: 'MTB utnyttelse',
    },

    // New count page
    newCount: {
      title: 'Ny telling',
      subtitle: 'Registrer lus eller dødlighet for dine merder',
      selectLocation: 'Velg lokasjon',
      location: 'Lokalitet',
      selectLocationPlaceholder: 'Velg lokalitet...',
      cage: 'Merd',
      selectCagePlaceholder: 'Velg merd...',
      selectCage: 'Velg en merd',
      addObservation: 'Legg til minst en fiskeobservasjon',
      timing: 'Tidspunkt',
      date: 'Dato',
      time: 'Klokkeslett',
      temperature: 'Temperatur (C)',
      tempPlaceholder: 'f.eks. 12.5',
      deadFish: 'Dødfisk',
      fishObservations: 'Fiskeobservasjoner',
      fish: 'fisk',
      addFish: '+ Legg til fisk',
      fishNumber: 'Fisk #',
      adultFemaleLice: 'Voksne hunnlus',
      mobileLice: 'Bevegelige lus',
      attachedLice: 'Fastsittende lus',
      image: 'Bilde',
      takePhoto: 'Ta bilde med kamera',
      selectFromGallery: 'Velg fra galleri',
      remove: 'Fjern',
      quickAdd: 'Hurtiglegg:',
      summary: 'Oppsummering',
      fishCounted: 'Fisk talt',
      avgPerFish: 'Snitt per fisk',
      status: 'Status',
      danger: 'FARE',
      warning: 'ADVARSEL',
      ok: 'OK',
      notesOptional: 'Notater (valgfritt)',
      notesPlaceholder: 'Legg til eventuelle notater om tellingen...',
      cancel: 'Avbryt',
      saving: 'Lagrer...',
      saveCount: 'Lagre telling',
      countSaved: 'Telling lagret!',
      redirecting: 'Du blir sendt til historikk...',
      couldNotSave: 'Kunne ikke lagre tellingen',
      networkError: 'Nettverksfeil. Prøv igjen senere.',
      selectCountType: 'Velg type telling',
      liceCount: 'Lusetelling',
      mortalityCount: 'Dødlighet',
      mortalityRegistration: 'Dødelighetsregistrering',
      selectLocationFirst: 'Velg lokalitet for å se merder',
      merdsFound: 'merder funnet',
      enterMortalityBelow: 'registrer dødlighet for hver merd nedenfor',
      noMerdsFound: 'Ingen merder funnet for denne lokaliteten',
      enterDeadFishCount: 'Oppgi antall døde fisk i minst én merd',
    },

    // History page
    history: {
      title: 'Historikk',
      subtitle: 'Alle registrerte lusetellinger',
      allLocations: 'Alle lokasjoner',
      filter: 'Filtrer',
      exportCsv: 'Eksporter CSV',
      loading: 'Laster...',
      noRecords: 'Ingen tellinger funnet',
      date: 'Dato',
      location: 'Lokasjon',
      cage: 'Merd',
      fish: 'Fisk',
      mobile: 'Mobile',
      attached: 'Fastsitt.',
      adultFemale: 'Voksen hunn',
      avg: 'Snitt',
      images: 'Bilder',
      actions: 'Handlinger',
      edit: 'Rediger',
      delete: 'Slett',
      editCount: 'Rediger telling',
      fishCount: 'Antall fisk',
      adultFemaleLice: 'Voksne hunnlus',
      mobileLice: 'Mobile lus',
      attachedLice: 'Fastsittende lus',
      notes: 'Notater',
      optionalNotes: 'Valgfrie notater...',
      avgAdultFemale: 'Snitt voksne hunnlus:',
      cancel: 'Avbryt',
      saving: 'Lagrer...',
      saveChanges: 'Lagre endringer',
      deleteCount: 'Slett telling?',
      confirmDelete: 'Er du sikker på at du vil slette denne tellingen? Denne handlingen kan ikke angres.',
      deleting: 'Sletter...',
      image: 'Bilde',
      couldNotSave: 'Kunne ikke lagre endringene',
      couldNotDelete: 'Kunne ikke slette tellingen',
    },

    // Locations page
    locations: {
      title: 'Lokasjoner',
      subtitle: 'Oversikt over alle registrerte lokasjoner',
      searchLocation: 'Søk etter lokalitet:',
      searchPlaceholder: 'Skriv lokalitetsnavn eller kommune...',
      showing: 'Viser',
      of: 'av',
      localities: 'lokaliteter',
      filterByCompany: 'Filtrer etter oppdrettsselskap:',
      companyPlaceholder: 'Skriv selskapsnavn...',
      allCompanies: 'Alle selskap',
      showingCompanies: 'selskap',
      total: 'Totalt',
      danger: 'Fare',
      warning: 'Advarsel',
      ok: 'OK',
      backToOverview: '← Tilbake til oversikt',
      locationNo: 'Lokalitetsnr',
      noLocations: 'Ingen lokasjoner funnet',
      noLocationsFor: 'Ingen lokasjoner funnet for',
      cage: 'Merd',
      noCages: 'Ingen merder registrert for denne lokaliteten',
      registeredCounts: 'registrerte tellinger',
      fishExamined: 'Fisk undersøkt',
      adultFemale: 'Voksen hunnlus',
      lastCount: 'Siste telling',
      showHistory: 'Vis historikk',
      counts: 'tellinger',
      date: 'Dato',
      fish: 'Fisk',
      avg: 'Snitt',
      noCountsRegistered: 'Ingen lusetellinger registrert',
      status: 'Status',
      fallow: 'Brakklagt',
      reported: 'Rapportert',
      notReported: 'Ikke rapportert',
      clickToSeeCages: 'Klikk for å se merder →',
    },

    // Map page
    map: {
      title: 'Kartvisning',
      subtitle: 'Oversikt over dine oppdrettslokaliteter og nabooppdrett med lusenivå',
      selectCompany: 'Velg selskap',
      allCompanies: 'Alle selskap',
      selectLocation: 'Velg lokalitet',
      allLocations: 'Alle lokaliteter',
      locations: 'lokaliteter',
      legend: 'Tegnforklaring',
      showPolygons: 'Vis områder',
      hidePolygons: 'Skjul områder',
      liceLevel: 'Lusenivå',
      low: 'Lavt',
      medium: 'Middels',
      high: 'Høyt',
      critical: 'Kritisk',
      unknown: 'Ukjent',
    },

    // Area comparison page
    area: {
      title: 'Områdeoversikt',
      subtitle: 'Sammenligning med nabooppdrett og områdeanalyse',
      selectYourLocation: 'Velg din lokalitet',
      selectLocation: '-- Velg lokalitet --',
      searchRadius: 'Søkeradius',
      display: 'Visning',
      table: 'Tabell',
      chart: 'Graf',
      loadingData: 'Laster sammenligningsdata...',
      noData: 'Velg en lokalitet for å se områdeoversikt og sammenligning med nabooppdrett',
      yourLocation: 'Din lokalitet',
      areaAverage: 'Område (gj.snitt)',
      difference: 'Forskjell',
      aboveLimitCard: 'Over grense',
      neighborsAbove: 'naboer over 0.5',
      farmsInArea: 'anlegg i området',
      adultFemaleLice: 'voksne hunnlus/fisk',
      betterThanNeighbors: 'Bedre enn naboer',
      higherThanNeighbors: 'Høyere enn naboer',
      sameAsNeighbors: 'Likt som naboer',
      historicalComparison: 'Historisk Sammenligning (12 uker)',
      week: 'Uke',
      yourLocationLabel: 'Din lokalitet',
      neighborAverage: 'Naboer (gjennomsnitt)',
      limit: 'Grense',
      nearbyFarms: 'Nabooppdrett',
      pcs: 'stk',
      location: 'Lokalitet',
      municipality: 'Kommune',
      distance: 'Avstand',
      liceLevel: 'Lusenivå',
      status: 'Status',
      vsYours: 'vs. Din',
      noNeighborsFound: 'Ingen nabooppdrett funnet innen',
      unknown: 'Ukjent',
      critical: 'Kritisk',
      warning: 'Advarsel',
      ok: 'OK',
      higher: 'høyere',
      lower: 'lavere',
      same: 'likt',
      liceStatusComparison: 'Lusestatus - Sammenligning',
      areaAnalysis: 'Områdeanalyse',
      highRiskTitle: 'Høy risiko i området',
      highRiskText: 'Flertallet av nabooppdrettene har lusenivåer over grensen. Dette øker smitterisikoen i området. Det anbefales å øke overvåkningsfrekvensen og vurdere forebyggende tiltak.',
      moderateRiskTitle: 'Moderat risiko i området',
      moderateRiskText: 'Noen nabooppdrett har forhøyede lusenivåer. Hold øye med utviklingen og vurder å koordinere tiltak med naboer ved behov.',
      lowRiskTitle: 'Lav risiko i området',
      lowRiskText: 'Alle nabooppdrett har lusenivåer under grensen. Fortsett med normal overvåkning og forebyggende rutiner.',
    },

    // Environment page
    environment: {
      title: 'Miljødata',
      subtitle: 'Sanntidsdata for temperatur, oksygen og værforhold',
      selectLocation: 'Velg lokasjon',
      seaTemperature: 'Sjøtemperatur',
      oxygen: 'Oksygennivå',
      salinity: 'Salinitet',
      weather: 'Værforhold',
      wind: 'Vind',
      waveHeight: 'Bølgehøyde',
      current: 'Strøm',
      forecast: 'Prognose',
      noData: 'Ingen miljødata tilgjengelig',
    },

    // Feeding page
    feeding: {
      title: 'Fôring',
      subtitle: 'Oversikt over fôringsplaner og forbruk',
      // Stats cards
      liceCount: 'Lusetelling ~',
      totalLiceFound: 'Totalt funnet lus',
      mortality: 'Dødelighet ~',
      totalLoss: 'Totalt tap',
      relativeGrowthIndex: 'Relativ Vekstindeks',
      goodGrowth: 'God vekst!',
      belowTarget: 'Under mål',
      noData: 'Ingen data',
      leastLiceIn: 'Minst lus i',
      mostLiceIn: 'Mest lus i',
      leastLossIn: 'Minst tap i',
      mostLossIn: 'Mest tap i',
      bestIn: 'Best i',
      worstIn: 'Svakest i',
      feedStorage: 'Fôr-lager',
      lastsForDays: 'Rekker i {days} dager',
      noStorageData: 'Ingen lagerdata',
      // Summary stats
      totalFeedToday: 'Total fôr i dag',
      completed: 'Fullført',
      scheduled: 'Planlagt',
      // Feeding log
      feedingLog: 'Fôringslogg',
      loadingData: 'Laster data...',
      noFeedingData: 'Ingen fôringsdata tilgjengelig. Koble til API for å hente data.',
      couldNotLoadData: 'Kunne ikke laste data fra API',
      // Table headers
      location: 'Lokasjon',
      cage: 'Merd',
      date: 'Dato',
      amountKg: 'Mengde (kg)',
      feedType: 'Fôrtype',
      status: 'Status',
      completedStatus: 'Fullført',
      scheduledStatus: 'Planlagt',
      // Manual feeding form
      addManualFeeding: 'Legg til fôring',
      selectLocation: 'Velg lokasjon...',
      allCages: 'Alle merder',
      feedTypePlaceholder: 'f.eks. Skretting Nutra',
      notes: 'Notater',
      notesPlaceholder: 'Valgfrie notater om fôringen...',
      saving: 'Lagrer...',
      saveFeeding: 'Lagre fôring',
      couldNotSave: 'Kunne ikke lagre fôring',
      // Growth index
      growthIndex: 'Vekstindeks',
      currentWeight: 'Nåværende vekt',
      targetWeight: 'Målvekt',
      growthRate: 'Veksthastighet',
      daysToTarget: 'Dager til mål',
      goodGrowthStatus: 'God vekst',
      belowTargetStatus: 'Under mål',
      // Boat ordering
      orderFeedBoat: 'Bestill fôrbåt',
      requestedDate: 'Ønsket dato',
      amountTons: 'Mengde (tonn)',
      boatOrderNotesPlaceholder: 'Spesielle instruksjoner...',
      submitOrder: 'Send bestilling',
      pendingOrders: 'Ventende bestillinger',
      pendingStatus: 'Venter',
      // Weekly consumption
      weeklyConsumption: 'Fôrforbruk siste 7 dager',
      totalWeek: 'Totalt denne uken',
      avgPerDay: 'Snitt per dag',
      // FCR and analytics
      fcr: 'Fôrfaktor (FCR)',
      fcrDescription: 'kg fôr per kg tilvekst',
      target: 'Mål',
      onTarget: 'På mål',
      aboveTarget: 'Over mål',
      feedCost: 'Fôrkostnad i dag',
      estimatedCost: 'Estimert basert på forbruk',
      pricePerKg: 'Pris per kg',
      recommendedFeeding: 'Anbefalt fôring',
      ofBiomassPerDay: 'av biomasse per dag',
      waterTemp: 'Vanntemperatur',
      avgFishWeight: 'Snitt fiskevekt',
      noDataThisWeek: 'Ingen fôringsdata denne uken',
      addFeedingToSeeStats: 'Legg til fôring for å se statistikk',
    },

    // Treatments page
    treatments: {
      title: 'Behandlinger',
      subtitle: 'Oversikt over behandlinger mot lakselus',
      addTreatment: 'Registrer behandling',
      treatmentHistory: 'Behandlingshistorikk',
      treatmentType: 'Behandlingstype',
      mechanical: 'Mekanisk',
      medicinal: 'Medikamentell',
      biological: 'Biologisk',
      thermal: 'Termisk',
      product: 'Produkt',
      dosage: 'Dosering',
      duration: 'Varighet',
      effectiveness: 'Effektivitet',
      notes: 'Notater',
      noRecords: 'Ingen behandlinger registrert',
    },

    // Predictions page
    predictions: {
      title: 'Prediksjoner',
      subtitle: 'AI-baserte prediksjoner for lusenivåer',
      predictedLevel: 'Forventet lusenivå',
      confidence: 'Sikkerhet',
      trend: 'Trend',
      increasing: 'Økende',
      stable: 'Stabil',
      decreasing: 'Synkende',
      recommendation: 'Anbefaling',
      riskLevel: 'Risikonivå',
      low: 'Lav',
      medium: 'Middels',
      high: 'Høy',
      factors: 'Påvirkende faktorer',
      noData: 'Ikke nok data for prediksjon',
    },

    // Reports page
    reports: {
      title: 'Rapporter',
      subtitle: 'Generer og last ned rapporter',
      generateReport: 'Generer rapport',
      reportType: 'Rapporttype',
      weekly: 'Ukentlig',
      monthly: 'Månedlig',
      custom: 'Egendefinert',
      dateRange: 'Datoperiode',
      includeCharts: 'Inkluder diagrammer',
      includeImages: 'Inkluder bilder',
      format: 'Format',
      generating: 'Genererer rapport...',
      downloadReady: 'Rapport klar for nedlasting',
      scheduledReports: 'Planlagte rapporter',
      scheduleReport: 'Planlegg rapport',
      noReports: 'Ingen rapporter generert',
    },

    // Alerts page
    alerts: {
      title: 'Varsler',
      subtitle: 'Oversikt over varsler og hendelser',
      activeAlerts: 'Aktive varsler',
      alertHistory: 'Varslingshistorikk',
      criticalLice: 'Kritisk lusenivå',
      warningLice: 'Forhøyet lusenivå',
      treatmentDue: 'Behandling påkrevd',
      highMortality: 'Høy dødelighet',
      markAsRead: 'Merk som lest',
      markAllAsRead: 'Merk alle som lest',
      noAlerts: 'Ingen aktive varsler',
      triggeredAt: 'Utløst',
    },

    // Settings page
    settings: {
      title: 'Innstillinger',
      subtitle: 'Tilpass applikasjonen etter dine behov',
      saved: 'Innstillinger lagret',
      unsavedChanges: 'Du har ulagrede endringer',
      saveSettings: 'Lagre innstillinger',

      // Notifications section
      notifications: 'Varsler',
      enableNotifications: 'Aktiver varsler i appen',
      emailAlerts: 'Send varsler på e-post',
      smsAlerts: 'Send varsler på SMS',

      // Contact info
      contactInfo: 'Kontaktinformasjon for varsler',
      email: 'E-postadresse',
      emailPlaceholder: 'din@epost.no',
      phone: 'Telefonnummer',
      phonePlaceholder: '+47 XXX XX XXX',
      sendTest: 'Send test',
      sending: 'Sender...',
      testEmailSent: 'Test e-post sendt! Sjekk innboksen din.',
      testEmailFailed: 'Kunne ikke sende test e-post. Prøv igjen senere.',
      enterEmailFirst: 'Vennligst oppgi en e-postadresse først',

      // Alert thresholds
      alertThresholds: 'Varslingsgrenser',
      criticalLevel: 'Kritisk lusenivå (voksne hunnlus per fisk)',
      legalLimit: 'Lovpålagt grense',
      warningLevel: 'Advarselsnivå (voksne hunnlus per fisk)',
      recommendedWarning: 'Anbefalt: 0.2 for tidlig varsling',

      // Alert types
      alertTypes: 'Varslingstyper',
      alertTypesDesc: 'Velg hvordan du vil motta varsler for hver type hendelse',
      alertType: 'Varseltype',
      app: 'App',

      // Alert type labels
      liceCritical: 'Kritisk lusenivå (over grense)',
      liceWarning: 'Forhøyet lusenivå (advarsel)',
      licePrediction: 'Luseprediksjoner (AI)',
      highMortality: 'Høy dødelighet',
      treatmentDue: 'Behandling påkrevd',
      dailySummary: 'Daglig sammendrag',
      weeklyReport: 'Ukentlig rapport',

      // Data refresh
      dataRefresh: 'Dataoppdatering',
      autoRefresh: 'Automatisk oppdatering av data',
      refreshInterval: 'Oppdateringsintervall',
      seconds: 'sekunder',
      minute: 'minutt',
      minutes: 'minutter',

      // Display
      display: 'Visning',
      language: 'Språk',
      theme: 'Tema',
      dark: 'Mørkt',
      light: 'Lyst',
    },

    // Auth pages
    auth: {
      login: 'Logg inn',
      signup: 'Opprett konto',
      logout: 'Logg ut',
      forgotPassword: 'Glemt passord?',
      resetPassword: 'Tilbakestill passord',
      email: 'E-post',
      password: 'Passord',
      confirmPassword: 'Bekreft passord',
      rememberMe: 'Husk meg',
      noAccount: 'Har du ikke konto?',
      hasAccount: 'Har du allerede konto?',
      createAccount: 'Opprett konto',
      sendResetLink: 'Send tilbakestillingslenke',
      backToLogin: 'Tilbake til innlogging',
      invalidCredentials: 'Ugyldig e-post eller passord',
      emailRequired: 'E-post er påkrevd',
      passwordRequired: 'Passord er påkrevd',
      passwordMismatch: 'Passordene matcher ikke',
      resetEmailSent: 'E-post med tilbakestillingslenke er sendt',
    },

    // Lice status
    liceStatus: {
      good: 'Bra',
      warning: 'Advarsel',
      critical: 'Kritisk',
      unknown: 'Ukjent',
    },

    // Units
    units: {
      licePerFish: 'lus/fisk',
      adultFemaleLicePerFish: 'voksne hunnlus/fisk',
      kg: 'kg',
      tons: 'tonn',
      meters: 'm',
      kilometers: 'km',
      celsius: '°C',
      percent: '%',
      mgPerLiter: 'mg/L',
      metersPerSecond: 'm/s',
    },
  },

  en: {
    // App name
    appName: 'FjordVind',

    // Navigation
    nav: {
      oversikt: 'Overview',
      nyTelling: 'New Count',
      historikk: 'History',
      lokasjoner: 'Locations',
      kart: 'Map',
      omrade: 'Area',
      miljodata: 'Environment',
      foring: 'Feeding',
      behandlinger: 'Treatments',
      prediksjoner: 'Predictions',
      rapporter: 'Reports',
      varsler: 'Alerts',
      innstillinger: 'Settings',
      loggUt: 'Log out',
    },

    // Common
    common: {
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      search: 'Search',
      filter: 'Filter',
      all: 'All',
      none: 'None',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      info: 'Info',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      submit: 'Submit',
      reset: 'Reset',
      export: 'Export',
      import: 'Import',
      download: 'Download',
      upload: 'Upload',
      date: 'Date',
      time: 'Time',
      actions: 'Actions',
      status: 'Status',
      name: 'Name',
      description: 'Description',
      type: 'Type',
      value: 'Value',
      total: 'Total',
      average: 'Average',
      min: 'Min',
      max: 'Max',
      from: 'From',
      to: 'To',
      selectAll: 'Select all',
      unselectAll: 'Unselect all',
      noData: 'No data',
      noResults: 'No results',
    },

    // Overview page
    overview: {
      title: 'Overview',
      subtitle: 'Your daily overview of lice levels',
      totalLocations: 'Total locations',
      averageLice: 'Average lice level',
      aboveLimit: 'Above limit',
      lastUpdated: 'Last updated',
      adultFemaleLice: 'adult female lice/fish',
      locations: 'locations',
      recentCounts: 'Recent counts',
      noLocations: 'No locations registered yet',
      addFirstLocation: 'Add your first location to get started',
    },

    // Dashboard
    dashboard: {
      loadingData: 'Loading data...',
      fetchingFromApi: 'Fetching information from API',
      noLocations: 'No locations',
      reports: 'Reports',
      filter: 'Filter',

      // Critical alert
      critical: 'CRITICAL',
      approachingLimit: 'approaching lice limit',
      predictionShows: 'Prediction shows',
      probabilityExceed: 'probability of exceeding 0.5 limit within 7 days',
      recommendedAction: 'Recommended action: Plan treatment.',
      planTreatment: 'Plan treatment',
      seeDetails: 'See details',

      // Stats cards
      liceCount: 'Lice Count',
      totalLiceFound: 'Total lice found',
      mortality: 'Mortality',
      totalLoss: 'Total loss',
      relativeGrowthIndex: 'Relative Growth Index',
      goodGrowth: 'Good growth!',
      belowTarget: 'Below target',
      feedStorage: 'Feed Storage',
      lastsForDays: 'Lasts for {days} days',
      noStorageData: 'No storage data',
      leastLiceIn: 'Least lice in',
      mostLiceIn: 'Most lice in',
      leastLossIn: 'Least loss in',
      mostLossIn: 'Most loss in',
      bestIn: 'Best in',
      worstIn: 'Worst in',

      // Predictive analysis
      predictiveAnalysis: 'Predictive Analysis',
      aiDriven: 'AI-DRIVEN',
      updated: 'Updated',
      today: 'Today',

      licePrediction7Days: 'LICE PREDICTION (7 DAYS)',
      expectedAvgAdultFemale: 'Expected avg adult female lice',
      fromToday: 'from today',

      treatmentNeed: 'TREATMENT NEED',
      cagesWithin14Days: 'Cages within 14 days',

      growthForecast30D: 'GROWTH FORECAST (30D)',
      expectedBiomassIncrease: 'Expected biomass increase',

      riskScore: 'RISK SCORE',
      totalFacilityRisk: 'Total facility risk',
      criticalRisk: 'Critical',
      highRisk: 'High',
      lowModerateRisk: 'Low-moderate',
      lowRisk: 'Low',

      // Merd status
      merdStatus: 'Cage Status',
      active: 'active',
      seeAllDetails: 'See all details',
      cage: 'Cage',
      fish: 'Fish',
      avgWeight: 'avg',
      liceRisk7d: '7d lice risk',

      // Treatment recommendations
      treatmentRecommendations: 'Treatment Recommendations',
      newFeature: 'NEW FEATURE',
      liveData: 'LIVE DATA',
      liceLevel: 'Lice level',
      predicted: 'Predicted',
      inDays: 'in {days} days',
      recommendedMethod: 'Recommended method',
      withinDays: 'Within {days} days',
      plan: 'Plan',

      // Lice trend
      liceTrend: 'Lice Count Trend',
      last14Days: 'last 14 days',

      // Average lice
      avgLiceLevel: 'Avg Lice Level',
      adultFemaleLicePerFish: 'Adult female lice per fish',
      belowLimit: 'Below limit (0.5)',
      aboveLimit: 'Above limit (0.5)',

      // Mortality
      mortalityTitle: 'Mortality',
      lossLast30Days: 'Loss last 30 days',
      fromLastMonth: 'from last month',

      // Environment
      environmentParameters: 'Environment Parameters',
      waterTemperature: 'Water Temperature',
      oxygen: 'Oxygen (O₂)',
      salinity: 'Salinity',
      phLevel: 'pH Level',
      optimal: 'Optimal',
      low: 'Low',

      // Bottom stats
      totalFish: 'Total fish',
      avgWeightLabel: 'Avg weight',
      totalBiomass: 'Total biomass',
      mtbUtilization: 'MTB utilization',
    },

    // New count page
    newCount: {
      title: 'New Count',
      subtitle: 'Register lice or mortality for your cages',
      selectLocation: 'Select location',
      location: 'Location',
      selectLocationPlaceholder: 'Select location...',
      cage: 'Cage',
      selectCagePlaceholder: 'Select cage...',
      selectCage: 'Select a cage',
      addObservation: 'Add at least one fish observation',
      timing: 'Timing',
      date: 'Date',
      time: 'Time',
      temperature: 'Temperature (C)',
      tempPlaceholder: 'e.g. 12.5',
      fishObservations: 'Fish Observations',
      fish: 'fish',
      addFish: '+ Add fish',
      fishNumber: 'Fish #',
      adultFemaleLice: 'Adult female lice',
      mobileLice: 'Mobile lice',
      attachedLice: 'Attached lice',
      image: 'Image',
      takePhoto: 'Take photo with camera',
      selectFromGallery: 'Select from gallery',
      remove: 'Remove',
      quickAdd: 'Quick add:',
      summary: 'Summary',
      fishCounted: 'Fish counted',
      avgPerFish: 'Avg per fish',
      status: 'Status',
      danger: 'DANGER',
      warning: 'WARNING',
      ok: 'OK',
      notesOptional: 'Notes (optional)',
      notesPlaceholder: 'Add any notes about the count...',
      cancel: 'Cancel',
      saving: 'Saving...',
      saveCount: 'Save count',
      countSaved: 'Count saved!',
      redirecting: 'Redirecting to history...',
      couldNotSave: 'Could not save count',
      networkError: 'Network error. Please try again later.',
      selectCountType: 'Select count type',
      liceCount: 'Lice count',
      mortalityCount: 'Mortality',
      mortalityRegistration: 'Mortality registration',
      selectLocationFirst: 'Select location to see cages',
      merdsFound: 'cages found',
      enterMortalityBelow: 'register mortality for each cage below',
      noMerdsFound: 'No cages found for this location',
      enterDeadFishCount: 'Enter dead fish count for at least one cage',
    },

    // History page
    history: {
      title: 'History',
      subtitle: 'All registered lice counts',
      allLocations: 'All locations',
      filter: 'Filter',
      exportCsv: 'Export CSV',
      loading: 'Loading...',
      noRecords: 'No counts found',
      date: 'Date',
      location: 'Location',
      cage: 'Cage',
      fish: 'Fish',
      mobile: 'Mobile',
      attached: 'Attached',
      adultFemale: 'Adult fem.',
      avg: 'Avg',
      images: 'Images',
      actions: 'Actions',
      edit: 'Edit',
      delete: 'Delete',
      editCount: 'Edit count',
      fishCount: 'Fish count',
      adultFemaleLice: 'Adult female lice',
      mobileLice: 'Mobile lice',
      attachedLice: 'Attached lice',
      notes: 'Notes',
      optionalNotes: 'Optional notes...',
      avgAdultFemale: 'Avg adult female lice:',
      cancel: 'Cancel',
      saving: 'Saving...',
      saveChanges: 'Save changes',
      deleteCount: 'Delete count?',
      confirmDelete: 'Are you sure you want to delete this count? This action cannot be undone.',
      deleting: 'Deleting...',
      image: 'Image',
      couldNotSave: 'Could not save changes',
      couldNotDelete: 'Could not delete count',
    },

    // Locations page
    locations: {
      title: 'Locations',
      subtitle: 'Overview of all registered locations',
      searchLocation: 'Search for location:',
      searchPlaceholder: 'Enter location name or municipality...',
      showing: 'Showing',
      of: 'of',
      localities: 'localities',
      filterByCompany: 'Filter by aquaculture company:',
      companyPlaceholder: 'Enter company name...',
      allCompanies: 'All companies',
      showingCompanies: 'companies',
      total: 'Total',
      danger: 'Danger',
      warning: 'Warning',
      ok: 'OK',
      backToOverview: '← Back to overview',
      locationNo: 'Location No',
      noLocations: 'No locations found',
      noLocationsFor: 'No locations found for',
      cage: 'Cage',
      noCages: 'No cages registered for this location',
      registeredCounts: 'registered counts',
      fishExamined: 'Fish examined',
      adultFemale: 'Adult female lice',
      lastCount: 'Last count',
      showHistory: 'Show history',
      counts: 'counts',
      date: 'Date',
      fish: 'Fish',
      avg: 'Avg',
      noCountsRegistered: 'No lice counts registered',
      status: 'Status',
      fallow: 'Fallow',
      reported: 'Reported',
      notReported: 'Not reported',
      clickToSeeCages: 'Click to see cages →',
    },

    // Map page
    map: {
      title: 'Map View',
      subtitle: 'Overview of your aquaculture sites and neighboring farms with lice levels',
      selectCompany: 'Select company',
      allCompanies: 'All companies',
      selectLocation: 'Select location',
      allLocations: 'All locations',
      locations: 'locations',
      legend: 'Legend',
      showPolygons: 'Show areas',
      hidePolygons: 'Hide areas',
      liceLevel: 'Lice level',
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Critical',
      unknown: 'Unknown',
    },

    // Area comparison page
    area: {
      title: 'Area Overview',
      subtitle: 'Comparison with neighboring farms and area analysis',
      selectYourLocation: 'Select your location',
      selectLocation: '-- Select location --',
      searchRadius: 'Search radius',
      display: 'Display',
      table: 'Table',
      chart: 'Chart',
      loadingData: 'Loading comparison data...',
      noData: 'Select a location to see area overview and comparison with neighboring farms',
      yourLocation: 'Your location',
      areaAverage: 'Area (average)',
      difference: 'Difference',
      aboveLimitCard: 'Above limit',
      neighborsAbove: 'neighbors above 0.5',
      farmsInArea: 'farms in area',
      adultFemaleLice: 'adult female lice/fish',
      betterThanNeighbors: 'Better than neighbors',
      higherThanNeighbors: 'Higher than neighbors',
      sameAsNeighbors: 'Same as neighbors',
      historicalComparison: 'Historical Comparison (12 weeks)',
      week: 'Week',
      yourLocationLabel: 'Your location',
      neighborAverage: 'Neighbors (average)',
      limit: 'Limit',
      nearbyFarms: 'Neighboring farms',
      pcs: 'pcs',
      location: 'Location',
      municipality: 'Municipality',
      distance: 'Distance',
      liceLevel: 'Lice level',
      status: 'Status',
      vsYours: 'vs. Yours',
      noNeighborsFound: 'No neighboring farms found within',
      unknown: 'Unknown',
      critical: 'Critical',
      warning: 'Warning',
      ok: 'OK',
      higher: 'higher',
      lower: 'lower',
      same: 'same',
      liceStatusComparison: 'Lice Status - Comparison',
      areaAnalysis: 'Area Analysis',
      highRiskTitle: 'High risk in area',
      highRiskText: 'The majority of neighboring farms have lice levels above the limit. This increases the infection risk in the area. It is recommended to increase monitoring frequency and consider preventive measures.',
      moderateRiskTitle: 'Moderate risk in area',
      moderateRiskText: 'Some neighboring farms have elevated lice levels. Monitor the development and consider coordinating measures with neighbors if needed.',
      lowRiskTitle: 'Low risk in area',
      lowRiskText: 'All neighboring farms have lice levels below the limit. Continue with normal monitoring and preventive routines.',
    },

    // Environment page
    environment: {
      title: 'Environment Data',
      subtitle: 'Real-time data for temperature, oxygen and weather conditions',
      selectLocation: 'Select location',
      seaTemperature: 'Sea temperature',
      oxygen: 'Oxygen level',
      salinity: 'Salinity',
      weather: 'Weather conditions',
      wind: 'Wind',
      waveHeight: 'Wave height',
      current: 'Current',
      forecast: 'Forecast',
      noData: 'No environmental data available',
    },

    // Feeding page
    feeding: {
      title: 'Feeding',
      subtitle: 'Overview of feeding plans and consumption',
      // Stats cards
      liceCount: 'Lice Count ~',
      totalLiceFound: 'Total lice found',
      mortality: 'Mortality ~',
      totalLoss: 'Total loss',
      relativeGrowthIndex: 'Relative Growth Index',
      goodGrowth: 'Good growth!',
      belowTarget: 'Below target',
      noData: 'No data',
      leastLiceIn: 'Least lice in',
      mostLiceIn: 'Most lice in',
      leastLossIn: 'Least loss in',
      mostLossIn: 'Most loss in',
      bestIn: 'Best in',
      worstIn: 'Weakest in',
      feedStorage: 'Feed Storage',
      lastsForDays: 'Lasts for {days} days',
      noStorageData: 'No storage data',
      // Summary stats
      totalFeedToday: 'Total feed today',
      completed: 'Completed',
      scheduled: 'Scheduled',
      // Feeding log
      feedingLog: 'Feeding Log',
      loadingData: 'Loading data...',
      noFeedingData: 'No feeding data available. Connect to API to fetch data.',
      couldNotLoadData: 'Could not load data from API',
      // Table headers
      location: 'Location',
      cage: 'Cage',
      date: 'Date',
      amountKg: 'Amount (kg)',
      feedType: 'Feed type',
      status: 'Status',
      completedStatus: 'Completed',
      scheduledStatus: 'Scheduled',
      // Manual feeding form
      addManualFeeding: 'Add feeding',
      selectLocation: 'Select location...',
      allCages: 'All cages',
      feedTypePlaceholder: 'e.g. Skretting Nutra',
      notes: 'Notes',
      notesPlaceholder: 'Optional notes about the feeding...',
      saving: 'Saving...',
      saveFeeding: 'Save feeding',
      couldNotSave: 'Could not save feeding',
      // Growth index
      growthIndex: 'Growth Index',
      currentWeight: 'Current weight',
      targetWeight: 'Target weight',
      growthRate: 'Growth rate',
      daysToTarget: 'Days to target',
      goodGrowthStatus: 'Good growth',
      belowTargetStatus: 'Below target',
      // Boat ordering
      orderFeedBoat: 'Order feed boat',
      requestedDate: 'Requested date',
      amountTons: 'Amount (tons)',
      boatOrderNotesPlaceholder: 'Special instructions...',
      submitOrder: 'Submit order',
      pendingOrders: 'Pending orders',
      pendingStatus: 'Pending',
      // Weekly consumption
      weeklyConsumption: 'Feed consumption last 7 days',
      totalWeek: 'Total this week',
      avgPerDay: 'Avg per day',
      // FCR and analytics
      fcr: 'Feed Conversion Ratio (FCR)',
      fcrDescription: 'kg feed per kg growth',
      target: 'Target',
      onTarget: 'On target',
      aboveTarget: 'Above target',
      feedCost: 'Feed cost today',
      estimatedCost: 'Estimated based on consumption',
      pricePerKg: 'Price per kg',
      recommendedFeeding: 'Recommended feeding',
      ofBiomassPerDay: 'of biomass per day',
      waterTemp: 'Water temperature',
      avgFishWeight: 'Avg fish weight',
      noDataThisWeek: 'No feeding data this week',
      addFeedingToSeeStats: 'Add feeding to see statistics',
    },

    // Treatments page
    treatments: {
      title: 'Treatments',
      subtitle: 'Overview of treatments against sea lice',
      addTreatment: 'Register treatment',
      treatmentHistory: 'Treatment history',
      treatmentType: 'Treatment type',
      mechanical: 'Mechanical',
      medicinal: 'Medicinal',
      biological: 'Biological',
      thermal: 'Thermal',
      product: 'Product',
      dosage: 'Dosage',
      duration: 'Duration',
      effectiveness: 'Effectiveness',
      notes: 'Notes',
      noRecords: 'No treatments registered',
    },

    // Predictions page
    predictions: {
      title: 'Predictions',
      subtitle: 'AI-based predictions for lice levels',
      predictedLevel: 'Predicted lice level',
      confidence: 'Confidence',
      trend: 'Trend',
      increasing: 'Increasing',
      stable: 'Stable',
      decreasing: 'Decreasing',
      recommendation: 'Recommendation',
      riskLevel: 'Risk level',
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      factors: 'Contributing factors',
      noData: 'Not enough data for prediction',
    },

    // Reports page
    reports: {
      title: 'Reports',
      subtitle: 'Generate and download reports',
      generateReport: 'Generate report',
      reportType: 'Report type',
      weekly: 'Weekly',
      monthly: 'Monthly',
      custom: 'Custom',
      dateRange: 'Date range',
      includeCharts: 'Include charts',
      includeImages: 'Include images',
      format: 'Format',
      generating: 'Generating report...',
      downloadReady: 'Report ready for download',
      scheduledReports: 'Scheduled reports',
      scheduleReport: 'Schedule report',
      noReports: 'No reports generated',
    },

    // Alerts page
    alerts: {
      title: 'Alerts',
      subtitle: 'Overview of alerts and events',
      activeAlerts: 'Active alerts',
      alertHistory: 'Alert history',
      criticalLice: 'Critical lice level',
      warningLice: 'Elevated lice level',
      treatmentDue: 'Treatment required',
      highMortality: 'High mortality',
      markAsRead: 'Mark as read',
      markAllAsRead: 'Mark all as read',
      noAlerts: 'No active alerts',
      triggeredAt: 'Triggered at',
    },

    // Settings page
    settings: {
      title: 'Settings',
      subtitle: 'Customize the application to your needs',
      saved: 'Settings saved',
      unsavedChanges: 'You have unsaved changes',
      saveSettings: 'Save settings',

      // Notifications section
      notifications: 'Notifications',
      enableNotifications: 'Enable in-app notifications',
      emailAlerts: 'Send alerts via email',
      smsAlerts: 'Send alerts via SMS',

      // Contact info
      contactInfo: 'Contact information for alerts',
      email: 'Email address',
      emailPlaceholder: 'your@email.com',
      phone: 'Phone number',
      phonePlaceholder: '+47 XXX XX XXX',
      sendTest: 'Send test',
      sending: 'Sending...',
      testEmailSent: 'Test email sent! Check your inbox.',
      testEmailFailed: 'Could not send test email. Try again later.',
      enterEmailFirst: 'Please enter an email address first',

      // Alert thresholds
      alertThresholds: 'Alert thresholds',
      criticalLevel: 'Critical lice level (adult female lice per fish)',
      legalLimit: 'Legal limit',
      warningLevel: 'Warning level (adult female lice per fish)',
      recommendedWarning: 'Recommended: 0.2 for early warning',

      // Alert types
      alertTypes: 'Alert types',
      alertTypesDesc: 'Choose how you want to receive alerts for each event type',
      alertType: 'Alert type',
      app: 'App',

      // Alert type labels
      liceCritical: 'Critical lice level (above limit)',
      liceWarning: 'Elevated lice level (warning)',
      licePrediction: 'Lice predictions (AI)',
      highMortality: 'High mortality',
      treatmentDue: 'Treatment required',
      dailySummary: 'Daily summary',
      weeklyReport: 'Weekly report',

      // Data refresh
      dataRefresh: 'Data refresh',
      autoRefresh: 'Automatic data refresh',
      refreshInterval: 'Refresh interval',
      seconds: 'seconds',
      minute: 'minute',
      minutes: 'minutes',

      // Display
      display: 'Display',
      language: 'Language',
      theme: 'Theme',
      dark: 'Dark',
      light: 'Light',
    },

    // Auth pages
    auth: {
      login: 'Log in',
      signup: 'Sign up',
      logout: 'Log out',
      forgotPassword: 'Forgot password?',
      resetPassword: 'Reset password',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password',
      rememberMe: 'Remember me',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      createAccount: 'Create account',
      sendResetLink: 'Send reset link',
      backToLogin: 'Back to login',
      invalidCredentials: 'Invalid email or password',
      emailRequired: 'Email is required',
      passwordRequired: 'Password is required',
      passwordMismatch: 'Passwords do not match',
      resetEmailSent: 'Reset email sent',
    },

    // Lice status
    liceStatus: {
      good: 'Good',
      warning: 'Warning',
      critical: 'Critical',
      unknown: 'Unknown',
    },

    // Units
    units: {
      licePerFish: 'lice/fish',
      adultFemaleLicePerFish: 'adult female lice/fish',
      kg: 'kg',
      tons: 'tons',
      meters: 'm',
      kilometers: 'km',
      celsius: '°C',
      percent: '%',
      mgPerLiter: 'mg/L',
      metersPerSecond: 'm/s',
    },
  },
}

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('no')

  // Load language from settings on mount
  useEffect(() => {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.language) {
          setLanguage(parsed.language)
        }
      } catch (e) {
        console.error('Failed to parse settings for language:', e)
      }
    }
  }, [])

  // Listen for language changes in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem(SETTINGS_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (parsed.language && parsed.language !== language) {
            setLanguage(parsed.language)
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)

    // Also listen for custom event for same-tab updates
    const handleLanguageChange = (e) => {
      if (e.detail && e.detail.language) {
        setLanguage(e.detail.language)
      }
    }
    window.addEventListener('languageChange', handleLanguageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('languageChange', handleLanguageChange)
    }
  }, [language])

  const t = (key) => {
    const keys = key.split('.')
    let value = translations[language]

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        // Fallback to Norwegian if key not found
        value = translations['no']
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = value[fallbackKey]
          } else {
            return key // Return key if not found in fallback either
          }
        }
        break
      }
    }

    return value
  }

  const changeLanguage = (newLang) => {
    setLanguage(newLang)
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('languageChange', { detail: { language: newLang } }))
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t, translations }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export default LanguageContext
