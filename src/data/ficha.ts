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
  /** Relato do cliente, em texto livre (base para os agentes). */
  relato: string | null
  /** Só nas áreas previdenciárias: NB, DIB, DCB, acidente, sequela… (colunas próprias do caso) */
  beneficio: Record<string, unknown> | null
  checklist: ItemChecklist[]
  historico: EventoHistorico[]
  etapas: Etapa[]
}

const dataBR = (d: string | null) => d && /^\d{4}-\d{2}-\d{2}/.test(d) ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : (d ?? '')

/** Texto curto de um evento do histórico, para a linha do tempo da ficha. */
export function textoEvento(h: EventoHistorico): string {
  if (h.evento === 'status' && h.para) return h.de ? `Mudou de “${h.de}” para “${h.para}”` : `Entrou em “${h.para}”`
  if (h.evento === 'agente' && h.detalhe) return h.de && h.de !== 'erro' ? `${h.de}: ${h.detalhe}` : h.detalhe
  if (h.evento === 'marco' && h.de === 'protocolo') return `Protocolo registrado: ${h.detalhe ?? ''}`.trim()
  if (h.evento === 'exigencia') return `Exigência registrada (prazo fatal ${dataBR(h.para)}): ${h.detalhe ?? ''}`
  if (h.evento === 'via' && h.para) return `Aberto um caso novo na via “${h.para}”${h.detalhe?.includes(' · ') ? ` (${h.detalhe.split(' · ').slice(1).join(' · ')})` : ''}`
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

/** Causas mais comuns no auxílio-acidente (lista padrão; "Outra causa" cobre o resto). */
export const CAUSAS_ACIDENTE = ['Acidente de trabalho típico', 'Acidente de trajeto', 'Acidente de trânsito (moto)', 'Acidente de trânsito (carro)', 'Atropelamento', 'Queda de altura', 'Queda da própria altura', 'Acidente com máquina ou ferramenta', 'Acidente rural ou com animal', 'Acidente doméstico', 'Acidente esportivo', 'Agressão', 'Doença ocupacional (LER/DORT)', 'Outra causa']

/** Campos do benefício (colunas do caso), na ordem em que aparecem na ficha. */
export const BENEFICIO_DEFS: CampoDef[] = [
  { chave: 'nb', rotulo: 'NB', tipo: 'texto', opcoes: null, ordem: 1, noCartao: false },
  { chave: 'protocolo_adm', rotulo: 'Protocolo', tipo: 'texto', opcoes: null, ordem: 2, noCartao: false },
  { chave: 'dib', rotulo: 'DIB', tipo: 'data', opcoes: null, ordem: 3, noCartao: false },
  { chave: 'dcb', rotulo: 'DCB', tipo: 'data', opcoes: null, ordem: 4, noCartao: false },
  { chave: 'data_acidente', rotulo: 'Data do acidente', tipo: 'data', opcoes: null, ordem: 5, noCartao: false },
  { chave: 'uf', rotulo: 'UF', tipo: 'lista', opcoes: ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'], ordem: 6, noCartao: false },
  { chave: 'profissao_epoca', rotulo: 'Profissão na época', tipo: 'texto', opcoes: null, ordem: 7, noCartao: false },
  { chave: 'causa_acidente', rotulo: 'Causa do acidente', tipo: 'lista', opcoes: CAUSAS_ACIDENTE, ordem: 8, noCartao: false },
  { chave: 'sequela', rotulo: 'Sequela', tipo: 'texto_longo', opcoes: null, ordem: 9, noCartao: false },
]

/** Protocolo registrado no caso (número e data), venha de onde vier. */
export type Protocolo = { numero: string; data: string | null }
export function protocoloDoCaso(f: Pick<Ficha, 'campos' | 'beneficio' | 'numeroCnj'>): Protocolo | null {
  const n = f.campos.protocolo_numero
  if (typeof n === 'string' && n) return { numero: n, data: typeof f.campos.protocolo_data === 'string' ? f.campos.protocolo_data : null }
  const adm = f.beneficio?.protocolo_adm
  if (typeof adm === 'string' && adm) return { numero: adm, data: null }
  return null
}

const soDigitos = (s: string) => s.replace(/\D/g, '')

/** Confere o protocolo antes de mandar ao servidor (que confere de novo). */
export function validarProtocolo(area: string, numero: string, data: string, hoje: string): string | null {
  const n = numero.trim()
  if (!n) return 'Informe o número do protocolo.'
  if (!/^[0-9A-Za-z./ -]{4,40}$/.test(n)) return 'Use só letras, números, ponto, barra e traço (4 a 40 caracteres).'
  if (area === 'judicial' && soDigitos(n).length !== 20) return 'No judicial, informe o número CNJ (20 dígitos).'
  if (!data) return 'Informe a data do protocolo.'
  if (data > hoje) return 'A data do protocolo não pode ser futura.'
  return null
}

/** A etapa de exigência da via, se houver (o caso vai para ela ao registrar uma exigência). */
export function etapaDeExigencia(etapas: Etapa[]): string | null {
  return etapas.find((e) => !e.final && /exig/i.test(e.status))?.status ?? null
}

export type NovaExigencia = { descricao: string; prazoFatal: string; folga: number; responsavel: string | null }

export function validarExigencia(e: NovaExigencia, hoje: string): string | null {
  if (e.descricao.trim().length < 3) return 'Descreva o que foi exigido.'
  if (!e.prazoFatal) return 'Informe o prazo fatal.'
  if (e.prazoFatal < hoje) return 'O prazo fatal já passou; confira a data.'
  if (!Number.isInteger(e.folga) || e.folga < 0 || e.folga > 10) return 'A folga vai de 0 a 10 dias úteis.'
  return null
}

/** Prévia do prazo interno: volta `folga` dias úteis (seg. a sex.) a partir do fatal, sem passar de hoje.
 *  O servidor faz a conta final já descontando os feriados. */
export function prazoInterno(fatal: string, folga: number, hoje: string): string {
  const d = new Date(`${fatal}T12:00:00Z`)
  let k = 0
  while (k < folga) {
    d.setUTCDate(d.getUTCDate() - 1)
    const s = d.getUTCDay()
    if (s !== 0 && s !== 6) k++
  }
  const r = d.toISOString().slice(0, 10)
  return r < hoje ? hoje : r
}
