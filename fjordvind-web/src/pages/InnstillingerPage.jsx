import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { isNative, getAppInfo } from '../utils/capacitor'

const SETTINGS_KEY = 'fjordvind_settings'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const defaultSettings = {
  notifications: true,
  emailAlerts: true,
  smsAlerts: false,
  autoRefresh: true,
  refreshInterval: 30,
  language: 'no',
  theme: 'dark',
  // Alert preferences
  alertEmail: '',
  alertPhone: '',
  liceCriticalThreshold: 0.5,
  liceWarningThreshold: 0.2,
  alertTypes: {
    LICE_CRITICAL: { email: true, sms: false, push: true },
    LICE_WARNING: { email: true, sms: false, push: true },
    LICE_PREDICTION: { email: false, sms: false, push: true },
    MORTALITY_HIGH: { email: true, sms: true, push: true },
    TREATMENT_DUE: { email: true, sms: false, push: true },
    DAILY_SUMMARY: { email: false, sms: false, push: false },
    WEEKLY_REPORT: { email: true, sms: false, push: false },
  }
}

// FAQ data for support section
const faqItems = [
  {
    q: 'Hvordan registrerer jeg en ny lusetelling?',
    a: 'Gå til "Ny telling" i menyen. Velg lokalitet og merd, fyll inn antall lus per kategori, og trykk "Registrer".'
  },
  {
    q: 'Hva betyr de ulike fargekodene på kartet?',
    a: 'Grønn = under grenseverdi (0.2), Gul = nærmer seg grense (0.2-0.4), Oransje = over grense (0.4-0.5), Rød = kritisk nivå (over 0.5).'
  },
  {
    q: 'Hvordan eksporterer jeg rapporter til Mattilsynet?',
    a: 'Gå til "Rapporter", velg "Mattilsynet" som rapporttype, velg periode og lokaliteter, og klikk "Eksporter PDF" eller "Eksporter Excel".'
  },
  {
    q: 'Kan jeg bruke appen offline?',
    a: 'Ja, appen støtter offline-bruk. Data lagres lokalt og synkroniseres automatisk når du er tilkoblet igjen.'
  },
  {
    q: 'Hvordan setter jeg opp varsler?',
    a: 'Gå til "Innstillinger" og konfigurer varsler under "Varsler". Du kan velge grenseverdier og varslingsmetode.'
  }
]

export default function InnstillingerPage() {
  const { t, setLanguage } = useLanguage()
  const { user, getAuthHeader } = useAuth()
  const [activeTab, setActiveTab] = useState('settings')
  const [settings, setSettings] = useState(defaultSettings)
  const [saved, setSaved] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [appInfo, setAppInfo] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState(null)

  // Push notifications
  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    permission: pushPermission,
    loading: pushLoading,
    error: pushError,
    isNative: isNativePush,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    sendTestNotification
  } = usePushNotifications()
  const [pushTestResult, setPushTestResult] = useState(null)

  // Support form state
  const [supportForm, setSupportForm] = useState({ type: 'question', subject: '', message: '' })
  const [sendingSupport, setSendingSupport] = useState(false)
  const [supportSent, setSupportSent] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState(null)

  // Load app info for native apps
  useEffect(() => {
    if (isNative) {
      getAppInfo().then(setAppInfo)
    }
  }, [])

  // Load settings from localStorage and API on mount
  useEffect(() => {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setSettings({ ...defaultSettings, ...parsed, alertTypes: { ...defaultSettings.alertTypes, ...parsed.alertTypes } })
      } catch (e) {
        console.error('Failed to parse settings:', e)
      }
    }

    // Try to load from API (will override local with server settings)
    if (user) {
      loadPreferencesFromApi()
    }
  }, [user])

  function handleToggle(key) {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
    setHasChanges(true)
    setSaved(false)
  }

  function handleChange(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
    setSaved(false)

    // If language changed, update the language context immediately
    if (key === 'language') {
      setLanguage(value)
    }
  }

  function handleAlertTypeChange(alertType, channel, value) {
    setSettings(prev => ({
      ...prev,
      alertTypes: {
        ...prev.alertTypes,
        [alertType]: {
          ...prev.alertTypes[alertType],
          [channel]: value
        }
      }
    }))
    setHasChanges(true)
    setSaved(false)
  }

  async function saveSettings() {
    // Save locally first
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))

    // Apply theme immediately
    document.documentElement.setAttribute('data-theme', settings.theme)

    // Try to sync with API
    setSyncing(true)
    setSyncError(null)

    try {
      const alertPreferences = {
        email_notifications: settings.emailAlerts,
        sms_notifications: settings.smsAlerts,
        push_notifications: settings.notifications,
        email_address: settings.alertEmail,
        phone_number: settings.alertPhone,
        lice_threshold_warning: settings.liceWarningThreshold,
        lice_threshold_critical: settings.liceCriticalThreshold,
        alert_types: settings.alertTypes
      }

      const response = await fetch(`${API_URL}/api/alert-preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        credentials: 'include',
        body: JSON.stringify(alertPreferences)
      })

      if (!response.ok) {
        throw new Error('Kunne ikke synkronisere med server')
      }

      setSaved(true)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to sync settings:', error)
      setSyncError('Innstillinger lagret lokalt, men kunne ikke synkroniseres med server')
      setSaved(true)
      setHasChanges(false)
    } finally {
      setSyncing(false)
      // Hide messages after 3 seconds
      setTimeout(() => {
        setSaved(false)
        setSyncError(null)
      }, 3000)
    }
  }

  // Load preferences from API on mount
  async function loadPreferencesFromApi() {
    try {
      const response = await fetch(`${API_URL}/api/alert-preferences`, {
        method: 'GET',
        headers: {
          ...getAuthHeader()
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.preferences) {
          const prefs = data.preferences
          setSettings(prev => ({
            ...prev,
            emailAlerts: prefs.email_notifications ?? prev.emailAlerts,
            smsAlerts: prefs.sms_notifications ?? prev.smsAlerts,
            notifications: prefs.push_notifications ?? prev.notifications,
            alertEmail: prefs.email_address || prev.alertEmail,
            alertPhone: prefs.phone_number || prev.alertPhone,
            liceWarningThreshold: prefs.lice_threshold_warning ?? prev.liceWarningThreshold,
            liceCriticalThreshold: prefs.lice_threshold_critical ?? prev.liceCriticalThreshold,
            alertTypes: prefs.alert_types || prev.alertTypes
          }))
        }
      }
    } catch (error) {
      console.log('Could not load preferences from API, using local settings')
    }
  }

  async function sendTestEmail() {
    if (!settings.alertEmail) {
      setTestResult({ success: false, message: t('settings.enterEmailFirst') })
      return
    }

    setTestingEmail(true)
    setTestResult(null)

    // Email functionality not implemented in standalone version
    // Simulating success for UI feedback
    setTimeout(() => {
      setTestResult({ success: true, message: 'Test e-post simulert (ikke sendt i frittstående versjon)' })
      setTestingEmail(false)
      setTimeout(() => setTestResult(null), 5000)
    }, 1000)
  }

  const alertTypeLabels = {
    LICE_CRITICAL: t('settings.liceCritical'),
    LICE_WARNING: t('settings.liceWarning'),
    LICE_PREDICTION: t('settings.licePrediction'),
    MORTALITY_HIGH: t('settings.highMortality'),
    TREATMENT_DUE: t('settings.treatmentDue'),
    DAILY_SUMMARY: t('settings.dailySummary'),
    WEEKLY_REPORT: t('settings.weeklyReport'),
  }

  async function handleSupportSubmit(e) {
    e.preventDefault()
    setSendingSupport(true)

    // Save locally for now - backend sync not implemented
    const pending = JSON.parse(localStorage.getItem('fjordvind_pending_support') || '[]')
    pending.push({ ...supportForm, user_email: user?.email, timestamp: new Date().toISOString() })
    localStorage.setItem('fjordvind_pending_support', JSON.stringify(pending))

    setSupportSent(true)
    setSupportForm({ type: 'question', subject: '', message: '' })
    setSendingSupport(false)
  }

  const selectStyle = {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text)'
  }

  const inputStyle = {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text)',
    width: '100%',
    boxSizing: 'border-box'
  }

  return (
    <div style={{ padding: '0 16px 16px 16px' }}>
      {/* Header med linje */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '12px 0',
        borderBottom: '1px solid var(--border)',
        marginBottom: '20px'
      }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>{t('settings.title')}</h1>
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{t('settings.subtitle')}</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[
          { id: 'settings', label: 'Innstillinger' },
          { id: 'support', label: 'Støtte og hjelp' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              border: activeTab === tab.id ? 'none' : '1px solid var(--border)',
              borderRadius: '6px',
              color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? '500' : '400'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'settings' && (<>
      {saved && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '24px',
          color: '#22c55e',
          fontWeight: '500'
        }}>
          {t('settings.saved')}
        </div>
      )}

      {/* Push Notification Settings */}
      <div className="card">
        <h3 className="card-title">Push-varsler</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!pushSupported ? (
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: '#ef4444', fontSize: '14px' }}>
              Push-varsler er ikke tilgjengelig {isNative ? 'på denne enheten' : 'i denne nettleseren'}.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: '500' }}>Push-varsler {isNativePush ? '(mobil)' : '(nettleser)'}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {pushSubscribed ? 'Aktiv - du mottar varsler' : pushPermission === 'denied' ? 'Varsler er blokkert i innstillinger' : 'Ikke aktivert'}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    setPushTestResult(null)
                    try {
                      if (pushSubscribed) {
                        await unsubscribePush()
                      } else {
                        await subscribePush()
                      }
                    } catch (err) {
                      setPushTestResult({ success: false, message: err.message })
                    }
                  }}
                  disabled={pushLoading || pushPermission === 'denied'}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: pushSubscribed ? 'rgba(239, 68, 68, 0.1)' : 'var(--primary)',
                    color: pushSubscribed ? '#ef4444' : 'white',
                    cursor: pushLoading || pushPermission === 'denied' ? 'not-allowed' : 'pointer',
                    opacity: pushLoading || pushPermission === 'denied' ? 0.6 : 1,
                    fontWeight: '500'
                  }}
                >
                  {pushLoading ? 'Venter...' : pushSubscribed ? 'Deaktiver' : 'Aktiver'}
                </button>
              </div>
              {pushSubscribed && (
                <button
                  onClick={async () => {
                    setPushTestResult(null)
                    try {
                      await sendTestNotification()
                      setPushTestResult({ success: true, message: 'Test-varsling sendt!' })
                    } catch (err) {
                      setPushTestResult({ success: false, message: err.message })
                    }
                  }}
                  disabled={pushLoading}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    cursor: pushLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  Send test-varsling
                </button>
              )}
              {(pushError || pushTestResult) && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  background: pushTestResult?.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: pushTestResult?.success ? '#22c55e' : '#ef4444'
                }}>
                  {pushTestResult?.message || pushError}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Basic Notification Settings */}
      <div className="card">
        <h3 className="card-title">{t('settings.notifications')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={() => handleToggle('notifications')}
              style={{ width: '20px', height: '20px' }}
            />
            <span>{t('settings.enableNotifications')}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.emailAlerts}
              onChange={() => handleToggle('emailAlerts')}
              style={{ width: '20px', height: '20px' }}
            />
            <span>{t('settings.emailAlerts')}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.smsAlerts}
              onChange={() => handleToggle('smsAlerts')}
              style={{ width: '20px', height: '20px' }}
            />
            <span>{t('settings.smsAlerts')}</span>
          </label>
        </div>
      </div>

      {/* Email & Phone Configuration */}
      {(settings.emailAlerts || settings.smsAlerts) && (
        <div className="card">
          <h3 className="card-title">{t('settings.contactInfo')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {settings.emailAlerts && (
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                  {t('settings.email')}
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="email"
                    value={settings.alertEmail}
                    onChange={(e) => handleChange('alertEmail', e.target.value)}
                    placeholder={t('settings.emailPlaceholder')}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={sendTestEmail}
                    disabled={testingEmail || !settings.alertEmail}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      cursor: testingEmail || !settings.alertEmail ? 'not-allowed' : 'pointer',
                      opacity: testingEmail || !settings.alertEmail ? 0.6 : 1,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {testingEmail ? t('settings.sending') : t('settings.sendTest')}
                  </button>
                </div>
                {testResult && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    background: testResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: testResult.success ? '#22c55e' : '#ef4444'
                  }}>
                    {testResult.message}
                  </div>
                )}
              </div>
            )}
            {settings.smsAlerts && (
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                  {t('settings.phone')}
                </label>
                <input
                  type="tel"
                  value={settings.alertPhone}
                  onChange={(e) => handleChange('alertPhone', e.target.value)}
                  placeholder={t('settings.phonePlaceholder')}
                  style={inputStyle}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alert Thresholds */}
      <div className="card">
        <h3 className="card-title">{t('settings.alertThresholds')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                {t('settings.criticalLevel')}
              </label>
              <input
                type="number"
                step="0.05"
                value={settings.liceCriticalThreshold}
                onChange={(e) => handleChange('liceCriticalThreshold', parseFloat(e.target.value) || 0.5)}
                style={inputStyle}
              />
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                {t('settings.legalLimit')}: 0.5
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                {t('settings.warningLevel')}
              </label>
              <input
                type="number"
                step="0.05"
                value={settings.liceWarningThreshold}
                onChange={(e) => handleChange('liceWarningThreshold', parseFloat(e.target.value) || 0.2)}
                style={inputStyle}
              />
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                {t('settings.recommendedWarning')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Alert Type Preferences */}
      {(settings.emailAlerts || settings.smsAlerts) && (
        <div className="card">
          <h3 className="card-title">{t('settings.alertTypes')}</h3>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
            {t('settings.alertTypesDesc')}
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '500' }}>{t('settings.alertType')}</th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: '500', width: '80px' }}>{t('settings.email')}</th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: '500', width: '80px' }}>SMS</th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: '500', width: '80px' }}>{t('settings.app')}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(alertTypeLabels).map(([type, label]) => (
                <tr key={type} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 10px', fontSize: '14px' }}>{label}</td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={settings.alertTypes[type]?.email || false}
                      onChange={(e) => handleAlertTypeChange(type, 'email', e.target.checked)}
                      disabled={!settings.emailAlerts}
                      style={{ width: '18px', height: '18px', cursor: settings.emailAlerts ? 'pointer' : 'not-allowed' }}
                    />
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={settings.alertTypes[type]?.sms || false}
                      onChange={(e) => handleAlertTypeChange(type, 'sms', e.target.checked)}
                      disabled={!settings.smsAlerts}
                      style={{ width: '18px', height: '18px', cursor: settings.smsAlerts ? 'pointer' : 'not-allowed' }}
                    />
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={settings.alertTypes[type]?.push || false}
                      onChange={(e) => handleAlertTypeChange(type, 'push', e.target.checked)}
                      disabled={!settings.notifications}
                      style={{ width: '18px', height: '18px', cursor: settings.notifications ? 'pointer' : 'not-allowed' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Data Refresh Settings */}
      <div className="card">
        <h3 className="card-title">{t('settings.dataRefresh')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.autoRefresh}
              onChange={() => handleToggle('autoRefresh')}
              style={{ width: '20px', height: '20px' }}
            />
            <span>{t('settings.autoRefresh')}</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>{t('settings.refreshInterval')}:</span>
            <select
              value={settings.refreshInterval}
              onChange={(e) => handleChange('refreshInterval', Number(e.target.value))}
              style={selectStyle}
            >
              <option value={15}>15 {t('settings.seconds')}</option>
              <option value={30}>30 {t('settings.seconds')}</option>
              <option value={60}>1 {t('settings.minute')}</option>
              <option value={300}>5 {t('settings.minutes')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Display Settings */}
      <div className="card">
        <h3 className="card-title">{t('settings.display')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>{t('settings.language')}:</span>
            <select
              value={settings.language}
              onChange={(e) => handleChange('language', e.target.value)}
              style={selectStyle}
            >
              <option value="no">Norsk</option>
              <option value="en">English</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>{t('settings.theme')}:</span>
            <select
              value={settings.theme}
              onChange={(e) => handleChange('theme', e.target.value)}
              style={selectStyle}
            >
              <option value="dark">{t('settings.dark')}</option>
              <option value="light">{t('settings.light')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <button
          className="btn btn-primary"
          onClick={saveSettings}
          disabled={syncing}
          style={{ opacity: hasChanges && !syncing ? 1 : 0.7 }}
        >
          {syncing ? 'Lagrer...' : t('settings.saveSettings')}
        </button>
        {hasChanges && !syncing && (
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {t('settings.unsavedChanges')}
          </span>
        )}
        {syncError && (
          <span style={{ color: '#f59e0b', fontSize: '13px' }}>
            ⚠️ {syncError}
          </span>
        )}
      </div>

      {/* App Info (for native apps) */}
      {appInfo && (
        <div style={{ marginTop: '32px', padding: '16px', background: 'var(--bg-card)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>App:</span>
            <span style={{ color: 'var(--text)' }}>{appInfo.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>Versjon:</span>
            <span style={{ color: 'var(--text)' }}>{appInfo.version} ({appInfo.build})</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Plattform:</span>
            <span style={{ color: 'var(--text)', textTransform: 'capitalize' }}>{appInfo.platform}</span>
          </div>
        </div>
      )}
      </>)}

      {/* Support Tab */}
      {activeTab === 'support' && (
        <div style={{ maxWidth: '700px' }}>
          <div className="card" style={{ marginBottom: '24px' }}>
            {supportSent ? (
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px', color: '#22c55e' }}>✓</div>
                <h3>Takk for din henvendelse!</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Vi svarer innen 24 timer.</p>
                <button onClick={() => setSupportSent(false)} className="btn btn-primary" style={{ marginTop: '16px' }}>
                  Send ny
                </button>
              </div>
            ) : (
              <form onSubmit={handleSupportSubmit}>
                <h3 style={{ marginBottom: '16px' }}>Kontakt oss</h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {['question', 'bug', 'feature'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSupportForm(f => ({ ...f, type }))}
                      style={{
                        padding: '8px 14px',
                        background: supportForm.type === type ? 'rgba(30,64,175,0.1)' : 'var(--bg-card)',
                        border: supportForm.type === type ? '2px solid var(--primary)' : '1px solid var(--border)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: supportForm.type === type ? 'var(--primary)' : 'var(--text-secondary)',
                        fontSize: '13px'
                      }}
                    >
                      {type === 'question' ? 'Spørsmål' : type === 'bug' ? 'Feil' : 'Ønske'}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={supportForm.subject}
                  onChange={e => setSupportForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Emne"
                  required
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', marginBottom: '12px' }}
                />
                <textarea
                  value={supportForm.message}
                  onChange={e => setSupportForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Beskriv henvendelsen..."
                  required
                  rows={4}
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', marginBottom: '16px', resize: 'vertical' }}
                />
                <button type="submit" disabled={sendingSupport} className="btn btn-primary" style={{ width: '100%' }}>
                  {sendingSupport ? 'Sender...' : 'Send henvendelse'}
                </button>
              </form>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>Vanlige spørsmål</h3>
            {faqItems.map((item, i) => (
              <div key={i} style={{ padding: '12px 0', borderBottom: i < faqItems.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }} onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '500', fontSize: '14px' }}>{item.q}</span>
                  <span style={{ color: 'var(--text-secondary)', transform: expandedFaq === i ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }}>▼</span>
                </div>
                {expandedFaq === i && <p style={{ marginTop: '8px', marginBottom: 0, color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>{item.a}</p>}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-card)', borderRadius: '8px', display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontWeight: '500', marginBottom: '4px' }}>E-post</div><div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>support@fjordvind.no</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontWeight: '500', marginBottom: '4px' }}>Telefon</div><div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>+47 123 45 678</div></div>
          </div>
        </div>
      )}
    </div>
  )
}
