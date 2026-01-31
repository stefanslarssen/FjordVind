import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Check if building for Electron
const isElectron = process.env.ELECTRON === 'true'

export default defineConfig({
  // Use relative paths for Electron file:// protocol
  base: isElectron ? './' : '/',
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api/fiskeridir': {
        target: 'https://gis.fiskeridir.no',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fiskeridir/, ''),
        secure: true
      },
      '/api/barentswatch': {
        target: 'https://www.barentswatch.no',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/barentswatch/, ''),
        secure: true
      },
      '/api/barentswatch-auth': {
        target: 'https://id.barentswatch.no',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/barentswatch-auth/, ''),
        secure: true
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'FjordVind Lusevokteren',
        short_name: 'FjordVind',
        description: 'Profesjonell luseovervåking for norsk oppdrettsnæring',
        theme_color: '#1e40af',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Cache strategier for offline støtte
        runtimeCaching: [
          {
            // Cache Fiskeridirektoratet ArcGIS geodata
            urlPattern: /^https:\/\/gis\.fiskeridir\.no\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fiskeridir-geodata-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 dager
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            // Cache BarentsWatch geodata API
            urlPattern: /^https:\/\/www\.barentswatch\.no\/bwapi\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'barentswatch-geodata-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 timer
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            // Cache API-kall for lokalitetsdata
            urlPattern: /^https?:\/\/.*\/api\/locality-boundaries/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'locality-data-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 timer
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache API-kall for BarentsWatch data (legacy)
            urlPattern: /^https?:\/\/.*\/api\/barentswatch/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'barentswatch-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 6 // 6 timer
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache kartfliser fra OpenStreetMap - VIKTIG for offline kart!
            urlPattern: /^https:\/\/[abc]?\.?tile\.openstreetmap\.org/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-map-tiles-cache',
              expiration: {
                maxEntries: 2000, // Økt fra 500 til 2000 for bedre dekning
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 dager
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache Leaflet marker-ikoner fra unpkg
            urlPattern: /^https:\/\/unpkg\.com\/leaflet/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'leaflet-assets-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 år
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache bilder og ikoner
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 dager
              }
            }
          },
          {
            // Cache fonter
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 år
              }
            }
          }
        ],
        // Precache viktige ressurser
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']
      }
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'src/main.jsx',
      ],
      thresholds: {
        statements: 60,
        branches: 60,
        functions: 60,
        lines: 60,
      },
    },
  },
})
