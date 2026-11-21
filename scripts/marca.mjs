// Gera os ícones do app e a imagem de compartilhamento (prévia do link) a partir da marca.
// Uso: node scripts/marca.mjs   (precisa do Playwright instalado; os arquivos vão para public/)
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const raiz = fileURLToPath(new URL('..', import.meta.url))
const fonte = (fam, p) => `data:font/woff2;base64,${readFileSync(`${raiz}node_modules/@fontsource/${fam}/files/${fam}-latin-${p}-normal.woff2`).toString('base64')}`

export const COR = { vinho: '#7a1f33', fundo: '#5c1626', rose: '#f0b7c2', tinta: '#ffffff', papel: '#f8f5f2', linho: '#f2e8e5' }

// Monograma "Hi": a perna direita do H vira um i, com o ponto rosé.
const glifo = (s, x = 0, y = 0) => `
  <g transform="translate(${x} ${y}) scale(${s / 32})">
    <path d="M10 7.5v17M22 13.5v11M10 16h12" stroke="${COR.tinta}" stroke-width="3" stroke-linecap="round" fill="none"/>
    <circle cx="22" cy="8" r="2.1" fill="${COR.rose}"/>
  </g>`

const icone = (lado, { cheio = false, margem = 0 } = {}) => {
  const r = cheio ? 0 : lado * 0.22
  const g = lado * (1 - 2 * margem)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">
    <rect width="${lado}" height="${lado}" rx="${r}" fill="${COR.vinho}"/>${glifo(g, lado * margem, lado * margem)}</svg>`
}

const og = `<!doctype html><html><head><style>
  @font-face { font-family: Marca; font-weight: 600; src: url(${fonte('source-serif-4', 600)}) format('woff2'); }
  @font-face { font-family: Texto; font-weight: 500; src: url(${fonte('inter-tight', 500)}) format('woff2'); }
  @font-face { font-family: Texto; font-weight: 600; src: url(${fonte('inter-tight', 600)}) format('woff2'); }
  html, body { margin: 0; width: 1200px; height: 630px; }
  body { background: ${COR.vinho}; color: ${COR.tinta}; font-family: Texto, sans-serif; position: relative; overflow: hidden; }
  .papel { position: absolute; right: 0; top: 0; bottom: 0; width: 18px; background: ${COR.rose}; }
  .conteudo { position: absolute; left: 96px; top: 96px; right: 120px; }
  .marca { display: flex; align-items: center; gap: 30px; }
  .nome { font-family: Marca; font-size: 120px; font-weight: 600; letter-spacing: -0.015em; line-height: 1; }
  h1 { margin: 76px 0 0; font-size: 50px; font-weight: 600; line-height: 1.15; letter-spacing: -0.015em; max-width: 1010px; }
  p { margin: 22px 0 0; font-size: 28px; font-weight: 500; color: ${COR.linho}; opacity: .85; }
  .url { position: absolute; left: 96px; bottom: 60px; font-size: 26px; font-weight: 600; color: ${COR.rose}; }
</style></head><body><div class="papel"></div>
  <div class="conteudo">
    <div class="marca">${icone(128).replace('<svg ', '<svg style="display:block;box-shadow:0 0 0 2px rgba(255,255,255,.22);border-radius:28px" ')}<span class="nome">HiAdv</span></div>
    <h1>Seus processos, prazos e peças sob controle.</h1>
    <p>Gestão e fluxo jurídico para advogados.</p>
  </div><div class="url">hiadv.com.br</div></body></html>`

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
