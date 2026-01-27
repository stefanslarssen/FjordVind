import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import MapSearch from '../components/map/MapSearch'

describe('MapSearch', () => {
  const mockOnSelect = vi.fn()

  const mockLocalityBoundaries = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          loknr: 12345,
          name: 'Fjordheim',
          owner: 'Salmar AS',
          municipality: 'Frøya',
          avgAdultFemaleLice: 0.15
        },
        geometry: {
          type: 'Point',
          coordinates: [9.5, 63.7]
        }
      },
      {
        type: 'Feature',
        properties: {
          loknr: 12346,
          name: 'Nordfjorden',
          owner: 'Mowi AS',
          municipality: 'Hitra',
          avgAdultFemaleLice: 0.08
        },
        geometry: {
          type: 'Point',
          coordinates: [9.2, 63.5]
        }
      },
      {
        type: 'Feature',
        properties: {
          loknr: 67890,
          name: 'Havbruk Sør',
          owner: 'Lerøy AS',
          municipality: 'Bergen',
          avgAdultFemaleLice: 0.25
        },
        geometry: {
          type: 'Point',
          coordinates: [5.3, 60.4]
        }
      }
    ]
  }

  const defaultProps = {
    localities: [],
    onSelect: mockOnSelect,
    localityBoundaries: mockLocalityBoundaries
  }

  beforeEach(() => {
    vi.useFakeTimers()
    mockOnSelect.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders search input', () => {
    render(<MapSearch {...defaultProps} />)

    const input = screen.getByPlaceholderText('Søk lokalitet, selskap, kommune...')
    expect(input).toBeInTheDocument()
  })

  it('has proper accessibility label', () => {
    render(<MapSearch {...defaultProps} />)

    const input = screen.getByLabelText('Søk etter lokalitet')
    expect(input).toBeInTheDocument()
  })

  it('does not show results for short search terms', async () => {
    render(<MapSearch {...defaultProps} />)

    const input = screen.getByPlaceholderText('Søk lokalitet, selskap, kommune...')
    fireEvent.change(input, { target: { value: 'F' } })

    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    expect(screen.queryByText('Fjordheim')).not.toBeInTheDocument()
  })

  it('shows results after debounce delay', async () => {
    render(<MapSearch {...defaultProps} />)

    const input = screen.getByPlaceholderText('Søk lokalitet, selskap, kommune...')
    fireEvent.change(input, { target: { value: 'Fjord' } })

    // Results shouldn't appear immediately
    expect(screen.queryByText('Fjordheim')).not.toBeInTheDocument()

    // Advance past debounce delay (300ms + buffer)
    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    expect(screen.getByText('Fjordheim')).toBeInTheDocument()
  })

  it('filters by locality name', async () => {
    render(<MapSearch {...defaultProps} />)

    const input = screen.getByPlaceholderText('Søk lokalitet, selskap, kommune...')
    fireEvent.change(input, { target: { value: 'Nord' } })

    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    expect(screen.getByText('Nordfjorden')).toBeInTheDocument()
    expect(screen.queryByText('Fjordheim')).not.toBeInTheDocument()
  })

  it('filters by locality number', async () => {
    render(<MapSearch {...defaultProps} />)

    const input = screen.getByPlaceholderText('Søk lokalitet, selskap, kommune...')
    fireEvent.change(input, { target: { value: '12345' } })

    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    expect(screen.getByText('Fjordheim')).toBeInTheDocument()
    expect(screen.queryByText('Nordfjorden')).not.toBeInTheDocument()
  })

  it('filters by owner/company name', async () => {
    render(<MapSearch {...defaultProps} />)

    const input = screen.getByPlaceholderText('Søk lokalitet, selskap, kommune...')
    fireEvent.change(input, { target: { value: 'Salmar' } })

    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    expect(screen.getByText('Fjordheim')).toBeInTheDocument()
    expect(screen.queryByText('Nordfjorden')).not.toBeInTheDocument()
  })

  it('filters by municipality', async () => {
    render(<MapSearch {...defaultProps} />)

    const input = screen.getByPlaceholderText('Søk lokalitet, selskap, kommune...')
    fireEvent.change(input, { target: { value: 'Bergen' } })

    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    expect(screen.getByText('Havbruk Sør')).toBeInTheDocument()
    expect(screen.queryByText('Fjordheim')).not.toBeInTheDocument()
  })

  it('calls onSelect when clicking a result', async () => {
    render(<MapSearch {...defaultProps} />)

    const input = screen.getByPlaceholderText('Søk lokalitet, selskap, kommune...')
    fireEvent.change(input, { target: { value: 'Fjord' } })

    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    expect(screen.getByText('Fjordheim')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Fjordheim'))

    expect(mockOnSelect).toHaveBeenCalledWith({
      loknr: 12345,
      lat: 63.7,
      lng: 9.5
    })
  })

  it('updates input value when result is selected', async () => {
    render(<MapSearch {...defaultProps} />)

    const input = screen.getByPlaceholderText('Søk lokalitet, selskap, kommune...')
    fireEvent.change(input, { target: { value: 'Fjord' } })

    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    expect(screen.getByText('Fjordheim')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Fjordheim'))

    expect(input.value).toBe('Fjordheim')
  })

  it('displays lice count with color coding', async () => {
    render(<MapSearch {...defaultProps} />)

    const input = screen.getByPlaceholderText('Søk lokalitet, selskap, kommune...')
    fireEvent.change(input, { target: { value: 'Havbruk' } })

    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    // High lice level (0.25) should be shown
    expect(screen.getByText('0.25 lus')).toBeInTheDocument()
  })

  it('shows owner, municipality and locality number in results', async () => {
    render(<MapSearch {...defaultProps} />)

    const input = screen.getByPlaceholderText('Søk lokalitet, selskap, kommune...')
    fireEvent.change(input, { target: { value: 'Fjord' } })

    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    expect(screen.getByText('Fjordheim')).toBeInTheDocument()
    expect(screen.getByText(/Salmar AS/)).toBeInTheDocument()
    expect(screen.getByText(/Frøya/)).toBeInTheDocument()
    expect(screen.getByText(/12345/)).toBeInTheDocument()
  })

  it('limits results to 10', async () => {
    const manyFeatures = Array.from({ length: 20 }, (_, i) => ({
      type: 'Feature',
      properties: {
        loknr: 10000 + i,
        name: `Test Lokalitet ${i}`,
        owner: 'Test AS',
        municipality: 'Test',
        avgAdultFemaleLice: 0.1
      },
      geometry: {
        type: 'Point',
        coordinates: [10, 60]
      }
    }))

    render(
      <MapSearch
        {...defaultProps}
        localityBoundaries={{ ...mockLocalityBoundaries, features: manyFeatures }}
      />
    )

    const input = screen.getByPlaceholderText('Søk lokalitet, selskap, kommune...')
    fireEvent.change(input, { target: { value: 'Test' } })

    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    const results = screen.getAllByText(/Test Lokalitet/)
    expect(results.length).toBeLessThanOrEqual(10)
  })
})
