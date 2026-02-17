import { useState, useEffect, useRef } from 'react'

// Hjelpefunksjon for å beregne ukenummer
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

/**
 * WeekSelector - Velger for uke og år med tidslinje-animasjon
 */
export default function WeekSelector({ selectedYear, selectedWeek, onYearChange, onWeekChange }) {
  const currentYear = new Date().getFullYear()
  const currentWeek = getWeekNumber(new Date())
  const [isPlaying, setIsPlaying] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(1000)
  const animationRef = useRef(null)

  const weeks = Array.from({ length: 52 }, (_, i) => i + 1)
  const years = Array.from({ length: currentYear - 2019 }, (_, i) => 2020 + i)

  const isCurrentWeek = selectedYear === currentYear && selectedWeek === currentWeek
  const totalWeeks = (currentYear - 2020) * 52 + currentWeek
  const currentPosition = (selectedYear - 2020) * 52 + selectedWeek

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = setInterval(() => {
        if (selectedWeek < 52 && !(selectedYear === currentYear && selectedWeek >= currentWeek)) {
          onWeekChange(selectedWeek + 1)
        } else if (selectedYear < currentYear) {
          onYearChange(selectedYear + 1)
          onWeekChange(1)
        } else {
          setIsPlaying(false)
        }
      }, animationSpeed)
    }
    return () => {
      if (animationRef.current) clearInterval(animationRef.current)
    }
  }, [isPlaying, selectedYear, selectedWeek, animationSpeed, currentYear, currentWeek, onYearChange, onWeekChange])

  useEffect(() => {
    if (isCurrentWeek && isPlaying) setIsPlaying(false)
  }, [isCurrentWeek, isPlaying])

  const handleSliderChange = (e) => {
    const position = parseInt(e.target.value)
    const year = 2020 + Math.floor((position - 1) / 52)
    const week = ((position - 1) % 52) + 1
    onYearChange(year)
    onWeekChange(week)
  }

  const togglePlay = () => {
    if (isCurrentWeek) {
      onYearChange(selectedYear)
      onWeekChange(1)
      setIsPlaying(true)
    } else {
      setIsPlaying(!isPlaying)
    }
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      padding: '10px 16px',
      minWidth: '500px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', fontSize: '13px' }}>
        <button
          onClick={togglePlay}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: 'none',
            background: isPlaying ? '#f44336' : '#1565c0',
            color: 'white',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={isPlaying ? 'Pause' : 'Spill av tidslinje'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <span style={{ fontWeight: 600, color: '#1a3a5c' }}>Uke:</span>

        <select
          value={selectedYear}
          onChange={(e) => onYearChange(parseInt(e.target.value))}
          disabled={isPlaying}
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '13px',
            cursor: isPlaying ? 'not-allowed' : 'pointer',
            opacity: isPlaying ? 0.6 : 1
          }}
        >
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <select
          value={selectedWeek}
          onChange={(e) => onWeekChange(parseInt(e.target.value))}
          disabled={isPlaying}
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '13px',
            cursor: isPlaying ? 'not-allowed' : 'pointer',
            opacity: isPlaying ? 0.6 : 1
          }}
        >
          {weeks.map(week => (
            <option key={week} value={week} disabled={selectedYear === currentYear && week > currentWeek}>
              Uke {week}
            </option>
          ))}
        </select>

        <select
          value={animationSpeed}
          onChange={(e) => setAnimationSpeed(parseInt(e.target.value))}
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '12px',
            cursor: 'pointer'
          }}
          title="Animasjonshastighet"
        >
          <option value={2000}>Sakte</option>
          <option value={1000}>Normal</option>
          <option value={500}>Rask</option>
          <option value={250}>Veldig rask</option>
        </select>

        {!isCurrentWeek && !isPlaying && (
          <button
            onClick={() => {
              onYearChange(currentYear)
              onWeekChange(currentWeek)
            }}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              border: 'none',
              background: '#1565c0',
              color: 'white',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Nå
          </button>
        )}

        {isCurrentWeek && (
          <span style={{ color: '#4CAF50', fontSize: '12px', fontWeight: 500 }}>
            Gjeldende uke
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: '#666', minWidth: '50px' }}>2020 U1</span>
        <input
          type="range"
          min={1}
          max={totalWeeks}
          value={currentPosition}
          onChange={handleSliderChange}
          disabled={isPlaying}
          style={{
            flex: 1,
            height: '6px',
            cursor: isPlaying ? 'not-allowed' : 'pointer',
            accentColor: '#1565c0'
          }}
        />
        <span style={{ fontSize: '11px', color: '#666', minWidth: '60px', textAlign: 'right' }}>
          {currentYear} U{currentWeek}
        </span>
      </div>
    </div>
  )
}

export { getWeekNumber }
