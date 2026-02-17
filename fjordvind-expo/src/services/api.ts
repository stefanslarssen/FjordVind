// FjordVind API Service
// Connects to fjordvind-api backend (same as Tauri/Web)

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// API Base URL - use environment or default
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Token storage
const TOKEN_KEY = 'fjordvind_auth_token';

async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

async function setToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

async function removeToken(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // For httpOnly cookies
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================
// TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
}

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

export interface MortalityRecord {
  id: string;
  merd_id: string;
  dato: string;
  antall_dod: number;
  arsak?: string;
  notat?: string;
  created_at: string;
}

export interface Alert {
  id: string;
  merd_id?: string;
  alert_type: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Treatment {
  id: string;
  merd_id: string;
  treatment_type: string;
  status: string;
  scheduled_date: string;
  notes?: string;
}

export interface EnvironmentReading {
  id: string;
  merd_id?: string;
  locality?: string;
  timestamp: string;
  temperature_celsius?: number;
  oxygen_percent?: number;
  salinity_ppt?: number;
  ph?: number;
}

export interface Prediction {
  id: string;
  merd_id: string;
  target_date: string;
  predicted_lice: number;
  confidence: number;
  risk_level: string;
  recommended_action?: string;
}

export interface RiskScore {
  id: string;
  merd_id?: string;
  locality?: string;
  overall_score: number;
  risk_level: string;
  calculated_at: string;
}

// ============================================
// AUTH
// ============================================

export async function login(email: string, password: string): Promise<User> {
  const data = await apiRequest<{ user: User; token?: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (data.token) {
    await setToken(data.token);
  }

  return data.user;
}

export async function register(email: string, password: string, name: string): Promise<User> {
  const data = await apiRequest<{ user: User; token?: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, full_name: name }),
  });

  if (data.token) {
    await setToken(data.token);
  }

  return data.user;
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } finally {
    await removeToken();
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const data = await apiRequest<{ user: User }>('/api/auth/me');
    return data.user;
  } catch {
    return null;
  }
}

// ============================================
// LOCATIONS & MERDS
// ============================================

export async function fetchLocations(): Promise<{ id: string; name: string }[]> {
  const data = await apiRequest<{ locations: any[] }>('/api/locations');
  return data.locations || [];
}

export async function fetchCages(locationId?: string): Promise<Merd[]> {
  const url = locationId ? `/api/merds?locality=${locationId}` : '/api/merds';
  const data = await apiRequest<{ merds: Merd[] }>(url);
  return data.merds || [];
}

// ============================================
// SAMPLES
// ============================================

export async function fetchSamples(filters: { locationId?: string; limit?: number } = {}): Promise<Sample[]> {
  const params = new URLSearchParams();
  if (filters.locationId) params.append('locality', filters.locationId);
  if (filters.limit) params.append('limit', filters.limit.toString());

  const url = `/api/samples${params.toString() ? '?' + params.toString() : ''}`;
  const data = await apiRequest<{ samples: Sample[] }>(url);
  return data.samples || [];
}

export async function createSample(
  merdId: string,
  userId: string,
  dato: string,
  tidspunkt: string,
  observations: FishObservation[],
  temperatur?: number,
  notat?: string
): Promise<Sample> {
  const data = await apiRequest<{ sample: Sample }>('/api/samples', {
    method: 'POST',
    body: JSON.stringify({
      merd_id: merdId,
      dato,
      tidspunkt,
      observations,
      temperatur,
      notat,
    }),
  });
  return data.sample;
}

// ============================================
// DASHBOARD
// ============================================

export async function fetchDashboardStats(): Promise<{
  totalLocations: number;
  totalMerds: number;
  activeAlerts: number;
}> {
  const data = await apiRequest<any>('/api/dashboard');
  return {
    totalLocations: data.localities?.length || 0,
    totalMerds: data.merds?.length || 0,
    activeAlerts: data.alerts?.length || 0,
  };
}

// ============================================
// MORTALITY
// ============================================

export async function fetchMortality(filters: { merdId?: string; fromDate?: string; toDate?: string } = {}): Promise<MortalityRecord[]> {
  const params = new URLSearchParams();
  if (filters.merdId) params.append('merd_id', filters.merdId);
  if (filters.fromDate) params.append('from', filters.fromDate);
  if (filters.toDate) params.append('to', filters.toDate);

  const url = `/api/mortality${params.toString() ? '?' + params.toString() : ''}`;
  const data = await apiRequest<{ records: MortalityRecord[] }>(url);
  return data.records || [];
}

export async function createMortality(
  merdId: string,
  dato: string,
  antallDod: number,
  arsak?: string,
  notat?: string
): Promise<MortalityRecord> {
  const data = await apiRequest<{ record: MortalityRecord }>('/api/mortality', {
    method: 'POST',
    body: JSON.stringify({
      merd_id: merdId,
      dato,
      antall_dod: antallDod,
      arsak,
      notat,
    }),
  });
  return data.record;
}

// ============================================
// ALERTS
// ============================================

export async function fetchAlerts(filters: { severity?: string; unreadOnly?: boolean } = {}): Promise<Alert[]> {
  const params = new URLSearchParams();
  if (filters.severity) params.append('severity', filters.severity);
  if (filters.unreadOnly) params.append('unread', 'true');

  const url = `/api/alerts${params.toString() ? '?' + params.toString() : ''}`;
  const data = await apiRequest<{ alerts: Alert[] }>(url);
  return data.alerts || [];
}

export async function markAlertRead(alertId: string): Promise<void> {
  await apiRequest(`/api/alerts/${alertId}/read`, { method: 'PUT' });
}

export async function acknowledgeAlert(alertId: string, userId: string): Promise<void> {
  await apiRequest(`/api/alerts/${alertId}/acknowledge`, { method: 'PUT' });
}

// ============================================
// TREATMENTS
// ============================================

export async function fetchTreatments(filters: { merdId?: string; status?: string } = {}): Promise<Treatment[]> {
  const params = new URLSearchParams();
  if (filters.merdId) params.append('merd_id', filters.merdId);
  if (filters.status) params.append('status', filters.status);

  const url = `/api/treatments${params.toString() ? '?' + params.toString() : ''}`;
  const data = await apiRequest<{ treatments: Treatment[] }>(url);
  return data.treatments || [];
}

export async function createTreatment(
  merdId: string,
  treatmentType: string,
  scheduledDate: string,
  notes?: string
): Promise<Treatment> {
  const data = await apiRequest<{ treatment: Treatment }>('/api/treatments', {
    method: 'POST',
    body: JSON.stringify({
      merd_id: merdId,
      treatment_type: treatmentType,
      scheduled_date: scheduledDate,
      notes,
    }),
  });
  return data.treatment;
}

export async function updateTreatmentStatus(treatmentId: string, status: string): Promise<void> {
  await apiRequest(`/api/treatments/${treatmentId}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

// ============================================
// ENVIRONMENT
// ============================================

export async function fetchEnvironment(filters: { merdId?: string; locality?: string } = {}): Promise<EnvironmentReading[]> {
  const params = new URLSearchParams();
  if (filters.merdId) params.append('merd_id', filters.merdId);
  if (filters.locality) params.append('locality', filters.locality);

  const url = `/api/environment${params.toString() ? '?' + params.toString() : ''}`;
  const data = await apiRequest<{ readings: EnvironmentReading[] }>(url);
  return data.readings || [];
}

export async function createEnvironmentReading(reading: {
  merdId?: string;
  locality?: string;
  temperature?: number;
  oxygen?: number;
  salinity?: number;
  ph?: number;
}): Promise<EnvironmentReading> {
  const data = await apiRequest<{ reading: EnvironmentReading }>('/api/environment', {
    method: 'POST',
    body: JSON.stringify({
      merd_id: reading.merdId,
      locality: reading.locality,
      temperature_celsius: reading.temperature,
      oxygen_percent: reading.oxygen,
      salinity_ppt: reading.salinity,
      ph: reading.ph,
    }),
  });
  return data.reading;
}

// ============================================
// PREDICTIONS & RISK SCORES
// ============================================

export async function fetchPredictions(merdId?: string): Promise<Prediction[]> {
  const url = merdId ? `/api/predictions?merd_id=${merdId}` : '/api/predictions';
  const data = await apiRequest<{ predictions: Prediction[] }>(url);
  return data.predictions || [];
}

export async function fetchRiskScores(locality?: string): Promise<RiskScore[]> {
  const url = locality ? `/api/risk-scores?locality=${locality}` : '/api/risk-scores';
  const data = await apiRequest<{ riskScores: RiskScore[] }>(url);
  return data.riskScores || [];
}

// ============================================
// IMAGES
// ============================================

export async function uploadImage(
  file: { uri: string; name: string; type: string },
  options: { sampleId?: string; observationId?: string } = {}
): Promise<{ id: string; url: string }> {
  const formData = new FormData();
  formData.append('image', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  if (options.sampleId) formData.append('sample_id', options.sampleId);
  if (options.observationId) formData.append('observation_id', options.observationId);

  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/api/upload/fish-image`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Image upload failed');
  }

  return response.json();
}
