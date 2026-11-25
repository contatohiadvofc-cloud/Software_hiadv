/** Central HiAdv: o que cada escritório (e cada pessoa) pode usar. A trava de verdade fica no servidor. */
import { PLANOS, type PlanoId } from './adesao'

export type Situacao = 'teste' | 'ativo' | 'atraso' | 'suspenso'
export const NOMES_SITUACAO: Record<Situacao, string> = { teste: 'Em teste', ativo: 'Ativo', atraso: 'Pagamento em atraso', suspenso: 'Suspenso' }

/** Recursos com nome fixo (os mesmos do servidor e do painel "Recursos do HiAdv"). */
export const NOMES_RECURSO: Record<string, string> = {
  casos: 'Casos por área', atendimentos: 'Atendimentos', clientes: 'Clientes', prazos: 'Tarefas e prazos', publicacoes: 'Publicações',
  agenda: 'Agenda e Google Agenda', acompanhamento: 'Acompanhamento pelo cliente', documentos: 'Documentos a partir de modelos', celular: 'App no celular',
  financeiro: 'Financeiro e honorários', relatorios: 'Relatórios', horas: 'Horas trabalhadas', atencao: 'Avisos e rodízio', drive: 'Google Drive',
  ia: 'IA própria do escritório (chave em Integrações)', sara: 'Sara Integrada (IA do HiAdv)', zapsign: 'Assinatura digital', whatsapp: 'WhatsApp oficial', api: 'API e webhooks',
}
export const nomeRecurso = (r: string) => NOMES_RECURSO[r] ?? r

/** Plano mínimo que inclui o recurso (para a frase "Disponível no plano …"). */
const MINIMO: Record<string, PlanoId> = {
  financeiro: 'premium', relatorios: 'premium', horas: 'premium', atencao: 'premium', drive: 'senior',
  ia: 'senior', sara: 'supremo', zapsign: 'premium', whatsapp: 'senior', api: 'senior',
}
export function planoMinimo(recurso: string): string {
  const id = MINIMO[recurso] ?? 'pro'
  return PLANOS.find((p) => p.id === id)!.nome
}

/** Qual recurso cada tela usa. Telas fora desta lista são sempre abertas. */
export function recursoDaRota(caminho: string): string | null {
  if (caminho.startsWith('/financeiro')) return 'financeiro'
  if (caminho.startsWith('/relatorios')) return 'relatorios'
  if (caminho.startsWith('/atendimentos')) return 'atendimentos'
  if (caminho.startsWith('/publicacoes')) return 'publicacoes'
  if (caminho.startsWith('/area/') || caminho === '/areas') return 'casos'
  if (caminho.startsWith('/tarefas')) return 'prazos'
  if (caminho.startsWith('/agenda')) return 'agenda'
  if (caminho.startsWith('/clientes')) return 'clientes'
  if (caminho.startsWith('/biblioteca')) return 'documentos'
  return null
}

export type MeusRecursos = { plano: PlanoId | null; situacao: Situacao | null; testeAte: string | null; pagoAte?: string | null; recursos: string[] }

/** null = escritório antigo, sem assinatura na Central: tudo aberto. */
export function pode(meus: MeusRecursos | null | undefined, recurso: string): boolean {
  if (!meus) return true
  return meus.recursos.includes(recurso)
}

/** Aviso discreto no topo para o Gestor (teste acabando, atraso, suspensão). */
export function avisoAssinatura(meus: MeusRecursos | null | undefined, hoje = new Date()): string | null {
  if (!meus?.situacao) return null
  if (meus.situacao === 'suspenso') return 'O acesso do escritório está suspenso. Casos e prazos continuam abertos; fale com o HiAdv para reativar o restante.'
  if (meus.situacao === 'atraso') return 'Há uma mensalidade em atraso. Fale com o HiAdv para manter todos os recursos.'
  // Mensalidade: "pago até" é o vencimento. Com 3 dias corridos de atraso, o gestor vê o aviso.
  if (meus.situacao === 'ativo' && meus.pagoAte) {
    const dia0 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
    const venc = new Date(meus.pagoAte + 'T00:00:00')
    const atraso = Math.round((dia0.getTime() - venc.getTime()) / 86_400_000)
    if (atraso >= 3) return `A mensalidade venceu em ${venc.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}. Para manter todos os recursos, regularize o pagamento com o HiAdv.`
  }
  if (meus.situacao === 'teste' && meus.testeAte) {
    const dia0 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
    const dias = Math.round((new Date(meus.testeAte + 'T00:00:00').getTime() - dia0.getTime()) / 86_400_000)
    if (dias < 0) return 'O período de teste terminou. Fale com o HiAdv para escolher o plano.'
    if (dias <= 5) return `O teste termina em ${dias === 0 ? 'hoje' : dias === 1 ? '1 dia' : `${dias} dias`}.`
  }
  return null
}

export type EscritorioCentral = {
  id: string; nome: string; cidade: string | null; ativo: boolean; oabsMaster: string[]
  plano: PlanoId | null; situacao: Situacao | null; fundador: boolean; testeAte: string | null; pagoAte: string | null; obs: string | null
  limites: { masters: number | null; colaboradores: number | null; oabs: number | null; iaMensal: number | null }
  uso: { masters: number; colaboradores: number; oabs: number; iaMes: number }
  ajustes: number
  preco?: number | null; saude?: number | null; ultimoAcesso?: string | null; masterNome?: string | null; casos?: number
}
export type PainelCentral = { inicio: string; fim: string; dias: { dia: number; recebido: number; previsto: number }[]; recebido: number; previsto: number; emAtraso: number }
export type PagamentoCentral = { competencia: string; valor: number; pagoEm: string; forma: string }

/** Faixa da barra de saúde (0 a 100): uso real do sistema nos últimos dias. */
export function faixaSaude(n: number | null | undefined): { tom: 'ok' | 'atencao' | 'risco' | 'sem'; rotulo: string } {
  if (n == null) return { tom: 'sem', rotulo: 'Sem dados' }
  if (n >= 70) return { tom: 'ok', rotulo: 'Usando bem' }
  if (n >= 40) return { tom: 'atencao', rotulo: 'Uso moderado' }
  return { tom: 'risco', rotulo: 'Pouco uso' }
}

/** Data digitada só com números: as barras ficam fixas (dd/mm/aaaa). */
export function mascaraData(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join('/')
}
/** dd/mm/aaaa → aaaa-mm-dd (ou null se a data não existe). */
export function dataIso(v: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v); if (!m) return null
  const [, d, mo, a] = m; const dt = new Date(Date.UTC(+a, +mo - 1, +d))
  if (dt.getUTCFullYear() !== +a || dt.getUTCMonth() !== +mo - 1 || dt.getUTCDate() !== +d) return null
  return `${a}-${mo}-${d}`
}
export const isoParaTela = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '')
export type DetalheCentral = {
  ajustes: { recurso: string; valor: 'liberado' | 'bloqueado'; validoAte: string | null }[]
  recursos: { recurso: string; noPlano: boolean; liberado: boolean }[]
  pessoas: { email: string; nome: string; papel: string; bloqueios: { recurso: string; validoAte: string | null }[] }[]
  historico: { quando: string; quem: string; acao: string }[]
}
export type AssinaturaForm = { plano: PlanoId; situacao: Situacao; fundador: boolean; testeAte: string; pagoAte: string; obs: string; masters: string; colaboradores: string; oabs: string; iaMensal: string }
export type NovoEscritorio = { nome: string; cidade: string; oab: string; masterNome: string; masterEmail: string; plano: PlanoId; fundador: boolean }

/** Passou do limite do plano? (só aviso: quem decide é o Deividy) */
export function acimaDoLimite(e: EscritorioCentral): string[] {
  const l: string[] = []
  if (e.limites.masters != null && e.uso.masters > e.limites.masters) l.push(`Masters ${e.uso.masters}/${e.limites.masters}`)
  if (e.limites.colaboradores != null && e.uso.colaboradores > e.limites.colaboradores) l.push(`Colaboradores ${e.uso.colaboradores}/${e.limites.colaboradores}`)
  if (e.limites.oabs != null && e.uso.oabs > e.limites.oabs) l.push(`OABs ${e.uso.oabs}/${e.limites.oabs}`)
  if (e.limites.iaMensal != null && e.limites.iaMensal > 0 && e.uso.iaMes > e.limites.iaMensal) l.push(`IA ${e.uso.iaMes}/${e.limites.iaMensal}`)
  return l
}

export function validarNovo(n: NovoEscritorio): string | null {
  if (n.nome.trim().length < 2) return 'Informe o nome do escritório.'
  if (n.masterNome.trim().length < 2) return 'Informe o nome do Gestor Master.'
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(n.masterEmail.trim())) return 'E-mail do Gestor Master inválido.'
  return null
}
