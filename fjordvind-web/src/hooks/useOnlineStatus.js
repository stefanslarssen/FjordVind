import { useState, useEffect } from 'react'

// Sjekk om vi kjører i Tauri
const isTauri = typeof window !== 'undefined' && (window.__TAURI__ || window.__TAURI_INTERNALS__)

/**
 * Hook for å detektere online/offline status
 * Gir feltarbeidere varsel når de mister nettverkstilgang
 * I Tauri returnerer vi alltid online=true siden navigator.onLine ikke er pålitelig
 */
export function useOnlineStatus() {
  // I Tauri, anta alltid online (navigator.onLine fungerer ikke riktig)
  const [isOnline, setIsOnline] = useState(isTauri ? true : navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Vis varsel om at vi er tilbake online
      if (wasOffline) {
        console.log('Nettverkstilkobling gjenopprettet')
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
      console.log('Mistet nettverkstilkobling - bruker cached data')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  return { isOnline, wasOffline }
}

export default useOnlineStatus
