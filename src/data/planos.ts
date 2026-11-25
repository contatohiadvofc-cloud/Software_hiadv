// Fonte única do que cada plano inclui. A mesma lista vai para o banco (docs/sql/hiadv3-planos.sql).
import type { PlanoId } from './adesao'

export const RECURSOS_POR_PLANO: Record<PlanoId, string[]> = {
  // Júnior: tudo o que o advogado sozinho precisa para não perder prazo e organizar os casos.
  pro: ['casos', 'atendimentos', 'clientes', 'prazos', 'publicacoes', 'agenda', 'acompanhamento', 'documentos', 'celular',
    'intimacoes_conectadas', 'calc_prazos'],
  premium: [],
  senior: [],
  supremo: [],
}
// Pleno: equipe, dinheiro e as calculadoras de cada área (inclui o Bancário).
RECURSOS_POR_PLANO.premium = [...RECURSOS_POR_PLANO.pro, 'financeiro', 'relatorios', 'horas', 'atencao',
  'calculadoras', 'assinatura', 'cobranca']
// Sênior: Drive com identificador e leitor, WhatsApp oficial, API e a IA própria (chave da Claude do escritório, em Integrações).
RECURSOS_POR_PLANO.senior = [...RECURSOS_POR_PLANO.premium, 'drive', 'identificador', 'whatsapp', 'api', 'ia']
// Sênior + Sara: o Sênior com a Sara Integrada (IA do sistema, uso incluído, sem chave própria).
RECURSOS_POR_PLANO.supremo = [...RECURSOS_POR_PLANO.senior, 'sara']

/** Plano mínimo que inclui o recurso (para o selo "no plano Pleno"). */
export function planoMinimo(recurso: string): PlanoId | null {
  for (const p of ['pro', 'premium', 'senior', 'supremo'] as PlanoId[]) if (RECURSOS_POR_PLANO[p].includes(recurso)) return p
  return null
}

/** Recurso de cada conector da tela Integrações. */
export const RECURSO_DO_CONECTOR: Record<string, string> = {
  cnj: 'publicacoes', escavador: 'intimacoes_conectadas', judit: 'intimacoes_conectadas', google_agenda: 'agenda',
  zapsign: 'assinatura', clicksign: 'assinatura', d4sign: 'assinatura', asaas: 'cobranca',
  claude: 'ia', google_drive: 'drive', whatsapp: 'whatsapp', gmail: 'sara', meta_ads: 'api',
}
