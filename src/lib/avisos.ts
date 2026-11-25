// Avisos das conversas: som (gerado no próprio aparelho, sem arquivo), janelinha na tela e notificação do sistema.
export type Som = 'suave' | 'duplo' | 'sino' | 'nenhum'
export type PrefsAvisos = { som: Som; popup: boolean; sistema: boolean; chamada: boolean }
export const SONS: { id: Som; nome: string }[] = [
  { id: 'suave', nome: 'Suave' }, { id: 'duplo', nome: 'Duplo' }, { id: 'sino', nome: 'Sino' }, { id: 'nenhum', nome: 'Sem som' },
]
const CHAVE = 'hiadv-avisos'
export const PADRAO: PrefsAvisos = { som: 'suave', popup: true, sistema: true, chamada: true }

export function lerPrefs(): PrefsAvisos {
  try { return { ...PADRAO, ...(JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as Partial<PrefsAvisos>) } } catch { return PADRAO }
}
export function salvarPrefs(p: PrefsAvisos) {
  try { localStorage.setItem(CHAVE, JSON.stringify(p)) } catch { /* só nesta visita */ }
  window.dispatchEvent(new Event('hiadv-avisos'))
}

/** Notas de cada som: [frequência Hz, início s, duração s]. */
export const NOTAS: Record<Exclude<Som, 'nenhum'>, [number, number, number][]> = {
  suave: [[880, 0, 0.18], [1175, 0.12, 0.22]],
  duplo: [[988, 0, 0.1], [988, 0.16, 0.1]],
  sino: [[1319, 0, 0.5], [1760, 0, 0.35]],
}

let ctx: AudioContext | null = null
function contexto(): AudioContext | null {
  const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!C) return null
  ctx ??= new C()
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return ctx
}
/** O navegador só libera som depois de um toque na tela: destrava no primeiro toque. */
export function destravarSom() {
  const f = () => { contexto(); removeEventListener('pointerdown', f) }
  addEventListener('pointerdown', f, { once: true })
}

function notas(lista: [number, number, number][], volume = 0.18) {
  const c = contexto(); if (!c) return
  const t0 = c.currentTime + 0.01
  for (const [hz, ini, dur] of lista) {
    const o = c.createOscillator(), g = c.createGain()
    o.type = 'sine'; o.frequency.value = hz
    g.gain.setValueAtTime(0, t0 + ini)
    g.gain.linearRampToValueAtTime(volume, t0 + ini + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + ini + dur)
    o.connect(g).connect(c.destination)
    o.start(t0 + ini); o.stop(t0 + ini + dur + 0.05)
  }
}
export function tocar(som: Som) { if (som !== 'nenhum') notas(NOTAS[som]) }

/** Toque de chamada: repete até atender, recusar ou passar o tempo. Devolve a função que para. */
export function tocarChamada(limiteMs = 45_000): () => void {
  const um = () => notas([[740, 0, 0.35], [988, 0.4, 0.35], [740, 1.2, 0.35], [988, 1.6, 0.35]], 0.22)
  um()
  const t = setInterval(um, 3000)
  const fim = setTimeout(() => clearInterval(t), limiteMs)
  try { navigator.vibrate?.([400, 200, 400]) } catch { /* sem vibração */ }
  return () => { clearInterval(t); clearTimeout(fim); try { navigator.vibrate?.(0) } catch { /* nada */ } }
}

export function notificarSistema(titulo: string, corpo: string, aoClicar?: () => void) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || document.visibilityState === 'visible') return
  try {
    const n = new Notification(titulo, { body: corpo.slice(0, 140), icon: '/icons/icon-192.png', tag: titulo })
    n.onclick = () => { window.focus(); aoClicar?.(); n.close() }
  } catch { /* alguns celulares só notificam pelo app instalado */ }
}

/** Conversa aberta na tela agora (não avisa de mensagem que a pessoa já está vendo). */
let aberta: string | null = null
export const marcarAberta = (id: string | null) => { aberta = id }
export const estaVendo = (id: string) => aberta === id && document.visibilityState === 'visible'
