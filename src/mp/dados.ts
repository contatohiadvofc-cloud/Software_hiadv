// Meu Processo: o que o cliente vê. Lógica pura (testada) e acesso ao banco só por funções públicas com o link pessoal.

export type MpCaso = { area: string; fase: string; etapa: number | null; etapas: number | null; desde: string | null; concluido: boolean }
export type MpCompromisso = { tipo: string; quando: string; local: string | null }
export type MpAtualizacao = { id: string; titulo: string; texto: string; em: string; lida: boolean }
export type MpPendencia = { id: string; titulo: string; detalhe: string | null; status: 'aberta' | 'reenviar' | 'enviada'; motivo: string | null }
export type MpInicio = {
  escritorio: { nome: string; whatsapp: string | null; cidade: string | null }
  cliente: string
  casos: MpCaso[]
  compromissos: MpCompromisso[]
  atualizacoes: MpAtualizacao[]
  pendencias: MpPendencia[]
  naoLidas: number
  expiraEm: string
}
export type MpMensagem = { id: string; autor: 'cliente' | 'equipe' | 'sara'; texto: string; em: string }

/** O caminho que o cliente entende, do começo ao fim, para mostrar "onde está o seu caso". */
export const CAMINHO = ['Preparando o seu pedido', 'Pedido protocolado', 'Perícia ou audiência', 'Aguardando decisão', 'Pagamento', 'Concluído'] as const

/** Em que ponto do caminho está a fase (texto que o banco devolve) e se ela depende do cliente. */
export function pontoNoCaminho(fase: string, concluido: boolean): { indice: number; precisaDeVoce: boolean } {
  if (concluido || /conclu/i.test(fase)) return { indice: 5, precisaDeVoce: false }
  if (/seus documentos/i.test(fase)) return { indice: 0, precisaDeVoce: true }
  if (/prepar/i.test(fase)) return { indice: 0, precisaDeVoce: false }
  if (/exig/i.test(fase)) return { indice: 1, precisaDeVoce: false }
  if (/protocol|an[aá]lise/i.test(fase)) return { indice: 1, precisaDeVoce: false }
  if (/per[ií]cia|audi[eê]ncia/i.test(fase)) return { indice: 2, precisaDeVoce: false }
  if (/decis/i.test(fase)) return { indice: 3, precisaDeVoce: false }
  if (/pagamento/i.test(fase)) return { indice: 4, precisaDeVoce: false }
  return { indice: 1, precisaDeVoce: false }
}

/** O link do escritório tem o token de 64 caracteres; aceita /mp/<token>, #<token> ou ?t=<token>. */
export function tokenDoEndereco(caminho: string, hash: string, busca: string): string | null {
  const candidatos = [caminho.replace(/^\/mp\/?/, '').split('/')[0], hash.replace(/^#\/?/, ''), new URLSearchParams(busca).get('t') ?? '']
  for (const c of candidatos) if (/^[0-9a-f]{64}$/.test(c) || c === 'demo') return c
  return null
}

export const dataLonga = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' })
export const horaCurta = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })

/** "hoje", "ontem" ou a data curta, como nas conversas do celular. */
export function quandoFoi(iso: string, agora = new Date()): string {
  const fuso = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const d = new Date(iso)
  if (fuso(d) === fuso(agora)) return `hoje, ${horaCurta(iso)}`
  if (fuso(d) === fuso(new Date(agora.getTime() - 864e5))) return `ontem, ${horaCurta(iso)}`
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'short' })
}

/** Dias até o compromisso (0 = hoje), para destacar o que está perto. */
export function diasAte(iso: string, agora = new Date()): number {
  const dia = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((dia(new Date(iso)) - dia(agora)) / 864e5)
}

export function linkWhats(numero: string | null, texto: string): string | null {
  if (!numero) return null
  let n = numero.replace(/\D/g, ''); if (n.length === 10 || n.length === 11) n = '55' + n
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`
}

type Rpc = (fn: string, args: Record<string, unknown>) => Promise<unknown>

export type MpApi = {
  inicio(): Promise<MpInicio | null>
  lidas(ids: string[]): Promise<void>
  mensagens(): Promise<MpMensagem[]>
  enviar(texto: string): Promise<void>
}

/** Chamadas diretas às funções públicas do banco (sem o pacote do app da equipe). */
export function criarRpc(url: string, chave: string): Rpc {
  return async (fn, args) => {
    const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, {
      method: 'POST', headers: { apikey: chave, Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args),
    })
    if (!r.ok) throw new Error('Sem conexão com o escritório agora. Tente de novo em instantes.')
    return r.json()
  }
}

export function criarMpApi(rpc: Rpc, token: string): MpApi {
  return {
    async inicio() {
      const r = (await rpc('mp_inicio', { p_token: token })) as Record<string, unknown> & { ok?: boolean }
      if (!r?.ok) return null
      const { ok: _ok, ...resto } = r
      return resto as unknown as MpInicio
    },
    async lidas(ids) { if (ids.length) await rpc('mp_lida', { p_token: token, p_ids: ids }) },
    async mensagens() {
      const r = (await rpc('mp_mensagens_ler', { p_token: token })) as { ok?: boolean; mensagens?: MpMensagem[] }
      return r?.ok ? r.mensagens ?? [] : []
    },
    async enviar(texto) {
      const r = (await rpc('mp_enviar', { p_token: token, p_texto: texto })) as { ok?: boolean; erro?: string }
      if (!r?.ok) throw new Error(r?.erro ?? 'Não deu para enviar agora.')
    },
  }
}
