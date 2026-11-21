import { telaParaValor, type CampoDef } from './campos'
import type { Etapa } from './quadro'

export type ItemChecklist = { item: string; rotulo: string; feito: boolean; data: string | null }
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
  /** Só nas áreas previdenciárias: NB, DIB, DCB, acidente, sequela… (colunas próprias do caso) */
  beneficio: Record<string, unknown> | null
  checklist: ItemChecklist[]
  historico: EventoHistorico[]
  etapas: Etapa[]
}

/** Texto curto de um evento do histórico, para a linha do tempo da ficha. */
export function textoEvento(h: EventoHistorico): string {
  if (h.evento === 'status' && h.para) return h.de ? `Mudou de “${h.de}” para “${h.para}”` : `Entrou em “${h.para}”`
  if (h.evento === 'checklist') return h.para === 'desmarcado' ? 'Desmarcou um item do checklist' : 'Marcou um item do checklist'
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

export const AREAS_PREVIDENCIARIAS = ['administrativo', 'judicial']

/** Campos do benefício (colunas do caso), na ordem em que aparecem na ficha. */
export const BENEFICIO_DEFS: CampoDef[] = [
  { chave: 'nb', rotulo: 'NB', tipo: 'texto', opcoes: null, ordem: 1, noCartao: false },
  { chave: 'protocolo_adm', rotulo: 'Protocolo', tipo: 'texto', opcoes: null, ordem: 2, noCartao: false },
  { chave: 'dib', rotulo: 'DIB', tipo: 'data', opcoes: null, ordem: 3, noCartao: false },
  { chave: 'dcb', rotulo: 'DCB', tipo: 'data', opcoes: null, ordem: 4, noCartao: false },
  { chave: 'data_acidente', rotulo: 'Data do acidente', tipo: 'data', opcoes: null, ordem: 5, noCartao: false },
  { chave: 'uf', rotulo: 'UF', tipo: 'texto', opcoes: null, ordem: 6, noCartao: false },
  { chave: 'profissao_epoca', rotulo: 'Profissão na época', tipo: 'texto', opcoes: null, ordem: 7, noCartao: false },
  { chave: 'causa_acidente', rotulo: 'Causa do acidente', tipo: 'texto', opcoes: null, ordem: 8, noCartao: false },
  { chave: 'sequela', rotulo: 'Sequela', tipo: 'texto_longo', opcoes: null, ordem: 9, noCartao: false },
]
