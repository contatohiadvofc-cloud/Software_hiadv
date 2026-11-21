export type NovoCliente = { nome: string; cpf?: string; telefone?: string; email?: string }
export type NovoCaso = { cliente: string; area: string; produto: string | null; relato: string; responsavel: string | null }
export type LinhaImportacao = { linha: number; nome: string; resultado: 'novo' | 'ja' | 'erro'; motivo: string | null }
export type ResultadoImportacao = { simulado: boolean; novos: number; existentes: number; erros: number; linhas: LinhaImportacao[] }

/** Benefícios das áreas previdenciárias (valores aceitos pelo servidor). */
export const PRODUTOS_PREV: { valor: string; nome: string }[] = [
  { valor: 'auxilio_acidente', nome: 'Auxílio-acidente' },
  { valor: 'incapacidade_temporaria', nome: 'Auxílio-doença (incapacidade temporária)' },
  { valor: 'incapacidade_permanente', nome: 'Aposentadoria por incapacidade permanente' },
  { valor: 'bpc', nome: 'BPC/LOAS' },
  { valor: 'outro', nome: 'Outro benefício' },
]
export const areaPrevidenciaria = (area: string) => area === 'administrativo' || area === 'judicial'

export function soDigitos(s: string | undefined | null): string {
  return (s ?? '').replace(/\D/g, '')
}

export function cpfValido(s: string): boolean {
  let d = soDigitos(s)
  if (d.length >= 9 && d.length < 11) d = d.padStart(11, '0')
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false
  const n = d.split('').map(Number)
  const dv = (ate: number) => { let s = 0; for (let i = 0; i < ate; i++) s += n[i] * (ate + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r }
  return dv(9) === n[9] && dv(10) === n[10]
}

/** Mesmas regras do servidor, para avisar antes de enviar. Devolve a mensagem de erro ou null. */
export function validarCliente(c: NovoCliente): string | null {
  const nome = c.nome.replace(/\s+/g, ' ').trim()
  if (nome.length < 2) return 'Informe o nome.'
  if (nome.length > 160) return 'Nome com mais de 160 letras.'
  if (c.cpf && soDigitos(c.cpf) && !cpfValido(c.cpf)) return 'CPF inválido.'
  if (c.telefone) {
    let t = soDigitos(c.telefone)
    if (t.startsWith('55') && t.length >= 12) t = t.slice(2)
    if (t && !/^\d{10,11}$/.test(t)) return 'Telefone precisa ter DDD e número.'
  }
  if (c.email && c.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email.trim())) return 'E-mail inválido.'
  return null
}

type Coluna = keyof NovoCliente
const NOMES_COLUNA: Record<Coluna, RegExp> = {
  nome: /^(nome( completo)?|cliente|nome do cliente)$/,
  cpf: /^(cpf|documento|cpf do cliente)$/,
  telefone: /^(telefone|celular|whatsapp|whats|fone|contato|tel)$/,
  email: /^(e-?mail|correio)$/,
}
const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Separa uma planilha colada (Excel/Sheets copiam com tabulação) ou um CSV (; ou ,), respeitando aspas. */
export function separarLinhas(texto: string): string[][] {
  const t = texto.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const primeira = t.split('\n').find((l) => l.trim()) ?? ''
  const sep = primeira.includes('\t') ? '\t' : (primeira.split(';').length >= primeira.split(',').length ? ';' : ',')
  const linhas: string[][] = []
  let campo = '', linha: string[] = [], aspas = false
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]
    if (aspas) {
      if (ch === '"' && t[i + 1] === '"') { campo += '"'; i++ }
      else if (ch === '"') aspas = false
      else campo += ch
    } else if (ch === '"' && campo === '') aspas = true
    else if (ch === sep) { linha.push(campo); campo = '' }
    else if (ch === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = '' }
    else campo += ch
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha) }
  return linhas.map((l) => l.map((c) => c.trim())).filter((l) => l.some((c) => c))
}

export type Planilha = { clientes: NovoCliente[]; colunas: Partial<Record<Coluna, number>>; comCabecalho: boolean; aviso: string | null }

/** Lê a planilha: acha as colunas pelo cabeçalho; sem cabeçalho, supõe nome, CPF, telefone, e-mail. */
export function lerPlanilha(texto: string): Planilha {
  const linhas = separarLinhas(texto)
  if (!linhas.length) return { clientes: [], colunas: {}, comCabecalho: false, aviso: 'A planilha está vazia.' }
  const cab = linhas[0].map(normal)
  const colunas: Partial<Record<Coluna, number>> = {}
  for (const k of Object.keys(NOMES_COLUNA) as Coluna[]) {
    const i = cab.findIndex((c) => NOMES_COLUNA[k].test(c))
    if (i >= 0) colunas[k] = i
  }
  const comCabecalho = colunas.nome !== undefined
  if (!comCabecalho) { colunas.nome = 0; colunas.cpf = 1; colunas.telefone = 2; colunas.email = 3 }
  const corpo = comCabecalho ? linhas.slice(1) : linhas
  const pega = (l: string[], k: Coluna) => (colunas[k] !== undefined ? l[colunas[k]!] ?? '' : '')
  const clientes = corpo.map((l) => ({ nome: pega(l, 'nome'), cpf: pega(l, 'cpf'), telefone: pega(l, 'telefone'), email: pega(l, 'email') }))
  let aviso: string | null = null
  if (!comCabecalho) aviso = 'Não achei o cabeçalho. Li as colunas na ordem: nome, CPF, telefone, e-mail.'
  if (clientes.length > 1000) aviso = 'A planilha tem mais de 1.000 linhas. Importe em partes de até 1.000.'
  return { clientes, colunas, comCabecalho, aviso }
}
