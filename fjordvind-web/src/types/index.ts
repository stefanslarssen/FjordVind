// Type definitions for Lusevokteren Frontend

// =============================================
// Lice Data Types
// =============================================

export interface LiceStatus {
  level: 'ok' | 'warning' | 'danger';
  color: string;
  label: string;
}

export interface LiceThresholds {
  OK: number;
  WARNING: number;
  DANGER: number;
  LEGAL_LIMIT: number;
}

// =============================================
// Map Types
// =============================================

export interface MapCenter {
  lat: number;
  lng: number;
}

export interface LocalityFeature {
  type: 'Feature';
  properties: {
    loknr: number;
    name: string;
    municipality?: string;
    avgAdultFemaleLice: number | null;
    status: string;
    hasReported: boolean;
    isFallow: boolean;
    owner?: string;
    anleggstype?: string;
    diseases?: string[];
  };
  geometry: {
    type: 'Point' | 'Polygon';
    coordinates: number[] | number[][];
  };
}

export interface LocalityBoundaries {
  type: 'FeatureCollection';
  features: LocalityFeature[];
  total: number;
  filtered: number;
  source: string;
}

// =============================================
// Dashboard Types
// =============================================

export interface DashboardStats {
  totalCounts: number;
  todayCounts: number;
  avgAdultFemale: number;
  aboveThreshold: number;
  _demo?: boolean;
}

export interface MerdData {
  id: string;
  merdId: string;
  name: string;
  biomassKg: number;
  fishCount: number;
  avgWeightGrams: number;
  welfareScore: 'A' | 'B' | 'C' | 'D';
  mortalityRate: number;
  growthRate: number;
  feedStorageKg: number;
  temperatureCelsius: number;
  oxygenPercent: number;
  liceLevel: 'OK' | 'WARNING' | 'DANGER';
  statusColor: string;
  capacityTonnes: number;
}

export interface LocalityDetail {
  locality: string;
  cageCount: number;
  aggregated: {
    totalFish: number;
    totalBiomassKg: number;
    avgWeightGrams: number;
    avgMortalityRate: number;
  };
  cages: MerdData[];
}

// =============================================
// Sample Types
// =============================================

export interface Sample {
  id: string;
  merdId: string;
  date: string;
  fishExamined: number;
  adultFemaleLice: number;
  movingLice: number;
  attachedLice: number;
  avgLicePerFish: number;
}

export interface FishObservation {
  fishNumber: number;
  voksneHunnlus: number;
  bevegeligeLus: number;
  fastsittendeLus: number;
  skottelus?: number;
}

// =============================================
// Prediction Types
// =============================================

export interface Prediction {
  id: string;
  merdId: string;
  merdName: string;
  locality: string;
  currentLice: number;
  predictedLice: number;
  confidence: number;
  probabilityExceedLimit: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendedAction: string;
  daysAhead: number;
}

export interface RiskScore {
  id: string;
  merdName: string;
  locality: string;
  overallScore: number;
  liceScore: number;
  mortalityScore: number;
  environmentScore: number;
  treatmentScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

// =============================================
// Alert Types
// =============================================

export interface Alert {
  id: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  merdName?: string;
  locality?: string;
}

// =============================================
// Treatment Types
// =============================================

export interface Treatment {
  id: string;
  merdId: string;
  treatmentDate: string;
  treatmentType: string;
  medication?: string;
  dosage?: string;
  effectivenessPercent?: number;
  notes?: string;
}

// =============================================
// User/Auth Types
// =============================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'operator' | 'viewer';
  companyId?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// =============================================
// API Response Types
// =============================================

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

export interface ApiError {
  error: string;
  code?: string;
  details?: string;
}

// =============================================
// Component Props Types
// =============================================

export interface WeekSelectorProps {
  selectedYear: number;
  selectedWeek: number;
  onYearChange: (year: number) => void;
  onWeekChange: (week: number) => void;
}

export interface MapSearchProps {
  localities: LocalityFeature[];
  onSelect: (selection: { loknr: number; lat: number; lng: number }) => void;
  localityBoundaries: LocalityBoundaries | null;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: React.ReactNode;
  color?: string;
}
