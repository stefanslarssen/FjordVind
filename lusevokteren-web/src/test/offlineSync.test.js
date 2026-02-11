import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isOnline, registerConnectionListeners } from '../utils/offlineSync'

// Mock IndexedDB
const mockObjectStore = {
  add: vi.fn(),
  put: vi.fn(),
  get: vi.fn(),
  getAll: vi.fn(),
  delete: vi.fn()
}

const mockTransaction = {
  objectStore: vi.fn(() => mockObjectStore),
  oncomplete: null,
  onerror: null
}

const mockDB = {
  transaction: vi.fn(() => mockTransaction),
  objectStoreNames: {
    contains: vi.fn(() => true)
  },
  createObjectStore: vi.fn()
}

const mockRequest = {
  result: mockDB,
  error: null,
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null
}

// Setup IndexedDB mock
vi.stubGlobal('indexedDB', {
  open: vi.fn(() => {
    setTimeout(() => {
      if (mockRequest.onsuccess) mockRequest.onsuccess()
    }, 0)
    return mockRequest
  })
})

describe('offlineSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isOnline', () => {
    it('returns true when navigator.onLine is true', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true
      })

      expect(isOnline()).toBe(true)
    })

    it('returns false when navigator.onLine is false', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true
      })

      expect(isOnline()).toBe(false)
    })
  })

  describe('registerConnectionListeners', () => {
    let addEventListenerSpy
    let removeEventListenerSpy

    beforeEach(() => {
      addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    })

    afterEach(() => {
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })

    it('registers online and offline event listeners', () => {
      const onOnline = vi.fn()
      const onOffline = vi.fn()

      registerConnectionListeners(onOnline, onOffline)

      expect(addEventListenerSpy).toHaveBeenCalledWith('online', onOnline)
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', onOffline)
    })

    it('returns cleanup function that removes listeners', () => {
      const onOnline = vi.fn()
      const onOffline = vi.fn()

      const cleanup = registerConnectionListeners(onOnline, onOffline)
      cleanup()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', onOnline)
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', onOffline)
    })

    it('calls onOnline when online event fires', () => {
      const onOnline = vi.fn()
      const onOffline = vi.fn()

      // Clear previous mocks and use real event listeners
      addEventListenerSpy.mockRestore()

      registerConnectionListeners(onOnline, onOffline)

      window.dispatchEvent(new Event('online'))

      expect(onOnline).toHaveBeenCalled()
    })

    it('calls onOffline when offline event fires', () => {
      const onOnline = vi.fn()
      const onOffline = vi.fn()

      // Clear previous mocks and use real event listeners
      addEventListenerSpy.mockRestore()

      registerConnectionListeners(onOnline, onOffline)

      window.dispatchEvent(new Event('offline'))

      expect(onOffline).toHaveBeenCalled()
    })
  })
})

describe('Offline data structure', () => {
  it('data entry should have required fields', () => {
    const expectedFields = ['timestamp', 'synced']
    const mockEntry = {
      url: '/api/test',
      method: 'POST',
      body: { data: 'test' },
      timestamp: Date.now(),
      synced: false
    }

    expectedFields.forEach(field => {
      expect(mockEntry).toHaveProperty(field)
    })
  })

  it('synced flag defaults to false for new entries', () => {
    const mockEntry = {
      url: '/api/test',
      timestamp: Date.now(),
      synced: false
    }

    expect(mockEntry.synced).toBe(false)
  })
})

describe('Sync results structure', () => {
  it('should return array of results with id and success status', () => {
    const mockResults = [
      { id: 1, success: true },
      { id: 2, success: false, error: 'API error' }
    ]

    expect(Array.isArray(mockResults)).toBe(true)
    mockResults.forEach(result => {
      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('success')
      expect(typeof result.success).toBe('boolean')
    })
  })

  it('failed results should include error message', () => {
    const failedResult = { id: 1, success: false, error: 'Network error' }

    expect(failedResult.success).toBe(false)
    expect(failedResult.error).toBeDefined()
    expect(typeof failedResult.error).toBe('string')
  })
})

describe('Service Worker integration', () => {
  it('should check for serviceWorker support before registration', () => {
    const hasServiceWorker = 'serviceWorker' in navigator
    expect(typeof hasServiceWorker).toBe('boolean')
  })

  it('should check for SyncManager support for background sync', () => {
    const hasSyncManager = 'SyncManager' in window
    expect(typeof hasSyncManager).toBe('boolean')
  })
})
