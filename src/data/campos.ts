export type TipoCampo = 'texto' | 'texto_longo' | 'data' | 'numero' | 'moeda' | 'lista' | 'sim_nao'
export type CampoDef = { chave: string; rotulo: string; tipo: TipoCampo; opcoes: string[] | null; ordem: number; noCartao: boolean }

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Como o valor gravado aparece na tela. */
export function valorParaTela(def: CampoDef, v: unknown): string {
  if (v === null || v === undefined || v === '') return '–'
  switch (def.tipo) {
    case 'moeda': return moeda.format(Number(v)).replace(/ /g, ' ')
    case 'numero': return new Intl.NumberFormat('pt-BR').format(Number(v))
    case 'data': { const [a, m, d] = String(v).split('-'); return a && m && d ? `${d}/${m}/${a}` : String(v) }
    case 'sim_nao': return v === true || v === 'true' ? 'Sim' : 'Não'
    default: return String(v)
  }
}

/** O que o campo do formulário manda ao servidor (o servidor confere de novo). */
export function telaParaValor(def: CampoDef, texto: string): string {
  const t = texto.trim()
  if (def.tipo === 'moeda' || def.tipo === 'numero') return t.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  return t
}

export function validarCampo(def: CampoDef, texto: string): string | null {
  const t = texto.trim()
  if (!t) return null
  if (def.tipo === 'moeda' || def.tipo === 'numero') {
    if (!/^-?\d+(\.\d{1,2})?$/.test(telaParaValor(def, t))) return def.tipo === 'moeda' ? `Informe um valor em reais em "${def.rotulo}".` : `Informe um número em "${def.rotulo}".`
  }
  if (def.tipo === 'data' && !/^\d{4}-\d{2}-\d{2}$/.test(t)) return `Informe a data em "${def.rotulo}".`
  if (def.tipo === 'lista' && !(def.opcoes ?? []).includes(t)) return `Escolha uma opção da lista em "${def.rotulo}".`
  if (def.tipo === 'texto' && t.length > 300) return `"${def.rotulo}" passa de 300 caracteres.`
  if (def.tipo === 'texto_longo' && t.length > 4000) return `"${def.rotulo}" passa de 4000 caracteres.`
  return null
}
