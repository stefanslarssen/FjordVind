import { supabase } from '../config/supabase';

// Types
export interface Merd {
  id: string;
  merd_id: string;
  navn: string;
  lokalitet: string;
  is_active: boolean;
}

export interface Sample {
  id: string;
  sample_id: string;
  merd_id: string;
  dato: string;
  tidspunkt: string;
  antall_fisk: number;
  temperatur?: number;
  notat?: string;
  location_name?: string;
  cage_id?: string;
  adult_female_lice: number;
  mobile_lice: number;
  attached_lice: number;
}

export interface FishObservation {
  fish_id: string;
  voksne_hunnlus: number;
  bevegelige_lus: number;
  fastsittende_lus: number;
}

// Fetch locations (unique lokaliteter)
export async function fetchLocations() {
  const { data, error } = await supabase
    .from('merds')
    .select('lokalitet')
    .eq('is_active', true);

  if (error) throw error;

  const unique = [...new Set(data.map((d: any) => d.lokalitet))];
  return unique.map((name) => ({ id: name, name }));
}

// Fetch merds/cages
export async function fetchCages(locationId?: string) {
  let query = supabase
    .from('merds')
    .select('*')
    .eq('is_active', true);

  if (locationId) {
    query = query.eq('lokalitet', locationId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Merd[];
}

// Fetch samples with observations
export async function fetchSamples(filters: { locationId?: string; limit?: number } = {}) {
  let query = supabase
    .from('samples')
    .select(`
      *,
      merds (id, merd_id, lokalitet, navn),
      fish_observations (*)
    `)
    .order('dato', { ascending: false })
    .limit(filters.limit || 50);

  const { data, error } = await query;
  if (error) throw error;

  let filtered = data;
  if (filters.locationId) {
    filtered = data.filter((s: any) => s.merds?.lokalitet === filters.locationId);
  }

  return filtered.map((sample: any) => {
    const obs = sample.fish_observations || [];
    const totalVoksneHunnlus = obs.reduce((sum: number, o: any) => sum + (o.voksne_hunnlus || 0), 0);
    const totalBevegeligeLus = obs.reduce((sum: number, o: any) => sum + (o.bevegelige_lus || 0), 0);
    const totalFastsittendeLus = obs.reduce((sum: number, o: any) => sum + (o.fastsittende_lus || 0), 0);

    return {
      id: sample.id,
      sample_id: sample.sample_id,
      merd_id: sample.merd_id,
      dato: sample.dato,
      tidspunkt: sample.tidspunkt,
      antall_fisk: sample.antall_fisk || obs.length,
      temperatur: sample.temperatur,
      notat: sample.notat,
      location_name: sample.merds?.lokalitet || 'Ukjent',
      cage_id: sample.merds?.merd_id || sample.merds?.navn || 'Ukjent',
      adult_female_lice: totalVoksneHunnlus,
      mobile_lice: totalBevegeligeLus,
      attached_lice: totalFastsittendeLus,
    } as Sample;
  });
}

// Create new sample with observations
export async function createSample(
  merdId: string,
  userId: string,
  dato: string,
  tidspunkt: string,
  observations: FishObservation[],
  temperatur?: number,
  notat?: string
) {
  const sampleId = `SAMPLE-${Date.now()}`;

  // Create sample
  const { data: sample, error: sampleError } = await supabase
    .from('samples')
    .insert({
      sample_id: sampleId,
      merd_id: merdId,
      røkter_id: userId,
      dato,
      tidspunkt,
      antall_fisk: observations.length,
      temperatur,
      notat,
    })
    .select()
    .single();

  if (sampleError) throw sampleError;

  // Create fish observations
  const observationRecords = observations.map((obs) => ({
    sample_id: sample.id,
    fish_id: obs.fish_id,
    voksne_hunnlus: obs.voksne_hunnlus,
    bevegelige_lus: obs.bevegelige_lus,
    fastsittende_lus: obs.fastsittende_lus,
  }));

  const { error: obsError } = await supabase
    .from('fish_observations')
    .insert(observationRecords);

  if (obsError) throw obsError;

  return sample;
}

// Fetch dashboard stats
export async function fetchDashboardStats() {
  const { data: merds } = await supabase
    .from('merds')
    .select('*')
    .eq('is_active', true);

  const { data: samples } = await supabase
    .from('samples')
    .select('*, fish_observations(*)')
    .order('dato', { ascending: false })
    .limit(10);

  const { data: alerts } = await supabase
    .from('alerts')
    .select('*')
    .is('resolved_at', null);

  const locations = [...new Set(merds?.map((m: any) => m.lokalitet) || [])];

  return {
    totalLocations: locations.length,
    totalMerds: merds?.length || 0,
    activeAlerts: alerts?.length || 0,
    recentSamples: samples || [],
  };
}
