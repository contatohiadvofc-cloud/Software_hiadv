/**
 * Movimento do site: efeitos guiados pela rolagem e pelo cursor, sem bibliotecas.
 * Tudo respeita "reduzir movimento" (mostra o estado final) e funciona no celular.
 */
type Win = Window & typeof globalThis

const limitar = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const suave = (t: number) => t * t * (3 - 2 * t)

/** Progresso (0 a 1) de um bloco fixo: 0 quando o topo encosta no topo da tela, 1 quando o fim chega ao fim. */
export function progressoFixo(topo: number, altura: number, janela: number): number {
  const curso = altura - janela
  return curso <= 0 ? 1 : limitar(-topo / curso)
}

/** Quantas palavras já acenderam, conforme o texto atravessa a tela. */
export function palavrasAcesas(topo: number, altura: number, janela: number, total: number): number {
  const ini = janela * 0.85, fim = janela * 0.35 - altura * 0.4
  return Math.round(limitar((ini - topo) / (ini - fim)) * total)
}

/** Etapa ativa numa lista fixa com n etapas. */
export function etapaAtiva(progresso: number, n: number): number {
  return Math.min(n - 1, Math.floor(progresso * n))
}

export function montarMovimento(doc: Document, win: Win) {
  const reduzir = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const fino = win.matchMedia?.('(pointer: fine)').matches ?? false
  doc.documentElement.classList.add(reduzir ? 'mv-parado' : 'mv-ativo')

  // 1. Texto que acende palavra por palavra
  const textos = [...doc.querySelectorAll<HTMLElement>('[data-revelar]')].map((el) => {
    const palavras: HTMLSpanElement[] = []
    const percorrer = (no: Node) => {
      for (const filho of [...no.childNodes]) {
        if (filho.nodeType === 3) {
          const frag = doc.createDocumentFragment()
          for (const parte of (filho.textContent ?? '').split(/(\s+)/)) {
            if (!parte) continue
            if (/^\s+$/.test(parte)) { frag.append(parte); continue }
            const s = doc.createElement('span'); s.className = 'mv-palavra'; s.textContent = parte
            palavras.push(s); frag.append(s)
          }
          filho.replaceWith(frag)
        } else if (filho.nodeType === 1) percorrer(filho)
      }
    }
    percorrer(el)
    el.setAttribute('aria-label', el.textContent ?? '')
    return { el, palavras }
  })

  // 2. Contadores e desenhos em linha que se montam ao aparecer
  const aoAparecer = (sel: string, fn: (el: HTMLElement) => void, margem = '0px 0px -15% 0px') => {
    const els = doc.querySelectorAll<HTMLElement>(sel)
    if (reduzir || !('IntersectionObserver' in win)) { els.forEach((el) => { el.classList.add('mv-visto'); fn(el) }); return }
    const io = new win.IntersectionObserver((entradas) => entradas.forEach((e) => {
      if (!e.isIntersecting) return
      io.unobserve(e.target); (e.target as HTMLElement).classList.add('mv-visto'); fn(e.target as HTMLElement)
    }), { rootMargin: margem })
    els.forEach((el) => io.observe(el))
  }
  aoAparecer('[data-contar]', (el) => {
    const alvo = Number(el.dataset.contar); const pre = el.dataset.prefixo ?? ''; const suf = el.dataset.sufixo ?? ''
    if (reduzir) { el.textContent = pre + alvo + suf; return }
    const t0 = win.performance.now(); const dur = 1400
    const passo = (t: number) => {
      const p = limitar((t - t0) / dur); el.textContent = pre + Math.round(alvo * (1 - Math.pow(1 - p, 3))) + suf
      if (p < 1) win.requestAnimationFrame(passo)
    }
    win.requestAnimationFrame(passo)
  })
  aoAparecer('.mv-surge', () => {})

  // 3. Blocos guiados pela rolagem (caos → ordem e etapas)
  const caos = doc.querySelector<HTMLElement>('[data-caos]')
  const cartoes = caos ? [...caos.querySelectorAll<HTMLElement>('[data-cartao]')].map((c, i) => ({
    c, i,
    x0: Number(c.dataset.x ?? 0), y0: Number(c.dataset.y ?? 0), r0: Number(c.dataset.r ?? 0),
  })) : []
  const etapas = doc.querySelector<HTMLElement>('[data-etapas]')
  const itensEtapa = etapas ? [...etapas.querySelectorAll<HTMLElement>('[data-etapa]')] : []
  const telaEtapa = etapas?.querySelector<HTMLElement>('[data-etapa-tela]')
  const heroi = doc.querySelector<HTMLElement>('[data-heroi-fx]')
  const fichas = heroi ? [...heroi.querySelectorAll<HTMLElement>('[data-ficha]')] : []

  let pedido = 0
  const desenhar = () => {
    pedido = 0
    const h = win.innerHeight
    for (const { el, palavras } of textos) {
      const r = el.getBoundingClientRect()
      const n = reduzir ? palavras.length : palavrasAcesas(r.top, r.height, h, palavras.length)
      palavras.forEach((p, i) => p.classList.toggle('mv-acesa', i < n))
    }
    if (caos) {
      const r = caos.getBoundingClientRect()
      const p = reduzir ? 1 : progressoFixo(r.top, r.height, h)
      caos.style.setProperty('--mv-p', p.toFixed(3))
      for (const k of cartoes) {
        // cada cartão chega um pouco depois do anterior
        const t = suave(limitar((p - 0.08 - k.i * 0.035) / 0.5))
        k.c.style.setProperty('--mv-x', `${(k.x0 * (1 - t)).toFixed(1)}vw`)
        k.c.style.setProperty('--mv-y', `${(k.y0 * (1 - t)).toFixed(1)}vh`)
        k.c.style.setProperty('--mv-r', `${(k.r0 * (1 - t)).toFixed(1)}deg`)
        k.c.classList.toggle('mv-no-lugar', t > 0.98)
      }
      caos.classList.toggle('mv-ordem', p > 0.72)
    }
    if (etapas && itensEtapa.length) {
      const r = etapas.getBoundingClientRect()
      const ativa = reduzir ? -1 : etapaAtiva(progressoFixo(r.top, r.height, h), itensEtapa.length)
      itensEtapa.forEach((it, i) => it.classList.toggle('mv-ativa', ativa === -1 || i === ativa))
      if (telaEtapa) telaEtapa.dataset.etapaTela = String(Math.max(0, ativa))
    }
    if (heroi && fichas.length && !reduzir) {
      const sobe = limitar(-heroi.getBoundingClientRect().top / h)
      heroi.style.setProperty('--mv-sobe', sobe.toFixed(3))
    }
  }
  const pedir = () => { if (!pedido) pedido = win.requestAnimationFrame(desenhar) }
  win.addEventListener('scroll', pedir, { passive: true })
  win.addEventListener('resize', pedir)
  desenhar()

  if (reduzir) return

  // 4. Herói: luz e fichas que acompanham o cursor
  if (heroi && fino) {
    heroi.addEventListener('pointermove', (e) => {
      const r = heroi.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height
      heroi.style.setProperty('--mv-cx', `${(x * 100).toFixed(1)}%`)
      heroi.style.setProperty('--mv-cy', `${(y * 100).toFixed(1)}%`)
      heroi.style.setProperty('--mv-dx', (x - 0.5).toFixed(3))
      heroi.style.setProperty('--mv-dy', (y - 0.5).toFixed(3))
    })
  }

  // 5. Botões magnéticos
  if (fino) doc.querySelectorAll<HTMLElement>('[data-magnetico]').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect()
      b.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1)}px, ${((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px)`
    })
    b.addEventListener('pointerleave', () => { b.style.transform = '' })
  })

  // 6. Letras que rolam no passar do mouse
  doc.querySelectorAll<HTMLElement>('[data-letras]').forEach((el) => {
    const texto = el.textContent ?? ''
    el.setAttribute('aria-label', texto)
    el.textContent = ''
    const caixa = doc.createElement('span'); caixa.className = 'mv-letras'; caixa.setAttribute('aria-hidden', 'true')
    ;[...texto].forEach((ch, i) => {
      const s = doc.createElement('span'); s.dataset.l = ch; s.textContent = ch === ' ' ? ' ' : ch
      s.style.setProperty('--i', String(i)); caixa.append(s)
    })
    el.append(caixa)
  })

  // 7. Cartões que inclinam com o cursor
  if (fino) doc.querySelectorAll<HTMLElement>('[data-inclinar]').forEach((c) => {
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5
      c.style.transform = `perspective(900px) rotateY(${(x * 8).toFixed(2)}deg) rotateX(${(-y * 8).toFixed(2)}deg)`
      c.style.setProperty('--mv-lx', `${((x + 0.5) * 100).toFixed(0)}%`)
      c.style.setProperty('--mv-ly', `${((y + 0.5) * 100).toFixed(0)}%`)
    })
    c.addEventListener('pointerleave', () => { c.style.transform = '' })
  })
}
