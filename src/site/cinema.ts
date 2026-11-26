/**
 * Seis modelos cinematográficos para a abertura do site (prévia, ?v=1 … ?v=6).
 * GSAP (ScrollTrigger + SplitText) para cenas presas à rolagem, Lenis para a rolagem suave e Three.js no modelo 3D.
 * Cada modelo substitui o herói; o resto da página continua igual, com títulos que se montam linha a linha.
 * "Reduzir movimento": tudo aparece no estado final, sem cenas presas.
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger, SplitText)

export const MODELOS = {
  '1': 'Abertura de cinema',
  '2': 'Palavra-janela',
  '3': 'Travessia horizontal',
  '4': 'Pilha de telas',
  '5': 'Galeria 3D',
  '6': 'Manifesto em movimento',
} as const
export type Modelo = keyof typeof MODELOS

const TELAS = ['seu-dia', 'quadro', 'publicacoes', 'atendimentos', 'tarefas', 'agenda', 'cliente', 'financeiro', 'relatorios', 'conversas', 'ia', 'acompanhamento']
const tela = (n: string, p = false) => `/site/tela-${n}${p ? '-p' : ''}.webp`

function h<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, cls: string, html = ''): HTMLElementTagNameMap[K] {
  const el = doc.createElement(tag); el.className = cls; el.innerHTML = html; return el
}

const CTA = `<div class="cn-acoes"><a class="sv-btn sv-btn-claro sv-btn-grande" href="/aderir" data-aderir>Aderir ao HiAdv</a><a class="sv-btn sv-btn-contorno sv-btn-grande" href="#experimentar">Ver o sistema por dentro</a></div>`

export function montarCinema(doc: Document, win: Window & typeof globalThis, modelo: Modelo) {
  const reduzir = win.matchMedia('(prefers-reduced-motion: reduce)').matches
  doc.documentElement.dataset.cinema = modelo
  const heroi = doc.querySelector<HTMLElement>('.sv-heroi')
  if (!heroi) return
  const cena = h(doc, 'section', `cn cn-${modelo}`)
  cena.setAttribute('aria-labelledby', 't-cena')
  heroi.after(cena)

  // Rolagem suave (Lenis) sincronizada com o ScrollTrigger
  if (!reduzir) {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true })
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0)
    doc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const alvo = a.hash.length > 1 ? doc.querySelector<HTMLElement>(a.hash) : null
      if (alvo) { e.preventDefault(); lenis.scrollTo(alvo, { offset: -70 }) }
    }))
  }

  ;({ '1': abertura, '2': palavraJanela, '3': travessia, '4': pilha, '5': galeria3d, '6': manifesto } as const)[modelo](doc, win, cena, reduzir)

  // Títulos do resto da página: linhas sobem de dentro de uma máscara
  if (!reduzir) doc.querySelectorAll<HTMLElement>('main > section:not(.cn) h2:not(.sr-only)').forEach((t) => {
    const s = SplitText.create(t, { type: 'lines', mask: 'lines', linesClass: 'cn-linha' })
    gsap.from(s.lines, { yPercent: 110, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: t, start: 'top 85%' } })
  })
  win.addEventListener('load', () => ScrollTrigger.refresh())
}

/* 1 · Abertura de cinema: faixas pretas se abrem, o título surge em letras desfocadas e a câmera "atravessa" para o produto */
function abertura(_doc: Document, _w: Window, cena: HTMLElement, reduzir: boolean) {
  cena.innerHTML = `<div class="cn-palco">
    <img class="cn1-tela" src="${tela('seu-dia')}" alt="Tela Seu dia do HiAdv" />
    <div class="cn1-veu"></div>
    <div class="cn1-texto"><p class="cn-sobre">HiAdv apresenta</p><h1 id="t-cena">Seu escritório inteiro, num só lugar.</h1>
    <p class="cn-sub">Prazos, publicações, casos e o cliente informado, no celular e no computador.</p>${CTA}</div>
    <i class="cn1-faixa cn1-cima"></i><i class="cn1-faixa cn1-baixo"></i></div>`
  if (reduzir) return
  const titulo = cena.querySelector('h1')!
  const s = SplitText.create(titulo, { type: 'chars,words' })
  gsap.timeline({ delay: 0.2 })
    .from('.cn1-faixa', { scaleY: 6, duration: 1.4, ease: 'expo.inOut' })
    .from('.cn-1 .cn-sobre', { opacity: 0, letterSpacing: '1em', duration: 1.2, ease: 'power3.out' }, '-=0.8')
    .from(s.chars, { opacity: 0, filter: 'blur(14px)', yPercent: 40, stagger: 0.025, duration: 0.9, ease: 'power3.out' }, '-=0.6')
    .from('.cn-1 .cn-sub, .cn-1 .cn-acoes', { opacity: 0, y: 24, stagger: 0.12, duration: 0.8 }, '-=0.4')
  gsap.timeline({ scrollTrigger: { trigger: cena, start: 'top top', end: '+=140%', scrub: 1, pin: '.cn-1 .cn-palco' } })
    .to('.cn1-texto', { scale: 1.6, opacity: 0, ease: 'power2.in' }, 0)
    .fromTo('.cn1-tela', { scale: 1.35, filter: 'brightness(.35) blur(6px)' }, { scale: 0.86, filter: 'brightness(1) blur(0px)', borderRadius: 18 }, 0)
    .to('.cn1-veu', { opacity: 0 }, 0)
    .to('.cn1-faixa', { scaleY: 0 }, 0.3)
}

/* 2 · Palavra-janela: o produto aparece por dentro das letras de "HiAdv"; a rolagem empurra a câmera para dentro da palavra */
function palavraJanela(_doc: Document, _w: Window, cena: HTMLElement, reduzir: boolean) {
  cena.innerHTML = `<div class="cn-palco">
    <div class="cn2-fundo"><img src="${tela('quadro')}" alt="Quadro de casos do HiAdv" /></div>
    <svg class="cn2-mascara" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><mask id="cn2-m"><rect width="1600" height="900" fill="#fff"/><text x="800" y="560" text-anchor="middle" font-size="420" font-weight="900" font-family="Public Sans, system-ui" letter-spacing="-20">HiAdv</text></mask></defs>
      <rect width="1600" height="900" fill="#0e0e0e" mask="url(#cn2-m)"/><text x="800" y="560" text-anchor="middle" font-size="420" font-weight="900" font-family="Public Sans, system-ui" letter-spacing="-20" fill="none" stroke="#c9a872" stroke-width="2.5">HiAdv</text></svg>
    <div class="cn2-texto"><h1 id="t-cena">Cada caso no lugar certo. Cada prazo com dono.</h1><p class="cn-sub">Role e entre no escritório.</p></div>
    <div class="cn2-final"><p class="cn-sub">Prazos, publicações, casos, atendimentos e o acompanhamento do cliente num só sistema.</p>${CTA}</div></div>`
  if (reduzir) { cena.classList.add('cn-parado'); return }
  gsap.timeline({ scrollTrigger: { trigger: cena, start: 'top top', end: '+=180%', scrub: 1, pin: '.cn-2 .cn-palco' } })
    .to('.cn2-mascara', { scale: 9, transformOrigin: '52% 56%', ease: 'power2.in' }, 0)
    .to('.cn2-texto', { opacity: 0, y: -40 }, 0)
    .fromTo('.cn2-fundo img', { scale: 1.25 }, { scale: 1 }, 0)
    .fromTo('.cn2-final', { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, 0.7)
}

/* 3 · Travessia horizontal: a rolagem vertical vira uma viagem de lado pelas etapas do caso */
function travessia(_doc: Document, _w: Window, cena: HTMLElement, reduzir: boolean) {
  const etapas = [
    ['Atendimento', 'O contato chega pelo site ou WhatsApp, com a origem registrada.', 'atendimentos'],
    ['Triagem', 'Documentos conferidos por checklist, pendências pedidas ao cliente.', 'cliente'],
    ['Jurídico', 'Prazos e publicações no dia de quem cuida, com alerta antes de vencer.', 'publicacoes'],
    ['Suporte', 'O cliente acompanha pelo Meu Processo, nos dias 1 e 15.', 'acompanhamento'],
    ['Gestão', 'Relatórios de funil, gargalos e carga por pessoa.', 'relatorios'],
  ]
  cena.innerHTML = `<div class="cn3-trilho">
    <div class="cn3-painel cn3-abre"><h1 id="t-cena">Da primeira mensagem ao cliente bem informado.</h1><p class="cn-sub">Role para atravessar o caminho de um caso.</p>${CTA}</div>
    ${etapas.map(([t, d, i], k) => `<article class="cn3-painel"><span class="cn3-num">0${k + 1}</span><div class="cn3-img"><img src="${tela(i)}" alt="Tela de ${t.toLowerCase()} do HiAdv" loading="lazy" /></div><h2>${t}</h2><p>${d}</p></article>`).join('')}
  </div><div class="cn3-barra"><i></i></div>`
  if (reduzir || matchMedia('(max-width: 760px)').matches) { cena.classList.add('cn-parado'); return }
  const trilho = cena.querySelector<HTMLElement>('.cn3-trilho')!
  const distancia = () => trilho.scrollWidth - innerWidth
  const ida = gsap.to(trilho, { x: () => -distancia(), ease: 'none', scrollTrigger: { trigger: cena, start: 'top top', end: () => `+=${distancia()}`, scrub: 1, pin: true, invalidateOnRefresh: true } })
  gsap.to('.cn3-barra i', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: cena, start: 'top top', end: () => `+=${distancia()}`, scrub: true } })
  cena.querySelectorAll<HTMLElement>('.cn3-img img').forEach((img) => gsap.fromTo(img, { xPercent: -12 }, { xPercent: 12, ease: 'none', scrollTrigger: { trigger: img.parentElement!, containerAnimation: ida, start: 'left right', end: 'right left', scrub: true } }))
  cena.querySelectorAll<HTMLElement>('.cn3-num').forEach((n) => gsap.from(n, { yPercent: 100, opacity: 0, scrollTrigger: { trigger: n, containerAnimation: ida, start: 'left 85%' } }))
}

/* 4 · Pilha de telas: cada tela sobe e cobre a anterior, que recua e escurece */
function pilha(_doc: Document, _w: Window, cena: HTMLElement, reduzir: boolean) {
  const cartas = [
    ['Seu dia', 'Atrasados, prazos de hoje e o que precisa de atenção, ao abrir.', 'seu-dia'],
    ['Quadro do escritório', 'Cada caso na etapa certa, com responsável e prazo.', 'quadro'],
    ['Publicações', 'Lidas, distribuídas e com prazo criado.', 'publicacoes'],
    ['Meu Processo', 'O cliente acompanha sem precisar perguntar.', 'acompanhamento'],
  ]
  cena.innerHTML = `<div class="cn4-topo sv-largura"><h1 id="t-cena">Um sistema. Quatro telas que mudam o dia do escritório.</h1><p class="cn-sub">Prazos, publicações, casos e o cliente informado.</p>${CTA}</div>
    <div class="cn4-pilha">${cartas.map(([t, d, i], k) => `<article class="cn4-carta" style="--k:${k}"><div class="cn4-legenda"><span>0${k + 1}</span><h2>${t}</h2><p>${d}</p></div><img src="${tela(i)}" alt="Tela ${t} do HiAdv" loading="lazy" /></article>`).join('')}</div>`
  if (reduzir) return
  const els = gsap.utils.toArray<HTMLElement>('.cn4-carta')
  els.forEach((c, i) => {
    if (i === els.length - 1) return
    gsap.to(c, { scale: 0.9, filter: 'brightness(.45)', ease: 'none', scrollTrigger: { trigger: els[i + 1], start: 'top bottom', end: 'top 12%', scrub: true } })
  })
  gsap.from('.cn4-topo > *', { y: 40, opacity: 0, stagger: 0.12, duration: 1, ease: 'expo.out' })
}

/* 5 · Galeria 3D: telas flutuando num arco; a rolagem gira a câmera e o cursor inclina a cena */
async function galeria3d(_doc: Document, win: Window, cena: HTMLElement, reduzir: boolean) {
  cena.innerHTML = `<div class="cn-palco"><canvas class="cn5-canvas" aria-hidden="true"></canvas>
    <div class="cn5-texto"><h1 id="t-cena">O escritório inteiro, em volta de você.</h1><p class="cn-sub">Doze telas, um só sistema. Role para girar.</p>${CTA}</div></div>`
  const canvas = cena.querySelector<HTMLCanvasElement>('canvas')!
  if (reduzir) { cena.classList.add('cn-parado'); return }
  const THREE = await import('three')
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  r.setPixelRatio(Math.min(2, win.devicePixelRatio))
  const cenario = new THREE.Scene(); cenario.fog = new THREE.Fog(0x0e0e0e, 8, 20)
  const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 50); cam.position.set(0, 0, 11)
  const grupo = new THREE.Group(); cenario.add(grupo)
  const carregador = new THREE.TextureLoader()
  const n = TELAS.length, raio = 6.2
  TELAS.forEach((nome, i) => {
    const tex = carregador.load(tela(nome, true)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2), new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide, transparent: true }))
    const a = (i / n) * Math.PI * 2
    m.position.set(Math.sin(a) * raio, (i % 3 - 1) * 1.1, Math.cos(a) * raio)
    m.lookAt(0, m.position.y, 0); m.rotateY(Math.PI)
    grupo.add(m)
  })
  grupo.position.z = -2.2
  const medir = () => { const w = cena.clientWidth, hh = win.innerHeight; r.setSize(w, hh, false); cam.aspect = w / hh; cam.updateProjectionMatrix() }
  medir(); win.addEventListener('resize', medir)
  const alvo = { giro: 0, mx: 0, my: 0 }
  win.addEventListener('pointermove', (e) => { alvo.mx = e.clientX / win.innerWidth - 0.5; alvo.my = e.clientY / win.innerHeight - 0.5 })
  ScrollTrigger.create({ trigger: cena, start: 'top top', end: '+=220%', pin: '.cn-5 .cn-palco', scrub: 1, onUpdate: (st) => { alvo.giro = st.progress * Math.PI * 1.6 } })
  gsap.to('.cn5-texto', { opacity: 0, y: -60, scrollTrigger: { trigger: cena, start: 'top top', end: '+=60%', scrub: true } })
  let visivel = true
  new IntersectionObserver(([e]) => { visivel = e.isIntersecting }).observe(cena)
  gsap.ticker.add(() => {
    if (!visivel) return
    grupo.rotation.y += (alvo.giro + win.performance.now() * 0.00005 - grupo.rotation.y) * 0.08
    cam.position.x += (alvo.mx * 1.4 - cam.position.x) * 0.05
    cam.position.y += (-alvo.my * 0.9 - cam.position.y) * 0.05
    cam.lookAt(0, 0, 0)
    r.render(cenario, cam)
  })
}

/* 6 · Manifesto em movimento: faixas gigantes correm em sentidos opostos conforme a velocidade da rolagem; telas seguem o cursor */
function manifesto(_doc: Document, _win: Window, cena: HTMLElement, reduzir: boolean) {
  const linhas = ['Prazos · Publicações · Perícias ·', 'Casos · Clientes · Atendimentos ·', 'Equipe · Relatórios · Meu Processo ·']
  const areas: [string, string][] = [['Previdenciário', 'publicacoes'], ['Trabalhista', 'quadro'], ['Cível e família', 'cliente'], ['Bancário', 'financeiro'], ['Penal', 'agenda'], ['Extrajudicial', 'tarefas']]
  cena.innerHTML = `<div class="cn6-intro sv-largura"><h1 id="t-cena">Feito por advogados. Para escritórios de todas as áreas.</h1>${CTA}</div>
    <div class="cn6-faixas" aria-hidden="true">${linhas.map((l, i) => `<div class="cn6-faixa" data-dir="${i % 2 ? 1 : -1}"><span>${l} ${l} ${l} ${l}</span></div>`).join('')}</div>
    <div class="cn6-areas sv-largura"><p class="cn-sobre">Passe o mouse nas áreas</p><ul>${areas.map(([a, i]) => `<li data-img="${tela(i, true)}"><a href="#areas">${a}</a></li>`).join('')}</ul></div>
    <img class="cn6-segue" alt="" aria-hidden="true" />`
  if (reduzir) return
  const s = SplitText.create(cena.querySelector('h1')!, { type: 'words', mask: 'words' })
  gsap.from(s.words, { yPercent: 120, stagger: 0.05, duration: 1.1, ease: 'expo.out', delay: 0.2 })
  const faixas = gsap.utils.toArray<HTMLElement>('.cn6-faixa')
  const posicoes = faixas.map(() => 0)
  let veloc = 0
  ScrollTrigger.create({ trigger: cena, start: 'top bottom', end: 'bottom top', onUpdate: (st) => { veloc = st.getVelocity() } })
  gsap.ticker.add(() => {
    veloc *= 0.92
    faixas.forEach((f, i) => {
      const dir = Number(f.dataset.dir)
      posicoes[i] = (posicoes[i]! + dir * (0.6 + Math.abs(veloc) * 0.004)) % 50
      f.firstElementChild!.setAttribute('style', `transform: translateX(${posicoes[i]! - (dir > 0 ? 50 : 0)}%) skewX(${gsap.utils.clamp(-12, 12, -veloc * 0.004)}deg)`)
    })
  })
  // telas que seguem o cursor sobre a lista de áreas
  const img = cena.querySelector<HTMLImageElement>('.cn6-segue')!
  const xTo = gsap.quickTo(img, 'x', { duration: 0.5, ease: 'power3' }), yTo = gsap.quickTo(img, 'y', { duration: 0.5, ease: 'power3' })
  const lista = cena.querySelector<HTMLElement>('.cn6-areas ul')!
  lista.addEventListener('pointermove', (e) => { xTo(e.clientX + 24); yTo(e.clientY - 120) })
  lista.querySelectorAll<HTMLElement>('li').forEach((li) => li.addEventListener('pointerenter', () => { img.src = li.dataset.img!; gsap.to(img, { opacity: 1, scale: 1, rotate: gsap.utils.random(-6, 6), duration: 0.4 }) }))
  lista.addEventListener('pointerleave', () => gsap.to(img, { opacity: 0, scale: 0.8, duration: 0.3 }))
}
