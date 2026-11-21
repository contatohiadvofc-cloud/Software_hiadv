import { lerValor, limitesDoMes, mensagemCobranca, mesVizinho, previaParcelas, resumoDoMes, validarHonorario, type Lancamento } from '../../src/data/financeiro'

const l = (p: Partial<Lancamento>): Lancamento => ({ id: 'x', sentido: 'entrada', etiqueta: 'Honorários', titulo: 't', descricao: null, valor: 100, vencimento: '2026-11-10', pagoEm: null, clienteId: 'c', cliente: 'Rita Moura', telefone: null, honorarioId: null, ...p })

describe('financeiro', () => {
  it('lê valores do jeito brasileiro e do jeito do teclado', () => {
    expect(lerValor('1.234,56')).toBe(1234.56)
    expect(lerValor('R$ 1.500')).toBe(1500)
    expect(lerValor('1500.5')).toBe(1500.5)
    expect(lerValor('abc')).toBeNull()
    expect(lerValor('0')).toBeNull()
  })
  it('divide as parcelas como o servidor e respeita o fim do mês', () => {
    expect(previaParcelas(1000, 3, '2026-01-31')).toEqual([
      { valor: 333.33, vencimento: '2026-01-31' }, { valor: 333.33, vencimento: '2026-02-28' }, { valor: 333.34, vencimento: '2026-03-31' },
    ])
  })
  it('valida o contrato conforme o tipo', () => {
    const base = { cliente: 'c', caso: null, descricao: '', valorFixo: '', parcelas: '1', primeiroVencimento: '2026-11-10', percentualExito: '' }
    expect(validarHonorario({ ...base, tipo: 'fixo' })).toBe('Informe o valor fixo.')
    expect(validarHonorario({ ...base, tipo: 'exito' })).toBe('Informe o percentual de êxito (até 100%).')
    expect(validarHonorario({ ...base, tipo: 'exito', percentualExito: '30' })).toBeNull()
    expect(validarHonorario({ ...base, tipo: 'misto', valorFixo: '1.000,00', parcelas: '61', percentualExito: '30' })).toBe('De 1 a 60 parcelas.')
  })
  it('resume o mês com atrasados de antes', () => {
    const r = resumoDoMes([
      l({ id: 'a', vencimento: '2026-10-10' }),
      l({ id: 'b', vencimento: '2026-11-05', pagoEm: '2026-11-06', valor: 300 }),
      l({ id: 'c', vencimento: '2026-11-25', valor: 200 }),
      l({ id: 'd', sentido: 'saida', vencimento: '2026-11-10', pagoEm: '2026-11-10', valor: 50 }),
    ], '2026-11', '2026-11-21')
    expect(r).toMatchObject({ recebido: 300, aReceber: 200, atrasado: 100, despesas: 50, resultado: 250 })
    expect(r.atrasados.map((x) => x.id)).toEqual(['a'])
  })
  it('navega entre meses', () => {
    expect(limitesDoMes('2026-02')).toEqual({ de: '2026-02-01', ate: '2026-02-28' })
    expect(mesVizinho('2026-12', 1)).toBe('2027-01')
    expect(mesVizinho('2026-01', -1)).toBe('2025-12')
  })
  it('lembrete cordial, sem pressão', () => {
    expect(mensagemCobranca(l({ valor: 333.33 }), 'Silva & Prado')).toBe('Olá, Rita! Aqui é do Silva & Prado. Passando para lembrar da parcela de R$ 333,33 com vencimento em 10/11. Se já pagou, pode desconsiderar e, se puder, nos envie o comprovante. Qualquer dúvida, estamos à disposição.')
  })
})
