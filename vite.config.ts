/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'

/** Desempenho na primeira visita (PageSpeed):
 *  - o CSS vai dentro do index.html (sem pedido extra que trava a pintura);
 *  - o módulo do servidor e a fonte do texto começam a baixar junto com a página. */
function primeiraPintura(): Plugin {
  return {
    name: 'hiadv-primeira-pintura',
    apply: 'build',
    enforce: 'post',
    generateBundle(_o, bundle) {
      const html = bundle['index.html']
      if (!html || html.type !== 'asset') return
      let fonte = String(html.source)
      const dicas: string[] = []
      for (const [nome, item] of Object.entries(bundle)) {
        if (item.type === 'asset' && nome.endsWith('.css')) {
          const tag = new RegExp(`<link rel="stylesheet"[^>]*href="[^"]*${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`)
          if (tag.test(fonte)) { fonte = fonte.replace(tag, `<style>${String(item.source)}</style>`); delete bundle[nome] }
        }
        // a frase de apresentação do login (maior texto da primeira tela) usa a serifa: baixa junto com a página
        if (item.type === 'asset' && /source-serif-4-latin-600-normal-.*\.woff2$/.test(nome)) dicas.push(`<link rel="preload" as="font" type="font/woff2" crossorigin href="/${nome}">`)
      }
      html.source = fonte.replace('</head>', `${dicas.join('')}</head>`)
    },
  }
}

const previa = process.env.VITE_PREVIA === '1'

// No navegador, o React é trocado pelo Preact (mesma API, bem menor e mais rápido para abrir).
// Os testes de lógica continuam no React.
const usarPreact = process.env.VITEST !== 'true' && process.env.HIADV_REACT !== '1'

export default defineConfig({
  resolve: usarPreact ? {
    alias: [
      { find: /^react$/, replacement: 'preact/compat' },
      { find: /^react-dom\/client$/, replacement: 'preact/compat/client' },
      { find: /^react-dom$/, replacement: 'preact/compat' },
      { find: /^react\/jsx-runtime$/, replacement: 'preact/jsx-runtime' },
      { find: /^react\/jsx-dev-runtime$/, replacement: 'preact/jsx-runtime' },
    ],
  } : undefined,
  base: previa ? './' : '/',
  plugins: [
    react(),
    !previa && primeiraPintura(),
    !previa && VitePWA({
      registerType: 'autoUpdate',
      // Registrado pelo próprio app depois que a página termina de abrir (main.tsx).
      injectRegister: null,
      includeAssets: ['icons/favicon-48.png', 'icons/apple-touch-icon.png', 'CNAME', 'robots.txt', 'og-hiadv.png'],
      manifest: {
        name: 'HiAdv · Gestão Jurídica',
        short_name: 'HiAdv',
        description: 'Gestão jurídica para escritórios de advocacia.',
        lang: 'pt-BR',
        start_url: '/seu-dia',
        scope: '/',
        display: 'standalone',
        background_color: '#f8f5f2',
        theme_color: '#7a1f33',
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
