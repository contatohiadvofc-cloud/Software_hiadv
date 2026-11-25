// "Experimente o HiAdv": prévia guiada, com dados fictícios, que não salva nada.
// Para não virar uso permanente: tempo curto, uma vez por dia no aparelho, roteiro fechado e,
// no fim, o convite para o teste de 14 dias com os dados do próprio escritório.
export const DURACAO_MIN = 20
const CHAVE_INICIO = 'hiadv-previa-inicio'
const CHAVE_ULTIMA = 'hiadv-previa-ultima'
const CHAVE_VISTAS = 'hiadv-previa-vistas'

export type Parada = { rota: string; titulo: string; texto: string; plano: 'Júnior' | 'Pleno' | 'Sênior' }
export const ROTEIRO: Parada[] = [
  { rota: '/seu-dia', titulo: 'Seu dia', texto: 'Prazos, perícias e audiências de hoje, com aviso antes do fatal.', plano: 'Júnior' },
  { rota: '/areas', titulo: 'Casos por área', texto: 'Cada caso em etapas, com o que falta para avançar e os documentos já identificados.', plano: 'Júnior' },
  { rota: '/publicacoes', titulo: 'Publicações', texto: 'Intimações pela OAB, que viram tarefa com prazo calculado.', plano: 'Júnior' },
  { rota: '/integracoes', titulo: 'Integrações', texto: 'Escavador, JUDIT, Google Agenda, assinatura e cobrança, conectados pelo próprio escritório.', plano: 'Júnior' },
  { rota: '/financeiro', titulo: 'Financeiro', texto: 'Honorários fixos, de êxito ou mistos, parcelas e atrasos.', plano: 'Pleno' },
  { rota: '/relatorios', titulo: 'Relatórios', texto: 'Onde os casos param e como a equipe está produzindo.', plano: 'Pleno' },
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
