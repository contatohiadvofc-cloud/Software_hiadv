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

export type RegrasAtencao = { paradoDias: number; preparoDias: number; fatalAlertaDias: number; paradoIgnorar: string[] }
export const REGRAS_PADRAO: RegrasAtencao = { paradoDias: 10, preparoDias: 5, fatalAlertaDias: 2, paradoIgnorar: [] }

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
