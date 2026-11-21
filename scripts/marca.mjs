// Gera os ícones do app e a imagem de compartilhamento (prévia do link) a partir da marca.
// Uso: node scripts/marca.mjs   (precisa do Playwright instalado; os arquivos vão para public/)
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const raiz = fileURLToPath(new URL('..', import.meta.url))
const fonte = (p) => `data:font/woff2;base64,${readFileSync(`${raiz}node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-${p}-normal.woff2`).toString('base64')}`

export const COR = { verde: '#14463a', fundo: '#0f3a30', menta: '#4fae93', tinta: '#ffffff', papel: '#f4f6f3' }

// Monograma: duas barras unidas (as duas partes de um processo) e o ponto de encontro.
const glifo = (s, x = 0, y = 0) => `
  <g transform="translate(${x} ${y}) scale(${s / 32})">
    <path d="M10 8v16M22 8v16M10 16h12" stroke="${COR.tinta}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <circle cx="16" cy="16" r="2.4" fill="${COR.menta}"/>
  </g>`

const icone = (lado, { cheio = false, margem = 0 } = {}) => {
  const r = cheio ? 0 : lado * 0.22
  const g = lado * (1 - 2 * margem)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">
    <rect width="${lado}" height="${lado}" rx="${r}" fill="${COR.verde}"/>${glifo(g, lado * margem, lado * margem)}</svg>`
}

const og = `<!doctype html><html><head><style>
  @font-face { font-family: Plex; font-weight: 600; src: url(${fonte(600)}) format('woff2'); }
  @font-face { font-family: Plex; font-weight: 700; src: url(${fonte(700)}) format('woff2'); }
  html, body { margin: 0; width: 1200px; height: 630px; }
  body { background: ${COR.fundo}; color: ${COR.tinta}; font-family: Plex, sans-serif; position: relative; overflow: hidden; }
  .grade { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px); background-size: 100% 42px; }
  .faixa { position: absolute; left: 0; top: 0; bottom: 0; width: 14px; background: ${COR.menta}; }
  .conteudo { position: absolute; left: 96px; top: 92px; right: 96px; }
  .marca { display: flex; align-items: center; gap: 28px; }
  .nome { font-size: 112px; font-weight: 700; letter-spacing: -0.02em; line-height: 1; }
  h1 { margin: 64px 0 0; font-size: 50px; font-weight: 600; line-height: 1.2; max-width: 900px; letter-spacing: -0.01em; }
  p { margin: 28px 0 0; font-size: 30px; font-weight: 600; color: ${COR.menta}; }
</style></head><body><div class="grade"></div><div class="faixa"></div>
  <div class="conteudo">
    <div class="marca">${icone(120).replace('<svg ', '<svg style="display:block;box-shadow:0 0 0 2px rgba(255,255,255,.18);border-radius:26px" ')}<span class="nome">HiAdv</span></div>
    <h1>Casos, prazos e equipe do escritório num só lugar.</h1>
    <p>hiadv.com.br</p>
  </div></body></html>`

const b = await chromium.launch()
async function png(html, w, h, arquivo, transparente = false) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  await p.setContent(html.startsWith('<svg') ? `<html><body style="margin:0;background:transparent">${html}</body></html>` : html)
  await p.evaluate(() => document.fonts.ready)
  await p.screenshot({ path: `${raiz}public/${arquivo}`, omitBackground: transparente, clip: { x: 0, y: 0, width: w, height: h } })
  await p.close()
}
await png(icone(512), 512, 512, 'icons/icon-512.png', true)
await png(icone(192), 192, 192, 'icons/icon-192.png', true)
await png(icone(48), 48, 48, 'icons/favicon-48.png', true)
await png(icone(512, { cheio: true, margem: 0.12 }), 512, 512, 'icons/maskable-512.png')
await png(icone(180, { cheio: true, margem: 0.06 }), 180, 180, 'icons/apple-touch-icon.png')
await png(og, 1200, 630, 'og-hiadv.png')
await b.close()
console.log('ok')
