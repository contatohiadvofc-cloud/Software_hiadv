// Ditado por voz (Web Speech API do navegador, em português). Some quando o aparelho não oferece.
type Reconhecimento = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; abort(): void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null }

function construtor(): (new () => Reconhecimento) | null {
  const w = window as unknown as { SpeechRecognition?: new () => Reconhecimento; webkitSpeechRecognition?: new () => Reconhecimento }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}
export const vozDisponivel = () => typeof window !== 'undefined' && !!construtor()

/** Ouve uma frase e devolve o texto aos poucos (parcial) e no fim. Retorna a função que para. */
export function ouvir(aoTexto: (t: string, final: boolean) => void, aoFim: (erro?: string) => void): () => void {
  const C = construtor()
  if (!C) { aoFim('indisponivel'); return () => {} }
  const r = new C()
  r.lang = 'pt-BR'; r.interimResults = true; r.continuous = false
  r.onresult = (e) => {
    let t = ''; let final = false
    for (let i = 0; i < e.results.length; i++) { t += e.results[i]![0]!.transcript; if (e.results[i]!.isFinal) final = true }
    aoTexto(t.trim(), final)
  }
  r.onerror = (e) => aoFim(e.error)
  r.onend = () => aoFim()
  try { r.start() } catch { aoFim('falhou') }
  return () => { try { r.stop() } catch { /* já parou */ } }
}
