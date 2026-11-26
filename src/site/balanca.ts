/**
 * Modelo 7 · A balança: uma só cena 3D (Three.js) presa ao fundo, que conta a história do escritório conforme a rolagem.
 * Abertura → desequilíbrio → equilíbrio → processos → controladoria → gestão → time → lucros → fechamento.
 * Paleta: prata + vermelho bordô. Celular: menos detalhes e sem brilho extra. "Reduzir movimento": quadro final parado.
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

const BORDO = 0x7a1f33, BORDO_VIVO = 0xb3354f
const limitar = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const suave = (t: number) => { const x = limitar(t); return x * x * (3 - 2 * x) }
/** Quanto de um capítulo já passou (0 a 1), dado o progresso geral e o intervalo do capítulo. */
export function trecho(p: number, ini: number, fim: number) { return suave((p - ini) / (fim - ini)) }

export const CAPITULOS = [
  { id: 'abertura', titulo: 'Seu escritório inteiro, num só lugar.', texto: 'Prazos, publicações, casos e o cliente informado, num sistema feito por advogados.' },
  { id: 'peso', titulo: 'Hoje, tudo pesa para um lado.', texto: 'Recados no WhatsApp, planilhas, prazos soltos e clientes perguntando “e o meu processo?”.' },
  { id: 'equilibrio', titulo: 'Com o HiAdv, o escritório se equilibra.', texto: 'Cada coisa no lugar certo, com responsável e data.' },
  { id: 'processos', titulo: 'Processos que andam sozinhos.', texto: 'Do primeiro contato ao protocolo, cada caso passa pelas etapas da sua área, com checklist e passagem de bastão.' },
  { id: 'controladoria', titulo: 'Controladoria sem susto.', texto: 'Publicações lidas e distribuídas, prazos criados e alertas antes de vencer.' },
  { id: 'gestao', titulo: 'Gestão que se vê.', texto: 'Funil, gargalos por etapa, tempo por área e carga de cada pessoa, sem montar planilha.' },
  { id: 'time', titulo: 'O time inteiro conectado.', texto: 'Conversas, chamadas, tarefas e a Sara, a assistente que executa o que a equipe pede.' },
  { id: 'lucros', titulo: 'Menos retrabalho, mais resultado.', texto: 'Honorários e parcelas organizados, e mais casos atendidos pela mesma equipe.' },
  { id: 'fim', titulo: 'Descubra o plano do seu escritório.', texto: 'Teste com os dados do seu escritório. Sem fidelidade.' },
] as const

export function montarBalanca(cena: HTMLElement, win: Window & typeof globalThis, reduzir: boolean) {
  const celular = win.matchMedia('(max-width: 760px), (pointer: coarse)').matches
  cena.innerHTML = `<div class="cn7-palco"><canvas class="cn7-canvas" aria-hidden="true"></canvas><div class="cn7-vinheta"></div></div>
    <div class="cn7-caps">${CAPITULOS.map((c, i) => `<article class="cn7-cap" data-lado="${i === 0 || i === CAPITULOS.length - 1 ? 'centro' : i % 2 ? 'esq' : 'dir'}">
      <div class="cn7-bloco">${i ? `<span class="cn7-num">${String(i).padStart(2, '0')}</span>` : '<p class="cn-sobre">HiAdv</p>'}
      ${i === 0 ? `<h1 id="t-cena">${c.titulo}</h1>` : `<h2>${c.titulo}</h2>`}<p>${c.texto}</p>
      ${i === 0 || i === CAPITULOS.length - 1 ? '<div class="cn-acoes"><a class="sv-btn sv-btn-claro sv-btn-grande" href="/aderir" data-aderir>Aderir ao HiAdv</a><a class="sv-btn sv-btn-contorno sv-btn-grande" href="#experimentar">Ver o sistema por dentro</a></div>' : ''}</div></article>`).join('')}</div>`
  const canvas = cena.querySelector<HTMLCanvasElement>('canvas')!

  // ── Renderizador e luz
  const r = new THREE.WebGLRenderer({ canvas, antialias: !celular, alpha: false, powerPreference: 'high-performance' })
  r.setPixelRatio(Math.min(celular ? 1.5 : 2, win.devicePixelRatio))
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05
  r.shadowMap.enabled = !celular; r.shadowMap.type = THREE.PCFSoftShadowMap
  const cenario = new THREE.Scene()
  cenario.background = new THREE.Color(0x0b0a0a); cenario.fog = new THREE.Fog(0x0b0a0a, 14, 34)
  const pm = new THREE.PMREMGenerator(r); cenario.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture
  const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
  const chave = new THREE.SpotLight(0xffffff, 120, 40, 0.5, 0.6); chave.position.set(4, 10, 6); chave.castShadow = !celular; chave.shadow.mapSize.set(1024, 1024); cenario.add(chave)
  const contra = new THREE.PointLight(BORDO_VIVO, 60, 30); contra.position.set(-5, 3, -6); cenario.add(contra)
  const contra2 = new THREE.PointLight(BORDO, 40, 30); contra2.position.set(6, 1, -4); cenario.add(contra2)
  cenario.add(new THREE.AmbientLight(0xffffff, 0.08))

  // ── Materiais
  const prata = new THREE.MeshStandardMaterial({ color: 0xd9dade, metalness: 1, roughness: 0.18 })
  const prataEscura = new THREE.MeshStandardMaterial({ color: 0x9a9ba1, metalness: 1, roughness: 0.32 })
  const bordo = new THREE.MeshStandardMaterial({ color: BORDO, metalness: 0.4, roughness: 0.35, emissive: BORDO, emissiveIntensity: 0.35 })
  const vidro = new THREE.MeshStandardMaterial({ color: 0x2a1218, metalness: 0.2, roughness: 0.2, transparent: true, opacity: 0.9, emissive: BORDO_VIVO, emissiveIntensity: 0.6 })
  const piso = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x0d0c0c, metalness: 0.6, roughness: 0.55 }))
  piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; cenario.add(piso)

  // ── A balança (modelada por código)
  const balanca = new THREE.Group(); cenario.add(balanca)
  const torno = (pts: [number, number][], seg = 64) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg)
  const malha = (g: THREE.BufferGeometry, m: THREE.Material) => { const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; return o }
  balanca.add(malha(torno([[0, 0], [1.5, 0], [1.5, 0.12], [1.25, 0.2], [1.1, 0.42], [0.55, 0.55], [0.32, 0.8], [0, 0.82]]), prata))
  balanca.add(malha(new THREE.CylinderGeometry(0.11, 0.16, 4.2, 32), prata).translateY(2.9))
  const anel = malha(new THREE.TorusGeometry(0.2, 0.05, 16, 48), bordo); anel.position.y = 1.2; anel.rotation.x = Math.PI / 2; balanca.add(anel)
  balanca.add(malha(new THREE.SphereGeometry(0.22, 32, 16), prata).translateY(5.1))
  const travessao = new THREE.Group(); travessao.position.y = 4.95; balanca.add(travessao)
  const viga = malha(new THREE.CylinderGeometry(0.06, 0.06, 5.6, 24), prata); viga.rotation.z = Math.PI / 2; travessao.add(viga)
  ;[-1, 1].forEach((l) => { const p = malha(new THREE.SphereGeometry(0.11, 24, 12), prata); p.position.x = l * 2.8; travessao.add(p) })
  const fiel = malha(new THREE.ConeGeometry(0.06, 1.1, 16), bordo); fiel.position.y = 0.55; travessao.add(fiel)
  const pratos: THREE.Group[] = [-1, 1].map((l) => {
    const g = new THREE.Group(); g.position.set(l * 2.8, 0, 0); travessao.add(g)
    const fios = new THREE.Group(); g.add(fios)
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2
      const fio = malha(new THREE.CylinderGeometry(0.012, 0.012, 2.2, 6), prataEscura)
      fio.position.set(Math.cos(a) * 0.45, -1.1, Math.sin(a) * 0.45); fio.lookAt(0, 0, 0); fio.rotateX(Math.PI / 2); fios.add(fio)
    }
    const prato = malha(torno([[0, 0], [0.95, 0.02], [1.05, 0.14], [1.0, 0.18], [0.9, 0.06], [0, 0.04]]), prata); prato.position.y = -2.2; g.add(prato)
    return g
  })

  // ── Pesos do dia a dia (esquerda) e fichas do HiAdv (direita)
  const pesos = Array.from({ length: 6 }, (_, i) => { const m = malha(new THREE.BoxGeometry(0.42, 0.18 + (i % 3) * 0.08, 0.32), prataEscura); m.visible = false; pratos[0]!.add(m); return m })
  const fichas = Array.from({ length: 5 }, () => { const m = malha(new THREE.BoxGeometry(0.5, 0.08, 0.34), vidro); m.visible = false; pratos[1]!.add(m); return m })

  // ── Processos: trilho de etapas que corre atrás da balança
  const trilho = new THREE.Group(); cenario.add(trilho)
  const curva = new THREE.CatmullRomCurve3([new THREE.Vector3(-9, 0.4, -4), new THREE.Vector3(-4, 1.4, -2.5), new THREE.Vector3(0, 0.8, -3.5), new THREE.Vector3(4, 1.6, -2.5), new THREE.Vector3(9, 0.6, -4)])
  const tubo = new THREE.Mesh(new THREE.TubeGeometry(curva, 200, 0.025, 8), new THREE.MeshStandardMaterial({ color: BORDO_VIVO, emissive: BORDO_VIVO, emissiveIntensity: 1.2, transparent: true }))
  trilho.add(tubo)
  const etapas = Array.from({ length: 7 }, () => { const m = malha(new THREE.BoxGeometry(0.9, 0.55, 0.06), vidro); trilho.add(m); return m })

  // ── Controladoria: mostrador em volta da balança, com marcas de prazo
  const mostrador = new THREE.Group(); mostrador.position.y = 4.95; cenario.add(mostrador)
  mostrador.add(new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.02, 8, 160), new THREE.MeshStandardMaterial({ color: 0xcfcfd4, metalness: 1, roughness: 0.2 })))
  for (let k = 0; k < 60; k++) {
    const a = (k / 60) * Math.PI * 2; const longo = k % 5 === 0
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.03, longo ? 0.34 : 0.16, 0.03), longo ? bordo : prataEscura)
    t.position.set(Math.cos(a) * 3.85, Math.sin(a) * 3.85, 0); t.rotation.z = a - Math.PI / 2; mostrador.add(t)
  }
  const ponteiro = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.2, 0.05), bordo); ponteiro.geometry.translate(0, 1.6, 0); mostrador.add(ponteiro)

  // ── Gestão: colunas de indicadores em arco
  const colunas = Array.from({ length: 9 }, (_, i) => {
    const a = -0.9 + (i / 8) * 1.8
    const m = malha(new THREE.BoxGeometry(0.55, 1, 0.55), i === 6 ? bordo : prata)
    m.geometry.translate(0, 0.5, 0); m.position.set(Math.sin(a) * 6.5, 0, -Math.cos(a) * 6.5 + 1.5); m.scale.y = 0.001; cenario.add(m)
    return { m, alvo: [1.2, 2.1, 1.6, 2.8, 2.3, 3.4, 4.6, 3.9, 5.2][i]! }
  })

  // ── Time: pessoas (esferas) em órbita, ligadas por fios de luz
  const time = new THREE.Group(); time.position.y = 3; cenario.add(time)
  const pessoas = Array.from({ length: 12 }, (_, i) => { const m = malha(new THREE.SphereGeometry(i % 4 ? 0.16 : 0.24, 24, 12), i % 4 ? prata : bordo); time.add(m); return m })
  const ligacoes = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: BORDO_VIVO, transparent: true, opacity: 0.6 }))
  const posLig = new Float32Array(12 * 3 * 2 * 2); ligacoes.geometry.setAttribute('position', new THREE.BufferAttribute(posLig, 3)); time.add(ligacoes)

  // ── Lucros: linha que sobe e moedas
  const subida = new THREE.CatmullRomCurve3([new THREE.Vector3(-6, 0.3, 0.5), new THREE.Vector3(-3, 1.2, 0.2), new THREE.Vector3(-1, 1.0, 0.4), new THREE.Vector3(1.5, 2.6, 0.2), new THREE.Vector3(3.5, 3.2, 0.4), new THREE.Vector3(6, 5.6, 0.2)])
  const linhaLucro = new THREE.Mesh(new THREE.TubeGeometry(subida, 300, 0.06, 12), new THREE.MeshStandardMaterial({ color: BORDO_VIVO, emissive: BORDO_VIVO, emissiveIntensity: 1.6, metalness: 0.3, roughness: 0.3 }))
  linhaLucro.geometry.setDrawRange(0, 0); cenario.add(linhaLucro)
  const totalIndices = linhaLucro.geometry.index!.count
  const moedas = Array.from({ length: 14 }, (_, i) => { const m = malha(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 40), prata); m.position.set(-5 + i * 0.8, -1, 0.6 + Math.sin(i) * 0.4); m.rotation.x = Math.PI / 2; cenario.add(m); return m })

  // ── Pós-processamento (brilho do metal e do bordô), só no computador
  let composer: EffectComposer | null = null
  if (!celular) {
    composer = new EffectComposer(r)
    composer.addPass(new RenderPass(cenario, cam))
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.5, 0.9))
    composer.addPass(new OutputPass())
  }
  const medir = () => { const w = win.innerWidth, h = win.innerHeight; r.setSize(w, h, false); composer?.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix() }
  medir(); win.addEventListener('resize', medir)

  // ── Câmera por capítulo (posição e para onde olha)
  const CAM: [number, number, number, number, number, number][] = [
    [0, 3.2, 15, 0, 3.4, 0], [-1.2, 4.2, 11, -0.6, 3.4, 0], [1, 4.4, 11, 0.4, 3.6, 0], [0, 3.4, 13.5, 0, 2, -2],
    [0, 4.95, 12, 0, 4.95, 0], [0, 5.5, 15, 0, 2.2, -1], [3, 4, 12, 0, 3, 0], [0, 3.4, 13, 0, 2.6, 0], [0, 3.6, 16, 0, 3.4, 0],
  ]
  const n = CAPITULOS.length
  const estado = { p: reduzir ? 1 : 0, mx: 0, my: 0 }
  const visto = { p: estado.p }
  if (!reduzir) {
    ScrollTrigger.create({ trigger: cena.querySelector('.cn7-caps')!, start: 'top top', end: 'bottom bottom', onUpdate: (st) => { estado.p = st.progress } })
    win.addEventListener('pointermove', (e) => { estado.mx = e.clientX / win.innerWidth - 0.5; estado.my = e.clientY / win.innerHeight - 0.5 })
    // textos: sobem e se apagam conforme o capítulo passa
    cena.querySelectorAll<HTMLElement>('.cn7-bloco').forEach((b) => gsap.timeline({ scrollTrigger: { trigger: b.parentElement!, start: 'top 75%', end: 'bottom 25%', scrub: true } })
      .fromTo(b, { opacity: 0, y: 60, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.3 })
      .to(b, { opacity: 1, duration: 0.4 }).to(b, { opacity: 0, y: -60, filter: 'blur(8px)', duration: 0.3 }))
  }
  const alvoCam = new THREE.Vector3(), olhar = new THREE.Vector3(), olharAlvo = new THREE.Vector3()
  const relogio = new THREE.Clock()
  let visivel = true
  new IntersectionObserver(([e]) => { visivel = e!.isIntersecting }).observe(cena)

  const quadro = () => {
    const t = relogio.getElapsedTime()
    visto.p += (estado.p - visto.p) * (reduzir ? 1 : 0.07)
    const p = visto.p, seg = p * (n - 1), i = Math.min(n - 2, Math.floor(seg)), f = suave(seg - i)
    const c0 = CAM[i]!, c1 = CAM[i + 1]!
    const longe = cam.aspect < 0.9 ? 1 + (0.9 - cam.aspect) * 1.2 : 1 // celular em pé: câmera mais longe para a balança caber
    alvoCam.set(c0[0] + (c1[0] - c0[0]) * f + estado.mx * 0.8, c0[1] + (c1[1] - c0[1]) * f - estado.my * 0.5 + (longe - 1) * 1.5, (c0[2] + (c1[2] - c0[2]) * f) * longe)
    olharAlvo.set(c0[3] + (c1[3] - c0[3]) * f, c0[4] + (c1[4] - c0[4]) * f, c0[5] + (c1[5] - c0[5]) * f)
    cam.position.lerp(alvoCam, reduzir ? 1 : 0.08); olhar.lerp(olharAlvo, reduzir ? 1 : 0.08); cam.lookAt(olhar)
    const cap = (k: number) => trecho(seg, k - 0.85, k - 0.15) // já está montado quando o texto do capítulo k aparece
    const sai = (k: number) => 1 - trecho(seg, k + 0.35, k + 0.85)

    // abertura: a balança sobe do chão
    const subiu = reduzir ? 1 : suave(Math.min(1, t / 2.4))
    balanca.position.y = -6 * (1 - subiu)
    balanca.rotation.y = Math.sin(t * 0.25) * 0.12 + p * Math.PI * 0.6
    // desequilíbrio → equilíbrio
    const peso = cap(1), equi = cap(2)
    pesos.forEach((m, k) => { const e = limitar(peso * 6 - k); m.visible = e > 0; m.position.set(((k % 3) - 1) * 0.42, -2.0 + Math.floor(k / 3) * 0.24 + (1 - suave(e)) * 3, (k % 2) * 0.2 - 0.1); m.rotation.y = k * 0.7 })
    fichas.forEach((m, k) => { const e = limitar(equi * 5 - k); m.visible = e > 0; m.position.set(0, -2.0 + k * 0.1 + (1 - suave(e)) * 3, 0); m.rotation.y = k * 0.4 })
    const inclina = (peso - equi) * 0.32 + Math.sin(t * 1.3) * 0.015 * (1 - equi)
    travessao.rotation.z = inclina
    pratos.forEach((g) => { g.rotation.z = -inclina })
    fiel.rotation.z = 0
    ;(bordo as THREE.MeshStandardMaterial).emissiveIntensity = 0.35 + equi * 0.5 * sai(2) + Math.sin(t * 2) * 0.05
    // processos: etapas correm no trilho
    const proc = cap(3) * sai(3)
    trilho.visible = proc > 0.01; (tubo.material as THREE.MeshStandardMaterial).opacity = proc
    etapas.forEach((m, k) => { const u = ((k / etapas.length) + t * 0.04) % 1; const pt = curva.getPointAt(u); m.position.copy(pt).add(new THREE.Vector3(0, 0.35, 0)); m.lookAt(cam.position); m.scale.setScalar(proc) })
    // controladoria: mostrador e ponteiro varrendo
    const ctrl = cap(4) * sai(4)
    mostrador.visible = ctrl > 0.01; mostrador.scale.setScalar(0.6 + ctrl * 0.4); mostrador.rotation.z = (1 - ctrl) * 0.6
    ponteiro.rotation.z = -t * 0.8
    // gestão: colunas sobem
    const gest = cap(5) * sai(5)
    colunas.forEach((c, k) => { const e = limitar(gest * 1.6 - k * 0.07); c.m.scale.y = Math.max(0.001, suave(e) * c.alvo); c.m.visible = e > 0.001 })
    // time: órbitas e ligações
    const eq = cap(6) * sai(6)
    time.visible = eq > 0.01
    pessoas.forEach((m, k) => { const a = (k / 12) * Math.PI * 2 + t * (k % 2 ? 0.25 : -0.18); const raio = (k % 3 === 0 ? 3.4 : 4.6) * eq; m.position.set(Math.cos(a) * raio, Math.sin(a * 2 + k) * 0.8 * eq, Math.sin(a) * raio * 0.6) })
    let j = 0
    for (let k = 0; k < 12; k++) for (const o of [1, 4]) { const a = pessoas[k]!.position, b = pessoas[(k + o) % 12]!.position; posLig.set([a.x, a.y, a.z, b.x, b.y, b.z], j); j += 6 }
    ligacoes.geometry.attributes.position!.needsUpdate = true; (ligacoes.material as THREE.LineBasicMaterial).opacity = 0.55 * eq
    // lucros: a linha se desenha e as moedas sobem
    const luc = cap(7) * sai(7)
    linhaLucro.geometry.setDrawRange(0, Math.floor((totalIndices / 3) * limitar(luc * 1.2)) * 3)
    moedas.forEach((m, k) => { const e = limitar(luc * 1.5 - k * 0.05); m.position.y = -1 + suave(e) * (0.6 + k * 0.36); m.rotation.z = t * 1.5 + k; m.visible = e > 0 })
    // a balança recua um pouco nos capítulos de conteúdo e volta inteira no fim
    const fundo = limitar(seg - 2.5) * (1 - trecho(seg, 7.2, 8))
    balanca.scale.setScalar(1 - fundo * 0.25)
    ;(prata as THREE.MeshStandardMaterial).roughness = 0.18 + fundo * 0.12
    contra.intensity = 60 + Math.sin(t * 0.8) * 10 + trecho(seg, 7.4, 8) * 60

    if (composer) composer.render(); else r.render(cenario, cam)
  }
  if (reduzir) { quadro(); win.addEventListener('resize', () => quadro()); return }
  gsap.ticker.add(() => { if (visivel) quadro() })
}
