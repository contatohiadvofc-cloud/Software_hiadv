// Tratamento da voz antes de gravar o áudio da conversa (tudo no próprio aparelho):
// corta o ronco grave, realça a clareza da fala, nivela o volume, abaixa o chiado nas pausas
// e limita os picos para não estourar. O resultado sai mais alto e mais limpo.
import { nivelVoz } from '../data/chamada'

export type MicLimpo = { stream: MediaStream; nivel: () => number; parar: () => void }

/** Constantes do tratamento (testadas em celular e computador). */
export const AJUSTE = { corteGrave: 90, corteAgudo: 9000, presencaHz: 3000, presencaDb: 4, ganho: 2.4, portao: 0.035, piso: 0.12 } as const

/** Ganho do "portão de ruído": volume cheio quando há fala, baixo nas pausas. */
export const ganhoPortao = (nivel: number) => (nivel >= AJUSTE.portao ? 1 : AJUSTE.piso)

export async function abrirMicLimpo(): Promise<MicLimpo> {
  const bruto = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 48000 },
  })
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return { stream: bruto, nivel: () => 0, parar: () => bruto.getTracks().forEach((t) => t.stop()) }
  const ctx = new Ctx({ sampleRate: 48000 })
  if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
  const fonte = ctx.createMediaStreamSource(bruto)
  const grave = new BiquadFilterNode(ctx, { type: 'highpass', frequency: AJUSTE.corteGrave, Q: 0.7 })
  const agudo = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: AJUSTE.corteAgudo, Q: 0.7 })
  const presenca = new BiquadFilterNode(ctx, { type: 'peaking', frequency: AJUSTE.presencaHz, Q: 1, gain: AJUSTE.presencaDb })
  const nivelador = new DynamicsCompressorNode(ctx, { threshold: -32, knee: 12, ratio: 4, attack: 0.004, release: 0.25 })
  const volume = new GainNode(ctx, { gain: AJUSTE.ganho })
  const portao = new GainNode(ctx, { gain: 1 })
  const limitador = new DynamicsCompressorNode(ctx, { threshold: -2, knee: 0, ratio: 20, attack: 0.001, release: 0.08 })
  const medidor = new AnalyserNode(ctx, { fftSize: 1024 })
  const saida = ctx.createMediaStreamDestination()
  fonte.connect(grave).connect(agudo).connect(presenca).connect(nivelador).connect(volume).connect(portao).connect(limitador).connect(saida)
  fonte.connect(medidor)
  const buf = new Uint8Array(medidor.fftSize)
  let ultimo = 0
  const t = setInterval(() => {
    medidor.getByteTimeDomainData(buf)
    ultimo = nivelVoz(buf)
    portao.gain.setTargetAtTime(ganhoPortao(ultimo), ctx.currentTime, ultimo >= AJUSTE.portao ? 0.01 : 0.12)
  }, 30)
  return {
    stream: saida.stream,
    nivel: () => ultimo,
    parar: () => { clearInterval(t); bruto.getTracks().forEach((x) => x.stop()); void ctx.close().catch(() => {}) },
  }
}
