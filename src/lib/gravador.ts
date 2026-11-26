/**
 * Gravação da chamada no próprio computador de quem grava (nada vai para o servidor).
 * Captura a aba/tela escolhida e mistura as vozes da chamada (a sua e a dos outros) num único arquivo.
 */
export type Gravacao = { parar: () => Promise<Blob>; aoTerminar: (fn: () => void) => void }

/** Primeiro formato que o navegador sabe gravar. */
export function formatoGravacao(suporta: (m: string) => boolean): string {
  return ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(suporta) ?? ''
}

/** Nome do arquivo com a data invertida, como o escritório organiza: chamada_2026_11_26-17h54.webm */
export function nomeGravacao(d: Date, tipo: string): string {
  const z = (n: number) => String(n).padStart(2, '0')
  return `chamada_${d.getFullYear()}_${z(d.getMonth() + 1)}_${z(d.getDate())}-${z(d.getHours())}h${z(d.getMinutes())}.${tipo.includes('mp4') ? 'mp4' : 'webm'}`
}

export async function gravarChamada(vozes: MediaStream[]): Promise<Gravacao> {
  const tela = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: { ideal: 30 }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: true,
    preferCurrentTab: true, selfBrowserSurface: 'include', surfaceSwitching: 'include',
  } as DisplayMediaStreamOptions)
  const ctx = new AudioContext()
  const destino = ctx.createMediaStreamDestination()
  for (const s of [...vozes, tela]) if (s.getAudioTracks().length) ctx.createMediaStreamSource(new MediaStream(s.getAudioTracks())).connect(destino)
  const mistura = new MediaStream([...tela.getVideoTracks(), ...destino.stream.getAudioTracks()])
  const tipo = formatoGravacao((m) => MediaRecorder.isTypeSupported(m))
  const rec = new MediaRecorder(mistura, { ...(tipo ? { mimeType: tipo } : {}), videoBitsPerSecond: 5_000_000, audioBitsPerSecond: 128_000 })
  const partes: Blob[] = []
  rec.ondataavailable = (e) => { if (e.data.size) partes.push(e.data) }
  let fim: () => void = () => {}
  const terminou = new Promise<Blob>((ok) => { rec.onstop = () => { tela.getTracks().forEach((t) => t.stop()); void ctx.close(); ok(new Blob(partes, { type: rec.mimeType || 'video/webm' })); fim() } })
  // a pessoa clicou em "Parar compartilhamento" na barra do navegador
  tela.getVideoTracks()[0]?.addEventListener('ended', () => { if (rec.state !== 'inactive') rec.stop() })
  rec.start(1000)
  return {
    parar: () => { if (rec.state !== 'inactive') rec.stop(); return terminou },
    aoTerminar: (fn) => { fim = fn },
  }
}
