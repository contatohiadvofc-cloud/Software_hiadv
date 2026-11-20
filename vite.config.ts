/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const previa = process.env.VITE_PREVIA === '1'

export default defineConfig({
  base: previa ? './' : '/',
  plugins: [
    react(),
    !previa && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon-48.png', 'icons/apple-touch-icon.png', 'CNAME'],
      manifest: {
        name: 'HiAdv · Gestão Jurídica',
        short_name: 'HiAdv',
        description: 'Gestão jurídica para escritórios de advocacia.',
        lang: 'pt-BR',
        start_url: '/seu-dia',
        scope: '/',
        display: 'standalone',
        background_color: '#f5f6f8',
        theme_color: '#16202e',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // Dados do escritório nunca ficam no cache do aparelho: só os arquivos do aplicativo.
        runtimeCaching: [],
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/unit/setup.ts'],
  },
})
