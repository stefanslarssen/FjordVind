import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import WeekSelector, { getWeekNumber } from '../components/map/WeekSelector'

describe('getWeekNumber', () => {
  it('returns correct week number for known dates', () => {
    // January 1, 2024 (Monday) is week 1
    expect(getWeekNumber(new Date(2024, 0, 1))).toBe(1)

    // January 8, 2024 is week 2
    expect(getWeekNumber(new Date(2024, 0, 8))).toBe(2)

    // December 31, 2023 is week 52 of 2023
    expect(getWeekNumber(new Date(2023, 11, 31))).toBe(52)
  })

  it('handles mid-year dates correctly', () => {
    // July 15, 2024
    const week = getWeekNumber(new Date(2024, 6, 15))
    expect(week).toBeGreaterThan(25)
    expect(week).toBeLessThan(35)
  })
})

describe('WeekSelector', () => {
  const mockOnYearChange = vi.fn()
  const mockOnWeekChange = vi.fn()

  const defaultProps = {
    selectedYear: 2024,
    selectedWeek: 10,
    onYearChange: mockOnYearChange,
    onWeekChange: mockOnWeekChange
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 5, 15)) // June 15, 2024
    mockOnYearChange.mockClear()
    mockOnWeekChange.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders year and week selectors', () => {
    render(<WeekSelector {...defaultProps} />)

    expect(screen.getByText('Uke:')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2024')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Uke 10')).toBeInTheDocument()
  })

  it('calls onYearChange when year is changed', () => {
    render(<WeekSelector {...defaultProps} />)

    const yearSelect = screen.getByDisplayValue('2024')
    fireEvent.change(yearSelect, { target: { value: '2023' } })

    expect(mockOnYearChange).toHaveBeenCalledWith(2023)
  })

  it('calls onWeekChange when week is changed', () => {
    render(<WeekSelector {...defaultProps} />)

    const weekSelect = screen.getByDisplayValue('Uke 10')
    fireEvent.change(weekSelect, { target: { value: '15' } })

    expect(mockOnWeekChange).toHaveBeenCalledWith(15)
  })

  it('shows play button when not at current week', () => {
    render(<WeekSelector {...defaultProps} />)

    const playButton = screen.getByTitle('Spill av tidslinje')
    expect(playButton).toBeInTheDocument()
    expect(playButton.textContent).toContain('▶')
  })

  it('shows "Nå" button when not at current week', () => {
    render(<WeekSelector {...defaultProps} />)

    const nowButton = screen.getByText('Nå')
    expect(nowButton).toBeInTheDocument()
  })

  it('clicking "Nå" jumps to current week', () => {
    render(<WeekSelector {...defaultProps} />)

    const nowButton = screen.getByText('Nå')
    fireEvent.click(nowButton)

    expect(mockOnYearChange).toHaveBeenCalledWith(2024)
    expect(mockOnWeekChange).toHaveBeenCalled()
  })

  it('shows "Gjeldende uke" when at current week', () => {
    const currentWeek = getWeekNumber(new Date(2024, 5, 15))

    render(
      <WeekSelector
        {...defaultProps}
        selectedYear={2024}
        selectedWeek={currentWeek}
      />
    )

    expect(screen.getByText('Gjeldende uke')).toBeInTheDocument()
  })

  it('disables future weeks in week selector', () => {
    render(<WeekSelector {...defaultProps} selectedYear={2024} />)

    const weekSelect = screen.getByDisplayValue('Uke 10')
    const options = weekSelect.querySelectorAll('option')

    const currentWeek = getWeekNumber(new Date(2024, 5, 15))
    const futureOption = Array.from(options).find(opt => parseInt(opt.value) > currentWeek)

    if (futureOption) {
      expect(futureOption.disabled).toBe(true)
    }
  })

  it('has animation speed selector', () => {
    render(<WeekSelector {...defaultProps} />)

    expect(screen.getByTitle('Animasjonshastighet')).toBeInTheDocument()
    expect(screen.getByText('Sakte')).toBeInTheDocument()
    expect(screen.getByText('Normal')).toBeInTheDocument()
    expect(screen.getByText('Rask')).toBeInTheDocument()
  })

  it('has a slider for timeline navigation', () => {
    render(<WeekSelector {...defaultProps} />)

    const slider = screen.getByRole('slider')
    expect(slider).toBeInTheDocument()
    expect(slider).toHaveAttribute('min', '1')
  })

  it('slider changes year and week on input', () => {
    render(<WeekSelector {...defaultProps} />)

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '53' } }) // Week 1 of 2021

    expect(mockOnYearChange).toHaveBeenCalled()
    expect(mockOnWeekChange).toHaveBeenCalled()
  })
})
