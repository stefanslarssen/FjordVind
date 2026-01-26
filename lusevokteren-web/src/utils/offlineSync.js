// FjordVind Offline Sync - Håndterer offline data og synkronisering

const DB_NAME = 'FjordVindOffline'
const DB_VERSION = 1
const STORE_NAME = 'offlineData'

// Åpne/opprett IndexedDB database
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

// Lagre data for offline bruk
export async function saveOfflineData(data) {
  try {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    const entry = {
      ...data,
      timestamp: Date.now(),
      synced: false
    }

    store.add(entry)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('Failed to save offline data:', err)
    return false
  }
}

// Hent alle usynkroniserte data
export async function getUnsynced() {
  try {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const data = request.result.filter(item => !item.synced)
        resolve(data)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('Failed to get unsynced data:', err)
    return []
  }
}

// Marker data som synkronisert
export async function markAsSynced(id) {
  try {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    const request = store.get(id)
    request.onsuccess = () => {
      const data = request.result
      if (data) {
        data.synced = true
        store.put(data)
      }
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('Failed to mark as synced:', err)
    return false
  }
}

// Slett synkronisert data
export async function clearSynced() {
  try {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      const data = request.result
      data.forEach(item => {
        if (item.synced) {
          store.delete(item.id)
        }
      })
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('Failed to clear synced data:', err)
    return false
  }
}

// Synkroniser offline data når online
export async function syncOfflineData(apiUrl) {
  const unsynced = await getUnsynced()
  const results = []

  for (const item of unsynced) {
    try {
      const response = await fetch(item.url, {
        method: item.method || 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(item.body)
      })

      if (response.ok) {
        await markAsSynced(item.id)
        results.push({ id: item.id, success: true })
      } else {
        results.push({ id: item.id, success: false, error: 'API error' })
      }
    } catch (err) {
      results.push({ id: item.id, success: false, error: err.message })
    }
  }

  // Rydd opp synkroniserte data
  await clearSynced()

  return results
}

// Sjekk om vi er online
export function isOnline() {
  return navigator.onLine
}

// Registrer online/offline events
export function registerConnectionListeners(onOnline, onOffline) {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}

// Registrer service worker
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js')
      console.log('Service Worker registered:', registration.scope)

      // Lytt til meldinger fra service worker
      navigator.serviceWorker.addEventListener('message', async (event) => {
        if (event.data.type === 'OFFLINE_SAVE') {
          await saveOfflineData(event.data.data)
        } else if (event.data.type === 'SYNC_START') {
          const apiUrl = localStorage.getItem('apiUrl') || ''
          await syncOfflineData(apiUrl)
        }
      })

      return registration
    } catch (err) {
      console.error('Service Worker registration failed:', err)
      return null
    }
  }
  return null
}

// Be om bakgrunnssynk
export async function requestBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready
    try {
      await registration.sync.register('sync-offline-data')
      return true
    } catch (err) {
      console.error('Background sync registration failed:', err)
      return false
    }
  }
  return false
}
