export type Etapa = { status: string; ordem: number; final: boolean; pedeMotivo: boolean }
export type CasoCard = {
  id: string
  cliente: string
  status: string
  dias: number
  produto: string | null
  numeroCnj: string | null
  gateOk: number
  gateTotal: number
}
export type Coluna = { etapa: Etapa; casos: CasoCard[] }
export type Quadro = { etapas: Etapa[]; casos: CasoCard[] }

/** Distribui os casos nas colunas. Etapas finais (encerramento) ficam escondidas, salvo quando pedido. */
export function montarColunas(etapas: Etapa[], casos: CasoCard[], mostrarFinais: boolean): Coluna[] {
  const ordenadas = [...etapas].sort((a, b) => a.ordem - b.ordem)
  const visiveis = ordenadas.filter((e) => mostrarFinais || !e.final)
  const cols: Coluna[] = visiveis.map((etapa) => ({ etapa, casos: [] }))
  const porStatus = new Map(cols.map((c) => [c.etapa.status, c]))
  const conhecidas = new Set(etapas.map((e) => e.status))
  for (const c of casos) {
    const col = porStatus.get(c.status)
    if (col) col.casos.push(c)
    else if (!conhecidas.has(c.status) && cols[0]) cols[0].casos.push(c) // etapa antiga: não deixa o caso sumir
  }
  for (const c of cols) c.casos.sort((a, b) => b.dias - a.dias || a.cliente.localeCompare(b.cliente))
  return cols
}

/** O que a mudança para a etapa exige: motivo (pede_motivo) e confirmação (etapa final, ação irreversível). */
export function exigenciaDaMudanca(destino: Etapa): { motivo: boolean; confirmar: boolean } {
  return { motivo: destino.pedeMotivo, confirmar: destino.final }
}

export function rotuloEtapa(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
