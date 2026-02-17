// Supabase client for FjordVind
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

// ============================================
// IMAGE FUNCTIONS
// ============================================

// Upload image to Supabase Storage
export async function uploadImage(file, options = {}) {
  const { sampleId, observationId, treatmentId } = options

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `fish-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
  const filePath = `fish-images/${fileName}`

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    throw new Error('Failed to upload image: ' + uploadError.message)
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('images')
    .getPublicUrl(filePath)

  const publicUrl = urlData?.publicUrl

  // Insert metadata into images table
  const { data: imageData, error: dbError } = await supabase
    .from('images')
    .insert({
      filename: fileName,
      original_name: file.name,
      mimetype: file.type,
      size_bytes: file.size,
      url: publicUrl,
      sample_id: sampleId || null,
      observation_id: observationId || null,
      treatment_id: treatmentId || null
    })
    .select()

  if (dbError) {
    console.error('Database insert error:', dbError)
    // Still return the URL even if DB insert fails
    return {
      id: `temp-${Date.now()}`,
      url: publicUrl,
      filename: fileName,
      _dbError: true
    }
  }

  return imageData?.[0] || { url: publicUrl, filename: fileName }
}

// Fetch images for a sample
export async function fetchImages({ sampleId, observationId, treatmentId } = {}) {
  let query = supabase
    .from('images')
    .select('*')
    .order('created_at', { ascending: false })

  if (sampleId) query = query.eq('sample_id', sampleId)
  if (observationId) query = query.eq('observation_id', observationId)
  if (treatmentId) query = query.eq('treatment_id', treatmentId)

  const { data, error } = await query

  if (error) {
    console.error('Error fetching images:', error)
    return []
  }

  return data || []
}

// Delete an image
export async function deleteImage(imageId) {
  // Get image info first
  const { data: image, error: fetchError } = await supabase
    .from('images')
    .select('filename')
    .eq('id', imageId)
    .single()

  if (fetchError) {
    throw new Error('Image not found')
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('images')
    .remove([`fish-images/${image.filename}`])

  if (storageError) {
    console.warn('Storage delete warning:', storageError)
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('images')
    .delete()
    .eq('id', imageId)

  if (dbError) {
    throw new Error('Failed to delete image from database')
  }

  return { success: true }
}

// Update image metadata (link to sample/observation)
export async function updateImage(imageId, updates) {
  const { data, error } = await supabase
    .from('images')
    .update(updates)
    .eq('id', imageId)
    .select()

  if (error) throw new Error('Failed to update image')
  return data?.[0]
}
