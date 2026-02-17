import { useState, useEffect } from 'react'
import { fetchLocations } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function RapporterPage() {
  const { getAuthHeader } = useAuth()
  const [reports, setReports] = useState([])
  const [generating, setGenerating] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [locations, setLocations] = useState([])
  const [selectedLocation, setSelectedLocation] = useState('')

  // Custom date range
  const [useCustomDates, setUseCustomDates] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Calendar state
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [selectingStart, setSelectingStart] = useState(true)

  // Filter for report list
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Server PDF download state
  const [downloadingServerPdf, setDownloadingServerPdf] = useState(null)

  useEffect(() => {
    loadLocations()
    const saved = localStorage.getItem('fjordvind_reports')
    if (saved) {
      setReports(JSON.parse(saved))
    } else {
      setReports([
        { id: 1, name: 'Ukentlig luserapport', type: 'Lus', date: new Date().toISOString().slice(0, 10), status: 'ready', data: null },
        { id: 2, name: 'Månedlig miljørapport', type: 'Miljø', date: new Date().toISOString().slice(0, 10), status: 'ready', data: null },
      ])
    }

    // Set default dates
    const today = new Date()
    const monthAgo = new Date(today)
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    setEndDate(today.toISOString().split('T')[0])
    setStartDate(monthAgo.toISOString().split('T')[0])
  }, [])

  async function loadLocations() {
    try {
      const data = await fetchLocations()
      setLocations(data)
    } catch (e) {
      console.error('Failed to load locations:', e)
    }
  }

  const readyReports = reports.filter(r => r.status === 'ready').length
  const pendingReports = reports.filter(r => r.status === 'pending').length

  // Filter reports
  const filteredReports = reports.filter(r => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    return true
  })

  // Get unique types for filter
  const reportTypes = [...new Set(reports.map(r => r.type))]

  async function generateReport() {
    if (!selectedType) return

    setGenerating(true)

    try {
      let data = {}

      // Import Supabase functions dynamically
      const { fetchLiceCounts, fetchEnvironmentReadings, fetchTreatments, fetchDashboardStats } = await import('../services/supabase')

      if (selectedType === 'lus' || selectedType === 'mattilsynet') {
        const samples = await fetchLiceCounts({ locationId: selectedLocation || undefined, fromDate: startDate, toDate: endDate })
        data = { samples }
      } else if (selectedType === 'miljo') {
        const readings = await fetchEnvironmentReadings()
        data = { readings }
      } else if (selectedType === 'behandling') {
        const treatments = await fetchTreatments()
        data = treatments
      } else if (selectedType === 'foring') {
        data = { feedingLogs: [] } // Feeding not implemented yet
      } else if (selectedType === 'biomasse') {
        data = await fetchDashboardStats()
      } else if (selectedType === 'dodelighet') {
        data = { records: [] } // Mortality not implemented yet
      }

      const typeNames = {
        mattilsynet: 'Mattilsynet-rapport',
        lus: 'Luserapport',
        miljo: 'Miljørapport',
        behandling: 'Behandlingsrapport',
        foring: 'Fôringsrapport',
        biomasse: 'Biomasserapport',
        dodelighet: 'Dødlighetsrapport'
      }

      const periodNames = {
        week: 'siste uke',
        month: 'siste måned',
        quarter: 'siste kvartal',
        year: 'siste år'
      }

      const periodText = useCustomDates
        ? `${startDate} - ${endDate}`
        : periodNames[selectedPeriod]

      const newReport = {
        id: Date.now(),
        name: `${typeNames[selectedType]} - ${periodText}`,
        type: typeNames[selectedType].split('rapport')[0],
        date: new Date().toISOString().slice(0, 10),
        status: 'ready',
        location: selectedLocation || 'Alle',
        period: periodText,
        data: data
      }

      const updatedReports = [newReport, ...reports]
      setReports(updatedReports)
      localStorage.setItem('fjordvind_reports', JSON.stringify(updatedReports))

      setSelectedType('')
    } catch (error) {
      console.error('Failed to generate report:', error)
    } finally {
      setGenerating(false)
    }
  }

  // Calendar helper functions
  function getDaysInMonth(date) {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []

    // Add empty days for alignment
    for (let i = 0; i < (firstDay.getDay() || 7) - 1; i++) {
      days.push(null)
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  function formatMonth(date) {
    return date.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' })
  }

  function isInRange(date) {
    if (!startDate || !endDate || !date) return false
    const d = date.toISOString().split('T')[0]
    return d >= startDate && d <= endDate
  }

  function isStartOrEnd(date) {
    if (!date) return false
    const d = date.toISOString().split('T')[0]
    return d === startDate || d === endDate
  }

  function handleDateClick(date) {
    if (!date) return
    const dateStr = date.toISOString().split('T')[0]

    if (selectingStart) {
      setStartDate(dateStr)
      setEndDate('')
      setSelectingStart(false)
    } else {
      if (dateStr < startDate) {
        setEndDate(startDate)
        setStartDate(dateStr)
      } else {
        setEndDate(dateStr)
      }
      setSelectingStart(true)
    }
  }

  // Download functions
  function downloadTxt(report) {
    let content = `FjordVind - ${report.name}\n`
    content += `Generert: ${report.date}\n`
    content += `${'='.repeat(50)}\n\n`

    if (report.data) {
      if (Array.isArray(report.data)) {
        content += `Antall oppføringer: ${report.data.length}\n\n`
        report.data.slice(0, 20).forEach((item, i) => {
          content += `${i + 1}. ${JSON.stringify(item, null, 2)}\n`
        })
      } else {
        content += JSON.stringify(report.data, null, 2)
      }
    } else {
      content += 'Ingen data tilgjengelig for denne rapporten.\n'
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.name.replace(/\s+/g, '_')}_${report.date}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadExcel(report) {
    let csvContent = ''

    if (report.data && Array.isArray(report.data) && report.data.length > 0) {
      const headers = Object.keys(report.data[0])
      csvContent += headers.join(';') + '\n'
      report.data.forEach(item => {
        const row = headers.map(h => item[h] ?? '')
        csvContent += row.join(';') + '\n'
      })
    } else {
      csvContent = 'Ingen data\n'
    }

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.name.replace(/\s+/g, '_')}_${report.date}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadPdf(report) {
    let tableContent = '<p>Ingen data</p>'

    if (report.data && Array.isArray(report.data) && report.data.length > 0) {
      const headers = Object.keys(report.data[0])
      tableContent = `
        <table>
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${report.data.slice(0, 50).map(item =>
            `<tr>${headers.map(h => `<td>${item[h] ?? '-'}</td>`).join('')}</tr>`
          ).join('')}</tbody>
        </table>
      `
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${report.name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .header { border-bottom: 3px solid #1e40af; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 28px; font-weight: bold; color: #1e40af; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background: #f5f5f5; }
      </style>
    </head><body>
      <div class="header"><div class="logo">FjordVind</div><h2>${report.name}</h2><p>Generert: ${report.date}</p></div>
      ${tableContent}
      <script>window.onload = function() { window.print(); }</script>
    </body></html>`

    const printWindow = window.open('', '_blank')
    printWindow.document.write(html)
    printWindow.document.close()
  }

  function deleteReport(id) {
    const updatedReports = reports.filter(r => r.id !== id)
    setReports(updatedReports)
    localStorage.setItem('fjordvind_reports', JSON.stringify(updatedReports))
  }

  // Download professional PDF from server API
  async function downloadServerPdf(reportType) {
    setDownloadingServerPdf(reportType)

    try {
      const params = new URLSearchParams()
      if (selectedLocation) params.append('locationId', selectedLocation)
      if (startDate) params.append('fromDate', startDate)
      if (endDate) params.append('toDate', endDate)

      const endpoint = reportType === 'mattilsynet'
        ? '/api/reports/pdf/mattilsynet'
        : reportType === 'behandling'
          ? '/api/reports/pdf/treatment'
          : '/api/reports/pdf/lice'

      const response = await fetch(`${API_URL}${endpoint}?${params}`, {
        method: 'GET',
        headers: {
          ...getAuthHeader()
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Kunne ikke generere rapport')
      }

      // Download the PDF
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      const filename = reportType === 'mattilsynet'
        ? `Mattilsynet_Rapport_${new Date().toISOString().split('T')[0]}.pdf`
        : reportType === 'behandling'
          ? `Behandlingsrapport_${new Date().toISOString().split('T')[0]}.pdf`
          : `Luserapport_${new Date().toISOString().split('T')[0]}.pdf`

      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download server PDF:', error)
      alert('Kunne ikke laste ned rapport fra server. Prøv klient-generert PDF i stedet.')
    } finally {
      setDownloadingServerPdf(null)
    }
  }

  // SVG Icons for report types
  const icons = {
    mattilsynet: (color) => (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <path d="M9 13h6"/>
        <path d="M9 17h6"/>
        <path d="M9 9h1"/>
      </svg>
    ),
    lus: (color) => (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <ellipse cx="12" cy="12" rx="8" ry="5"/>
        <path d="M4 12c0-2 1-4 3-5M20 12c0-2-1-4-3-5"/>
        <circle cx="9" cy="11" r="1" fill={color}/>
        <circle cx="15" cy="11" r="1" fill={color}/>
      </svg>
    ),
    miljo: (color) => (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M14 4v6a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V4"/>
        <path d="M10 4v6a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2V4"/>
        <path d="M12 12v8"/>
        <path d="M8 20h8"/>
      </svg>
    ),
    behandling: (color) => (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <rect x="6" y="4" width="12" height="16" rx="2"/>
        <path d="M12 8v4"/>
        <path d="M10 10h4"/>
        <path d="M9 16h6"/>
      </svg>
    ),
    foring: (color) => (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M2 16s1-4 4-4 4 4 7 4 4-4 7-4 4 4 4 4"/>
        <path d="M18 8c0-2-1.5-4-4-4s-4 2-4 4"/>
        <circle cx="7" cy="12" r="1" fill={color}/>
      </svg>
    ),
    biomasse: (color) => (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M7 17V9"/>
        <path d="M12 17V7"/>
        <path d="M17 17v-5"/>
      </svg>
    ),
    dodelighet: (color) => (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M3 3v18h18"/>
        <path d="M7 14l4-4 4 4 5-6"/>
      </svg>
    )
  }

  // Report type cards config
  const reportTypeCards = [
    { id: 'mattilsynet', name: 'Mattilsynet', color: '#dc2626', desc: 'Offisiell ukerapport', official: true },
    { id: 'lus', name: 'Luserapport', color: '#ef4444', desc: 'Lusetellinger og trender' },
    { id: 'miljo', name: 'Miljørapport', color: '#3b82f6', desc: 'Temperatur, oksygen, pH' },
    { id: 'behandling', name: 'Behandling', color: '#8b5cf6', desc: 'Behandlingshistorikk' },
    { id: 'foring', name: 'Fôring', color: '#22c55e', desc: 'Fôrforbruk og -effektivitet' },
    { id: 'biomasse', name: 'Biomasse', color: '#f59e0b', desc: 'Vekt og biomasseutvikling' },
    { id: 'dodelighet', name: 'Dødelighet', color: '#6366f1', desc: 'Dødelighetsstatistikk' },
  ]

  // Mattilsynet-spesifikk PDF-generering
  function downloadMattilsynetPdf(report) {
    const currentWeek = getWeekNumber(new Date(report.date))
    const year = new Date(report.date).getFullYear()

    // Forbered data i Mattilsynet-format
    const liceData = report.data?.samples || report.data || []
    const locationName = locations.find(l => l.id === selectedLocation)?.name || 'Alle lokaliteter'

    // Beregn statistikk
    const avgAdultFemale = liceData.length > 0
      ? (liceData.reduce((sum, s) => sum + (s.adult_female_lice || 0), 0) / liceData.length).toFixed(2)
      : '0.00'
    const avgMobile = liceData.length > 0
      ? (liceData.reduce((sum, s) => sum + (s.mobile_lice || 0), 0) / liceData.length).toFixed(2)
      : '0.00'
    const avgStationary = liceData.length > 0
      ? (liceData.reduce((sum, s) => sum + (s.stationary_lice || 0), 0) / liceData.length).toFixed(2)
      : '0.00'

    const html = `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="utf-8">
  <title>Mattilsynet Ukerapport - Uke \${currentWeek}/\${year}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #000; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
    .header h1 { font-size: 16pt; margin: 0 0 5px 0; }
    .header h2 { font-size: 14pt; margin: 0; font-weight: normal; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 10pt; }
    .section { margin-bottom: 20px; }
    .section h3 { font-size: 12pt; border-bottom: 1px solid #666; padding-bottom: 5px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; }
    .summary-box { background: #f5f5f5; border: 1px solid #000; padding: 15px; margin: 20px 0; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center; }
    .summary-value { font-size: 18pt; font-weight: bold; color: #000; }
    .summary-label { font-size: 9pt; color: #666; }
    .status-ok { color: #16a34a; }
    .status-warning { color: #ca8a04; }
    .status-danger { color: #dc2626; font-weight: bold; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #666; font-size: 9pt; color: #666; }
    .signature-line { margin-top: 40px; display: flex; justify-content: space-between; }
    .signature-box { width: 200px; text-align: center; }
    .signature-box .line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>UKERAPPORT - LAKSELUS</h1>
    <h2>Rapportering til Mattilsynet iht. forskrift om lakselusbekjempelse</h2>
  </div>

  <div class="meta">
    <div>
      <strong>Lokalitet:</strong> \${locationName}<br>
      <strong>Organisasjon:</strong> FjordVind AS
    </div>
    <div style="text-align: right;">
      <strong>Uke:</strong> \${currentWeek}/\${year}<br>
      <strong>Generert:</strong> \${new Date().toLocaleDateString('nb-NO')}
    </div>
  </div>

  <div class="summary-box">
    <h3 style="margin: 0 0 15px 0; border: none;">Oppsummering lusetelling</h3>
    <div class="summary-grid">
      <div>
        <div class="summary-value \${parseFloat(avgAdultFemale) >= 0.5 ? 'status-danger' : parseFloat(avgAdultFemale) >= 0.2 ? 'status-warning' : 'status-ok'}">\${avgAdultFemale}</div>
        <div class="summary-label">Voksne hunnlus (snitt)</div>
        <div style="font-size: 8pt; color: #666;">Grense: 0,5 / 0,2 i vår</div>
      </div>
      <div>
        <div class="summary-value">\${avgMobile}</div>
        <div class="summary-label">Bevegelige lus (snitt)</div>
      </div>
      <div>
        <div class="summary-value">\${avgStationary}</div>
        <div class="summary-label">Fastsittende lus (snitt)</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h3>Detaljerte tellinger</h3>
    <table>
      <thead>
        <tr>
          <th>Dato</th>
          <th>Merd</th>
          <th>Antall fisk</th>
          <th>Voksne hunnlus</th>
          <th>Bevegelige</th>
          <th>Fastsittende</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        \${liceData.slice(0, 20).map(s => \`
          <tr>
            <td>\${s.date || s.counted_at?.split('T')[0] || '-'}</td>
            <td>\${s.merd_id || s.cage || '-'}</td>
            <td>\${s.fish_count || s.fish_counted || '-'}</td>
            <td class="\${(s.adult_female_lice || 0) >= 0.5 ? 'status-danger' : ''}">\${(s.adult_female_lice || 0).toFixed(2)}</td>
            <td>\${(s.mobile_lice || 0).toFixed(2)}</td>
            <td>\${(s.stationary_lice || 0).toFixed(2)}</td>
            <td class="\${(s.adult_female_lice || 0) >= 0.5 ? 'status-danger' : (s.adult_female_lice || 0) >= 0.2 ? 'status-warning' : 'status-ok'}">
              \${(s.adult_female_lice || 0) >= 0.5 ? 'OVER GRENSE' : (s.adult_female_lice || 0) >= 0.2 ? 'ADVARSEL' : 'OK'}
            </td>
          </tr>
        \`).join('')}
        \${liceData.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:#666;">Ingen tellinger registrert</td></tr>' : ''}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h3>Behandlingshistorikk siste 4 uker</h3>
    <p style="color: #666; font-style: italic;">Se separat behandlingsrapport for detaljer.</p>
  </div>

  <div class="signature-line">
    <div class="signature-box">
      <div class="line">Driftsleder</div>
    </div>
    <div class="signature-box">
      <div class="line">Dato</div>
    </div>
  </div>

  <div class="footer">
    <p>Denne rapporten er generert av FjordVind FjordVind og oppfyller kravene i forskrift om lakselusbekjempelse (FOR-2012-12-05-1140).</p>
    <p>Ved spørsmål kontakt: support@fjordvind.no | Rapport-ID: MT-\${Date.now()}</p>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`

    const printWindow = window.open('', '_blank')
    printWindow.document.write(html)
    printWindow.document.close()
  }

  // Mattilsynet Excel-eksport (CSV med spesifikt format)
  function downloadMattilsynetExcel(report) {
    const currentWeek = getWeekNumber(new Date(report.date))
    const year = new Date(report.date).getFullYear()
    const liceData = report.data?.samples || report.data || []
    const locationName = locations.find(l => l.id === selectedLocation)?.name || 'Alle lokaliteter'

    // Mattilsynet CSV-format
    let csv = `MATTILSYNET UKERAPPORT - LAKSELUS\n`
    csv += `Uke;${currentWeek}\n`
    csv += `År;${year}\n`
    csv += `Lokalitet;${locationName}\n`
    csv += `Generert;${new Date().toLocaleDateString('nb-NO')}\n`
    csv += `\n`
    csv += `Dato;Merd;Antall fisk;Voksne hunnlus;Bevegelige lus;Fastsittende lus;Status\n`

    liceData.forEach(s => {
      const status = (s.adult_female_lice || 0) >= 0.5 ? 'OVER GRENSE' :
                     (s.adult_female_lice || 0) >= 0.2 ? 'ADVARSEL' : 'OK'
      csv += `${s.date || s.counted_at?.split('T')[0] || ''};`
      csv += `${s.merd_id || s.cage || ''};`
      csv += `${s.fish_count || s.fish_counted || ''};`
      csv += `${(s.adult_female_lice || 0).toFixed(2)};`
      csv += `${(s.mobile_lice || 0).toFixed(2)};`
      csv += `${(s.stationary_lice || 0).toFixed(2)};`
      csv += `${status}\n`
    })

    // Legg til oppsummering
    const avgAdult = liceData.length > 0
      ? (liceData.reduce((sum, s) => sum + (s.adult_female_lice || 0), 0) / liceData.length).toFixed(2)
      : '0.00'

    csv += `\n`
    csv += `OPPSUMMERING\n`
    csv += `Antall tellinger;${liceData.length}\n`
    csv += `Snitt voksne hunnlus;${avgAdult}\n`
    csv += `Status;${parseFloat(avgAdult) >= 0.5 ? 'OVER GRENSE - TILTAK PÅKREVD' : parseFloat(avgAdult) >= 0.2 ? 'ADVARSEL' : 'OK'}\n`

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Mattilsynet_Uke${currentWeek}_${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Hjelpefunksjon for ukenummer
  function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  }

  return (
    <div style={{ padding: '0 24px 24px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 0',
        borderBottom: '1px solid var(--border)',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '600' }}>Rapporter</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--muted)' }}>
            Generer og last ned rapporter for dine anlegg
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            color: '#22c55e',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {readyReports} klare
          </div>
          {pendingReports > 0 && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              color: '#f59e0b',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {pendingReports} under behandling
            </div>
          )}
        </div>
      </div>

      {/* Generate Report Section */}
      <div style={{
        background: 'var(--card)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid var(--border)'
      }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
          Generer ny rapport
        </h2>

        {/* Report Type Selection */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '500', color: 'var(--muted)' }}>
            1. Velg rapporttype
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            {reportTypeCards.map(type => (
              <div
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: selectedType === type.id ? `2px solid ${type.color}` : '2px solid var(--border)',
                  background: selectedType === type.id ? `${type.color}10` : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ marginBottom: '8px' }}>{icons[type.id](type.color)}</div>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{type.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{type.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Location & Period Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '24px' }}>
          {/* Location Filter */}
          <div>
            <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '500', color: 'var(--muted)' }}>
              2. Velg lokasjon (valgfritt)
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '14px'
              }}
            >
              <option value="">Alle lokasjoner</option>
              {locations.map(loc => (
                <option key={loc.name || loc.lokalitet} value={loc.name || loc.lokalitet}>
                  {loc.name || loc.lokalitet}
                </option>
              ))}
            </select>
          </div>

          {/* Period Selection */}
          <div>
            <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '500', color: 'var(--muted)' }}>
              3. Velg tidsperiode
            </label>

            {/* Period Type Toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button
                onClick={() => setUseCustomDates(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: !useCustomDates ? 'var(--primary)' : 'var(--border)',
                  color: !useCustomDates ? 'white' : 'var(--foreground)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                Forhåndsdefinert
              </button>
              <button
                onClick={() => setUseCustomDates(true)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: useCustomDates ? 'var(--primary)' : 'var(--border)',
                  color: useCustomDates ? 'white' : 'var(--foreground)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                Egendefinert
              </button>
            </div>

            {!useCustomDates ? (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'week', label: 'Siste uke' },
                  { id: 'month', label: 'Siste måned' },
                  { id: 'quarter', label: 'Siste kvartal' },
                  { id: 'year', label: 'Siste år' }
                ].map(period => (
                  <button
                    key={period.id}
                    onClick={() => setSelectedPeriod(period.id)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: selectedPeriod === period.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: selectedPeriod === period.id ? 'rgba(45, 155, 196, 0.1)' : 'transparent',
                      color: 'var(--foreground)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: selectedPeriod === period.id ? '600' : '400'
                    }}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <span style={{ color: 'var(--muted)' }}>til</span>
                  <div style={{ flex: 1 }}>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <button
                    onClick={() => setShowCalendar(!showCalendar)}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: showCalendar ? 'var(--primary)' : 'transparent',
                      color: showCalendar ? 'white' : 'var(--foreground)',
                      cursor: 'pointer'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </button>
                </div>

                {/* Calendar Popup */}
                {showCalendar && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    background: 'var(--card)',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                    padding: '20px',
                    zIndex: 100,
                    width: '320px'
                  }}>
                    {/* Calendar Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <button
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--foreground)' }}
                      >
                        ←
                      </button>
                      <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>{formatMonth(calendarMonth)}</span>
                      <button
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--foreground)' }}
                      >
                        →
                      </button>
                    </div>

                    {/* Day Headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
                      {['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'].map(day => (
                        <div key={day} style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted)', fontWeight: '500' }}>
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Days Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                      {getDaysInMonth(calendarMonth).map((date, i) => (
                        <div
                          key={i}
                          onClick={() => handleDateClick(date)}
                          style={{
                            padding: '8px',
                            textAlign: 'center',
                            borderRadius: '8px',
                            cursor: date ? 'pointer' : 'default',
                            background: isStartOrEnd(date)
                              ? 'var(--primary)'
                              : isInRange(date)
                                ? 'rgba(45, 155, 196, 0.2)'
                                : 'transparent',
                            color: isStartOrEnd(date) ? 'white' : date ? 'var(--foreground)' : 'transparent',
                            fontSize: '14px',
                            fontWeight: isStartOrEnd(date) ? '600' : '400'
                          }}
                        >
                          {date?.getDate() || ''}
                        </div>
                      ))}
                    </div>

                    {/* Selection Info */}
                    <div style={{ marginTop: '16px', padding: '12px', background: 'var(--border)', borderRadius: '8px', fontSize: '13px' }}>
                      {selectingStart ? (
                        <span>Velg startdato</span>
                      ) : (
                        <span>Velg sluttdato</span>
                      )}
                      {startDate && endDate && (
                        <div style={{ marginTop: '4px', fontWeight: '500' }}>
                          {startDate} → {endDate}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setShowCalendar(false)}
                      style={{
                        width: '100%',
                        marginTop: '12px',
                        padding: '10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'var(--primary)',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Ferdig
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateReport}
          disabled={!selectedType || generating}
          style={{
            padding: '14px 32px',
            borderRadius: '10px',
            border: 'none',
            background: selectedType ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'var(--border)',
            color: selectedType ? 'white' : 'var(--muted)',
            cursor: selectedType ? 'pointer' : 'not-allowed',
            fontSize: '15px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: selectedType ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
          }}
        >
          {generating ? (
            <>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
              Genererer...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              Generer rapport
            </>
          )}
        </button>
      </div>

      {/* Reports List Section */}
      <div style={{
        background: 'var(--card)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            Mine rapporter
          </h2>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '13px'
              }}
            >
              <option value="all">Alle typer</option>
              {reportTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '13px'
              }}
            >
              <option value="all">Alle statuser</option>
              <option value="ready">Klar</option>
              <option value="pending">Under behandling</option>
            </select>
          </div>
        </div>

        {/* Reports Table */}
        {filteredReports.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--muted)' }}>Rapportnavn</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--muted)' }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--muted)' }}>Dato</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--muted)' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--muted)' }}>Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map(report => (
                  <tr key={report.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px', fontWeight: '500' }}>{report.name}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'var(--border)',
                        fontSize: '12px'
                      }}>
                        {report.type}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--muted)' }}>{report.date}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: report.status === 'ready' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: report.status === 'ready' ? '#22c55e' : '#f59e0b',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {report.status === 'ready' ? 'Klar' : 'Behandles'}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {report.status === 'ready' && (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {report.type === 'Mattilsynet' && (
                            <button
                              onClick={() => downloadServerPdf('mattilsynet')}
                              disabled={downloadingServerPdf === 'mattilsynet'}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                                color: 'white',
                                cursor: downloadingServerPdf === 'mattilsynet' ? 'wait' : 'pointer',
                                fontSize: '12px',
                                fontWeight: '500',
                                opacity: downloadingServerPdf === 'mattilsynet' ? 0.7 : 1
                              }}
                              title="Last ned profesjonell PDF fra server"
                            >
                              {downloadingServerPdf === 'mattilsynet' ? '⏳' : '⭐'} Server PDF
                            </button>
                          )}
                          {report.type === 'Behandling' && (
                            <button
                              onClick={() => downloadServerPdf('behandling')}
                              disabled={downloadingServerPdf === 'behandling'}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                                color: 'white',
                                cursor: downloadingServerPdf === 'behandling' ? 'wait' : 'pointer',
                                fontSize: '12px',
                                fontWeight: '500',
                                opacity: downloadingServerPdf === 'behandling' ? 0.7 : 1
                              }}
                              title="Last ned profesjonell PDF fra server"
                            >
                              {downloadingServerPdf === 'behandling' ? '⏳' : '⭐'} Server PDF
                            </button>
                          )}
                          <button
                            onClick={() => report.type === 'Mattilsynet' ? downloadMattilsynetPdf(report) : downloadPdf(report)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              background: '#dc2626',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                          >
                            {report.type === 'Mattilsynet' ? 'Lokal PDF' : 'PDF'}
                          </button>
                          <button
                            onClick={() => report.type === 'Mattilsynet' ? downloadMattilsynetExcel(report) : downloadExcel(report)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              background: '#16a34a',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                          >
                            {report.type === 'Mattilsynet' ? 'Mattilsynet CSV' : 'Excel'}
                          </button>
                          <button
                            onClick={() => downloadTxt(report)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'var(--primary)',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                          >
                            TXT
                          </button>
                          <button
                            onClick={() => deleteReport(report.id)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              background: 'transparent',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Slett
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{
            padding: '60px',
            textAlign: 'center',
            color: 'var(--muted)'
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5, margin: '0 auto 16px' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <div style={{ fontWeight: '500', marginBottom: '4px' }}>Ingen rapporter funnet</div>
            <div style={{ fontSize: '14px' }}>Generer din første rapport ovenfor</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
