// Gera a seção "Experimente" do site a partir do roteiro da prévia (src/previa/previa.ts), para o site e a prévia nunca divergirem.
// Rodar: npx tsx scripts/experimentar-site.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { ROTEIRO } from '../src/previa/previa'

const TELA: Record<string, string> = { '/seu-dia': 'tela-seu-dia', '/atendimentos': 'tela-atendimentos', '/areas': 'tela-quadro', '/clientes': 'tela-cliente', '/publicacoes': 'tela-publicacoes', '/agenda': 'tela-agenda', '/financeiro': 'tela-financeiro', '/relatorios': 'tela-relatorios', '/integracoes': 'tela-integracoes' }
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const p0 = ROTEIRO[0]!
const abas = ROTEIRO.map((p, i) => `              <button type="button" role="tab" id="exp-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" aria-controls="painel-exp" data-tela="/site/${TELA[p.rota]}.webp" data-alt="Tela ${esc(p.titulo)} do HiAdv na prévia" data-rota="${p.rota}" data-tente="${esc(p.tente)}"><span class="sv-exp-n" aria-hidden="true">${i + 1}</span><span><strong>${esc(p.titulo)}</strong> <small>${p.plano}</small><span>${esc(p.texto)}</span></span></button>`).join('\n')
const html = `<!-- experimentar:inicio -->
      <section class="sv-secao" id="experimentar" aria-labelledby="t-exp">
        <div class="sv-largura">
          <h2 id="t-exp">Experimente antes de decidir</h2>
          <p class="sv-intro">A prévia abre um escritório fictício completo, com clientes, casos, prazos e honorários de exemplo. São 20 minutos, sem cadastro, e nada do que você fizer fica salvo. As telas abaixo são as mesmas que você vai encontrar lá.</p>
          <div class="sv-exp">
            <div class="sv-exp-lista" role="tablist" aria-label="Roteiro da prévia" aria-orientation="vertical">
${abas}
            </div>
            <div class="sv-exp-tela" id="painel-exp" role="tabpanel" aria-labelledby="exp-0" tabindex="0">
              <div class="sv-janela"><div class="sv-janela-barra"><i></i><i></i><i></i></div><img id="exp-img" src="/site/${TELA[p0.rota]}.webp" width="1280" height="800" alt="Tela ${esc(p0.titulo)} do HiAdv na prévia" loading="lazy" decoding="async" /></div>
              <div class="sv-exp-acao"><p><strong>Experimente:</strong> <span data-exp-tente>${esc(p0.tente)}</span></p><a class="sv-btn sv-btn-vinho" data-exp-abrir href="/experimentar?ir=${encodeURIComponent(p0.rota)}">Abrir esta tela na prévia</a></div>
            </div>
          </div>
        </div>
      </section>
      <!-- experimentar:fim -->`
const f = 'index.html'
let s = readFileSync(f, 'utf8')
if (s.includes('<!-- experimentar:inicio -->')) s = s.replace(/<!-- experimentar:inicio -->[\s\S]*?<!-- experimentar:fim -->/, html)
else s = s.replace('      <section class="sv-secao sv-secao-escura" aria-labelledby="t-dif">', `      ${html}\n\n      <section class="sv-secao sv-secao-escura" aria-labelledby="t-dif">`)
writeFileSync(f, s)
console.log('seção Experimente atualizada:', ROTEIRO.length, 'paradas')
