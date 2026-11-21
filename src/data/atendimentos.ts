export type EtapaLead = 'novo' | 'conversa' | 'proposta' | 'contratou' | 'perdido'
export type Lead = {
  id: string; nome: string; telefone: string | null; origem: string | null; area: string | null; assunto: string | null
  etapa: EtapaLead; motivoPerda: string | null; responsavel: string | null; proximoContato: string | null; clienteId: string | null; criadoEm: string
}
export type NovoLead = { nome: string; telefone: string; origem: string; area: string; assunto: string; responsavel: string; proximoContato: string }

export const ETAPAS_LEAD: { etapa: EtapaLead; nome: string }[] = [
  { etapa: 'novo', nome: 'Novo contato' },
  { etapa: 'conversa', nome: 'Em conversa' },
  { etapa: 'proposta', nome: 'Proposta enviada' },
  { etapa: 'contratou', nome: 'Virou cliente' },
  { etapa: 'perdido', nome: 'Não fechou' },
]
export const nomeEtapaLead = (e: EtapaLead) => ETAPAS_LEAD.find((x) => x.etapa === e)?.nome ?? e

export const ORIGENS = ['WhatsApp', 'Instagram', 'Facebook', 'Google', 'Site', 'Indicação', 'Telefone', 'Presencial', 'Outro']
export const MOTIVOS_PERDA = ['Sem direito ao benefício', 'Achou caro', 'Fechou com outro escritório', 'Parou de responder', 'Desistiu', 'Outro']

/** Quem ainda está no funil, na ordem das colunas. */
export const ETAPAS_ABERTAS: EtapaLead[] = ['novo', 'conversa', 'proposta']

export function validarLead(l: NovoLead): string | null {
  if (l.nome.trim().length < 2) return 'Informe o nome.'
  const t = l.telefone.replace(/\D/g, '')
  if (t && !/^(55)?\d{10,11}$/.test(t)) return 'Telefone com DDD (10 ou 11 números).'
  if (l.assunto.length > 2000) return 'Assunto com até 2.000 letras.'
  if (l.proximoContato && !/^\d{4}-\d{2}-\d{2}$/.test(l.proximoContato)) return 'Data do próximo contato inválida.'
  return null
}

/** Contato atrasado: a data combinada já passou e o atendimento segue aberto. */
export function contatoAtrasado(l: Pick<Lead, 'etapa' | 'proximoContato'>, hoje: string): boolean {
  return ETAPAS_ABERTAS.includes(l.etapa) && !!l.proximoContato && l.proximoContato < hoje
}

/** Agrupa por etapa aberta, na ordem das colunas (mais urgente primeiro). */
export function colunasDoFunil(leads: Lead[]): Record<EtapaLead, Lead[]> {
  const r = { novo: [], conversa: [], proposta: [], contratou: [], perdido: [] } as Record<EtapaLead, Lead[]>
  for (const l of leads) r[l.etapa].push(l)
  for (const e of ETAPAS_ABERTAS) r[e].sort((a, b) => (a.proximoContato ?? '9999').localeCompare(b.proximoContato ?? '9999') || b.criadoEm.localeCompare(a.criadoEm))
  return r
}

/** Taxa de conversão (contratou / (contratou + não fechou)), em %; null sem base. */
export function taxaConversao(contratou: number, perdido: number): number | null {
  const base = contratou + perdido
  return base ? Math.round((contratou / base) * 100) : null
}
