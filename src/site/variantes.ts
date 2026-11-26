/**
 * Versões do site interativo para comparação (prévia): A (noite com luz), B (papel e caneta), C (linha do processo).
 * Escolha por ?v=a|b|c ou pelo seletor flutuante. Cada versão só liga os próprios efeitos.
 * Tudo respeita "reduzir movimento".
 */
type Win = Window & typeof globalThis
export type Variante = 'a' | 'b' | 'c' | '1' | '2' | '3' | '4' | '5' | '6' | '7'

const limitar = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))

/** Lê a versão pedida na URL; qualquer outro valor cai na A. */
export function lerVariante(busca: string): Variante {
  const v = new URLSearchParams(busca).get('v')?.toLowerCase()
  return v && ['b', 'c', '1', '2', '3', '4', '5', '6', '7'].includes(v) ? v as Variante : 'a'
}

/** Texto embaralhado que vai se acertando da esquerda para a direita (p de 0 a 1). */
export function embaralhar(alvo: string, p: number, sorteio: () => number = Math.random): string {
  const sinais = '§¶†#/\\=+*0123456789'
  const certas = Math.floor(limitar(p) * alvo.length)
  return [...alvo].map((ch, i) => (i < certas || ch === ' ' ? ch : sinais[Math.floor(sorteio() * sinais.length)])).join('')
}

const NOMES: Record<Variante, string> = { '1': 'Abertura de cinema', '2': 'Palavra-janela', '3': 'Travessia horizontal', '4': 'Pilha de telas', '5': 'Galeria 3D', '6': 'Manifesto', '7': 'A balança', a: 'Noite', b: 'Papel', c: 'Linha do processo' }

export function montarVariantes(doc: Document, win: Win): Variante {
  const v = lerVariante(win.location.search)
  doc.documentElement.dataset.variante = v
  const reduzir = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const fino = win.matchMedia?.('(pointer: fine)').matches ?? false

  // Seletor flutuante de versões
  const nav = doc.createElement('nav')
  nav.className = 'vr-seletor'; nav.setAttribute('aria-label', 'Versões do site')
  nav.innerHTML = `<span>Versão</span>${(['7', '1', '2', '3', '4', '5', '6', 'a', 'b', 'c'] as Variante[]).map((k) =>
    `<a href="?v=${k}"${k === v ? ' aria-current="page"' : ''} title="${NOMES[k]}" class="${/\d/.test(k) ? 'vr-cinema' : 'vr-antiga'}">${k.toUpperCase()}<small>${NOMES[k]}</small></a>`).join('')}`
  doc.body.append(nav)

  if (/\d/.test(v)) void import('./cinema').then((c) => c.montarCinema(doc, win, v as '1'))
  if (v === 'b') montarPapel(doc, win, reduzir, fino)
  if (v === 'c') montarLinha(doc, win, reduzir, fino)
  return v
}

/* ───────── B · Papel e caneta ───────── */
function montarPapel(doc: Document, win: Win, reduzir: boolean, fino: boolean) {
  const heroi = doc.querySelector<HTMLElement>('[data-heroi-fx]')
  // Folhas dos autos que se abrem em leque ao rolar
  if (heroi) {
    const pilha = doc.createElement('div'); pilha.className = 'vr-folhas'; pilha.setAttribute('aria-hidden', 'true')
    const folhas = [
      ['Petição inicial', 'Auxílio-acidente · protocolada'],
      ['Laudo pericial', 'Manifestar até 05/12'],
      ['Publicação', 'TRF4 · intimação lida'],
      ['Meu Processo', 'Cliente avisado no dia 15'],
    ]
    folhas.forEach(([t, s], i) => {
      const f = doc.createElement('div'); f.className = 'vr-folha'; f.style.setProperty('--i', String(i))
      f.innerHTML = `<b>${t}</b><span>${s}</span><i></i><i></i><i></i>`; pilha.append(f)
    })
    heroi.append(pilha)
    const abrir = () => heroi.style.setProperty('--vr-leque', reduzir ? '1' : limitar(0.35 + -heroi.getBoundingClientRect().top / (win.innerHeight * 0.7)).toFixed(3))
    win.addEventListener('scroll', abrir, { passive: true }); abrir()
  }
  // Marca-texto: as palavras do título se grifam quando o cursor passa (ou sozinhas, no celular)
  const titulo = heroi?.querySelector<HTMLElement>('h1')
  if (titulo) {
    const texto = titulo.textContent ?? ''
    titulo.setAttribute('aria-label', texto)
    titulo.innerHTML = texto.split(' ').map((p) => `<span class="vr-grifo" aria-hidden="true">${p}</span>`).join(' ')
    const grifos = [...titulo.querySelectorAll<HTMLElement>('.vr-grifo')]
    if (reduzir || !fino) grifos.forEach((g, i) => win.setTimeout(() => g.classList.add('vr-grifado'), reduzir ? 0 : 400 + i * 160))
    else grifos.forEach((g) => g.addEventListener('pointerenter', () => g.classList.add('vr-grifado')))
  }
  // Sublinhado à caneta que se desenha sob cada título de seção
  const io = 'IntersectionObserver' in win ? new win.IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('vr-assinado'); io?.unobserve(e.target) }
  }), { rootMargin: '0px 0px -20% 0px' }) : null
  doc.querySelectorAll<HTMLElement>('main h2:not(.sr-only):not(.mv-rotulo)').forEach((h) => {
    h.insertAdjacentHTML('beforeend', '<svg class="vr-caneta" viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden="true"><path d="M2 9C60 4 120 12 180 7s90-3 116 1"/></svg>')
    if (reduzir || !io) h.classList.add('vr-assinado'); else io.observe(h)
  })
}

/* ───────── C · Linha do processo ───────── */
function montarLinha(doc: Document, win: Win, reduzir: boolean, fino: boolean) {
  // Trilho lateral com um marco por seção; enche conforme a rolagem
  const secoes = [...doc.querySelectorAll<HTMLElement>('main > section[aria-labelledby]')]
    .filter((s) => { const h = doc.getElementById(s.getAttribute('aria-labelledby') ?? ''); return h && !h.classList.contains('sr-only') })
  const trilho = doc.createElement('nav'); trilho.className = 'vr-trilho'; trilho.setAttribute('aria-label', 'Seções da página')
  trilho.innerHTML = '<i class="vr-enchido"></i>' + secoes.map((s) => {
    const h = doc.getElementById(s.getAttribute('aria-labelledby')!)!
    return `<a href="#${s.id || h.id}"><span>${(h.textContent ?? '').replace(/^\+\s*/, '')}</span></a>`
  }).join('')
  doc.body.append(trilho)
  const marcos = [...trilho.querySelectorAll<HTMLElement>('a')]
  const atualizar = () => {
    const max = doc.documentElement.scrollHeight - win.innerHeight
    trilho.style.setProperty('--vr-p', limitar(win.scrollY / (max || 1)).toFixed(3))
    let ativo = 0
    secoes.forEach((s, i) => { if (s.getBoundingClientRect().top < win.innerHeight * 0.45) ativo = i })
    marcos.forEach((m, i) => { m.classList.toggle('vr-passou', i <= ativo); if (i === ativo) m.setAttribute('aria-current', 'step'); else m.removeAttribute('aria-current') })
  }
  win.addEventListener('scroll', atualizar, { passive: true }); win.addEventListener('resize', atualizar); atualizar()

  // Títulos que se "decodificam" ao entrar na tela
  const titulos = [...doc.querySelectorAll<HTMLElement>('main h2:not(.sr-only):not(.mv-rotulo), [data-heroi-fx] h1')]
  if (!reduzir && 'IntersectionObserver' in win) {
    const io = new win.IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return
      io.unobserve(e.target)
      const el = e.target as HTMLElement; const alvo = el.dataset.vrTexto ?? ''; const t0 = win.performance.now()
      const passo = (t: number) => { const p = (t - t0) / 900; el.lastElementChild!.textContent = embaralhar(alvo, p); if (p < 1) win.requestAnimationFrame(passo) }
      win.requestAnimationFrame(passo)
    }), { rootMargin: '0px 0px -10% 0px' })
    titulos.forEach((el) => {
      const alvo = el.textContent ?? ''
      el.dataset.vrTexto = alvo; el.setAttribute('aria-label', alvo)
      el.innerHTML = `<span class="sr-only">${alvo}</span><span aria-hidden="true">${alvo}</span>`
      io.observe(el)
    })
  }

  // Herói: grade de pontos que cresce perto do cursor (canvas)
  const heroi = doc.querySelector<HTMLElement>('[data-heroi-fx]')
  if (!heroi || reduzir) return
  const cv = doc.createElement('canvas'); cv.className = 'vr-pontos'; cv.setAttribute('aria-hidden', 'true')
  heroi.prepend(cv)
  const ctx = cv.getContext('2d'); if (!ctx) return
  let w = 0, h = 0, mx = -999, my = -999, t = 0
  const dpr = Math.min(2, win.devicePixelRatio || 1)
  const medir = () => { w = heroi.clientWidth; h = heroi.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0) }
  medir(); win.addEventListener('resize', medir)
  if (fino) heroi.addEventListener('pointermove', (e) => { const r = heroi.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top })
  heroi.addEventListener('pointerleave', () => { mx = my = -999 })
  let visivel = true
  if ('IntersectionObserver' in win) new win.IntersectionObserver(([e]) => { visivel = e.isIntersecting }).observe(heroi)
  const passo = 28
  const quadro = () => {
    t += 0.012
    if (visivel) {
      ctx.clearRect(0, 0, w, h)
      // sem cursor (celular), uma "onda" passa pela grade
      const ox = mx > -999 ? mx : (Math.sin(t) * 0.5 + 0.5) * w, oy = my > -999 ? my : h * 0.45
      for (let y = passo / 2; y < h; y += passo) for (let x = passo / 2; x < w; x += passo) {
        const d = Math.hypot(x - ox, y - oy); const k = Math.max(0, 1 - d / 220)
        ctx.fillStyle = `rgba(122,162,255,${(0.12 + k * 0.7).toFixed(3)})`
        ctx.beginPath(); ctx.arc(x, y, 1 + k * 2.6, 0, Math.PI * 2); ctx.fill()
      }
    }
    win.requestAnimationFrame(quadro)
  }
  win.requestAnimationFrame(quadro)
}
