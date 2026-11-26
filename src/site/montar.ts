/** Comportamento do site de apresentação (hiadv.com.br). Sem framework: a página já vem pronta no HTML. */

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

/** Quem já entrou no sistema neste aparelho vê "Abrir o HiAdv" em vez de "Entrar". */
export function temSessao(storage: Pick<Storage, 'length' | 'key'>): boolean {
  try {
    for (let i = 0; i < storage.length; i++) if (/^sb-.*-auth-token$/.test(storage.key(i) ?? '')) return true
  } catch { /* navegação privada */ }
  return false
}

/** Código de indicação que chegou no endereço do site (?ref=) segue para o questionário. */
export function linkAderir(busca: string): string {
  const ref = new URLSearchParams(busca).get('ref')?.trim().toUpperCase() ?? ''
  return /^[A-Z2-9]{7}$/.test(ref) ? `/aderir?ref=${ref}` : '/aderir'
}

export function montarSite(doc: Document, win: Window) {
  // Acesso e adesão
  const aderir = linkAderir(win.location.search)
  doc.querySelectorAll<HTMLAnchorElement>('[data-aderir]').forEach((a) => { a.href = aderir })
  let logado = false
  try { logado = temSessao(win.localStorage) } catch { /* sem acesso ao armazenamento */ }
  if (logado) {
    doc.querySelectorAll<HTMLAnchorElement>('[data-entrar]').forEach((a) => {
      a.href = '/seu-dia'
      if (a.textContent?.trim() === 'Entrar') a.textContent = 'Abrir o HiAdv'
    })
  }

  if (logado) doc.querySelectorAll<HTMLElement>('[data-abrir-titulo]').forEach((t) => { t.textContent = 'Abrir o HiAdv' })
  montarGuiaInstalar(doc, win)
  avisoCookies(doc, win)
  montarTour(doc)
  montarTour(doc, '.sv-exp-lista', 'exp-img', 'painel-exp')
  montarAreas(doc)
  montarVideo(doc, win)
  montarGaleria(doc)
  montarInstalar(doc, win)

  // Deixa o aplicativo pronto para abrir rápido (e instalável) depois que a página termina de carregar.
  if ('serviceWorker' in win.navigator && win.location.protocol === 'https:') {
    win.addEventListener('load', () => { setTimeout(() => { win.navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {}) }, 2500) })
  }
}

function montarTour(doc: Document, lista = '.sv-tour-lista', imgId = 'tour-img', painelId = 'painel-tour') {
  const abas = Array.from(doc.querySelectorAll<HTMLButtonElement>(`${lista} [role="tab"]`))
  const img = doc.getElementById(imgId) as HTMLImageElement | null
  const painel = doc.getElementById(painelId)
  if (!abas.length || !img || !painel) return
  const escolher = (aba: HTMLButtonElement, focar: boolean) => {
    for (const a of abas) { const sel = a === aba; a.setAttribute('aria-selected', String(sel)); a.tabIndex = sel ? 0 : -1 }
    img.src = aba.dataset.tela ?? img.src
    img.alt = aba.dataset.alt ?? ''
    // prévia: o botão abre a mesma tela no escritório fictício e o texto diz o que testar
    const abrir = painel.querySelector<HTMLAnchorElement>('[data-exp-abrir]')
    if (abrir && aba.dataset.rota) abrir.href = `/experimentar?ir=${encodeURIComponent(aba.dataset.rota)}`
    const tente = painel.querySelector('[data-exp-tente]')
    if (tente && aba.dataset.tente) tente.textContent = aba.dataset.tente
    painel.setAttribute('aria-labelledby', aba.id)
    if (focar) aba.focus()
    // no celular a tela fica acima da lista: mostra a troca
    else if (painel.getBoundingClientRect().bottom < 80 || painel.getBoundingClientRect().top < 0) painel.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  abas.forEach((aba, i) => {
    aba.addEventListener('click', () => escolher(aba, false))
    aba.addEventListener('keydown', (e) => {
      const ir = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]
      if (ir) { e.preventDefault(); escolher(abas[(i + ir + abas.length) % abas.length], true) }
      else if (e.key === 'Home') { e.preventDefault(); escolher(abas[0], true) }
      else if (e.key === 'End') { e.preventDefault(); escolher(abas[abas.length - 1], true) }
    })
  })
  // baixa as outras telas quando o navegador estiver livre, para a troca ser instantânea
  const pre = () => abas.forEach((a) => { if (a.dataset.tela) new Image().src = a.dataset.tela })
  ;('requestIdleCallback' in window ? (window as Window & { requestIdleCallback: (f: () => void) => void }).requestIdleCallback : (f: () => void) => setTimeout(f, 3000))(pre)
}

/** Abas das áreas de atuação: mostra um painel por vez (no HTML estão todos, para a busca do Google). */
function montarAreas(doc: Document) {
  const abas = Array.from(doc.querySelectorAll<HTMLButtonElement>('.sv-areas-abas [role="tab"]'))
  if (!abas.length) return
  const escolher = (aba: HTMLButtonElement, focar: boolean) => {
    for (const a of abas) {
      const sel = a === aba
      a.setAttribute('aria-selected', String(sel)); a.tabIndex = sel ? 0 : -1
      const painel = doc.getElementById(a.getAttribute('aria-controls') ?? '')
      if (painel) painel.hidden = !sel
    }
    if (focar) aba.focus()
  }
  abas.forEach((aba, i) => {
    aba.addEventListener('click', () => escolher(aba, false))
    aba.addEventListener('keydown', (e) => {
      const ir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
      if (ir) { e.preventDefault(); escolher(abas[(i + ir + abas.length) % abas.length], true) }
      else if (e.key === 'Home') { e.preventDefault(); escolher(abas[0], true) }
      else if (e.key === 'End') { e.preventDefault(); escolher(abas[abas.length - 1], true) }
    })
  })
}

function montarVideo(doc: Document, win: Window) {
  const dlg = doc.getElementById('dialogo-video') as HTMLDialogElement | null
  const v = doc.getElementById('video-apresentacao') as HTMLVideoElement | null
  const abrir = doc.getElementById('abrir-video')
  if (!dlg || !v || !abrir) return
  abrir.addEventListener('click', () => {
    if (!v.src) {
      const vertical = win.matchMedia('(max-width: 700px) and (orientation: portrait)').matches
      if (vertical && v.dataset.capaV) v.poster = v.dataset.capaV
      v.src = (vertical ? v.dataset.v : v.dataset.h) ?? ''
    }
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '')
    v.play().catch(() => { /* o usuário aperta o play */ })
  })
  const fechar = () => { v.pause(); if (dlg.open) dlg.close() }
  doc.getElementById('fechar-video')?.addEventListener('click', fechar)
  dlg.addEventListener('close', () => v.pause())
  dlg.addEventListener('click', (e) => { if (e.target === dlg) fechar() })
}

export function montarGaleria(doc: Document) {
  const dlg = doc.getElementById('dialogo-tela') as HTMLDialogElement | null
  const img = doc.getElementById('tela-grande') as HTMLImageElement | null
  const titulo = doc.getElementById('t-ampliar')
  if (!dlg || !img || !titulo) return
  let origem: HTMLElement | null = null
  doc.querySelectorAll<HTMLButtonElement>('[data-ampliar]').forEach((b) => {
    b.addEventListener('click', () => {
      const nome = b.closest('li')?.querySelector('h4')?.textContent?.trim() ?? 'Tela do HiAdv'
      img.src = b.dataset.ampliar ?? ''
      img.alt = `Tela ${nome} do HiAdv em tamanho grande`
      titulo.textContent = nome
      origem = b
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '')
    })
  })
  const fechar = () => { if (dlg.open) dlg.close(); else dlg.removeAttribute('open') }
  doc.getElementById('fechar-tela')?.addEventListener('click', fechar)
  dlg.addEventListener('click', (e) => { if (e.target === dlg) fechar() })
  dlg.addEventListener('close', () => { origem?.focus() })
}

function montarInstalar(doc: Document, win: Window) {
  const botoes = Array.from(doc.querySelectorAll<HTMLButtonElement>('[data-instalar]'))
  const instalado = win.matchMedia('(display-mode: standalone)').matches
  if (instalado) { doc.querySelector<HTMLElement>('[data-instalado]')?.removeAttribute('hidden'); return }
  let pedido: EventoInstalar | null = null
  win.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    pedido = e as EventoInstalar
    botoes.forEach((b) => b.removeAttribute('hidden'))
  })
  botoes.forEach((b) => b.addEventListener('click', async () => {
    if (!pedido) return
    await pedido.prompt()
    const r = await pedido.userChoice
    pedido = null
    botoes.forEach((x) => x.setAttribute('hidden', ''))
    if (r.outcome === 'accepted') doc.querySelector<HTMLElement>('[data-instalado]')?.removeAttribute('hidden')
  }))
  win.addEventListener('appinstalled', () => { botoes.forEach((x) => x.setAttribute('hidden', '')); doc.querySelector<HTMLElement>('[data-instalado]')?.removeAttribute('hidden') })
}

export type Aparelho = 'ios' | 'android' | 'pc'
/** Qual passo a passo mostrar. iPad novo se apresenta como Mac, por isso o toque também conta. */
export function aparelho(ua: string, toques = 0): Aparelho {
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && toques > 1)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'pc'
}

/** "Instalar o app": usa o pedido nativo quando o navegador oferece; senão abre o passo a passo do aparelho. */
function montarGuiaInstalar(doc: Document, win: Window) {
  const botoes = Array.from(doc.querySelectorAll<HTMLButtonElement>('[data-instalar-guia]'))
  const dialogo = doc.getElementById('dialogo-instalar') as HTMLDialogElement | null
  if (!botoes.length) return
  if (win.matchMedia?.('(display-mode: standalone)').matches) {
    doc.querySelectorAll<HTMLElement>('[data-instalar-texto]').forEach((t) => { t.textContent = 'Já está instalado neste aparelho.' })
  }
  let pedido: EventoInstalar | null = null
  win.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pedido = e as EventoInstalar })
  const qual = aparelho(win.navigator.userAgent, win.navigator.maxTouchPoints ?? 0)
  dialogo?.querySelectorAll<HTMLElement>('[data-so]').forEach((p) => { p.hidden = p.dataset.so !== qual })
  botoes.forEach((b) => b.addEventListener('click', async () => {
    if (pedido) { const p = pedido; pedido = null; await p.prompt(); return }
    if (dialogo?.showModal) dialogo.showModal(); else dialogo?.setAttribute('open', '')
  }))
  dialogo?.querySelector('[data-fechar-instalar]')?.addEventListener('click', () => dialogo.close?.())
  dialogo?.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close?.() })
}

/** Aviso de cookies: o HiAdv só usa armazenamento essencial (sem rastreamento), então é um aviso, não um pedido de consentimento. */
export function avisoCookies(doc: Document, win: Window) {
  let visto = false
  try { visto = win.localStorage.getItem('hiadv-aviso-cookies') === '1' } catch { return }
  if (visto) return
  const caixa = doc.createElement('div')
  caixa.className = 'sv-cookies'
  caixa.setAttribute('role', 'region')
  caixa.setAttribute('aria-label', 'Aviso de cookies')
  caixa.innerHTML = '<p>Usamos só o armazenamento essencial para o site e o sistema funcionarem. Nada de rastreamento ou publicidade. <a href="/privacidade/#pp-10">Saiba mais</a></p><button type="button" class="sv-btn sv-btn-vinho">Entendi</button>'
  caixa.querySelector('button')!.addEventListener('click', () => { try { win.localStorage.setItem('hiadv-aviso-cookies', '1') } catch { /* sem armazenamento */ } caixa.remove() })
  doc.body.appendChild(caixa)
}
