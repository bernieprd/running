import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/running/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'RunCoach',
        short_name: 'RunCoach',
        description: '0 to 10K training coach',
        theme_color: '#FF6B35',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/running/',
        start_url: '/running/',
        icons: [
          {
            src: '/running/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/running/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/running/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/running/index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
