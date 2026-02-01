import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, Suspense, lazy } from 'react'
import { useAuth } from './contexts/AuthContext'
import { useLanguage } from './contexts/LanguageContext'
import { MobileMenuProvider, useMobileMenu } from './contexts/MobileMenuContext'
import ProtectedRoute from './components/ProtectedRoute'
import OfflineIndicator from './components/OfflineIndicator'
import CookieConsent from './components/CookieConsent'
import HamburgerButton from './components/HamburgerButton'
import MobileOverlay from './components/MobileOverlay'
import OnboardingWizard from './components/OnboardingWizard'
import { supabase } from './services/supabase'
import { isNative, initializeNativeFeatures, setupBackButtonHandler } from './utils/capacitor'

// Check if running in Electron
const isElectron = window.electronAPI?.isElectron || false

// Initialize native features on app load
if (isNative) {
  initializeNativeFeatures()
}

// Lazy-loadede sider for mindre bundle-størrelse
const OversiktPage = lazy(() => import('./pages/OversiktPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const LocationsPage = lazy(() => import('./pages/LocationsPage'))
const MapPage = lazy(() => import('./pages/MapPage'))
const PredictionsPage = lazy(() => import('./pages/PredictionsPage'))
const AlertsPage = lazy(() => import('./pages/AlertsPage'))
const TreatmentsPage = lazy(() => import('./pages/TreatmentsPage'))
const EnvironmentPage = lazy(() => import('./pages/EnvironmentPage'))
const ForingPage = lazy(() => import('./pages/ForingPage'))
const RapporterPage = lazy(() => import('./pages/RapporterPage'))
const InnstillingerPage = lazy(() => import('./pages/InnstillingerPage'))
const NyTellingPage = lazy(() => import('./pages/NyTellingPage'))
const NaboSammenligningPage = lazy(() => import('./pages/NaboSammenligningPage'))
const MyFarmsPage = lazy(() => import('./pages/MyFarmsPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const PersonvernPage = lazy(() => import('./pages/PersonvernPage'))
const VilkarPage = lazy(() => import('./pages/VilkarPage'))

// Fallback-komponent mens sider laster
function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
      color: 'var(--text-secondary)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid var(--border)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 12px'
        }} />
        <span>Laster...</span>
      </div>
    </div>
  )
}

// Removed API_URL - now using Supabase directly

// Wrapper for onboarding - vises kun for nye brukere
function OnboardingWrapper({ children }) {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    // Sjekk om bruker har fullført onboarding
    const onboardingComplete = localStorage.getItem('fjordvind_onboarding_complete')
    if (!onboardingComplete && user) {
      setShowOnboarding(true)
    }
    setCheckingOnboarding(false)
  }, [user])

  const handleOnboardingComplete = () => {
    localStorage.setItem('fjordvind_onboarding_complete', 'true')
    setShowOnboarding(false)
  }

  if (checkingOnboarding) {
    return null // Kort flash mens vi sjekker
  }

  if (showOnboarding) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />
  }

  return children
}

function AppLayout() {
  const [alertCounts, setAlertCounts] = useState({ critical: 0, warning: 0, unread: 0 })
  const { user, signOut, isAuthenticated } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const { isMenuOpen, closeMenu } = useMobileMenu()

  // Close mobile menu on route change
  useEffect(() => {
    closeMenu()
  }, [location.pathname, closeMenu])

  // Handle native back button (Android)
  useEffect(() => {
    if (!isNative) return

    const cleanup = setupBackButtonHandler((canGoBack) => {
      if (isMenuOpen) {
        closeMenu()
      } else if (canGoBack) {
        navigate(-1)
      }
    })

    return cleanup
  }, [navigate, isMenuOpen, closeMenu])

  // Listen for Electron menu navigation
  useEffect(() => {
    if (isElectron && window.electronAPI?.onNavigate) {
      window.electronAPI.onNavigate((route) => {
        navigate(route)
      })
    }
  }, [navigate])

  useEffect(() => {
    if (isAuthenticated) {
      loadAlertCounts()
      const interval = setInterval(loadAlertCounts, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  async function loadAlertCounts() {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('severity, is_read')
        .is('resolved_at', null)

      if (error) throw error

      const critical = data?.filter(a => a.severity === 'CRITICAL').length || 0
      const warning = data?.filter(a => a.severity === 'WARNING').length || 0
      const unread = data?.filter(a => !a.is_read).length || 0

      setAlertCounts({ critical, warning, unread })
    } catch (error) {
      console.error('Failed to load alert counts:', error)
    }
  }

  async function handleLogout() {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const userRole = user?.role || user?.user_metadata?.role || 'bruker'
  const userName = user?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Bruker'

  return (
    <div className="layout">
      <MobileOverlay />
      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        {/* FjordVind Icon */}
        <svg viewBox="0 0 100 100" className="brand-icon">
          <path d="M15 65 L32 35 L50 50 L70 22" stroke="#1e40af" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 78 L45 78" stroke="#3b82f6" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
          <path d="M35 88 L85 88" stroke="#93c5fd" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
        </svg>
        <h1 className="brand-title">FjordVind</h1>
        <div className="subtitle">Beskytter Norges kyst</div>

        {/* User Info */}
        <div style={{
          margin: '20px 0',
          padding: '12px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: '500',
                fontSize: '14px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {userName}
              </div>
              <div style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: userRole === 'admin' ? 'rgba(239, 68, 68, 0.2)' :
                             userRole === 'driftsleder' ? 'rgba(59, 130, 246, 0.2)' :
                             'rgba(34, 197, 94, 0.2)',
                  color: userRole === 'admin' ? '#ef4444' :
                         userRole === 'driftsleder' ? '#3b82f6' :
                         '#22c55e',
                  fontSize: '11px',
                  fontWeight: '500'
                }}>
                  {userRole}
                </span>
              </div>
            </div>
          </div>
        </div>

        <nav>
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
            {t('nav.oversikt')}
          </NavLink>

          <NavLink to="/ny-telling" className={({ isActive }) => `nav-item new-feature ${isActive ? 'active' : ''}`}>
            {t('nav.nyTelling')}
          </NavLink>

          <NavLink to="/predictions" className={({ isActive }) => `nav-item new-feature ${isActive ? 'active' : ''}`}>
            {t('nav.prediksjoner')}
          </NavLink>

          <NavLink to="/alerts" className={({ isActive }) => `nav-item new-feature ${isActive ? 'active' : ''}`}>
            {t('nav.varsler')}
            {alertCounts.unread > 0 && (
              <span className="badge">{alertCounts.unread}</span>
            )}
          </NavLink>

          <NavLink to="/treatments" className={({ isActive }) => `nav-item new-feature ${isActive ? 'active' : ''}`}>
            {t('nav.behandlinger')}
          </NavLink>

          <NavLink to="/locations" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            {t('nav.lokasjoner')}
          </NavLink>

          <NavLink to="/map" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            {t('nav.kart')}
          </NavLink>

          <NavLink to="/nabo-sammenligning" className={({ isActive }) => `nav-item new-feature ${isActive ? 'active' : ''}`}>
            {t('nav.omrade')}
          </NavLink>

          <NavLink to="/environment" className={({ isActive }) => `nav-item new-feature ${isActive ? 'active' : ''}`}>
            {t('nav.miljodata')}
          </NavLink>

          <NavLink to="/foring" className={({ isActive }) => `nav-item new-feature ${isActive ? 'active' : ''}`}>
            {t('nav.foring')}
          </NavLink>

          <NavLink to="/rapporter" className={({ isActive }) => `nav-item new-feature ${isActive ? 'active' : ''}`}>
            {t('nav.rapporter')}
          </NavLink>

          <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            {t('nav.historikk')}
          </NavLink>

          <NavLink to="/innstillinger" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            {t('nav.innstillinger')}
          </NavLink>
        </nav>

        {/* Logout Button */}
        <div style={{ marginTop: 'auto', padding: '16px 0' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'
              e.currentTarget.style.color = '#ef4444'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            {t('nav.loggUt')}
          </button>
        </div>
      </aside>

      <main className="main">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <HamburgerButton />
        </div>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<OversiktPage />} />
            <Route path="/ny-telling" element={<NyTellingPage />} />
            <Route path="/predictions" element={<PredictionsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/treatments" element={<TreatmentsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/mine-anlegg" element={<MyFarmsPage />} />
            <Route path="/nabo-sammenligning" element={<NaboSammenligningPage />} />
            <Route path="/environment" element={<EnvironmentPage />} />
            <Route path="/foring" element={<ForingPage />} />
            <Route path="/rapporter" element={<RapporterPage />} />
            <Route path="/innstillinger" element={<InnstillingerPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

export default function App() {
  const { loading } = useAuth()
  const { t } = useLanguage()

  // Load saved theme on app start
  useEffect(() => {
    const stored = localStorage.getItem('fjordvind_settings')
    if (stored) {
      try {
        const settings = JSON.parse(stored)
        if (settings.theme) {
          document.documentElement.setAttribute('data-theme', settings.theme)
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-dark)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <svg viewBox="0 0 100 100" style={{ width: '60px', height: '60px', marginBottom: '16px' }}>
            <path d="M15 65 L32 35 L50 50 L70 22" stroke="#1e40af" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 78 L45 78" stroke="#3b82f6" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
            <path d="M35 88 L85 88" stroke="#93c5fd" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
          </svg>
          <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/personvern" element={<PersonvernPage />} />
          <Route path="/vilkar" element={<VilkarPage />} />

          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <OnboardingWrapper>
                  <MobileMenuProvider>
                    <AppLayout />
                  </MobileMenuProvider>
                </OnboardingWrapper>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
      <OfflineIndicator />
      <CookieConsent />
    </>
  )
}
