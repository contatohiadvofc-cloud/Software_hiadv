import { diaSP } from './seuDia'

export type Publicacao = {
  id: number
  quando: string // ISO
  publicacao: boolean // true = DJEN; false = andamento do tribunal (DataJud)
  titulo: string
  texto: string | null
  processoId: string
  numeroCnj: string | null
  clienteId: string | null
  cliente: string | null
  tarefa: { id: string; prazo: string | null; feita: boolean } | null
}

export type Oabs = { oabs: string[]; daEquipe: { nome: string; oab: string }[] }

export type Contagem = 'uteis' | 'corridos'
export type Justica = 'federal' | 'estadual' | 'trabalho'
export type PedidoPrazo = { inicio: string; dias: number; contagem: Contagem; justica: Justica; disponibilizacao: boolean }
export type ResultadoPrazo = { publicacao: string; fim: string; coberturaAte: string | null; pulados: { dia: string; nome: string }[] }

/** 0000000-00.0000.0.00.0000 */
export function cnjTela(n: string | null): string {
  const d = (n ?? '').replace(/\D/g, '')
  if (d.length !== 20) return n ?? ''
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16)}`
}

export const dataTela = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`

/** Agrupa por dia (fuso de Brasília), do mais recente ao mais antigo. */
export function porDia(itens: Publicacao[]): { dia: string; itens: Publicacao[] }[] {
  const m = new Map<string, Publicacao[]>()
  for (const p of itens) {
    const d = diaSP(new Date(p.quando))
    m.set(d, [...(m.get(d) ?? []), p])
  }
  return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([dia, itens]) => ({ dia, itens }))
}

/** Prazo sugerido pelo texto da publicação ("prazo de 15 dias"). */
export function prazoNoTexto(texto: string | null): number | null {
  const t = (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  const m = t.match(/PRAZO (?:LEGAL )?(?:COMUM )?(?:DE )?(\d{1,3})\s*(?:\(?[A-Z]+(?: [A-Z]+)?\)?\s*)?DIAS?/)
  const n = m ? Number(m[1]) : NaN
  return n > 0 && n <= 365 ? n : null
}

/** Junta os dias pulados: dias seguidos de suspensão viram um período; feriado e suspensão no mesmo dia aparecem uma vez. */
export function resumirPulados(p: { dia: string; nome: string }[]): string[] {
  const porDiaUnico = new Map<string, string>()
  for (const x of p) if (!porDiaUnico.has(x.dia) || /suspens/i.test(x.nome)) porDiaUnico.set(x.dia, x.nome)
  const dias = [...porDiaUnico.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const saida: string[] = []
  let i = 0
  while (i < dias.length) {
    const [dia, nome] = dias[i]
    if (/suspens/i.test(nome)) {
      let j = i
      while (j + 1 < dias.length && /suspens/i.test(dias[j + 1][1]) && diasEntre(dias[j][0], dias[j + 1][0]) <= 4) j++
      saida.push(j > i ? `${dataTela(dia)} a ${dataTela(dias[j][0])}: suspensão de prazos` : `${dataTela(dia)}: ${nome}`)
      i = j + 1
    } else { saida.push(`${dataTela(dia)}: ${nome}`); i++ }
  }
  return saida
}
function diasEntre(a: string, b: string) { return Math.round((Date.parse(b) - Date.parse(a)) / 864e5) }

export function validarPrazo(p: PedidoPrazo): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.inicio)) return 'Informe a data.'
  if (!Number.isInteger(p.dias) || p.dias < 1 || p.dias > 365) return 'Informe de 1 a 365 dias.'
  return null
}

/** Normaliza uma OAB digitada ("12345/sc", "OAB/SC 12.345") como o servidor faz. */
export function oabTela(t: string): string | null {
  const s = t.toUpperCase()
  const uf = s.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/)?.[1]
  const num = s.replace(/\b[A-Z]{2,}\b/g, '').replace(/\D/g, '').replace(/^0+/, '')
  if (!uf || num.length < 1 || num.length > 7 || s.replace(/\D/g, '').length < 3) return null
  return `OAB/${uf} ${num.length > 3 ? `${num.slice(0, -3)}.${num.slice(-3)}` : num}`
}
