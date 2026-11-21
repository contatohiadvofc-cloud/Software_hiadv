import { diferencas, textoEvento, valorParaEdicao } from '../../src/data/ficha'
import type { CampoDef } from '../../src/data/campos'

const defs: CampoDef[] = [
  { chave: 'vara', rotulo: 'Vara', tipo: 'texto', opcoes: null, ordem: 1, noCartao: true },
  { chave: 'salario', rotulo: 'Salário', tipo: 'moeda', opcoes: null, ordem: 2, noCartao: false },
]

describe('diferencas', () => {
  it('manda só o que mudou', () => {
    expect(diferencas(defs, { vara: '1ª Vara', salario: 2000 }, { vara: '1ª Vara', salario: '2500' })).toEqual({ salario: '2500' })
  })
  it('limpar um campo manda vazio', () => {
    expect(diferencas(defs, { vara: '1ª Vara' }, { vara: '  ' })).toEqual({ vara: '' })
  })
  it('ignora chave que não é da área', () => {
    expect(diferencas(defs, {}, { outra: 'x' } as Record<string, string>)).toEqual({})
  })
})

describe('textoEvento', () => {
  it('descreve mudança de etapa', () => {
    expect(textoEvento({ evento: 'status', de: 'pendente', para: 'protocolado', detalhe: null, quem: null, em: '' })).toBe('Mudou de “pendente” para “protocolado”')
  })
  it('usa o detalhe quando existe', () => {
    expect(textoEvento({ evento: 'campos', de: null, para: null, detalhe: 'Atualizou: Vara', quem: null, em: '' })).toBe('Atualizou: Vara')
  })
})

describe('moeda na edição', () => {
  it('mostra com vírgula e não reenvia valor igual', () => {
    expect(valorParaEdicao(defs[1], 3150)).toBe('3150,00')
    expect(diferencas(defs, { salario: 3150 }, { salario: '3150,00' })).toEqual({})
    expect(diferencas(defs, { salario: 3150 }, { salario: '3.200,50' })).toEqual({ salario: '3200.50' })
  })
})
