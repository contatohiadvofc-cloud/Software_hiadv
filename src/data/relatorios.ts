export type Relatorio = {
  dias: number
  casos: { abertos: number; novos: number; encerrados: number }
  etapas: { area: string; etapa: string; casos: number; media_dias: number; maior_dias: number }[]
  ciclo: { area: string; casos: number; media_dias: number }[]
  pessoas: { email: string; nome: string; abertas: number; atrasadas: number; feitas: number; casos: number }[]
  clientes: { total: number; novos: number; origens: { origem: string; n: number }[] }
  prazos: { publicacoes: number; cumpridos: number; em_aberto: number; vencidos: number }
  financeiro: { meses: { mes: string; recebido: number; pago: number }[]; em_atraso: number; a_receber: number; clientes_em_atraso: number }
}

/** Largura relativa (0–100) para as barras, com mínimo visível quando o valor não é zero. */
export function largura(v: number, max: number): number {
  if (!max || v <= 0) return 0
  return Math.max(4, Math.round((v / max) * 100))
}

/** Gargalos: etapas com casos parados há 7 dias ou mais em média, da pior para a melhor. */
export function gargalos(r: Relatorio, minimo = 7): Relatorio['etapas'] {
  return r.etapas.filter((e) => e.media_dias >= minimo).sort((a, b) => b.media_dias - a.media_dias || b.casos - a.casos)
}

export const mesCurto = (m: string) => ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m.slice(5, 7)) - 1] + '/' + m.slice(2, 4)
