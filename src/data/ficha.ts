import { telaParaValor, type CampoDef } from './campos'
import type { Etapa } from './quadro'

export type ItemChecklist = { item: string; rotulo: string; feito: boolean }
export type EventoHistorico = { evento: string; de: string | null; para: string | null; detalhe: string | null; quem: string | null; em: string }
export type Ficha = {
  id: string
  cliente: string
  status: string
  area: string
  produto: string | null
  numeroCnj: string | null
  campos: Record<string, unknown>
  defs: CampoDef[]
  checklist: ItemChecklist[]
  historico: EventoHistorico[]
  etapas: Etapa[]
}

/** Texto curto de um evento do histórico, para a linha do tempo da ficha. */
export function textoEvento(h: EventoHistorico): string {
  if (h.evento === 'status' && h.para) return h.de ? `Mudou de “${h.de}” para “${h.para}”` : `Entrou em “${h.para}”`
  if (h.detalhe) return h.detalhe
  return h.evento.charAt(0).toUpperCase() + h.evento.slice(1)
}

/** Só o que mudou em relação ao que está gravado (o servidor registra no histórico). */
export function diferencas(defs: CampoDef[], gravado: Record<string, unknown>, rascunho: Record<string, string>): Record<string, string> {
  const fora: Record<string, string> = {}
  for (const d of defs) {
    if (!(d.chave in rascunho)) continue
    const antes = gravado[d.chave] === null || gravado[d.chave] === undefined ? '' : String(gravado[d.chave])
    const agora = rascunho[d.chave].trim()
    if ((d.tipo === 'moeda' || d.tipo === 'numero') && agora && antes) {
      const n = telaParaValor(d, agora)
      if (Number(n) !== Number(antes)) fora[d.chave] = n
      continue
    }
    if (agora !== antes) fora[d.chave] = d.tipo === 'moeda' || d.tipo === 'numero' ? telaParaValor(d, agora) : agora
  }
  return fora
}

/** Valor inicial do campo no formulário de edição. */
export function valorParaEdicao(d: CampoDef, v: unknown): string {
  if (v === null || v === undefined) return ''
  if (d.tipo === 'moeda') return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false })
  if (d.tipo === 'numero') return String(v).replace('.', ',')
  return String(v)
}
