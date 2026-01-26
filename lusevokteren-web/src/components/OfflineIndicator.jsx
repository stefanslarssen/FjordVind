import { useState, useEffect } from 'react'
import { registerConnectionListeners, getUnsynced, syncOfflineData } from '../utils/offlineSync'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Sjekk pending offline data
    async function checkPending() {
      const unsynced = await getUnsynced()
      setPendingCount(unsynced.length)
    }
    checkPending()

    // Registrer tilkoblingslyttere
    const cleanup = registerConnectionListeners(
      async () => {
        setIsOnline(true)
        // Auto-sync når vi kommer online
        if (pendingCount > 0) {
          setSyncing(true)
          await syncOfflineData(API_URL)
          await checkPending()
          setSyncing(false)
        }
      },
      () => {
        setIsOnline(false)
        setShowBanner(true)
      }
    )

    // Sjekk pending data periodisk
    const interval = setInterval(checkPending, 30000)

    return () => {
      cleanup()
      clearInterval(interval)
    }
  }, [pendingCount])

  // Skjul banner etter 5 sekunder når online
  useEffect(() => {
    if (isOnline && showBanner) {
      const timer = setTimeout(() => setShowBanner(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, showBanner])

  // Manuell synkronisering
  async function handleSync() {
    if (!isOnline || syncing) return
    setSyncing(true)
    await syncOfflineData(API_URL)
    const unsynced = await getUnsynced()
    setPendingCount(unsynced.length)
    setSyncing(false)
  }

  if (isOnline && !showBanner && pendingCount === 0) {
    return null
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    }}>
      {/* Offline banner */}
      {!isOnline && (
        <div style={{
          padding: '12px 20px',
          borderRadius: '8px',
          background: 'rgba(234, 179, 8, 0.95)',
          color: '#000',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <line x1="12" y1="20" x2="12.01" y2="20"/>
          </svg>
          Du er offline - data lagres lokalt
        </div>
      )}

      {/* Synkronisering tilgjengelig */}
      {isOnline && pendingCount > 0 && (
        <div style={{
          padding: '12px 20px',
          borderRadius: '8px',
          background: 'rgba(59, 130, 246, 0.95)',
          color: 'white',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span>{pendingCount} usynkroniserte elementer</span>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: 'none',
              background: 'white',
              color: '#3b82f6',
              fontWeight: '600',
              cursor: syncing ? 'wait' : 'pointer',
              fontSize: '13px'
            }}
          >
            {syncing ? 'Synkroniserer...' : 'Synkroniser na'}
          </button>
        </div>
      )}

      {/* Online igjen banner */}
      {isOnline && showBanner && pendingCount === 0 && (
        <div style={{
          padding: '12px 20px',
          borderRadius: '8px',
          background: 'rgba(34, 197, 94, 0.95)',
          color: 'white',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Tilkoblet igjen - alt synkronisert
        </div>
      )}
    </div>
  )
}
