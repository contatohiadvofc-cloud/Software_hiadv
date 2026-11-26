// Canal de chamada entre abas do mesmo navegador (prévia e testes): mesma interface do canal real,
// mas a sinalização passa por BroadcastChannel. Áudio e vídeo continuam indo por WebRTC de verdade.
import type { CanalChamada, Presenca, Sinal } from './chamada'

type Msg = { tipo: 'oi' | 'estou' | 'tchau'; p: Presenca } | { tipo: 'sinal'; s: Sinal }

export function canalLocal(id: string): CanalChamada | null {
  if (typeof BroadcastChannel === 'undefined') return null
  const bc = new BroadcastChannel(`hiadv-chamada-${id}`)
  const vivos = new Map<string, { p: Presenca; em: number }>()
  let eu: Presenca | null = null
  let aoSinal: (s: Sinal) => void = () => {}
  let aoPresenca: (v: Presenca[]) => void = () => {}
  let pulso: ReturnType<typeof setInterval> | undefined
  const avisar = () => aoPresenca([...(eu ? [eu] : []), ...[...vivos.values()].map((v) => v.p)])
  bc.onmessage = (e: MessageEvent<Msg>) => {
    const m = e.data
    if (m.tipo === 'sinal') { if (eu && m.s.para === eu.id) aoSinal(m.s); return }
    if (m.tipo === 'tchau') { vivos.delete(m.p.id); avisar(); return }
    const novo = !vivos.has(m.p.id)
    vivos.set(m.p.id, { p: m.p, em: Date.now() })
    if (m.tipo === 'oi' && eu) bc.postMessage({ tipo: 'estou', p: eu } satisfies Msg)
    if (novo) avisar()
  }
  return {
    aoSinal(fn) { aoSinal = fn },
    aoPresenca(fn) { aoPresenca = fn },
    async entrar(p) {
      eu = p
      bc.postMessage({ tipo: 'oi', p } satisfies Msg)
      avisar()
      pulso = setInterval(() => {
        bc.postMessage({ tipo: 'estou', p } satisfies Msg)
        const antes = vivos.size
        for (const [k, v] of vivos) if (Date.now() - v.em > 6000) vivos.delete(k)
        if (vivos.size !== antes) avisar()
      }, 2000)
    },
    enviar(s) { bc.postMessage({ tipo: 'sinal', s } satisfies Msg) },
    sair() { clearInterval(pulso); if (eu) bc.postMessage({ tipo: 'tchau', p: eu } satisfies Msg); bc.close() },
  }
}
