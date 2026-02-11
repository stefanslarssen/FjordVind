/**
 * Offline Map Tile Cache for Tauri
 * Uses IndexedDB to cache map tiles for offline use
 */

const DB_NAME = 'FjordVindMapTiles'
const DB_VERSION = 1
const STORE_NAME = 'tiles'
const MAX_TILES = 3000 // Maks antall fliser i cache

// Åpne IndexedDB database
function openTileDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

/**
 * Hent en tile fra cache
 */
export async function getCachedTile(url) {
  try {
    const db = await openTileDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(url)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result
        if (result && result.blob) {
          resolve(result.blob)
        } else {
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('Failed to get cached tile:', err)
    return null
  }
}

/**
 * Lagre en tile i cache
 */
export async function cacheTile(url, blob) {
  try {
    const db = await openTileDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    store.put({
      url,
      blob,
      timestamp: Date.now()
    })

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('Failed to cache tile:', err)
    return false
  }
}

/**
 * Rydd opp gamle tiles hvis cache er for stor
 */
export async function trimTileCache() {
  try {
    const db = await openTileDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const countRequest = store.count()

    countRequest.onsuccess = () => {
      const count = countRequest.result
      if (count > MAX_TILES) {
        // Slett de eldste 20%
        const toDelete = Math.floor(count * 0.2)
        const index = store.index('timestamp')
        const cursorRequest = index.openCursor()
        let deleted = 0

        cursorRequest.onsuccess = (event) => {
          const cursor = event.target.result
          if (cursor && deleted < toDelete) {
            store.delete(cursor.primaryKey)
            deleted++
            cursor.continue()
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to trim tile cache:', err)
  }
}

/**
 * Hent antall cachede tiles
 */
export async function getCacheStats() {
  try {
    const db = await openTileDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const countRequest = store.count()

    return new Promise((resolve, reject) => {
      countRequest.onsuccess = () => {
        resolve({
          count: countRequest.result,
          maxTiles: MAX_TILES
        })
      }
      countRequest.onerror = () => reject(countRequest.error)
    })
  } catch (err) {
    return { count: 0, maxTiles: MAX_TILES }
  }
}

/**
 * Tøm hele tile-cachen
 */
export async function clearTileCache() {
  try {
    const db = await openTileDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.clear()

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('Failed to clear tile cache:', err)
    return false
  }
}

/**
 * Last ned tiles for et område (for pre-caching)
 * @param {Object} bounds - { north, south, east, west }
 * @param {number} minZoom - Minimum zoom level
 * @param {number} maxZoom - Maximum zoom level
 * @param {Function} onProgress - Callback for progress updates
 */
export async function downloadTilesForArea(bounds, minZoom, maxZoom, onProgress) {
  const tiles = []

  for (let z = minZoom; z <= maxZoom; z++) {
    const minX = lon2tile(bounds.west, z)
    const maxX = lon2tile(bounds.east, z)
    const minY = lat2tile(bounds.north, z)
    const maxY = lat2tile(bounds.south, z)

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        tiles.push({ z, x, y })
      }
    }
  }

  let downloaded = 0
  const total = tiles.length
  const servers = ['a', 'b', 'c']

  for (const tile of tiles) {
    const server = servers[Math.floor(Math.random() * servers.length)]
    const url = `https://${server}.tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`

    try {
      const response = await fetch(url)
      if (response.ok) {
        const blob = await response.blob()
        await cacheTile(url, blob)
      }
    } catch (err) {
      console.warn('Failed to download tile:', url)
    }

    downloaded++
    if (onProgress) {
      onProgress(downloaded, total)
    }

    // Liten pause for å ikke overbelaste serveren
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  await trimTileCache()
  return downloaded
}

// Hjelpefunksjoner for tile-koordinater
function lon2tile(lon, zoom) {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom))
}

function lat2tile(lat, zoom) {
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))
}
