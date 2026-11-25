// "Experimente o HiAdv": prévia guiada, com dados fictícios, que não salva nada.
// Para não virar uso permanente: tempo curto, uma vez por dia no aparelho, roteiro fechado e,
// no fim, o convite para o teste de 14 dias com os dados do próprio escritório.
export const DURACAO_MIN = 20
const CHAVE_INICIO = 'hiadv-previa-inicio'
const CHAVE_ULTIMA = 'hiadv-previa-ultima'
const CHAVE_VISTAS = 'hiadv-previa-vistas'

export type Parada = { rota: string; titulo: string; texto: string; tente: string; plano: 'Júnior' | 'Pleno' | 'Sênior' }
/** Roteiro da prévia: só o que já funciona no HiAdv de verdade, na ordem do dia a dia do escritório. */
export const ROTEIRO: Parada[] = [
  { rota: '/seu-dia', titulo: 'Seu dia', texto: 'O que está atrasado, o que vence hoje e os próximos 7 dias, para cada pessoa.', tente: 'Toque em um número no alto para filtrar a lista.', plano: 'Júnior' },
  { rota: '/atendimentos', titulo: 'Atendimentos', texto: 'Do primeiro contato até virar cliente, com a origem marcada.', tente: 'Mova um atendimento para a próxima etapa.', plano: 'Júnior' },
  { rota: '/areas', titulo: 'Casos por área', texto: 'Cada área com o seu quadro de etapas e o que falta para o caso andar.', tente: 'Abra um caso e veja a ficha com o checklist.', plano: 'Júnior' },
  { rota: '/clientes', titulo: 'Clientes', texto: 'Ficha completa e o link de acompanhamento que o cliente abre sem senha.', tente: 'Abra Rita Moura e gere o link de acompanhamento.', plano: 'Júnior' },
  { rota: '/publicacoes', titulo: 'Publicações', texto: 'Intimações das OABs acompanhadas, que viram prazo ou tarefa.', tente: 'Transforme uma publicação em prazo.', plano: 'Júnior' },
  { rota: '/agenda', titulo: 'Agenda', texto: 'Prazos, audiências e perícias da equipe num só calendário.', tente: 'Troque entre lista e calendário.', plano: 'Júnior' },
  { rota: '/financeiro', titulo: 'Financeiro', texto: 'Honorários fixos, de êxito ou mistos, parcelas e atrasos.', tente: 'Filtre as parcelas em atraso.', plano: 'Pleno' },
  { rota: '/relatorios', titulo: 'Relatórios', texto: 'Onde os casos param e como a equipe está produzindo.', tente: 'Veja a aba Equipe.', plano: 'Pleno' },
  { rota: '/integracoes', titulo: 'Integrações e IA', texto: 'Escavador, JUDIT, agenda, assinatura, cobrança e a IA própria do escritório no Sênior.', tente: 'Abra o cartão da IA própria.', plano: 'Sênior' },
]

const ler = (k: string, s: Storage = sessionStorage) => { try { return s.getItem(k) } catch { return null } }
const gravar = (k: string, v: string, s: Storage = sessionStorage) => { try { s.setItem(k, v) } catch { /* sem armazenamento */ } }
const hojeLocal = () => new Date().toLocaleDateString('sv-SE')

export const emPrevia = () => ler('hiadv-previa') === '1'

/** Começa a prévia. Devolve false se este aparelho já usou a prévia hoje. */
export function comecarPrevia(agora = Date.now()): boolean {
  const ultima = ler(CHAVE_ULTIMA, localStorage)
  if (ultima === hojeLocal() && !emPrevia()) return false
  gravar('hiadv-previa', '1'); gravar('hiadv-modo-demo', '1')
  if (!ler(CHAVE_INICIO)) gravar(CHAVE_INICIO, String(agora))
  gravar(CHAVE_ULTIMA, hojeLocal(), localStorage)
  return true
}

export function minutosRestantes(agora = Date.now()): number {
  const ini = Number(ler(CHAVE_INICIO) ?? agora)
  return Math.max(0, Math.ceil(DURACAO_MIN - (agora - ini) / 60000))
}

export function marcarVista(rota: string): string[] {
  const vistas = new Set<string>(JSON.parse(ler(CHAVE_VISTAS) ?? '[]'))
  const parada = ROTEIRO.find((p) => rota === p.rota || rota.startsWith(p.rota + '/'))
  if (parada) vistas.add(parada.rota)
  gravar(CHAVE_VISTAS, JSON.stringify([...vistas]))
  return [...vistas]
}

export function encerrarPrevia() {
  try { for (const k of ['hiadv-previa', 'hiadv-modo-demo', CHAVE_INICIO, CHAVE_VISTAS]) sessionStorage.removeItem(k) } catch { /* sem armazenamento */ }
}
