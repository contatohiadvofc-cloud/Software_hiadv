// Som da chamada: alto-falante com volume reforçado e detecção de fone.

const FONE = /fone|headset|headphone|earphone|earbud|buds|airpods|bluetooth|hands-?free|auricular/i

/** Algum fone (com fio ou Bluetooth) conectado? Pelo nome dos aparelhos de áudio. */
export async function temFone(): Promise<boolean> {
  try {
    const lista = await navigator.mediaDevices.enumerateDevices()
    return lista.some((d) => (d.kind === 'audiooutput' || d.kind === 'audioinput') && FONE.test(d.label))
  } catch { return false }
}
export const nomePareceFone = (rotulo: string) => FONE.test(rotulo)

/** Ganho do alto-falante: reforça a voz dos outros sem estourar (limitador logo depois). */
export const GANHO_ALTO = 2.2

/** Toca o áudio dos outros participantes pelo alto-falante, mais alto e sem distorcer. */
export class AltoFalante {
  private ctx: AudioContext | null = null
  private fontes = new Map<MediaStream, MediaStreamAudioSourceNode>()
  private ganho: GainNode | null = null

  ligar() {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!C) return false
    this.ctx = new C()
    this.ganho = new GainNode(this.ctx, { gain: GANHO_ALTO })
    const limitador = new DynamicsCompressorNode(this.ctx, { threshold: -6, knee: 4, ratio: 12, attack: 0.002, release: 0.12 })
    this.ganho.connect(limitador).connect(this.ctx.destination)
    void this.ctx.resume().catch(() => {})
    return true
  }
  /** Mantém a lista de vozes em dia (quem entra e sai da chamada). */
  atualizar(streams: MediaStream[]) {
    if (!this.ctx || !this.ganho) return
    for (const [s, f] of this.fontes) if (!streams.includes(s)) { f.disconnect(); this.fontes.delete(s) }
    for (const s of streams) {
      if (this.fontes.has(s) || !s.getAudioTracks().length) continue
      const f = this.ctx.createMediaStreamSource(s)
      f.connect(this.ganho)
      this.fontes.set(s, f)
    }
  }
  desligar() {
    this.fontes.forEach((f) => f.disconnect()); this.fontes.clear()
    void this.ctx?.close().catch(() => {}); this.ctx = null; this.ganho = null
  }
}
