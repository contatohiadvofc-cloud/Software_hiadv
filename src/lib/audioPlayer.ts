// Coordena os áudios do chat como no WhatsApp: só um toca por vez, a velocidade fica lembrada
// e, ao terminar, o próximo áudio da conversa começa sozinho.

const CHAVE_VEL = 'hiadv-audio-vel'
export const VELOCIDADES = [1, 1.5, 2] as const

export function velocidadeSalva(): number {
  try { const v = Number(localStorage.getItem(CHAVE_VEL)); return (VELOCIDADES as readonly number[]).includes(v) ? v : 1 } catch { return 1 }
}
export function proximaVelocidade(v: number): number { const i = VELOCIDADES.indexOf(v as 1); return VELOCIDADES[(i + 1) % VELOCIDADES.length] }
export function salvarVelocidade(v: number) { try { localStorage.setItem(CHAVE_VEL, String(v)) } catch { /* sem armazenamento */ } }

let tocandoAgora: HTMLAudioElement | null = null
/** Pausa o áudio que estava tocando antes deste. */
export function assumir(el: HTMLAudioElement) { if (tocandoAgora && tocandoAgora !== el) tocandoAgora.pause(); tocandoAgora = el }
export function soltar(el: HTMLAudioElement) { if (tocandoAgora === el) tocandoAgora = null }

/** Ao terminar um áudio, toca o próximo áudio da mesma conversa (o seguinte na tela). */
export function tocarProximo(el: HTMLAudioElement) {
  const todos = Array.from(document.querySelectorAll<HTMLAudioElement>('.cv-msgs audio'))
  const i = todos.indexOf(el)
  const prox = i >= 0 ? todos[i + 1] : undefined
  if (prox) { prox.currentTime = 0; void prox.play().catch(() => {}) }
}

/** Ondas de verdade: lê o áudio e resume o volume em N barras (0..1). Fica em cache por endereço. */
const cache = new Map<string, Promise<number[]>>()
export function picos(url: string, n = 32): Promise<number[]> {
  const k = `${url}#${n}`
  if (!cache.has(k)) cache.set(k, (async () => {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) throw new Error('sem WebAudio')
    const buf = await (await fetch(url)).arrayBuffer()
    const ctx = new Ctx()
    try { return resumirPicos((await ctx.decodeAudioData(buf)).getChannelData(0), n) } finally { void ctx.close() }
  })())
  return cache.get(k)!
}

/** Média do volume por fatia, normalizada para o pico mais alto (mínimo visível de 12%). */
export function resumirPicos(dados: ArrayLike<number>, n: number): number[] {
  const tam = Math.max(1, Math.floor(dados.length / n))
  const r: number[] = []
  for (let b = 0; b < n; b++) {
    let s = 0
    for (let i = b * tam, f = Math.min(dados.length, i + tam); i < f; i++) s += Math.abs(dados[i])
    r.push(s / tam)
  }
  const max = Math.max(...r, 1e-6)
  return r.map((v) => Math.max(0.12, Math.min(1, v / max)))
}
