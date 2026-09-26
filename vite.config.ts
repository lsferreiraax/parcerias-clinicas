import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpeg,jpg}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MiB
      },
      manifest: {
        name: 'Parcerias Clínicas',
        short_name: 'Parcerias',
        description: 'Sistema de gestão financeira de parcerias clínicas',
        theme_color: '#1F3864',
        background_color: '#F9FAFB',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/logo.jpeg', sizes: '192x192', type: 'image/jpeg' },
          { src: '/logo.jpeg', sizes: '512x512', type: 'image/jpeg', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  }
})
