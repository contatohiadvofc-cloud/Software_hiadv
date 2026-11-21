export type RegistroHoras = { id: string; email: string; nome: string | null; descricao: string | null; dia: string; minutos: number; minha: boolean }
export type NovasHoras = { cliente: string | null; caso: string | null; descricao: string; dia: string; minutos: number }

/** "1h30", "1:30", "90", "90min", "1,5h", "2h" → minutos; null se não der. */
export function lerDuracao(t: string): number | null {
  const s = t.trim().toLowerCase().replace(/\s+/g, '')
  if (!s) return null
  let m: RegExpMatchArray | null
  let min: number | null = null
  if ((m = s.match(/^(\d{1,2}):(\d{2})$/))) min = Number(m[1]) * 60 + Number(m[2])
  else if ((m = s.match(/^(\d{1,2})h(\d{1,2})?(min|m)?$/))) min = Number(m[1]) * 60 + Number(m[2] ?? 0)
  else if ((m = s.match(/^(\d{1,2})[.,](\d{1,2})h?$/))) min = Math.round(Number(`${m[1]}.${m[2]}`) * 60)
  else if ((m = s.match(/^(\d{1,4})(min|m)?$/))) min = Number(m[1])
  return min && min >= 1 && min <= 1440 ? min : null
}

/** 45 → "45 min"; 90 → "1h30"; 120 → "2h". */
export function duracaoTela(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), r = min % 60
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`
}

/** Cronômetro: minutos inteiros desde o início (mínimo 1). */
export function minutosDecorridos(inicio: number, agora: number): number {
  return Math.max(1, Math.round((agora - inicio) / 60000))
}

export function somaMinutos(rs: Pick<RegistroHoras, 'minutos'>[]): number {
  return rs.reduce((t, r) => t + r.minutos, 0)
}
