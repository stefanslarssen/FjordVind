import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from '../components/ErrorBoundary'

// Komponent som kaster feil for testing
function ThrowError({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>Child component</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('should render error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Noe gikk galt')).toBeInTheDocument()
    expect(screen.getByText('Last inn på nytt')).toBeInTheDocument()
    expect(screen.getByText('Gå til forsiden')).toBeInTheDocument()
  })

  it('should have reload button that calls window.location.reload', () => {
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock, href: '' },
      writable: true,
    })

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    fireEvent.click(screen.getByText('Last inn på nytt'))
    expect(reloadMock).toHaveBeenCalled()
  })

  it('should have home button that navigates to /', () => {
    let hrefValue = ''
    Object.defineProperty(window, 'location', {
      value: {
        reload: vi.fn(),
        get href() { return hrefValue },
        set href(val) { hrefValue = val },
      },
      writable: true,
    })

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    fireEvent.click(screen.getByText('Gå til forsiden'))
    expect(hrefValue).toBe('/')
  })

  it('should store error in localStorage', () => {
    const setItemMock = vi.fn()
    Object.defineProperty(window, 'localStorage', {
      value: { setItem: setItemMock, getItem: vi.fn() },
      writable: true,
    })

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(setItemMock).toHaveBeenCalledWith(
      'fjordvind_last_error',
      expect.any(String)
    )

    // Verify the stored data contains expected fields
    const storedData = JSON.parse(setItemMock.mock.calls[0][1])
    expect(storedData).toHaveProperty('message', 'Test error')
    expect(storedData).toHaveProperty('timestamp')
    expect(storedData).toHaveProperty('url')
  })
})
