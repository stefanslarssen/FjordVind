import { useAuth } from '../contexts/AuthContext'

/**
 * RoleGate - Viser innhold basert på brukerrolle
 *
 * Props:
 * - requiredRole: 'admin' | 'driftsleder' | 'bruker'
 * - fallback: Valgfritt innhold å vise hvis bruker ikke har tilgang
 * - children: Innhold som skal vises hvis bruker har tilgang
 */
export default function RoleGate({ requiredRole, fallback = null, children }) {
  const { hasRole, user } = useAuth()

  // If no role required, show content
  if (!requiredRole) {
    return children
  }

  // Check if user has required role
  if (hasRole(requiredRole)) {
    return children
  }

  // Return fallback or nothing
  return fallback
}

/**
 * AdminOnly - Snarvei for admin-only innhold
 */
export function AdminOnly({ fallback = null, children }) {
  return (
    <RoleGate requiredRole="admin" fallback={fallback}>
      {children}
    </RoleGate>
  )
}

/**
 * DriftslederOnly - Snarvei for driftsleder+ innhold
 */
export function DriftslederOnly({ fallback = null, children }) {
  return (
    <RoleGate requiredRole="driftsleder" fallback={fallback}>
      {children}
    </RoleGate>
  )
}

/**
 * useRoleAccess - Hook for rolle-sjekking
 */
export function useRoleAccess() {
  const { hasRole, isAdmin, isDriftsleder, user } = useAuth()

  return {
    hasRole,
    isAdmin: isAdmin(),
    isDriftsleder: isDriftsleder(),
    userRole: user?.role || user?.user_metadata?.role || 'bruker',

    // Utility functions
    canManageUsers: () => hasRole('admin'),
    canManageLocations: () => hasRole('driftsleder'),
    canViewReports: () => hasRole('bruker'),
    canEditSettings: () => hasRole('driftsleder'),
    canDeleteSamples: () => hasRole('driftsleder'),
    canExportData: () => hasRole('bruker'),
    canScheduleReports: () => hasRole('driftsleder'),
    canManageAlerts: () => hasRole('driftsleder')
  }
}
