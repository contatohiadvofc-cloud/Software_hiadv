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

  montarTour(doc)
  montarVideo(doc, win)
  montarInstalar(doc, win)

  // Deixa o aplicativo pronto para abrir rápido (e instalável) depois que a página termina de carregar.
  if ('serviceWorker' in win.navigator && win.location.protocol === 'https:') {
    win.addEventListener('load', () => { setTimeout(() => { win.navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {}) }, 2500) })
  }
}

function montarTour(doc: Document) {
  const abas = Array.from(doc.querySelectorAll<HTMLButtonElement>('.sv-tour-lista [role="tab"]'))
  const img = doc.getElementById('tour-img') as HTMLImageElement | null
  const painel = doc.getElementById('painel-tour')
  if (!abas.length || !img || !painel) return
  const escolher = (aba: HTMLButtonElement, focar: boolean) => {
    for (const a of abas) { const sel = a === aba; a.setAttribute('aria-selected', String(sel)); a.tabIndex = sel ? 0 : -1 }
    img.src = aba.dataset.tela ?? img.src
    img.alt = aba.dataset.alt ?? ''
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
