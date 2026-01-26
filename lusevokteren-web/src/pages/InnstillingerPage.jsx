import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const SETTINGS_KEY = 'fjordvind_settings'

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

export default function InnstillingerPage() {
  const { t, setLanguage } = useLanguage()
  const [settings, setSettings] = useState(defaultSettings)
  const [saved, setSaved] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testResult, setTestResult] = useState(null)

  // Load settings from localStorage on mount
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
  }, [])

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
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))

    // Also save to backend if email alerts are configured
    if (settings.alertEmail) {
      try {
        await fetch(`${API_URL}/api/alert-preferences`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: settings.alertEmail,
            phone: settings.alertPhone,
            preferences: settings.alertTypes,
            thresholds: {
              liceCritical: settings.liceCriticalThreshold,
              liceWarning: settings.liceWarningThreshold
            }
          })
        })
      } catch (e) {
        console.error('Failed to save alert preferences to server:', e)
      }
    }

    setSaved(true)
    setHasChanges(false)

    // Apply theme immediately
    document.documentElement.setAttribute('data-theme', settings.theme)

    // Hide success message after 3 seconds
    setTimeout(() => setSaved(false), 3000)
  }

  async function sendTestEmail() {
    if (!settings.alertEmail) {
      setTestResult({ success: false, message: t('settings.enterEmailFirst') })
      return
    }

    setTestingEmail(true)
    setTestResult(null)

    try {
      const response = await fetch(`${API_URL}/api/alerts/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: settings.alertEmail })
      })

      if (response.ok) {
        setTestResult({ success: true, message: t('settings.testEmailSent') })
      } else {
        setTestResult({ success: false, message: t('settings.testEmailFailed') })
      }
    } catch (e) {
      setTestResult({ success: false, message: t('settings.testEmailFailed') })
    } finally {
      setTestingEmail(false)
      setTimeout(() => setTestResult(null), 5000)
    }
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
      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          className="btn btn-primary"
          onClick={saveSettings}
          style={{ opacity: hasChanges ? 1 : 0.7 }}
        >
          {t('settings.saveSettings')}
        </button>
        {hasChanges && (
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {t('settings.unsavedChanges')}
          </span>
        )}
      </div>
    </div>
  )
}
