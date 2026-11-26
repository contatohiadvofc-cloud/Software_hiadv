// Mesa do Suporte e Meu Processo: o HiAdv gera os rascunhos, o Suporte confere e publica para cada cliente.

export type OrigemAtualizacao = 'andamento' | 'fase' | 'pericia' | 'audiencia' | 'pendencia' | 'manual'
export type StatusAtualizacao = 'rascunho' | 'publicada' | 'descartada'

export type Atualizacao = {
  id: string; origem: OrigemAtualizacao; titulo: string; texto: string; interno: string | null; status: StatusAtualizacao
  criadoEm: string; editadoPor: string | null; publicadoEm: string | null; publicadoPor: string | null; lidaEm: string | null
}
export type GrupoAtualizacoes = { clienteId: string; cliente: string; temAcesso: boolean; ultima: string; itens: Atualizacao[] }

export type ConversaCliente = { clienteId: string; nome: string; ultimaEm: string; ultima: string; naoLidas: number }
export type MensagemCliente = { id: string; autor: 'cliente' | 'equipe' | 'sara'; autorEmail?: string | null; texto: string; em: string; lidaCliente?: string | null }

export const NOMES_ORIGEM: Record<OrigemAtualizacao, string> = {
  andamento: 'Andamento do processo', fase: 'Mudança de etapa', pericia: 'Perícia marcada',
  audiencia: 'Audiência marcada', pendencia: 'Documento pedido', manual: 'Escrita pela equipe',
}

export const LIMITE_TITULO = 120
export const LIMITE_TEXTO = 1500

/** Mesmo critério do banco: título de 2 a 120 caracteres e texto de 2 a 1.500. */
export function validarAtualizacao(titulo: string, texto: string): string | null {
  const t = titulo.trim(); const x = texto.trim()
  if (t.length < 2 || t.length > LIMITE_TITULO) return 'O título precisa ter entre 2 e 120 caracteres.'
  if (x.length < 2 || x.length > LIMITE_TEXTO) return 'O texto precisa ter entre 2 e 1.500 caracteres.'
  return null
}

/** Palavras que não podem ir ao cliente sem um advogado conferir (promessa de resultado, valores, prazos de pagamento). */
const SENSIVEIS = [/\bganh(ou|amos|ar|a)\b/i, /\bgarant/i, /\bcerteza\b/i, /\bR\$\s?\d/i, /\bvai receber\b/i, /\bperdeu\b/i]
export function alertasTexto(texto: string): string[] {
  const a: string[] = []
  if (SENSIVEIS.slice(0, 3).some((r) => r.test(texto))) a.push('Evite promessa de resultado: a OAB não permite.')
  if (SENSIVEIS[3].test(texto) || SENSIVEIS[4].test(texto)) a.push('Valores ao cliente: confirme com o advogado antes de publicar.')
  if (SENSIVEIS[5].test(texto)) a.push('Notícia desfavorável: o ideal é o advogado conversar antes com o cliente.')
  return a
}

/** Ids de todos os rascunhos dos grupos (para "Publicar tudo"). */
export function idsDosGrupos(grupos: GrupoAtualizacoes[], so?: Set<string>): string[] {
  return grupos.flatMap((g) => g.itens.filter((i) => i.status === 'rascunho' && (!so || so.has(i.id))).map((i) => i.id))
}

export function resumoPublicacao(n: number, clientes: number): string {
  if (n === 0) return 'Nada para publicar.'
  return `${n} ${n === 1 ? 'atualização publicada' : 'atualizações publicadas'} para ${clientes} ${clientes === 1 ? 'cliente' : 'clientes'}.`
}

export const quandoCurto = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Andamentos e mudanças de etapa vão ao cliente nos dias 1 e 15 de cada mês. Perícia, audiência e documento pedido não esperam. */
export const DIAS_PUBLICACAO = [1, 15] as const
export const ORIGENS_URGENTES: OrigemAtualizacao[] = ['pericia', 'audiencia', 'pendencia']

/** Data (AAAA-MM-DD, horário de Brasília) da próxima rodada de publicação, contando o próprio dia se ele for 1 ou 15. */
export function proximaPublicacao(agora: Date = new Date()): string {
  const hoje = agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  let [a, m, d] = hoje.split('-').map(Number)
  if (d === 1 || d === 15) return hoje
  if (d < 15) d = 15
  else { d = 1; m += 1; if (m > 12) { m = 1; a += 1 } }
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
export const ehDiaDePublicacao = (agora: Date = new Date()) => proximaPublicacao(agora) === agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
export function avisoPublicacao(agora: Date = new Date()): string {
  if (ehDiaDePublicacao(agora)) return 'Hoje é dia de publicar os andamentos no Meu Processo.'
  const [a, m, d] = proximaPublicacao(agora).split('-')
  return `Próxima publicação de andamentos: ${d}/${m}/${a}. Perícia, audiência e pedido de documento podem ser publicados na hora.`
}
