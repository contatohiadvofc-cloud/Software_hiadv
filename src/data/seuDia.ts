export type TipoItem = 'prazo' | 'tarefa' | 'pericia' | 'audiencia'

export type ItemDia = {
  id: string
  tipo: TipoItem
  titulo: string
  sub: string
  /** dia no fuso de Brasília, AAAA-MM-DD; null quando não tem data */
  dia: string | null
  /** HH:MM em Brasília, quando houver horário */
  hora: string | null
  quem: string
}

export type Grupos = { atrasados: ItemDia[]; hoje: ItemDia[]; proximos7: ItemDia[]; semPrazo: ItemDia[] }

const FUSO = 'America/Sao_Paulo'

export function diaSP(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

export function horaSP(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
}

function somaDias(dia: string, n: number): string {
  const [a, m, d] = dia.split('-').map(Number)
  const x = new Date(Date.UTC(a, m - 1, d + n))
  return x.toISOString().slice(0, 10)
}

const ordem = (a: ItemDia, b: ItemDia) =>
  (a.dia ?? '').localeCompare(b.dia ?? '') || (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99') || a.titulo.localeCompare(b.titulo)

/** Agrupa os itens do dia. Itens além de 7 dias ficam de fora. */
export function agruparSeuDia(itens: ItemDia[], agora: Date = new Date()): Grupos {
  const hoje = diaSP(agora)
  const limite = somaDias(hoje, 7)
  const g: Grupos = { atrasados: [], hoje: [], proximos7: [], semPrazo: [] }
  for (const it of itens) {
    if (!it.dia) g.semPrazo.push(it)
    else if (it.dia < hoje) g.atrasados.push(it)
    else if (it.dia === hoje) g.hoje.push(it)
    else if (it.dia <= limite) g.proximos7.push(it)
  }
  g.atrasados.sort(ordem); g.hoje.sort(ordem); g.proximos7.sort(ordem); g.semPrazo.sort(ordem)
  return g
}

/** Texto curto de quando: "Venceu ontem", "Há 3 dias", "Hoje", "09:30", "Ter, 24/11". */
export function quandoTexto(it: ItemDia, agora: Date = new Date()): string {
  if (!it.dia) return 'Sem data'
  const hoje = diaSP(agora)
  if (it.dia === hoje) return it.hora ?? 'Hoje'
  if (it.dia < hoje) {
    const [a1, m1, d1] = it.dia.split('-').map(Number)
    const [a2, m2, d2] = hoje.split('-').map(Number)
    const dias = Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000)
    return dias === 1 ? 'Venceu ontem' : `Há ${dias} dias`
  }
  const [a, m, d] = it.dia.split('-').map(Number)
  const dt = new Date(Date.UTC(a, m - 1, d, 12))
  const sem = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' }).format(dt).replace('.', '')
  return `${sem.charAt(0).toUpperCase()}${sem.slice(1)}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}
