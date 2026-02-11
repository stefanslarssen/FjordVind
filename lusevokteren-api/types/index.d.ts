// Type definitions for Lusevokteren API

// =============================================
// Database Models
// =============================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'operator' | 'viewer';
  company_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Company {
  id: string;
  name: string;
  org_number?: string;
  contact_name?: string;
  contact_email?: string;
  created_at: Date;
}

export interface Location {
  id: string;
  company_id: string;
  name: string;
  locality_no: number;
  latitude: number;
  longitude: number;
  municipality?: string;
  is_active: boolean;
}

export interface Merd {
  id: string;
  location_id: string;
  merd_id: string;
  name: string;
  lokalitet: string;
  fish_count: number;
  biomass_kg: number;
  avg_weight_grams: number;
  welfare_score: 'A' | 'B' | 'C' | 'D';
  mortality_rate_percent: number;
  growth_rate_percent: number;
  feed_storage_kg: number;
  temperature_celsius: number;
  oxygen_percent: number;
  lice_level: 'OK' | 'WARNING' | 'DANGER';
  status_color: string;
  capacity_tonnes: number;
  is_active: boolean;
}

export interface Sample {
  id: string;
  merd_id: string;
  dato: string;
  antall_fisk: number;
  created_by?: string;
  created_at: Date;
}

export interface FishObservation {
  id: string;
  sample_id: string;
  fish_number: number;
  voksne_hunnlus: number;
  bevegelige_lus: number;
  fastsittende_lus: number;
  skottelus?: number;
}

export interface Treatment {
  id: string;
  merd_id: string;
  treatment_date: string;
  treatment_type: string;
  medication?: string;
  dosage?: string;
  effectiveness_percent?: number;
  notes?: string;
}

export interface Prediction {
  id: string;
  merd_id: string;
  locality_name: string;
  prediction_date: string;
  target_date: string;
  days_ahead: number;
  current_lice: number;
  predicted_lice: number;
  confidence: number;
  probability_exceed_limit: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommended_action: 'NO_ACTION' | 'MONITOR' | 'SCHEDULE_TREATMENT' | 'IMMEDIATE_TREATMENT';
  model_version: string;
}

export interface RiskScore {
  id: string;
  merd_id: string;
  locality_name: string;
  overall_score: number;
  lice_score: number;
  mortality_score: number;
  environment_score: number;
  treatment_score: number;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  risk_factors?: string[];
  recommendations?: string[];
  calculated_at: Date;
}

export interface Alert {
  id: string;
  merd_id?: string;
  locality_name?: string;
  alert_type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  is_read: boolean;
  created_at: Date;
}

// =============================================
// API Request/Response Types
// =============================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface LiceData {
  localityNo: number;
  name: string;
  municipality?: string;
  latitude: number;
  longitude: number;
  avgAdultFemaleLice: number | null;
  hasReported: boolean;
  isFallow: boolean;
  status: string;
  owner?: string;
  hasSalmonoidLicense: boolean;
  diseases?: string[];
}

export interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: {
    type: 'Point' | 'Polygon' | 'MultiPolygon';
    coordinates: number[] | number[][] | number[][][];
  };
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

// =============================================
// BarentsWatch Types
// =============================================

export interface BarentswatchLocality extends LiceData {
  week: number;
  year: number;
}

// =============================================
// Dashboard Types
// =============================================

export interface DashboardOverview {
  totalLocalities: number;
  totalCages: number;
  totalFish: number;
  totalBiomassKg: number;
  avgWeightGrams: number;
  avgMortalityRate: number;
  avgGrowthRate: number;
  scoreACount: number;
  scoreBCount: number;
  scoreCCount: number;
  scoreDCount: number;
  dangerCount: number;
  warningCount: number;
  okCount: number;
}

export interface LocalitySummary {
  name: string;
  cageCount: number;
  totalFish: number;
  totalBiomassKg: number;
  avgWeightGrams: number;
  dangerCount: number;
  warningCount: number;
}

export interface MonthlyStats {
  lice: {
    totalCount: number;
    monthlyData: number[];
    leastLiceMerds: string[];
    mostLiceMerds: string[];
  };
  mortality: {
    totalCount: number;
    monthlyData: number[];
    leastDeathsMerds: string[];
    mostDeathsMerds: string[];
  };
  growth: {
    currentIndex: number;
    monthlyData: number[];
    bestMonth: string;
    worstMonth: string;
  };
  months: string[];
}

// =============================================
// Cache Types
// =============================================

export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: string;
}

// =============================================
// Auth Types
// =============================================

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  companyId?: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Express.Request {
  user?: JWTPayload;
}
