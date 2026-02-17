// FjordVind Service Worker - Offline Support
const CACHE_NAME = 'fjordvind-cache-v2'
const MAP_TILE_CACHE = 'fjordvind-map-tiles-v1'
const OFFLINE_DATA_STORE = 'fjordvind-offline-data'

// Filer som skal caches for offline-bruk
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
]

// API-endepunkter som kan caches
const CACHEABLE_APIS = [
  '/api/locations',
  '/api/merds',
  '/api/samples',
  '/api/alerts'
]

// Kartfliser som skal caches (OpenStreetMap og andre tile-providere)
const MAP_TILE_DOMAINS = [
  'tile.openstreetmap.org',
  'a.tile.openstreetmap.org',
  'b.tile.openstreetmap.org',
  'c.tile.openstreetmap.org',
  'tiles.stadiamaps.com',
  'cartodb-basemaps-a.global.ssl.fastly.net',
  'cartodb-basemaps-b.global.ssl.fastly.net',
  'cartodb-basemaps-c.global.ssl.fastly.net'
]

// Eksterne API-er som skal caches for offline-bruk (geodata)
const EXTERNAL_CACHEABLE_APIS = [
  'gis.fiskeridir.no',
  'barentswatch.no'
]

// Maks antall kartfliser i cache (for å unngå at cachen blir for stor)
const MAX_MAP_TILES = 2000

// Installer service worker og cache statiske filer
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.log('[SW] Some assets failed to cache:', err)
      })
    })
  )
  self.skipWaiting()
})

// Aktiver og rydd opp gamle caches
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, MAP_TILE_CACHE]
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => {
            console.log('[SW] Sletter gammel cache:', name)
            return caches.delete(name)
          })
      )
    })
  )
  self.clients.claim()
})

// Sjekk om URL er en kartflise
function isMapTile(url) {
  return MAP_TILE_DOMAINS.some(domain => url.hostname.includes(domain))
}

// Sjekk om URL er et eksternt API som kan caches
function isExternalCacheableApi(url) {
  return EXTERNAL_CACHEABLE_APIS.some(domain => url.hostname.includes(domain))
}

// Begrens størrelsen på kartflise-cachen
async function trimMapTileCache() {
  try {
    const cache = await caches.open(MAP_TILE_CACHE)
    const keys = await cache.keys()
    if (keys.length > MAX_MAP_TILES) {
      // Slett de eldste 20% av flisene
      const toDelete = Math.floor(keys.length * 0.2)
      for (let i = 0; i < toDelete; i++) {
        await cache.delete(keys[i])
      }
      console.log(`[SW] Trimmet kartflise-cache: slettet ${toDelete} fliser`)
    }
  } catch (err) {
    console.error('[SW] Feil ved trimming av cache:', err)
  }
}

// Fetch-handler med network-first strategi for API, cache-first for statiske filer
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorer ikke-GET requests (POST, PUT, DELETE lagres offline)
  if (request.method !== 'GET') {
    // Håndter offline POST-requests
    if (!navigator.onLine && request.method === 'POST') {
      event.respondWith(handleOfflinePost(request))
      return
    }
    return
  }

  // Kartfliser: cache-first med network fallback (viktig for offline!)
  if (isMapTile(url)) {
    event.respondWith(
      caches.open(MAP_TILE_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request)
        if (cachedResponse) {
          // Returner cachet flise umiddelbart
          return cachedResponse
        }

        // Ikke i cache - hent fra nettverk
        try {
          const networkResponse = await fetch(request)
          if (networkResponse.ok) {
            // Lagre i cache for offline-bruk
            cache.put(request, networkResponse.clone())
            // Trim cache i bakgrunnen
            trimMapTileCache()
          }
          return networkResponse
        } catch (err) {
          // Offline og ikke i cache - returner en placeholder
          console.log('[SW] Kartflise ikke tilgjengelig offline:', url.href)
          return new Response('', { status: 404 })
        }
      })
    )
    return
  }

  // Eksterne API-er (Fiskeridirektoratet, BarentsWatch): network-first med cache fallback
  if (isExternalCacheableApi(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            // Cache vellykket API-svar
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
              console.log('[SW] Cachet geodata API-svar:', url.href)
            })
          }
          return response
        })
        .catch(async () => {
          // Offline - sjekk cache
          console.log('[SW] Prøver å hente geodata fra cache:', url.href)
          const cachedResponse = await caches.match(request)
          if (cachedResponse) {
            console.log('[SW] Returnerer cachet geodata')
            return cachedResponse
          }
          // Ikke i cache - returner feilmelding
          return new Response(
            JSON.stringify({
              error: 'Offline',
              offline: true,
              message: 'Geodata ikke tilgjengelig offline'
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        })
    )
    return
  }

  // API-requests: network-first med cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache vellykkede API-svar
          if (response.ok && CACHEABLE_APIS.some(api => url.pathname.includes(api))) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Offline - returner cachet data
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            // Returner offline-melding
            return new Response(
              JSON.stringify({ error: 'Offline', offline: true }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            )
          })
        })
    )
    return
  }

  // Statiske filer: cache-first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }
      return fetch(request).then((response) => {
        // Cache statiske ressurser
        if (response.ok && (
          request.url.endsWith('.js') ||
          request.url.endsWith('.css') ||
          request.url.endsWith('.png') ||
          request.url.endsWith('.jpg') ||
          request.url.endsWith('.svg')
        )) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return response
      })
    })
  )
})

// Håndter offline POST-requests ved å lagre dem lokalt
async function handleOfflinePost(request) {
  try {
    const body = await request.clone().json()
    const offlineData = {
      url: request.url,
      method: request.method,
      body: body,
      timestamp: Date.now()
    }

    // Lagre i IndexedDB via message til client
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'OFFLINE_SAVE',
        data: offlineData
      })
    })

    return new Response(
      JSON.stringify({
        success: true,
        offline: true,
        message: 'Data lagret lokalt. Synkroniseres når du er online.'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Kunne ikke lagre data offline' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData())
  }
})

async function syncOfflineData() {
  const clients = await self.clients.matchAll()
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_START' })
  })
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body || 'Ny varsling fra FjordVind',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'fjordvind-notification',
    data: {
      url: data.url || '/'
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'FjordVind', options)
  )
})

// Håndter klikk på push-varsler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Sjekk om appen allerede er åpen
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      // Åpne ny fane
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})
