// Gera os ícones do app e a imagem de compartilhamento a partir da marca (Identidade D · Pasta).
// Uso: node scripts/marca.mjs   (precisa do Playwright; os arquivos vão para public/)
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const raiz = fileURLToPath(new URL('..', import.meta.url))
const fonte = (p) => `data:font/woff2;base64,${readFileSync(`${raiz}node_modules/@fontsource/public-sans/files/public-sans-latin-${p}-normal.woff2`).toString('base64')}`
export const COR = { fundo: '#0e0e0e', grafite: '#161616', pasta: '#232322', ouro: '#c9a872', texto: '#f2f2f0', apoio: '#a9a9a4' }
const css = `@font-face{font-family:P;font-weight:800;src:url(${fonte(800)}) format('woff2')}@font-face{font-family:P;font-weight:400;src:url(${fonte(400)}) format('woff2')}
html,body{margin:0;background:transparent}body{font-family:P,sans-serif}`

// Pasta ouro com "Hi" dentro: aba no alto à esquerda e corpo com o canto superior esquerdo reto.
// proporções da arte: corpo 160×120, aba 74×22, cantos 10/12
const pasta = (l) => { const h = l * .48, w = h * 1.333
  return `<div style="display:flex;flex-direction:column;margin-top:${h * .183}px"><div style="width:${h * .617}px;height:${h * .183}px;background:${COR.ouro};border-radius:${h * .083}px ${h * .083}px 0 0"></div>
  <div style="width:${w}px;height:${h}px;background:${COR.ouro};border-radius:0 ${h * .1}px ${h * .1}px ${h * .1}px;display:grid;place-items:center;color:${COR.grafite};font-weight:800;font-size:${h * .717}px;letter-spacing:-.05em;line-height:1">Hi</div></div>` }
const icone = (l, { cheio = false } = {}) => `<!doctype html><html><head><style>${css}</style></head><body>
  <div style="width:${l}px;height:${l}px;border-radius:${cheio ? 0 : l * .22}px;background:${COR.fundo};display:grid;place-items:center"><div style="margin-top:-${l * .08}px">${pasta(cheio ? l * .78 : l * 1.05)}</div></div></body></html>`

const og = `<!doctype html><html><head><style>${css}
  body{width:1200px;height:630px;background:${COR.fundo};color:${COR.texto};position:relative;overflow:hidden}
  .c{position:absolute;left:96px;top:92px;right:110px}.m{display:flex;align-items:flex-end;gap:10px;font-weight:800;font-size:118px;line-height:.9;letter-spacing:-.05em}
  h1{margin:70px 0 0;font-size:56px;font-weight:800;line-height:1.08;letter-spacing:-.035em;max-width:980px}
  p{margin:22px 0 0;font-size:28px;color:${COR.apoio}}.u{position:absolute;left:96px;bottom:58px;font-size:26px;font-weight:800;color:${COR.ouro}}
  .f{position:absolute;right:0;top:0;bottom:0;width:16px;background:${COR.ouro}}
</style></head><body><div class="f"></div><div class="c"><div class="m">${pasta(240)}<span>Adv</span></div>
  <h1>Software jurídico para escritórios de advocacia</h1><p>Prazos, publicações, casos, atendimentos e financeiro num só lugar.</p></div><div class="u">hiadv.com.br</div></body></html>`

const b = await chromium.launch()
async function png(html, w, h, arquivo, transparente = false) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  await p.setContent(html); await p.evaluate(() => document.fonts.ready)
  await p.screenshot({ path: `${raiz}public/${arquivo}`, omitBackground: transparente, clip: { x: 0, y: 0, width: w, height: h } })
  await p.close()
}
await png(icone(512), 512, 512, 'icons/icon-512.png', true)
await png(icone(192), 192, 192, 'icons/icon-192.png', true)
await png(icone(48), 48, 48, 'icons/favicon-48.png', true)
await png(icone(512, { cheio: true }), 512, 512, 'icons/maskable-512.png')
await png(icone(180, { cheio: true }), 180, 180, 'icons/apple-touch-icon.png')
await png(og, 1200, 630, 'og-hiadv.png')
await b.close()
console.log('ok')
