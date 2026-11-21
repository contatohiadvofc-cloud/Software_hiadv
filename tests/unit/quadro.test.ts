import { montarColunas, exigenciaDaMudanca, type Etapa, type CasoCard } from '../../src/data/quadro'
import { destaquesDoCartao } from '../../src/data/quadro'

const etapas: Etapa[] = [
  { status: 'pendente', ordem: 1, final: false, pedeMotivo: false },
  { status: 'protocolado', ordem: 5, final: false, pedeMotivo: false },
  { status: 'inviável', ordem: 10, final: true, pedeMotivo: true },
  { status: 'decisão positiva', ordem: 12, final: true, pedeMotivo: false },
]
const caso = (id: string, status: string, dias = 1): CasoCard => ({ id, cliente: `Cliente ${id}`, status, dias, produto: null, numeroCnj: null, gateOk: 0, gateTotal: 0 })

describe('montarColunas', () => {
  it('põe cada caso na sua etapa, na ordem das etapas, e esconde as finais por padrão', () => {
    const cols = montarColunas(etapas, [caso('a', 'protocolado'), caso('b', 'pendente'), caso('c', 'inviável')], false)
    expect(cols.map((c) => c.etapa.status)).toEqual(['pendente', 'protocolado'])
    expect(cols[0].casos.map((c) => c.id)).toEqual(['b'])
  })
  it('mostra as finais quando pedido e ordena por mais tempo parado', () => {
    const cols = montarColunas(etapas, [caso('a', 'pendente', 2), caso('b', 'pendente', 9)], true)
    expect(cols).toHaveLength(4)
    expect(cols[0].casos.map((c) => c.id)).toEqual(['b', 'a'])
  })
  it('caso com etapa desconhecida não some: vai para a primeira coluna', () => {
    const cols = montarColunas(etapas, [caso('x', 'etapa antiga')], false)
    expect(cols[0].casos.map((c) => c.id)).toEqual(['x'])
  })
})

describe('exigenciaDaMudanca', () => {
  it('etapa comum: nada a pedir', () => {
    expect(exigenciaDaMudanca(etapas[1])).toEqual({ motivo: false, confirmar: false })
  })
  it('etapa final com motivo: pede motivo e confirmação', () => {
    expect(exigenciaDaMudanca(etapas[2])).toEqual({ motivo: true, confirmar: true })
  })
  it('etapa final sem motivo: só confirmação', () => {
    expect(exigenciaDaMudanca(etapas[3])).toEqual({ motivo: false, confirmar: true })
  })
})

describe('destaquesDoCartao', () => {
  const defs = [
    { chave: 'fase', rotulo: 'Fase', tipo: 'lista' as const, opcoes: ['Recurso'], ordem: 120, noCartao: true },
    { chave: 'reclamadas', rotulo: 'Reclamada(s)', tipo: 'texto' as const, opcoes: null, ordem: 10, noCartao: true },
    { chave: 'salario', rotulo: 'Salário', tipo: 'moeda' as const, opcoes: null, ordem: 50, noCartao: false },
  ]
  it('só os marcados para o cartão, na ordem, sem vazios', () => {
    expect(destaquesDoCartao(defs, { fase: 'Recurso', salario: 10, vara: '' })).toEqual([{ rotulo: 'Fase', valor: 'Recurso' }])
    expect(destaquesDoCartao(defs, { fase: 'Recurso', reclamadas: 'Alfa' }).map((d) => d.rotulo)).toEqual(['Reclamada(s)', 'Fase'])
  })
})
