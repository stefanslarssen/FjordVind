import { useState, useCallback } from 'react'
import { formatApiError } from '../utils/validation'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * Custom hook for API calls with error handling
 * @returns {Object} API helpers and state
 */
export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Make an API request with error handling
   * @param {string} endpoint - API endpoint (without base URL)
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Response data
   */
  const request = useCallback(async (endpoint, options = {}) => {
    setLoading(true)
    setError(null)

    try {
      const url = `${API_URL}${endpoint}`
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle API error response
        const errorMessage = formatApiError(data)
        setError(errorMessage)
        throw data
      }

      return data
    } catch (err) {
      // Handle network errors
      if (err.message === 'Failed to fetch') {
        const networkError = 'Kunne ikke koble til serveren. Sjekk internettforbindelsen.'
        setError(networkError)
        throw new Error(networkError)
      }

      // Re-throw API errors
      if (err.error) {
        throw err
      }

      // Handle other errors
      const errorMessage = err.message || 'En ukjent feil oppstod'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * GET request helper
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Response data
   */
  const get = useCallback(async (endpoint, params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    const url = queryString ? `${endpoint}?${queryString}` : endpoint
    return request(url, { method: 'GET' })
  }, [request])

  /**
   * POST request helper
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @returns {Promise<Object>} Response data
   */
  const post = useCallback(async (endpoint, body) => {
    return request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    })
  }, [request])

  /**
   * PUT request helper
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @returns {Promise<Object>} Response data
   */
  const put = useCallback(async (endpoint, body) => {
    return request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
  }, [request])

  /**
   * DELETE request helper
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Object>} Response data
   */
  const del = useCallback(async (endpoint) => {
    return request(endpoint, { method: 'DELETE' })
  }, [request])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    loading,
    error,
    request,
    get,
    post,
    put,
    del,
    clearError
  }
}

/**
 * Hook for data fetching with loading and error states
 * @param {Function} fetchFn - Async fetch function
 * @param {Array} deps - Dependencies array for refetch
 * @returns {Object} { data, loading, error, refetch }
 */
export function useFetch(fetchFn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      setData(result)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setLoading(false)
    }
  }, deps)

  // Initial fetch
  useState(() => {
    fetchData()
  })

  return { data, loading, error, refetch: fetchData }
}

export default useApi
