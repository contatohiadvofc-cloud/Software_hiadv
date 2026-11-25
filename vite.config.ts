/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'
import { writeFileSync } from 'node:fs'

/** Desempenho na primeira visita (PageSpeed):
 *  - o CSS vai dentro do index.html (sem pedido extra que trava a pintura);
 *  - o módulo do servidor e a fonte do texto começam a baixar junto com a página. */
function primeiraPintura(): Plugin {
  return {
    name: 'hiadv-primeira-pintura',
    apply: 'build',
    enforce: 'post',
    generateBundle(_o, bundle) {
      // as duas páginas: o site de apresentação (index.html) e o aplicativo (app.html)
      const css = Object.entries(bundle).filter(([nome, item]) => item.type === 'asset' && nome.endsWith('.css'))
      for (const pagina of ['index.html', 'app.html']) {
        const html = bundle[pagina]
        if (!html || html.type !== 'asset') continue
        let fonte = String(html.source)
        const dicas: string[] = []
        for (const [nome, item] of css) {
          if (item.type !== 'asset') continue
          const tag = new RegExp(`<link rel="stylesheet"[^>]*href="[^"]*${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`)
          if (tag.test(fonte)) { fonte = fonte.replace(tag, `<style>${String(item.source)}</style>`) }
        }
        // o maior texto da primeira tela usa a serifa: baixa junto com a página
        for (const nome of Object.keys(bundle)) if (/source-serif-4-latin-600-normal-.*\.woff2$/.test(nome)) dicas.push(`<link rel="preload" as="font" type="font/woff2" crossorigin href="/${nome}">`)
        html.source = fonte.replace('</head>', `${dicas.join('')}</head>`)
      }
      // o arquivo .css continua publicado: partes do aplicativo abertas depois ainda podem pedi-lo
    },
  }
}

/** O site de apresentação fica em "/"; qualquer outro endereço sem arquivo é o aplicativo (app.html).
 *  No GitHub Pages isso é feito pelo 404.html (cópia do app.html). */
function rotasDoApp(): Plugin {
  const reescrever = (req: { url?: string }, _res: unknown, next: () => void) => {
    const caminho = (req.url ?? '/').split('?')[0]
    if (caminho !== '/' && caminho !== '/index.html' && caminho !== '/CNAME' && !/\.[a-z0-9]+$/i.test(caminho) && !caminho.startsWith('/@') && !caminho.startsWith('/src/') && !caminho.startsWith('/node_modules/')) req.url = '/app.html' + (req.url?.slice(caminho.length) ?? '')
    next()
  }
  return {
    name: 'hiadv-rotas-do-app',
    // GitHub Pages: endereço sem arquivo (ex.: /seu-dia) recebe o 404.html, que é o próprio aplicativo
    writeBundle(opts, bundle) {
      const app = bundle['app.html']
      if (app && app.type === 'asset' && opts.dir) writeFileSync(opts.dir + '/404.html', String(app.source))
    },
    configureServer(s) { s.middlewares.use(reescrever) },
    configurePreviewServer(s) { s.middlewares.use(reescrever) },
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
  appType: 'mpa',
  build: { rollupOptions: { input: previa ? { app: 'app.html' } : { index: 'index.html', app: 'app.html' } } },
  plugins: [
    react(),
    rotasDoApp(),
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
        // id fixo mantém o mesmo app instalado; o início é um arquivo real (abre mesmo sem o service worker)
        id: '/seu-dia',
        start_url: '/app.html?origem=app',
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
        navigateFallback: '/app.html',
        // o site de apresentação e os vídeos não passam pelo aplicativo
        navigateFallbackDenylist: [/^\/$/, /^\/index\.html$/, /^\/video\//],
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
