// Supabase client for Lusevokteren
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iqrwmrumqlghwzlgqyja.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_yNTHRmXw3-QB5yYrWUJlLw_AZ2jd2hM'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Fetch unique locations (lokaliteter)
export async function fetchLocations() {
  const { data, error } = await supabase
    .from('merds')
    .select('lokalitet')
    .eq('is_active', true)

  if (error) throw new Error('Failed to fetch locations')

  const unique = [...new Set(data.map(d => d.lokalitet))]
  return unique.map(name => ({ id: name, name }))
}

// Fetch merds (cages)
export async function fetchCages(locationId) {
  let query = supabase
    .from('merds')
    .select('*')
    .eq('is_active', true)

  if (locationId) {
    query = query.eq('lokalitet', locationId)
  }

  const { data, error } = await query
  if (error) throw new Error('Failed to fetch merds')
  return data
}

// Fetch samples with fish observations
export async function fetchLiceCounts({ locationId, fromDate, toDate } = {}) {
  let query = supabase
    .from('samples')
    .select(`
      *,
      merds (id, merd_id, lokalitet, navn),
      users (full_name),
      fish_observations (*)
    `)
    .order('dato', { ascending: false })

  if (fromDate) query = query.gte('dato', fromDate)
  if (toDate) query = query.lte('dato', toDate)

  const { data, error } = await query
  if (error) throw new Error('Failed to fetch samples')

  // Filter by location if needed
  let filtered = data
  if (locationId) {
    filtered = data.filter(s => s.merds?.lokalitet === locationId)
  }

  // Transform to expected format for HistoryPage
  return filtered.map(sample => {
    const obs = sample.fish_observations || []
    const totalVoksneHunnlus = obs.reduce((sum, o) => sum + (o.voksne_hunnlus || 0), 0)
    const totalBevegeligeLus = obs.reduce((sum, o) => sum + (o.bevegelige_lus || 0), 0)
    const totalFastsittendeLus = obs.reduce((sum, o) => sum + (o.fastsittende_lus || 0), 0)
    const images = obs.filter(o => o.bilde_url).map(o => ({ url: o.bilde_url }))

    return {
      id: sample.id,
      date: sample.dato,
      location_name: sample.merds?.lokalitet || 'Ukjent',
      cage_id: sample.merds?.merd_id || sample.merds?.navn || 'Ukjent',
      fish_examined: sample.antall_fisk || obs.length,
      mobile_lice: totalBevegeligeLus,
      attached_lice: totalFastsittendeLus,
      adult_female_lice: totalVoksneHunnlus,
      notes: sample.notat,
      images: images,
      user_name: sample.users?.full_name
    }
  })
}

// Fetch dashboard statistics
export async function fetchDashboardStats() {
  const { data: merds } = await supabase
    .from('merds')
    .select('*')
    .eq('is_active', true)

  const { data: samples } = await supabase
    .from('samples')
    .select('*, fish_observations(*)')
    .order('dato', { ascending: false })
    .limit(100)

  const { data: alerts } = await supabase
    .from('alerts')
    .select('*')
    .is('resolved_at', null)
    .order('created_at', { ascending: false })

  const locations = [...new Set(merds?.map(m => m.lokalitet) || [])]

  return {
    totalLocations: locations.length,
    totalMerds: merds?.length || 0,
    totalSamples: samples?.length || 0,
    activeAlerts: alerts?.length || 0,
    locations,
    merds,
    recentSamples: samples?.slice(0, 10)
  }
}

// Fetch predictions
export async function fetchPredictions(merdId) {
  let query = supabase
    .from('predictions')
    .select('*, merds(merd_id, lokalitet, navn)')
    .order('target_date', { ascending: true })

  if (merdId) query = query.eq('merd_id', merdId)

  const { data, error } = await query
  if (error) throw new Error('Failed to fetch predictions')
  return data
}

// Fetch alerts
export async function fetchAlerts({ severity, limit = 50 } = {}) {
  let query = supabase
    .from('alerts')
    .select('*, merds(merd_id, lokalitet, navn)')
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (severity) query = query.eq('severity', severity)

  const { data, error } = await query
  if (error) throw new Error('Failed to fetch alerts')
  return { alerts: data }
}

// Fetch treatments
export async function fetchTreatments(merdId) {
  let query = supabase
    .from('treatments')
    .select('*, merds(merd_id, lokalitet, navn)')
    .order('scheduled_date', { ascending: true })

  if (merdId) query = query.eq('merd_id', merdId)

  const { data, error } = await query
  if (error) throw new Error('Failed to fetch treatments')
  return { recommendations: data }
}

// Fetch risk scores
export async function fetchRiskScores() {
  const { data, error } = await supabase
    .from('risk_scores')
    .select('*, merds(merd_id, lokalitet, navn)')
    .order('calculated_at', { ascending: false })

  if (error) throw new Error('Failed to fetch risk scores')
  return data
}

// Fetch environment readings
export async function fetchEnvironmentReadings(merdId) {
  let query = supabase
    .from('environment_readings')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(100)

  if (merdId) query = query.eq('merd_id', merdId)

  const { data, error } = await query
  if (error) throw new Error('Failed to fetch environment readings')
  return data
}

// Update sample
export async function updateSample(sampleId, data) {
  const { data: result, error } = await supabase
    .from('samples')
    .update(data)
    .eq('id', sampleId)
    .select()

  if (error) throw new Error('Failed to update sample')
  return result
}

// Delete sample
export async function deleteSample(sampleId) {
  const { error } = await supabase
    .from('samples')
    .delete()
    .eq('id', sampleId)

  if (error) throw new Error('Failed to delete sample')
  return { success: true }
}

// Create new sample
export async function createSample(data) {
  const { data: result, error } = await supabase
    .from('samples')
    .insert(data)
    .select()

  if (error) throw new Error('Failed to create sample')
  return result
}

// Create environment reading
export async function createEnvironmentReading(data) {
  const { data: result, error } = await supabase
    .from('environment_readings')
    .insert({
      merd_id: data.merdId || null,
      locality: data.locality,
      temperature_celsius: data.temperature,
      oxygen_percent: data.oxygen,
      salinity_ppt: data.salinity,
      ph: data.ph,
      timestamp: data.timestamp || new Date().toISOString(),
      is_anomaly: false
    })
    .select()

  if (error) {
    console.error('Supabase error:', error)
    throw new Error('Failed to create environment reading: ' + error.message)
  }
  return result
}

// Delete environment reading
export async function deleteEnvironmentReading(id) {
  const { error } = await supabase
    .from('environment_readings')
    .delete()
    .eq('id', id)

  if (error) throw new Error('Failed to delete environment reading')
}

// Create a new location
export async function createLocation(data) {
  const { data: result, error } = await supabase
    .from('locations')
    .insert({
      name: data.name,
      lokalitetsnummer: data.lokalitetsnummer || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      municipality: data.municipality || null,
      owner: data.owner || null
    })
    .select()

  if (error) {
    console.error('Supabase error:', error)
    throw new Error('Failed to create location: ' + error.message)
  }
  return result?.[0]
}

// Update a location
export async function updateLocation(id, data) {
  const { data: result, error } = await supabase
    .from('locations')
    .update(data)
    .eq('id', id)
    .select()

  if (error) throw new Error('Failed to update location')
  return result?.[0]
}

// Delete a location
export async function deleteLocation(id) {
  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', id)

  if (error) throw new Error('Failed to delete location')
}

// Create a new cage/merd
export async function createCage(data) {
  const { data: result, error } = await supabase
    .from('merds')
    .insert({
      navn: data.name,
      merd_id: data.merdId || null,
      lokalitet: data.locationName,
      location_id: data.locationId || null
    })
    .select()

  if (error) {
    console.error('Supabase error:', error)
    throw new Error('Failed to create cage: ' + error.message)
  }
  return result?.[0]
}

// Delete a cage
export async function deleteCage(id) {
  const { error } = await supabase
    .from('merds')
    .delete()
    .eq('id', id)

  if (error) throw new Error('Failed to delete cage')
}
