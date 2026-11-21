import { diaSP } from './seuDia'

export type Pessoa = { email: string; nome: string }
export type Tarefa = {
  id: string
  titulo: string
  detalhe: string | null
  /** AAAA-MM-DD; prazo fatal tem prioridade sobre o prazo comum */
  prazo: string | null
  fatal: boolean
  responsavel: string | null
}
export type NovaTarefa = { titulo: string; responsavel: string; prazo: string; detalhe: string }
export type GruposTarefas = { atrasadas: Tarefa[]; hoje: Tarefa[]; semana: Tarefa[]; depois: Tarefa[]; semData: Tarefa[] }

function somaDias(dia: string, n: number): string {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10)
}

const ordem = (a: Tarefa, b: Tarefa) => (a.prazo ?? '').localeCompare(b.prazo ?? '') || Number(b.fatal) - Number(a.fatal) || a.titulo.localeCompare(b.titulo)

/** Diferente do Seu dia, aqui nada some: o que passa de 7 dias vai para "Mais adiante". */
export function agruparTarefas(lista: Tarefa[], agora: Date = new Date()): GruposTarefas {
  const hoje = diaSP(agora)
  const limite = somaDias(hoje, 7)
  const g: GruposTarefas = { atrasadas: [], hoje: [], semana: [], depois: [], semData: [] }
  for (const t of lista) {
    if (!t.prazo) g.semData.push(t)
    else if (t.prazo < hoje) g.atrasadas.push(t)
    else if (t.prazo === hoje) g.hoje.push(t)
    else if (t.prazo <= limite) g.semana.push(t)
    else g.depois.push(t)
  }
  for (const k of Object.keys(g) as Array<keyof GruposTarefas>) g[k].sort(ordem)
  return g
}

export function nomeDe(email: string | null, equipe: Pessoa[]): string {
  if (!email) return 'Equipe'
  return equipe.find((p) => p.email === email)?.nome.split(' ')[0] ?? email.split('@')[0]
}

/** Confere antes de enviar; o servidor confere de novo. */
export function validarNovaTarefa(n: NovaTarefa, hoje: string = diaSP(new Date())): string | null {
  if (n.titulo.trim().length < 2) return 'Escreva o que precisa ser feito.'
  if (n.titulo.trim().length > 200) return 'O título passa de 200 caracteres. Use o detalhe para o resto.'
  if (n.prazo && !/^\d{4}-\d{2}-\d{2}$/.test(n.prazo)) return 'Informe uma data válida.'
  if (n.prazo && n.prazo < somaDias(hoje, -365)) return 'A data parece errada (mais de um ano atrás).'
  return null
}
