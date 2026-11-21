/** "Precisa de atenção": prazos fatais, casos parados e eventos sem preparação.
 *  Calculado pelo servidor na hora; o gestor vê também o que é da equipe (escalado). */
export type TipoAtencao = 'prazo' | 'parado' | 'preparo'
export type ItemAtencao = {
  tipo: TipoAtencao
  id: string
  evento: 'pericia' | 'audiencia' | null
  titulo: string
  detalhe: string
  dia: string | null
  responsavel: string | null
  clienteId: string | null
  casoId: string | null
  gravidade: 'alta' | 'media'
  escalado: boolean
}

/** rodizio: por área, quem recebe os casos novos sem responsável (vai para quem tem menos carga). */
export type RegrasAtencao = { paradoDias: number; preparoDias: number; fatalAlertaDias: number; paradoIgnorar: string[]; rodizio: Record<string, string[]> }
export const REGRAS_PADRAO: RegrasAtencao = { paradoDias: 10, preparoDias: 5, fatalAlertaDias: 2, paradoIgnorar: [], rodizio: {} }

export function rotuloAtencao(it: Pick<ItemAtencao, 'tipo' | 'evento'>): string {
  if (it.tipo === 'prazo') return 'Prazo fatal'
  if (it.tipo === 'parado') return 'Caso parado'
  return it.evento === 'audiencia' ? 'Preparar audiência' : 'Preparar perícia'
}

const PESO: Record<TipoAtencao, number> = { prazo: 0, preparo: 1, parado: 2 }

/** Alta gravidade primeiro; depois prazo, preparação e parado; depois a data. */
export function ordenarAtencao(itens: ItemAtencao[]): ItemAtencao[] {
  return [...itens].sort((a, b) =>
    (a.gravidade === b.gravidade ? 0 : a.gravidade === 'alta' ? -1 : 1) ||
    PESO[a.tipo] - PESO[b.tipo] ||
    (a.dia ?? '9999').localeCompare(b.dia ?? '9999') ||
    a.titulo.localeCompare(b.titulo))
}

export function lerItemAtencao(x: Record<string, unknown>): ItemAtencao {
  const s = (v: unknown) => (typeof v === 'string' && v ? v : null)
  const tipo = x.tipo === 'parado' || x.tipo === 'preparo' ? x.tipo : 'prazo'
  return {
    tipo, id: String(x.id), evento: x.evento === 'audiencia' ? 'audiencia' : x.evento === 'pericia' ? 'pericia' : null,
    titulo: String(x.titulo ?? ''), detalhe: String(x.detalhe ?? ''), dia: s(x.dia), responsavel: s(x.responsavel),
    clienteId: s(x.cliente_id), casoId: s(x.caso_id), gravidade: x.gravidade === 'alta' ? 'alta' : 'media', escalado: x.escalado === true,
  }
}

export function validarRegras(r: RegrasAtencao): string | null {
  const inteiro = (n: number, a: number, b: number) => Number.isInteger(n) && n >= a && n <= b
  if (!inteiro(r.paradoDias, 2, 90)) return 'Caso parado: use de 2 a 90 dias.'
  if (!inteiro(r.preparoDias, 1, 30)) return 'Preparação de eventos: use de 1 a 30 dias.'
  if (!inteiro(r.fatalAlertaDias, 0, 10)) return 'Aviso de prazo fatal: use de 0 a 10 dias úteis.'
  return null
}

/** Par de clientes que parecem ser a mesma pessoa (para o gestor revisar; nada é juntado sozinho). */
export type ParDuplicado = { a: { id: string; nome: string }; b: { id: string; nome: string }; motivos: string[] }
export type CargaPessoa = { email: string; nome: string; tarefas: number; casos: number; total: number }
export type Falha = { id: number; casoId: string; cliente: string; area: string; etapa: string | null; origem: string; detalhe: string; em: string }

export function lerRodizio(x: unknown): Record<string, string[]> {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return {}
  const r: Record<string, string[]> = {}
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) if (Array.isArray(v)) r[k] = v.map(String)
  return r
}

/** Texto curto da falha (sem o prefixo técnico). */
export function textoFalha(f: Pick<Falha, 'detalhe'>): string {
  return f.detalhe.replace(/^(Agente interno não concluiu|Rodízio não concluiu):\s*/i, '').trim() || 'Erro sem detalhe.'
}
