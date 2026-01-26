// API client for Lusevokteren backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Fetch samples with fish observations
export async function fetchLiceCounts({ locationId, fromDate, toDate } = {}) {
  const params = new URLSearchParams()
  if (locationId) params.append('locationId', locationId)
  if (fromDate) params.append('fromDate', fromDate)
  if (toDate) params.append('toDate', toDate)

  const url = `${API_URL}/api/samples?${params.toString()}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Failed to fetch samples')
  }

  return await response.json()
}

// Fetch unique locations (lokaliteter)
export async function fetchLocations() {
  const response = await fetch(`${API_URL}/api/locations`)

  if (!response.ok) {
    throw new Error('Failed to fetch locations')
  }

  return await response.json()
}

// Fetch merds (cages)
export async function fetchCages(locationId) {
  const params = new URLSearchParams()
  if (locationId) params.append('locationId', locationId)

  const url = `${API_URL}/api/merds?${params.toString()}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Failed to fetch merds')
  }

  return await response.json()
}

// Fetch dashboard statistics
export async function fetchDashboardStats() {
  const response = await fetch(`${API_URL}/api/stats`)

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard stats')
  }

  return await response.json()
}

// Update existing sample (lice count)
export async function updateSample(sampleId, data) {
  const response = await fetch(`${API_URL}/api/samples/${sampleId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to update sample')
  }

  return await response.json()
}

// Delete sample (lice count)
export async function deleteSample(sampleId) {
  const response = await fetch(`${API_URL}/api/samples/${sampleId}`, {
    method: 'DELETE'
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to delete sample')
  }

  return await response.json()
}
