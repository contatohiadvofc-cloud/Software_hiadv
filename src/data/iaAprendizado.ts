/** A IA aprende com o próprio escritório: a equipe avalia, os gestores aprovam, a IA segue. Nada sai do escritório. */
import type { AcaoIA } from './iaPrompts'

export type FeedbackIA = { id: number; quem: string; acao: AcaoIA; pedido: string | null; comoQueria: string | null; em: string }
export type OrientacaoIA = { id: number; acao: AcaoIA | null; texto: string; ativo: boolean; usos: number; criadoPor: string; em: string }
export type AprendizadoIA = { pendentes: FeedbackIA[]; orientacoes: OrientacaoIA[]; resumo: { uteis: number; naoUteis: number } }

export const LIMITE_ORIENTACAO = 400
export const MAX_ORIENTACOES = 40

/** Mesma regra do servidor (ia_orientacao_problema): a IA só aprende o jeito de escrever, nunca regra, segurança ou sistema. */
export function problemaOrientacao(texto: string): string | null {
  const t = texto.trim()
  if (t.length < 5) return 'Escreva a orientação com pelo menos 5 caracteres.'
  if (t.length > LIMITE_ORIENTACAO) return `A orientação pode ter até ${LIMITE_ORIENTACAO} caracteres.`
  const mexe = /(ignor|desconsider|esque[çc]a|desativ|burl|contorn|sobrescrev)\w*\s+(as|a|os|o|suas|todas)?\s*(regra|instru|segur|limit|restri|polít|sistema)/i.test(t)
    || /(senha|token|chave|api|service.?role|admin|permiss|outros? escrit|todos os escrit|banco de dados|sql|c[óo]digo[- ]fonte|javascript|<script|```)/i.test(t)
  return mexe ? 'Essa orientação mexe em regras, segurança ou no sistema. A IA só aprende o jeito de escrever e de responder do seu escritório.' : null
}

/** Sugestão inicial para o gestor, a partir do que a pessoa disse que queria. */
export function sugerirOrientacao(f: Pick<FeedbackIA, 'comoQueria'>): string {
  return (f.comoQueria ?? '').replace(/\s+/g, ' ').trim().slice(0, LIMITE_ORIENTACAO)
}

export function satisfacao(r: AprendizadoIA['resumo']): number | null {
  const total = r.uteis + r.naoUteis
  return total ? Math.round((r.uteis / total) * 100) : null
}
