/**
 * Modelo 7 · A balança: uma só cena 3D (Three.js) presa ao fundo, que conta a história do escritório conforme a rolagem.
 * Abertura → desequilíbrio → equilíbrio → processos → controladoria → gestão → time → lucros → fechamento (o martelo bate).
 * Paleta: prata envelhecida + vermelho bordô laqueado, sobre mármore escuro.
 * Qualidade: luz de estúdio (HDRI), chão espelhado, foco de lente e brilho; tudo se desliga sozinho se o aparelho não acompanhar.
 * Celular: versão leve. "Reduzir movimento": quadro final parado.
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

const BORDO = 0x6e1a2c, BORDO_VIVO = 0xb3354f
const limitar = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const suave = (t: number) => { const x = limitar(t); return x * x * (3 - 2 * x) }
/** Quanto de um capítulo já passou (0 a 1), dado o progresso geral e o intervalo do capítulo. */
export function trecho(p: number, ini: number, fim: number) { return suave((p - ini) / (fim - ini)) }

/** Próximo degrau de qualidade quando os quadros ficam lentos (0 = tudo ligado … 3 = mínimo). */
export function degrauQualidade(atual: number, msPorQuadro: number): number {
  return msPorQuadro > 24 && atual < 3 ? atual + 1 : atual
}

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

/** Textura desenhada na hora (sem baixar imagem): pátina do metal ou veios do mármore. */
function textura(tam: number, desenhar: (c: CanvasRenderingContext2D, t: number) => void, cor = false) {
  const cv = document.createElement('canvas'); cv.width = cv.height = tam
  desenhar(cv.getContext('2d')!, tam)
  const tx = new THREE.CanvasTexture(cv); tx.wrapS = tx.wrapT = THREE.RepeatWrapping
  if (cor) tx.colorSpace = THREE.SRGBColorSpace
  return tx
}
const sorteio = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647 } })()

export function montarBalanca(cena: HTMLElement, win: Window & typeof globalThis, reduzir: boolean) {
  const celular = win.matchMedia('(max-width: 760px), (pointer: coarse)').matches
  cena.innerHTML = `<div class="cn7-palco"><canvas class="cn7-canvas" aria-hidden="true"></canvas><div class="cn7-vinheta"></div><div class="cn7-grao"></div></div>
    <div class="cn7-caps">${CAPITULOS.map((c, i) => `<article class="cn7-cap" data-lado="${i === 0 ? 'centro' : i % 2 || i === CAPITULOS.length - 1 ? 'esq' : 'dir'}">
      <div class="cn7-bloco">${i ? `<span class="cn7-num">${String(i).padStart(2, '0')}</span>` : '<p class="cn-sobre">HiAdv</p>'}
      ${i === 0 ? `<h1 id="t-cena">${c.titulo}</h1>` : `<h2>${c.titulo}</h2>`}<p>${c.texto}</p>
      ${i === 0 || i === CAPITULOS.length - 1 ? '<div class="cn-acoes"><a class="sv-btn sv-btn-claro sv-btn-grande" href="/aderir" data-aderir>Aderir ao HiAdv</a><a class="sv-btn sv-btn-contorno sv-btn-grande" href="#experimentar">Ver o sistema por dentro</a></div>' : ''}</div></article>`).join('')}</div>`
  const canvas = cena.querySelector<HTMLCanvasElement>('canvas')!

  // ── Renderizador
  const r = new THREE.WebGLRenderer({ canvas, antialias: celular, alpha: false, powerPreference: 'high-performance', stencil: false })
  let dpr = Math.min(celular ? 1.5 : 2, win.devicePixelRatio)
  r.setPixelRatio(dpr)
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.8
  r.shadowMap.enabled = !celular; r.shadowMap.type = THREE.PCFSoftShadowMap
  const FUNDO = 0x0a0909
  const cenario = new THREE.Scene()
  cenario.background = new THREE.Color(FUNDO); cenario.fog = new THREE.Fog(FUNDO, 15, 36)
  const pm = new THREE.PMREMGenerator(r)
  cenario.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; cenario.environmentIntensity = 0.3
  // luz de estúdio de verdade (HDRI) chega logo depois e dá os reflexos no metal
  void import('@pmndrs/assets/hdri/studio.exr').then((m) => new EXRLoader().load(m.default, (tx) => {
    tx.mapping = THREE.EquirectangularReflectionMapping
    cenario.environment = pm.fromEquirectangular(tx).texture; cenario.environmentIntensity = 0.38; cenario.environmentRotation.y = 0.6
    tx.dispose(); pm.dispose()
  })).catch(() => { /* fica com a luz padrão */ })

  const cam = new THREE.PerspectiveCamera(32, 1, 0.5, 80)
  const chave = new THREE.SpotLight(0xfff4ea, 95, 40, 0.42, 0.7, 1.6); chave.position.set(5, 11, 7); chave.castShadow = !celular
  chave.shadow.mapSize.set(2048, 2048); chave.shadow.bias = -0.0004; chave.shadow.radius = 6; cenario.add(chave); chave.target.position.set(0, 3, 0); cenario.add(chave.target)
  const contra = new THREE.PointLight(BORDO_VIVO, 90, 30, 1.8); contra.position.set(-6, 4, -6); cenario.add(contra)
  const contra2 = new THREE.PointLight(0xff5a78, 50, 26, 1.8); contra2.position.set(7, 2, -4); cenario.add(contra2)
  const batida = new THREE.PointLight(0xffe0d0, 0, 14, 2); batida.position.set(3.4, 1.3, 4.9); cenario.add(batida)

  // ── Materiais
  const patina = textura(512, (c, t) => {
    c.fillStyle = '#7a7a7a'; c.fillRect(0, 0, t, t)
    for (let k = 0; k < 2600; k++) { const v = 70 + sorteio() * 150 | 0; c.fillStyle = `rgba(${v},${v},${v},${0.05 + sorteio() * 0.12})`; const s = 2 + sorteio() * 26; c.fillRect(sorteio() * t, sorteio() * t, s, s * (0.3 + sorteio())) }
    c.globalAlpha = 0.18; c.strokeStyle = '#e8e8e8'
    for (let k = 0; k < 260; k++) { c.lineWidth = 0.5 + sorteio(); c.beginPath(); const x = sorteio() * t, y = sorteio() * t; c.moveTo(x, y); c.lineTo(x + (sorteio() - 0.5) * 60, y + (sorteio() - 0.5) * 8); c.stroke() }
  })
  patina.repeat.set(3, 2); patina.anisotropy = 4
  const marmoreTx = textura(1024, (c, t) => {
    const g = c.createLinearGradient(0, 0, t, t); g.addColorStop(0, '#1b1b1d'); g.addColorStop(0.5, '#2a2a2d'); g.addColorStop(1, '#141415'); c.fillStyle = g; c.fillRect(0, 0, t, t)
    for (let k = 0; k < 46; k++) {
      c.strokeStyle = `rgba(${200 + sorteio() * 55 | 0},${195 + sorteio() * 50 | 0},${195 + sorteio() * 50 | 0},${0.05 + sorteio() * 0.2})`; c.lineWidth = 0.6 + sorteio() * 3.5
      let x = sorteio() * t, y = sorteio() * t; c.beginPath(); c.moveTo(x, y)
      for (let s = 0; s < 14; s++) { x += (sorteio() - 0.3) * 120; y += (sorteio() - 0.5) * 90; c.lineTo(x, y) } c.stroke()
    }
    for (let k = 0; k < 900; k++) { c.fillStyle = `rgba(255,255,255,${sorteio() * 0.05})`; c.fillRect(sorteio() * t, sorteio() * t, 2 + sorteio() * 40, 1 + sorteio() * 6) }
  }, true)
  marmoreTx.repeat.set(2, 1); marmoreTx.anisotropy = 8
  const prata = new THREE.MeshPhysicalMaterial({ color: 0xa9aab0, metalness: 1, roughness: 0.55, roughnessMap: patina })
  const prataPolida = new THREE.MeshPhysicalMaterial({ color: 0xcfd0d4, metalness: 1, roughness: 0.14 })
  const prataEscura = new THREE.MeshPhysicalMaterial({ color: 0x77787e, metalness: 1, roughness: 0.5, roughnessMap: patina })
  const bordo = new THREE.MeshPhysicalMaterial({ color: BORDO, metalness: 0.15, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06, emissive: BORDO, emissiveIntensity: 0.25 })
  const vidro = new THREE.MeshPhysicalMaterial({ color: 0x3a0f1a, metalness: 0.1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.94, emissive: BORDO_VIVO, emissiveIntensity: 0.55 })
  const marmore = new THREE.MeshPhysicalMaterial({ map: marmoreTx, color: 0xffffff, metalness: 0, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.12 })
  const neon = new THREE.MeshStandardMaterial({ color: BORDO_VIVO, emissive: BORDO_VIVO, emissiveIntensity: 0.9 })

  // ── Chão: espelho escuro (computador) ou piso polido simples (celular)
  let espelho: Reflector | null = null
  if (!celular) {
    espelho = new Reflector(new THREE.CircleGeometry(40, 48), { textureWidth: 1024, textureHeight: 1024, color: 0x777777, clipBias: 0.003 })
    espelho.rotation.x = -Math.PI / 2; cenario.add(espelho)
  }
  const piso = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x0b0a0a, metalness: 0.5, roughness: 0.5, transparent: !celular, opacity: celular ? 1 : 0.84 }))
  piso.rotation.x = -Math.PI / 2; piso.position.y = 0.004; piso.receiveShadow = true; cenario.add(piso)

  // ── Ferramentas de modelagem
  const torno = (pts: [number, number][], seg = celular ? 48 : 96) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg)
  const malha = (g: THREE.BufferGeometry, m: THREE.Material) => { const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; return o }
  /** Perfil torneado: lista de [altura, raio] ligada por curva suave (dá as "cinturas" e os gomos da coluna). */
  const perfil = (pts: [number, number][], passos = 10) => {
    const curva = new THREE.SplineCurve(pts.map(([y, x]) => new THREE.Vector2(x, y)))
    return curva.getPoints(pts.length * passos).map((v) => [Math.max(0.0001, v.x), v.y] as [number, number])
  }
  const mtx = new THREE.Matrix4()

  // ── A balança
  const balanca = new THREE.Group(); cenario.add(balanca)
  // base de mármore em degraus
  balanca.add(malha(torno([[0.0001, 0], [1.95, 0], [1.98, 0.05], [1.98, 0.3], [1.9, 0.36], [1.62, 0.4], [1.6, 0.46], [1.6, 0.66], [1.52, 0.72], [0.0001, 0.72]]), marmore))
  // pé e coluna torneados em prata
  balanca.add(malha(torno(perfil([[0.72, 1.36], [0.8, 1.38], [0.86, 1.22], [0.96, 0.92], [1.06, 0.98], [1.14, 0.7], [1.3, 0.36], [1.42, 0.42], [1.5, 0.26], [1.62, 0.2], [1.72, 0.34], [1.84, 0.36], [1.96, 0.22], [2.1, 0.15],
    [2.5, 0.2], [2.9, 0.24], [3.1, 0.17], [3.2, 0.27], [3.3, 0.17], [3.5, 0.13], [3.9, 0.15], [4.2, 0.2], [4.34, 0.3], [4.44, 0.2], [4.56, 0.13], [4.72, 0.16]])), prata))
  ;[1.0, 1.52, 3.2, 4.34].forEach((y, k) => { const a = malha(new THREE.TorusGeometry([0.97, 0.3, 0.29, 0.32][k]!, 0.035, 12, 64), k === 2 ? bordo : prataPolida); a.rotation.x = Math.PI / 2; a.position.y = y; balanca.add(a) })
  // caneluras: filetes verticais no fuste
  const filetes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.56, 6), prataPolida, 12)
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; mtx.makeTranslation(Math.cos(a) * 0.215, 2.62, Math.sin(a) * 0.215); filetes.setMatrixAt(k, mtx) }
  balanca.add(filetes)
  // capitel e remate
  balanca.add(malha(torno(perfil([[4.72, 0.16], [4.8, 0.3], [4.88, 0.34], [4.95, 0.3], [5.04, 0.33], [5.12, 0.2], [5.2, 0.1], [5.3, 0.16], [5.42, 0.19], [5.54, 0.12], [5.7, 0.05], [5.9, 0.012]])), prata))

  // travessão com braços em voluta
  const travessao = new THREE.Group(); travessao.position.y = 4.95; balanca.add(travessao)
  const eixo = malha(new THREE.CylinderGeometry(0.1, 0.1, 0.74, 32), prataPolida); eixo.rotation.x = Math.PI / 2; travessao.add(eixo)
  ;[-1, 1].forEach((l) => {
    const v = (x: number, y: number) => new THREE.Vector3(l * x, y, 0)
    travessao.add(malha(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v(0.05, 0.02), v(0.6, 0.34), v(1.3, 0.4), v(2.0, 0.2), v(2.55, 0.02), v(2.8, 0)]), 80, 0.075, 16), prata))
    // voluta que se enrola por baixo, como nas balanças antigas
    const esp: THREE.Vector3[] = []; for (let k = 0; k <= 40; k++) { const a = (k / 40) * Math.PI * 3.2; const rr = 0.36 * (1 - k / 46); esp.push(v(2.1 + Math.cos(a + 1.2) * rr, -0.16 + Math.sin(a + 1.2) * rr)) }
    travessao.add(malha(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(esp), 90, 0.04, 10), prataPolida))
    const esp2: THREE.Vector3[] = []; for (let k = 0; k <= 30; k++) { const a = (k / 30) * Math.PI * 2.6; const rr = 0.24 * (1 - k / 36); esp2.push(v(0.95 + Math.cos(-a + 2.4) * rr, 0.62 + Math.sin(-a + 2.4) * rr)) }
    travessao.add(malha(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(esp2), 70, 0.032, 10), prataPolida))
    const ponta = malha(new THREE.SphereGeometry(0.1, 24, 16), prataPolida); ponta.position.copy(v(2.8, 0)); travessao.add(ponta)
    const argola = malha(new THREE.TorusGeometry(0.09, 0.022, 10, 32), prataPolida); argola.position.copy(v(2.8, -0.16)); travessao.add(argola)
  })
  const fiel = malha(torno([[0.0001, 0], [0.055, 0.04], [0.03, 0.2], [0.05, 0.3], [0.016, 0.8], [0.0001, 1.25]], 24), bordo); fiel.position.y = 0.08; travessao.add(fiel)

  // pratos fundos suspensos por correntes de elos
  const ELOS = celular ? 12 : 22
  const elo = new THREE.TorusGeometry(0.05, 0.013, celular ? 6 : 8, celular ? 12 : 18); elo.scale(0.72, 1.25, 1)
  const Y_PRATO = -2.72, ABA = 0.47
  const pratos: THREE.Group[] = [-1, 1].map((l) => {
    const g = new THREE.Group(); g.position.set(l * 2.8, -0.24, 0); travessao.add(g)
    const correntes = new THREE.InstancedMesh(elo, prataEscura, ELOS * 3); correntes.castShadow = true
    const ate = new THREE.Vector3(), dir = new THREE.Vector3(), q = new THREE.Quaternion(), giro = new THREE.Quaternion(), pos = new THREE.Vector3(), um = new THREE.Vector3(1, 1, 1), cima = new THREE.Vector3(0, 1, 0)
    for (let c = 0; c < 3; c++) {
      const a = (c / 3) * Math.PI * 2 + Math.PI / 6
      ate.set(Math.cos(a) * 1.0, Y_PRATO + ABA, Math.sin(a) * 1.0)
      const comp = ate.length(); dir.copy(ate).normalize(); q.setFromUnitVectors(cima, dir)
      for (let k = 0; k < ELOS; k++) {
        pos.copy(dir).multiplyScalar((k + 0.5) * (comp / ELOS)); giro.setFromAxisAngle(dir, k % 2 ? Math.PI / 2 : 0)
        mtx.compose(pos, giro.multiply(q), um); correntes.setMatrixAt(c * ELOS + k, mtx)
      }
      const gancho = malha(new THREE.SphereGeometry(0.045, 12, 8), prataPolida); gancho.position.copy(ate); g.add(gancho)
    }
    g.add(correntes)
    const prato = malha(torno([[0.0001, 0], [0.3, 0.02], [0.66, 0.13], [0.94, 0.33], [1.02, 0.41], [1.08, 0.45], [1.1, ABA], [1.06, 0.49], [1.0, 0.44], [0.9, 0.36], [0.64, 0.19], [0.3, 0.09], [0.0001, 0.07]]), prata); prato.position.y = Y_PRATO; g.add(prato)
    const friso = malha(new THREE.TorusGeometry(1.085, 0.022, 10, 96), prataPolida); friso.rotation.x = Math.PI / 2; friso.position.y = Y_PRATO + ABA; g.add(friso)
    const pingente = malha(torno([[0.0001, 0], [0.05, 0.05], [0.1, 0.14], [0.06, 0.22], [0.12, 0.27], [0.0001, 0.3]], 24), prataPolida); pingente.position.y = Y_PRATO - 0.28; g.add(pingente)
    return g
  })
  const FUNDO_PRATO = Y_PRATO + 0.1

  // ── Pesos do dia a dia (esquerda) e fichas do HiAdv (direita)
  const pesos = Array.from({ length: 6 }, (_, i) => { const m = malha(new THREE.BoxGeometry(0.4, 0.16 + (i % 3) * 0.07, 0.3), prata); m.visible = false; pratos[0]!.add(m); return m })
  const fichaGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.07, 48)
  const fichas = Array.from({ length: 5 }, () => { const m = malha(fichaGeo, vidro); m.visible = false; pratos[1]!.add(m); return m })

  // ── Processos: trilho de etapas atrás da balança
  const trilho = new THREE.Group(); cenario.add(trilho)
  const curva = new THREE.CatmullRomCurve3([new THREE.Vector3(-10, 0.5, -4), new THREE.Vector3(-4.5, 1.5, -2.6), new THREE.Vector3(0, 0.9, -3.6), new THREE.Vector3(4.5, 1.7, -2.6), new THREE.Vector3(10, 0.7, -4)])
  const fioTrilho = new THREE.Mesh(new THREE.TubeGeometry(curva, 200, 0.022, 8), neon); trilho.add(fioTrilho)
  const indicesTrilho = fioTrilho.geometry.index!.count
  const cartao = new THREE.BoxGeometry(0.95, 0.6, 0.05)
  const etapas = Array.from({ length: 7 }, () => { const m = malha(cartao, vidro); trilho.add(m); return m })

  // ── Controladoria: mostrador de prazos em volta do eixo
  const mostrador = new THREE.Group(); mostrador.position.set(0, 4.95, -0.6); cenario.add(mostrador)
  mostrador.add(new THREE.Mesh(new THREE.TorusGeometry(3.7, 0.022, 8, 200), prataPolida))
  mostrador.add(new THREE.Mesh(new THREE.TorusGeometry(4.12, 0.01, 6, 200), prataEscura))
  const marcas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.028, 0.18, 0.028), prataPolida, 60), marcasFortes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.045, 0.36, 0.045), bordo, 12)
  const eu = new THREE.Euler(), qq = new THREE.Quaternion(), pp = new THREE.Vector3(), ss = new THREE.Vector3(1, 1, 1)
  for (let k = 0; k < 60; k++) { const a = (k / 60) * Math.PI * 2; pp.set(Math.cos(a) * 3.92, Math.sin(a) * 3.92, 0); qq.setFromEuler(eu.set(0, 0, a - Math.PI / 2)); mtx.compose(pp, qq, ss); marcas.setMatrixAt(k, mtx); if (k % 5 === 0) marcasFortes.setMatrixAt(k / 5, mtx) }
  mostrador.add(marcas, marcasFortes)
  const ponteiro = new THREE.Mesh(new THREE.BoxGeometry(0.045, 3.3, 0.045), neon); ponteiro.geometry.translate(0, 1.65, 0); mostrador.add(ponteiro)

  // ── Gestão: colunas de indicadores em arco
  const colunaGeo = new THREE.BoxGeometry(0.56, 1, 0.56); colunaGeo.translate(0, 0.5, 0)
  const colunas = Array.from({ length: 9 }, (_, i) => {
    const a = -0.9 + (i / 8) * 1.8
    const m = malha(colunaGeo, i === 6 ? bordo : prataPolida); m.position.set(Math.sin(a) * 6.6, 0, -Math.cos(a) * 6.6 + 1.4); m.rotation.y = -a; m.scale.y = 0.001; cenario.add(m)
    return { m, alvo: [1.2, 2.1, 1.6, 2.8, 2.3, 3.4, 4.6, 3.9, 5.2][i]! }
  })

  // ── Time: pessoas em órbita, ligadas por fios de luz
  const time = new THREE.Group(); time.position.y = 3; cenario.add(time)
  const esfP = new THREE.SphereGeometry(0.16, 32, 16), esfG = new THREE.SphereGeometry(0.25, 32, 16)
  const pessoas = Array.from({ length: 12 }, (_, i) => { const m = malha(i % 4 ? esfP : esfG, i % 4 ? prataPolida : bordo); time.add(m); return m })
  const ligacoes = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: BORDO_VIVO, transparent: true, opacity: 0.6 }))
  const posLig = new Float32Array(12 * 2 * 6); ligacoes.geometry.setAttribute('position', new THREE.BufferAttribute(posLig, 3)); ligacoes.frustumCulled = false; time.add(ligacoes)

  // ── Lucros: linha que sobe e moedas
  const subida = new THREE.CatmullRomCurve3([new THREE.Vector3(-6, 0.3, 0.9), new THREE.Vector3(-3, 1.2, 0.7), new THREE.Vector3(-1, 1.0, 0.9), new THREE.Vector3(1.5, 2.6, 0.7), new THREE.Vector3(3.5, 3.2, 0.9), new THREE.Vector3(6.2, 5.8, 0.7)])
  const linhaLucro = new THREE.Mesh(new THREE.TubeGeometry(subida, 300, 0.05, 12), neon)
  linhaLucro.geometry.setDrawRange(0, 0); cenario.add(linhaLucro)
  const totalIndices = linhaLucro.geometry.index!.count
  const moedaGeo = torno([[0.0001, -0.03], [0.27, -0.03], [0.3, -0.015], [0.3, 0.015], [0.27, 0.03], [0.24, 0.018], [0.0001, 0.018]], 40)
  const moedas = Array.from({ length: 14 }, (_, i) => { const m = malha(moedaGeo, prataPolida); m.position.set(-5 + i * 0.8, -1, 1.1 + Math.sin(i) * 0.4); cenario.add(m); return m })

  // ── Fechamento: o martelo e a base de som
  const martelo = new THREE.Group(); martelo.position.set(3.4, 0, 4.6); martelo.rotation.y = -0.45; cenario.add(martelo)
  martelo.add(malha(torno([[0.0001, 0], [0.86, 0], [0.9, 0.04], [0.9, 0.2], [0.84, 0.25], [0.7, 0.27], [0.68, 0.33], [0.6, 0.36], [0.0001, 0.36]]), prata))
  const braco = new THREE.Group(); braco.position.set(-2.3, 0.98, 0); martelo.add(braco) // gira em torno da ponta do cabo
  const cabo = malha(torno(perfil([[0, 0.05], [0.1, 0.1], [0.3, 0.085], [0.9, 0.06], [1.6, 0.05], [2.0, 0.07], [2.1, 0.11], [2.2, 0.06]]), 32), bordo); cabo.rotation.z = -Math.PI / 2; braco.add(cabo)
  const cabeca = malha(torno(perfil([[-0.62, 0.0001], [-0.6, 0.3], [-0.52, 0.34], [-0.44, 0.28], [-0.36, 0.33], [-0.28, 0.24], [0, 0.22], [0.28, 0.24], [0.36, 0.33], [0.44, 0.28], [0.52, 0.34], [0.6, 0.3], [0.62, 0.0001]], 8), 48), prataPolida)
  cabeca.position.set(2.3, 0, 0); braco.add(cabeca)

  // ── Pós-processamento: suavização, foco de lente e brilho (só no computador)
  let composer: EffectComposer | null = null, lente: BokehPass | null = null, brilho: UnrealBloomPass | null = null
  if (!celular) {
    composer = new EffectComposer(r, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }))
    composer.addPass(new RenderPass(cenario, cam))
    lente = new BokehPass(cenario, cam, { focus: 14, aperture: 0.00035, maxblur: 0.003 }); composer.addPass(lente)
    brilho = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.1, 0.4, 1); composer.addPass(brilho)
    composer.addPass(new OutputPass())
  }
  const medir = () => { const w = win.innerWidth, h = win.innerHeight; r.setPixelRatio(dpr); r.setSize(w, h, false); composer?.setPixelRatio(dpr); composer?.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix() }
  medir(); win.addEventListener('resize', medir)

  // ── Câmera por capítulo (posição e para onde olha)
  const CAM: [number, number, number, number, number, number][] = [
    [0, 4.8, 21, 0, 6.2, 0], [-1.6, 3.9, 12.5, -0.7, 3.2, 0], [1.4, 4.1, 12.5, 0.5, 3.3, 0], [0, 3.2, 15, 0, 2.2, -2],
    [0, 4.95, 13.5, 0, 4.7, 0], [0, 5.6, 17, 0, 2.3, -1], [3.2, 3.8, 13.5, 0, 3, 0], [0, 3.3, 14.5, 0, 2.7, 0], [-0.7, 2.8, 17, -1.9, 3.0, 0],
  ]
  const n = CAPITULOS.length
  const estado = { p: reduzir ? 1 : 0, mx: 0, my: 0 }
  const visto = { p: estado.p }
  if (!reduzir) {
    ScrollTrigger.create({ trigger: cena.querySelector('.cn7-caps')!, start: 'top top', end: 'bottom bottom', onUpdate: (st) => { estado.p = st.progress } })
    win.addEventListener('pointermove', (ev) => { estado.mx = ev.clientX / win.innerWidth - 0.5; estado.my = ev.clientY / win.innerHeight - 0.5 }, { passive: true })
    // textos: só opacidade e posição (leves para a placa de vídeo), presos à rolagem
    cena.querySelectorAll<HTMLElement>('.cn7-bloco').forEach((b, k) => gsap.timeline({ scrollTrigger: { trigger: b.parentElement!, start: k ? 'top 70%' : 'top top', end: 'bottom 30%', scrub: 0.6 } })
      .fromTo(b, { opacity: k ? 0 : 1, y: k ? 70 : 0 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' })
      .to(b, { opacity: 1, duration: 0.4 }).to(b, { opacity: 0, y: -70, duration: 0.3, ease: 'power2.in' }))
  }
  const alvoCam = new THREE.Vector3(), olhar = new THREE.Vector3(0, 6.2, 0), olharAlvo = new THREE.Vector3(), centro = new THREE.Vector3(0, 3.4, 0)
  const relogio = new THREE.Clock()
  let visivel = true
  new IntersectionObserver(([en]) => { visivel = en!.isIntersecting }).observe(cena)
  canvas.classList.add('cn7-pronto')

  // qualidade que se adapta: se os quadros ficarem lentos, desliga o que pesa (foco → espelho e nitidez → brilho)
  const travada = /[?&]q=max/.test(win.location.search) // para conferir a cena com tudo ligado
  let nivel = 0, somaMs = 0, quadros = 0, ultimo = win.performance.now()
  const ajustarQualidade = () => {
    const agora = win.performance.now(); const dt = Math.min(100, agora - ultimo); ultimo = agora
    somaMs += dt; quadros++
    if (quadros < 80 || travada) return
    const novo = degrauQualidade(nivel, somaMs / quadros); somaMs = 0; quadros = 0
    if (novo === nivel) return
    nivel = novo
    if (nivel >= 1 && lente) lente.enabled = false
    if (nivel >= 2) { if (espelho) espelho.visible = false; (piso.material as THREE.MeshStandardMaterial).opacity = 1; dpr = Math.min(dpr, 1.25); medir() }
    if (nivel >= 3) { if (brilho) brilho.enabled = false; dpr = 1; medir() }
  }

  const quadro = () => {
    const dt = Math.min(0.25, relogio.getDelta()), t = relogio.elapsedTime
    // suavização pelo tempo (e não por quadro): a cena acompanha a rolagem igual em aparelho rápido ou lento
    const k1 = reduzir ? 1 : 1 - Math.exp(-dt * 5.5), k2 = reduzir ? 1 : 1 - Math.exp(-dt * 4.5)
    visto.p += (estado.p - visto.p) * k1
    const p = visto.p, seg = p * (n - 1), cs = Math.min(n - 1, seg + 0.45), i = Math.min(n - 2, Math.floor(cs)), f = suave(cs - i)
    const c0 = CAM[i]!, c1 = CAM[i + 1]!
    const longe = cam.aspect < 0.9 ? 1 + (0.9 - cam.aspect) * 1.2 : 1 // celular em pé: câmera mais longe para a balança caber
    const lat = cam.aspect < 0.9 ? 0.15 : 1 // celular: sem deslocar a balança para o lado, o texto fica embaixo
    alvoCam.set((c0[0] + (c1[0] - c0[0]) * f) * lat + estado.mx * 0.7, c0[1] + (c1[1] - c0[1]) * f - estado.my * 0.4 + (longe - 1) * 1.5, (c0[2] + (c1[2] - c0[2]) * f) * longe)
    olharAlvo.set((c0[3] + (c1[3] - c0[3]) * f) * lat, c0[4] + (c1[4] - c0[4]) * f, c0[5] + (c1[5] - c0[5]) * f)
    cam.position.lerp(alvoCam, k2); olhar.lerp(olharAlvo, k2); cam.lookAt(olhar)
    if (lente) (lente.uniforms as Record<string, { value: number }>).focus!.value = cam.position.distanceTo(centro)
    const cap = (k: number) => trecho(seg, k - 0.85, k - 0.15) // já está montado quando o texto do capítulo k aparece
    const sai = (k: number) => 1 - trecho(seg, k + 0.35, k + 0.85)

    // abertura: a balança sobe do chão, girando devagar
    const subiu = reduzir ? 1 : 1 - Math.pow(1 - Math.min(1, t / 2.8), 4)
    balanca.position.y = -7 * (1 - subiu)
    balanca.rotation.y = (1 - subiu) * -1.2 + Math.sin(t * 0.22) * 0.08 + Math.sin(p * Math.PI * 2) * 0.55 // balança de frente na abertura, na controladoria e no fim
    // desequilíbrio → equilíbrio
    const peso = cap(1), equi = cap(2)
    pesos.forEach((m, k) => { const en = limitar(peso * 6 - k); m.visible = en > 0; m.position.set(((k % 3) - 1) * 0.36, FUNDO_PRATO + 0.1 + Math.floor(k / 3) * 0.22 + Math.pow(1 - en, 2) * 3.4, (k % 2) * 0.24 - 0.12); m.rotation.y = k * 0.7 })
    fichas.forEach((m, k) => { const en = limitar(equi * 5 - k); m.visible = en > 0; m.position.set(Math.sin(k * 2.1) * 0.05, FUNDO_PRATO + 0.06 + k * 0.075 + Math.pow(1 - en, 2) * 3.4, Math.cos(k * 1.7) * 0.05) })
    // ao equilibrar, o travessão passa um pouco do ponto e assenta (como metal de verdade)
    const assenta = Math.sin(equi * Math.PI * 3) * (1 - equi) * 0.06
    const inclina = (peso - equi) * 0.3 + assenta + Math.sin(t * 1.1) * 0.012 * (1 - equi * 0.6)
    travessao.rotation.z = inclina
    pratos.forEach((g, k) => { g.rotation.z = -inclina + Math.sin(t * 1.4 + k * 2) * 0.012 })
    bordo.emissiveIntensity = 0.25 + equi * 0.45 * sai(2)
    // processos: o fio de luz se desenha e os cartões das etapas correm por ele
    const proc = cap(3) * sai(3)
    trilho.visible = proc > 0.01
    fioTrilho.geometry.setDrawRange(0, Math.floor((indicesTrilho / 3) * proc) * 3)
    etapas.forEach((m, k) => { const u = ((k / etapas.length) + t * 0.035) % 1; curva.getPointAt(u, m.position); m.position.y += 0.36; m.lookAt(cam.position); m.scale.setScalar(Math.max(0.001, proc * Math.sqrt(Math.sin(u * Math.PI)))) })
    // controladoria
    const ctrl = cap(4) * sai(4)
    mostrador.visible = ctrl > 0.01; mostrador.scale.setScalar(0.7 + ctrl * 0.3); mostrador.rotation.z = (1 - ctrl) * 0.8
    ponteiro.rotation.z = -t * 0.7
    // gestão
    const gest = cap(5) * sai(5)
    colunas.forEach((c, k) => { const en = limitar(gest * 1.7 - k * 0.08); c.m.scale.y = Math.max(0.001, (1 - Math.pow(1 - en, 3)) * c.alvo); c.m.visible = en > 0.001 })
    // time
    const eq = cap(6) * sai(6)
    time.visible = eq > 0.01
    pessoas.forEach((m, k) => { const a = (k / 12) * Math.PI * 2 + t * (k % 2 ? 0.22 : -0.16); const raio = (k % 3 === 0 ? 3.5 : 4.7) * eq; m.position.set(Math.cos(a) * raio, Math.sin(a * 2 + k) * 0.8 * eq, Math.sin(a) * raio * 0.6) })
    let j = 0
    for (let k = 0; k < 12; k++) for (const o of [1, 4]) { const a = pessoas[k]!.position, b = pessoas[(k + o) % 12]!.position; posLig[j++] = a.x; posLig[j++] = a.y; posLig[j++] = a.z; posLig[j++] = b.x; posLig[j++] = b.y; posLig[j++] = b.z }
    ligacoes.geometry.attributes.position!.needsUpdate = true; (ligacoes.material as THREE.LineBasicMaterial).opacity = 0.5 * eq
    // lucros
    const luc = cap(7) * sai(7)
    linhaLucro.visible = luc > 0.005; linhaLucro.geometry.setDrawRange(0, Math.floor((totalIndices / 3) * limitar(luc * 1.2)) * 3)
    moedas.forEach((m, k) => { const en = limitar(luc * 1.5 - k * 0.05); m.position.y = -1 + suave(en) * (0.7 + k * 0.36); m.rotation.x = Math.PI / 2 + Math.sin(t + k) * 0.3; m.rotation.z = t * 1.2 + k; m.visible = en > 0 })
    // fechamento: o martelo desce e bate; um clarão quente marca a decisão
    const entra = trecho(seg, 7.0, 7.4), golpe = limitar((seg - 7.45) / 0.3)
    martelo.visible = entra > 0.01; martelo.scale.setScalar(Math.max(0.001, entra))
    const desce = golpe * golpe * golpe
    braco.rotation.z = 0.95 * (1 - desce) + Math.sin(limitar((seg - 7.75) / 0.12) * Math.PI) * 0.06 // pequeno quique depois da batida
    batida.intensity = Math.sin(limitar((seg - 7.74) / 0.14) * Math.PI) * 9
    // a balança recua um pouco nos capítulos de conteúdo e volta inteira no fim
    const fundo = limitar(seg - 2.5) * (1 - trecho(seg, 7.2, 8))
    balanca.scale.setScalar(1 - fundo * 0.22)
    contra.intensity = 90 + Math.sin(t * 0.7) * 12 + trecho(seg, 7.4, 8) * 70
    chave.intensity = 95 - fundo * 25

    if (composer) composer.render(); else r.render(cenario, cam)
  }
  if (reduzir) { quadro(); setTimeout(quadro, 1500); win.addEventListener('resize', () => quadro()); return }
  gsap.ticker.add(() => { if (!visivel || document.hidden) { ultimo = win.performance.now(); return } quadro(); ajustarQualidade() })
}
