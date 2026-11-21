export type Lancamento = {
  id: string
  sentido: 'entrada' | 'saida'
  etiqueta: string
  titulo: string
  descricao: string | null
  valor: number
  vencimento: string
  pagoEm: string | null
  clienteId: string | null
  cliente: string | null
  telefone: string | null
  honorarioId: string | null
}
export type TipoHonorario = 'fixo' | 'exito' | 'misto'
export type Honorario = {
  id: string; tipo: TipoHonorario; descricao: string | null; valorFixo: number | null; parcelas: number | null
  percentualExito: number | null; status: 'ativo' | 'encerrado'; criadoEm: string; recebido: number; aReceber: number; atrasado: number
}
export type NovoHonorario = { cliente: string; caso: string | null; tipo: TipoHonorario; descricao: string; valorFixo: string; parcelas: string; primeiroVencimento: string; percentualExito: string }
export type NovoLancamento = { sentido: 'entrada' | 'saida'; titulo: string; valor: string; vencimento: string; etiqueta: string; cliente: string | null; pago: boolean }

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const moeda = (v: number) => BRL.format(v)

/** "1.234,56", "1234.56", "R$ 1.234" → número; null se não der. */
export function lerValor(t: string): number | null {
  let s = t.replace(/[^\d.,]/g, '')
  if (!s) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if ((s.match(/\./g) ?? []).length > 1 || /\.\d{3}$/.test(s)) s = s.replace(/\./g, '')
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null
}

export function validarHonorario(h: NovoHonorario): string | null {
  if (!h.cliente) return 'Escolha o cliente.'
  if (h.tipo !== 'exito') {
    if (!lerValor(h.valorFixo)) return 'Informe o valor fixo.'
    const n = Number(h.parcelas)
    if (!Number.isInteger(n) || n < 1 || n > 60) return 'De 1 a 60 parcelas.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(h.primeiroVencimento)) return 'Informe o primeiro vencimento.'
  }
  if (h.tipo !== 'fixo') {
    const p = lerValor(h.percentualExito)
    if (!p || p > 100) return 'Informe o percentual de êxito (até 100%).'
  }
  return null
}

export function validarLancamento(l: NovoLancamento): string | null {
  if (l.titulo.trim().length < 2) return 'Descreva o lançamento.'
  if (l.titulo.trim().length > 120) return 'Descrição com até 120 letras.'
  if (!lerValor(l.valor)) return 'Informe o valor.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(l.vencimento)) return 'Informe a data.'
  if (l.etiqueta.trim().length > 40) return 'Etiqueta com até 40 letras.'
  return null
}

/** Parcelas como o servidor gera: valor dividido igual, centavos que sobram na última, vencimentos mensais. */
export function previaParcelas(valor: number, n: number, primeiro: string): { valor: number; vencimento: string }[] {
  const parte = Math.floor((valor / n) * 100) / 100
  const resto = Math.round((valor - parte * n) * 100) / 100
  const [a, m, d] = primeiro.split('-').map(Number)
  return Array.from({ length: n }, (_, i) => {
    const alvo = new Date(Date.UTC(a, m - 1 + i, 1))
    const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate()
    alvo.setUTCDate(Math.min(d, ultimo))
    return { valor: Math.round((parte + (i === n - 1 ? resto : 0)) * 100) / 100, vencimento: alvo.toISOString().slice(0, 10) }
  })
}

export type Resumo = { recebido: number; aReceber: number; atrasado: number; despesas: number; resultado: number; atrasados: Lancamento[]; proximos: Lancamento[] }

/** Resumo do mês (AAAA-MM). Atrasado inclui meses anteriores. */
export function resumoDoMes(l: Lancamento[], mes: string, hoje: string): Resumo {
  const noMes = (d: string | null) => !!d && d.slice(0, 7) === mes
  const ent = l.filter((x) => x.sentido === 'entrada')
  const sai = l.filter((x) => x.sentido === 'saida')
  const soma = (xs: Lancamento[]) => Math.round(xs.reduce((s, x) => s + x.valor, 0) * 100) / 100
  const recebido = soma(ent.filter((x) => noMes(x.pagoEm)))
  const despesasPagas = soma(sai.filter((x) => noMes(x.pagoEm)))
  const atrasados = ent.filter((x) => !x.pagoEm && x.vencimento < hoje).sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  const proximos = ent.filter((x) => !x.pagoEm && x.vencimento >= hoje && noMes(x.vencimento)).sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  return {
    recebido, aReceber: soma(proximos), atrasado: soma(atrasados), despesas: soma(sai.filter((x) => noMes(x.vencimento))),
    resultado: Math.round((recebido - despesasPagas) * 100) / 100, atrasados, proximos,
  }
}

export function limitesDoMes(mes: string): { de: string; ate: string } {
  const [a, m] = mes.split('-').map(Number)
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate()
  return { de: `${mes}-01`, ate: `${mes}-${String(ultimo).padStart(2, '0')}` }
}
export function mesVizinho(mes: string, passo: number): string {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 1 + passo, 1))
  return d.toISOString().slice(0, 7)
}
export function nomeDoMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number)
  const n = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(a, m - 1, 1)))
  return `${n[0].toUpperCase()}${n.slice(1)} de ${a}`
}

/** Lembrete cordial de pagamento, para o advogado revisar e enviar pelo WhatsApp (nada sai sozinho). */
export function mensagemCobranca(l: Lancamento, escritorio: string): string {
  const primeiro = (l.cliente ?? '').split(' ')[0]
  const venc = `${l.vencimento.slice(8, 10)}/${l.vencimento.slice(5, 7)}`
  return `Olá, ${primeiro}! Aqui é do ${escritorio}. Passando para lembrar da parcela de ${moeda(l.valor)} com vencimento em ${venc}. Se já pagou, pode desconsiderar e, se puder, nos envie o comprovante. Qualquer dúvida, estamos à disposição.`
}
