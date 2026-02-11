/**
 * OfflineTileLayer - Leaflet TileLayer med offline-støtte via IndexedDB
 * Fungerer i Tauri uten service workers
 */

import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { getCachedTile, cacheTile, trimTileCache } from '../utils/offlineTiles'

// Opprett en custom TileLayer-klasse som bruker IndexedDB cache
const CachedTileLayer = L.TileLayer.extend({
  createTile: function (coords, done) {
    const tile = document.createElement('img')
    const url = this.getTileUrl(coords)

    tile.alt = ''
    tile.setAttribute('role', 'presentation')

    // Prøv å hente fra cache først
    getCachedTile(url)
      .then(async (cachedBlob) => {
        if (cachedBlob) {
          // Bruk cachet tile
          tile.src = URL.createObjectURL(cachedBlob)
          done(null, tile)
        } else {
          // Hent fra nettverk
          try {
            const response = await fetch(url)
            if (response.ok) {
              const blob = await response.blob()
              // Lagre i cache for senere bruk
              cacheTile(url, blob).catch(() => {})
              // Trim cache periodisk (ca hver 100. tile)
              if (Math.random() < 0.01) {
                trimTileCache().catch(() => {})
              }
              tile.src = URL.createObjectURL(blob)
              done(null, tile)
            } else {
              // Feilet - vis placeholder eller tom
              tile.src = ''
              done(new Error('Failed to load tile'), tile)
            }
          } catch (err) {
            // Offline og ikke i cache
            tile.src = ''
            done(err, tile)
          }
        }
      })
      .catch((err) => {
        // Fallback til vanlig lasting
        tile.src = url
        L.DomEvent.on(tile, 'load', () => done(null, tile))
        L.DomEvent.on(tile, 'error', (e) => done(e, tile))
      })

    return tile
  }
})

export default function OfflineTileLayer({
  url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom = 19,
  subdomains = 'abc'
}) {
  const map = useMap()
  const layerRef = useRef(null)

  useEffect(() => {
    // Opprett og legg til tile layer
    layerRef.current = new CachedTileLayer(url, {
      attribution,
      maxZoom,
      subdomains
    })
    layerRef.current.addTo(map)

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
      }
    }
  }, [map, url, attribution, maxZoom, subdomains])

  return null
}
