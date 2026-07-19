import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  appType: 'mpa',
  plugins: [
    vue(),
    vuetify(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            // Browser tabs ask metadata with ?view=browser so they always revalidate
            urlPattern: /\/assets\/(firmware|backpack)\/(index\.json|hardware\/targets\.json)(\?.*)?$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firmware-metadata',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 20,
              },
            },
          },
          {
            // Cache firmware files for offline flashing, including metadata bundled by the service worker
            urlPattern: /\/assets\/(firmware|backpack)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firmwares',
              expiration: {
                maxEntries: 50,
              },
            },
          },
          {
            // Cache fonts
            urlPattern: /\/assets\/.*\.(ttf|eot|woff|woff2)/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: {
                maxEntries: 50,
              },
            },
          },
        ],
      },
      // These files will always be available offline
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'mask-icon.svg',
        'assets/{firmware,backpack}/index.json',
        'assets/{firmware,backpack}/**/targets.json',
      ],
      manifest: {
        name: 'ExpressLRS Web Flasher',
        short_name: 'ELRS Web Flasher',
        description: 'Web-hosted flasher for ExpressLRS version 3 firmware',
        theme_color: '#4a88ab',
        display_override: ['window-controls-overlay', 'standalone', 'browser'],
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
      },
    })
  ],
  base: './'
})
