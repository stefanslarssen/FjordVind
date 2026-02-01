// FjordVind API Error Handler
// Handles error responses from the API with request ID support

/**
 * Parse API error response and extract useful information
 * @param {Response} response - Fetch response object
 * @returns {Promise<{message: string, code: string, requestId: string, details: any}>}
 */
export async function parseApiError(response) {
  let errorData = {
    message: 'En ukjent feil oppstod',
    code: 'UNKNOWN_ERROR',
    requestId: response.headers.get('X-Request-ID') || 'unknown',
    details: null
  }

  try {
    const data = await response.json()
    if (data.error) {
      errorData = {
        message: data.error.message || errorData.message,
        code: data.error.code || errorData.code,
        requestId: data.error.requestId || errorData.requestId,
        details: data.error.details || null
      }
    }
  } catch (e) {
    // Response wasn't JSON, use status text
    errorData.message = response.statusText || errorData.message
  }

  return errorData
}

/**
 * Create a user-friendly error message from API error
 * @param {object} error - Parsed API error
 * @returns {string}
 */
export function formatErrorMessage(error) {
  const messages = {
    VALIDATION_ERROR: 'Valideringsfeil',
    AUTHENTICATION_ERROR: 'Autentiseringsfeil - vennligst logg inn på nytt',
    AUTHORIZATION_ERROR: 'Du har ikke tilgang til denne ressursen',
    NOT_FOUND: 'Ressursen ble ikke funnet',
    RATE_LIMIT_ERROR: 'For mange forespørsler - vent litt og prøv igjen',
    INTERNAL_ERROR: 'Serverfeil - prøv igjen senere',
    UNKNOWN_ERROR: 'En ukjent feil oppstod'
  }

  return messages[error.code] || error.message
}

/**
 * Format error for display with request ID
 * @param {object} error - Parsed API error
 * @returns {string}
 */
export function formatErrorWithRequestId(error) {
  const message = formatErrorMessage(error)
  return `${message}\n\nFeilkode: ${error.code}\nRequest ID: ${error.requestId}`
}

/**
 * Handle API fetch with automatic error parsing
 * @param {string} url - API URL
 * @param {object} options - Fetch options
 * @returns {Promise<any>}
 */
export async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include'
  })

  if (!response.ok) {
    const error = await parseApiError(response)
    const err = new Error(error.message)
    err.code = error.code
    err.requestId = error.requestId
    err.details = error.details
    err.status = response.status
    throw err
  }

  // Check if response is JSON
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return response.json()
  }

  return response
}

/**
 * Log error with request ID for debugging
 * @param {string} context - Where the error occurred
 * @param {Error} error - The error object
 */
export function logApiError(context, error) {
  console.error(`[${context}] API Error:`, {
    message: error.message,
    code: error.code,
    requestId: error.requestId,
    status: error.status,
    details: error.details
  })
}

export default {
  parseApiError,
  formatErrorMessage,
  formatErrorWithRequestId,
  apiFetch,
  logApiError
}
