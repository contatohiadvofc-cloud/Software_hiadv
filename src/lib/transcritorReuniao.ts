// Transcrição da chamada: cada aparelho grava só a própria voz em pedaços curtos e manda para virar texto.
// Pedaço sem fala é descartado; o áudio não fica guardado em lugar nenhum, só o texto.
import { nivelVoz } from '../data/chamada'

export const PEDACO_MS = 25_000
export const LIMIAR_FALA = 0.05
/** Só manda o pedaço se teve fala por pelo menos ~1 s. */
export const teveFala = (amostrasComFala: number, intervaloMs: number) => amostrasComFala * intervaloMs >= 1000

export function iniciarTranscritor(faixa: MediaStreamTrack, enviar: (b: Blob) => Promise<void>): () => void {
  if (typeof MediaRecorder === 'undefined') return () => {}
  const copia = faixa.clone()
  const stream = new MediaStream([copia])
  const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  const ctx = C ? new C() : null
  const an = ctx?.createAnalyser()
  if (ctx && an) { an.fftSize = 512; ctx.createMediaStreamSource(stream).connect(an) }
  const buf = new Uint8Array(512)
  let comFala = 0
  const INTERVALO = 150
  const medir = setInterval(() => { copia.enabled = faixa.enabled; if (!an || !faixa.enabled) return; an.getByteTimeDomainData(buf); if (nivelVoz(buf) > LIMIAR_FALA) comFala++ }, INTERVALO)
  const tipo = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t))
  let ativo = true
  let rec: MediaRecorder | null = null
  function novo() {
    if (!ativo) return
    const partes: Blob[] = []
    comFala = 0
    rec = new MediaRecorder(stream, { ...(tipo ? { mimeType: tipo } : {}), audioBitsPerSecond: 24000 })
    rec.ondataavailable = (e) => { if (e.data.size) partes.push(e.data) }
    rec.onstop = () => {
      const falou = teveFala(comFala, INTERVALO)
      if (falou && partes.length) void enviar(new Blob(partes, { type: (rec?.mimeType || 'audio/webm').split(';')[0] })).catch(() => {})
      novo()
    }
    rec.start()
    setTimeout(() => { if (rec?.state === 'recording') rec.stop() }, PEDACO_MS)
  }
  novo()
  return () => {
    ativo = false
    clearInterval(medir)
    try { if (rec?.state === 'recording') rec.stop() } catch { /* já parou */ }
    stream.getTracks().forEach((t) => t.stop())
    void ctx?.close().catch(() => {})
  }
}
