import type { Tarefa } from './tarefas'

export type ClienteResumo = { id: string; nome: string; telefone: string | null; origem: string | null; desde: string | null }
export type CasoDoCliente = { id: string; area: string; status: string; produto: string | null }
export type ProcessoDoCliente = { id: string; numeroCnj: string | null; classe: string | null; orgao: string | null; ativo: boolean }
export type ClienteFicha = { cliente: ClienteResumo; casos: CasoDoCliente[]; processos: ProcessoDoCliente[]; tarefas: Tarefa[] }

/** Termo seguro para o filtro "contém" do servidor (tira curingas e vírgulas que quebram o filtro). */
export function termoBusca(t: string): string {
  return t.replace(/[%_,()*\\]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Link de WhatsApp só com dígitos; acrescenta o 55 quando o número é brasileiro sem DDI. */
export function linkWhatsapp(telefone: string | null): string | null {
  const d = (telefone ?? '').replace(/\D/g, '')
  if (d.length < 10) return null
  return `https://wa.me/${d.length <= 11 ? '55' + d : d}`
}

export function telefoneTela(telefone: string | null): string {
  const d = (telefone ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return telefone ?? ''
}
