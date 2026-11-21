import { diaSP } from './seuDia'

export type Compromisso = {
  id: string
  tipo: 'pericia' | 'audiencia'
  titulo: string
  cliente: string
  clienteId: string | null
  /** AAAA-MM-DD e HH:MM em Brasília */
  dia: string
  hora: string
  local: string
  quem: string
}
export type DiaAgenda = { dia: string; rotulo: string; itens: Compromisso[] }

function somaDias(dia: string, n: number): string {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10)
}

export function rotuloDia(dia: string, hoje: string): string {
  if (dia === hoje) return 'Hoje'
  if (dia === somaDias(hoje, 1)) return 'Amanhã'
  const [a, m, d] = dia.split('-').map(Number)
  const dt = new Date(Date.UTC(a, m - 1, d, 12))
  const sem = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' }).format(dt)
  return `${sem.charAt(0).toUpperCase()}${sem.slice(1)}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

/** De hoje até "dias" à frente, um bloco por dia que tem compromisso, em ordem de horário. */
export function agruparAgenda(lista: Compromisso[], agora: Date = new Date(), dias = 30): DiaAgenda[] {
  const hoje = diaSP(agora)
  const fim = somaDias(hoje, dias)
  const mapa = new Map<string, Compromisso[]>()
  for (const c of lista) {
    if (c.dia < hoje || c.dia > fim) continue
    if (!mapa.has(c.dia)) mapa.set(c.dia, [])
    mapa.get(c.dia)!.push(c)
  }
  return [...mapa.keys()].sort().map((dia) => ({
    dia, rotulo: rotuloDia(dia, hoje),
    itens: mapa.get(dia)!.sort((a, b) => a.hora.localeCompare(b.hora) || a.cliente.localeCompare(b.cliente)),
  }))
}

/** "pericia_medica" → "Perícia médica" quando o servidor manda o código. */
export function nomeTipo(t: string | null | undefined, padrao: string): string {
  const s = (t ?? '').replace(/_/g, ' ').trim()
  if (!s) return padrao
  const corr: Record<string, string> = { medica: 'médica', 'pericia': 'perícia', social: 'social', instrucao: 'instrução', conciliacao: 'conciliação', una: 'una', inicial: 'inicial' }
  const p = s.toLowerCase().split(' ').map((w) => corr[w] ?? w).join(' ')
  return p.charAt(0).toUpperCase() + p.slice(1)
}
