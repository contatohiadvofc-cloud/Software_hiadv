// Gera no index.html (entre os marcadores manual:inicio e manual:fim) a seção do site com telas explicadas do manual.
// Rodar: npx tsx scripts/manual-site.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { MANUAL } from '../src/data/manual'
import { posicaoNumero } from '../src/routes/manualFigura'
const POS = JSON.parse(readFileSync('src/data/manualPosicoes.json', 'utf8'))
const W = 1280, H = 800
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const ids = ['hoje', 'casos', 'publicacoes']
const figuras = ids.map((id) => {
  const p = MANUAL.find((x) => x.id === id)!
  const g = p.marcadores.map((k) => {
    const c = POS[id].m[String(k.n)]; if (!c) return ''
    const x = (c.x / 100) * W, y = (c.y / 100) * H, w = (c.w / 100) * W, h = (c.h / 100) * H
    const { bx, by } = posicaoNumero(c)
    const ax = bx < x ? x + 6 : x + w - 6, ay = by < y ? y + 6 : y + Math.min(h, 40)
    return `<g><rect x="${(x - 3).toFixed(0)}" y="${(y - 3).toFixed(0)}" width="${(w + 6).toFixed(0)}" height="${(h + 6).toFixed(0)}" rx="10" class="man-caixa"/><line x1="${bx.toFixed(0)}" y1="${by.toFixed(0)}" x2="${ax.toFixed(0)}" y2="${ay.toFixed(0)}" class="man-linha" marker-end="url(#sv-ponta)"/><circle cx="${bx.toFixed(0)}" cy="${by.toFixed(0)}" r="17" class="man-bola"/><text x="${bx.toFixed(0)}" y="${(by + 6).toFixed(0)}" text-anchor="middle" class="man-num">${k.n}</text></g>`
  }).join('')
  return `            <figure class="sv-man">
              <h3>${esc(p.titulo)}</h3>
              <p>${esc(p.paraQue)}</p>
              <div class="man-quadro"><img src="/manual/${id}.jpg" alt="" width="1280" height="800" loading="lazy"><svg viewBox="0 0 1280 800" aria-hidden="true" class="man-setas">${g}</svg></div>
              <figcaption><ol class="man-legenda">${p.marcadores.map((k) => `<li value="${k.n}"><span class="man-legenda-n" aria-hidden="true">${k.n}</span>${esc(k.texto)}</li>`).join('')}</ol></figcaption>
            </figure>`
}).join('\n')
const secao = `<!-- manual:inicio (gerado por scripts/manual-site.ts) -->
      <section class="sv-secao" id="como-funciona" aria-labelledby="t-por-dentro">
        <div class="sv-largura">
          <h2 id="t-por-dentro">Veja como funciona por dentro</h2>
          <p class="sv-intro">Estas são telas do HiAdv com um escritório fictício. Os números mostram o que cada parte faz. Quem usa o HiAdv tem o manual completo em Configurações, com todas as áreas explicadas assim.</p>
          <svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs><marker id="sv-ponta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" class="man-ponta"/></marker></defs></svg>
          <div class="sv-mans">
${figuras}
          </div>
        </div>
      </section>
      <!-- manual:fim -->`
let html = readFileSync('index.html', 'utf8')
if (html.includes('<!-- manual:inicio')) html = html.replace(/<!-- manual:inicio[\s\S]*?<!-- manual:fim -->/, secao)
else html = html.replace('      <section class="sv-secao sv-secao-clara" id="sara"', secao + '\n\n      <section class="sv-secao sv-secao-clara" id="sara"')
writeFileSync('index.html', html)
console.log('seção do manual no site atualizada')
