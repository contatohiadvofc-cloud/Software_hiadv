// Chamada de voz e vídeo da equipe: o áudio e o vídeo vão direto entre os aparelhos (WebRTC, criptografado).
// O servidor só "apresenta" os aparelhos por um canal privado. Nada é gravado.

export type Presenca = { id: string; email: string; nome: string; video: boolean }
export type Estado = { mic: boolean; cam: boolean }
export type Sinal = { de: string; para: string; email: string; descricao?: RTCSessionDescriptionInit; candidato?: RTCIceCandidateInit; estado?: Estado }

export interface CanalChamada {
  aoSinal(fn: (s: Sinal) => void): void
  aoPresenca(fn: (vivos: Presenca[]) => void): void
  /** Entra no canal e se anuncia. Rejeita se o canal não abrir. */
  entrar(eu: Presenca): Promise<void>
  enviar(s: Sinal): void
  sair(): void
}

export const ICE: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: 'stun:stun.cloudflare.com:3478' },
]

/** Menos gente na chamada = mais qualidade por pessoa; mais gente = vídeo mais leve para não travar. */
export function qualidadeVideo(pessoas: number): { maxBitrate: number; escala: number } {
  if (pessoas <= 1) return { maxBitrate: 1_200_000, escala: 1 }
  if (pessoas <= 3) return { maxBitrate: 600_000, escala: 1.5 }
  if (pessoas <= 5) return { maxBitrate: 320_000, escala: 2 }
  // chamadas grandes (até 13 no Sênior): cada aparelho envia um vídeo para cada pessoa, então o vídeo fica bem leve
  return { maxBitrate: 160_000, escala: 3 }
}

/** Quem tem o identificador maior liga; o outro só responde (evita as duas pontas ligando juntas). */
export const devoLigar = (meuId: string, outroId: string) => meuId > outroId

export function cronometro(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`
}

/** Nível de voz (0 a 1) a partir das amostras do analisador: acima de 0,06 a pessoa está falando. */
export function nivelVoz(amostras: Uint8Array): number {
  let soma = 0
  for (const a of amostras) { const v = (a - 128) / 128; soma += v * v }
  return Math.min(1, Math.sqrt(soma / Math.max(1, amostras.length)) * 4)
}
export const FALANDO = 0.06
