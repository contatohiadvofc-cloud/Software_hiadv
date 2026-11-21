import { valorParaTela, telaParaValor, validarCampo, type CampoDef } from '../../src/data/campos'

const def = (over: Partial<CampoDef>): CampoDef => ({ chave: 'x', rotulo: 'X', tipo: 'texto', opcoes: null, ordem: 1, noCartao: false, ...over })

describe('valorParaTela', () => {
  it('mostra moeda em reais', () => {
    expect(valorParaTela(def({ tipo: 'moeda' }), 2350.5)).toBe('R$ 2.350,50')
  })
  it('mostra data no formato brasileiro sem mudar o dia', () => {
    expect(valorParaTela(def({ tipo: 'data' }), '2021-03-01')).toBe('01/03/2021')
  })
  it('vazio vira traço', () => {
    expect(valorParaTela(def({ tipo: 'texto' }), undefined)).toBe('–')
  })
})

describe('telaParaValor e validarCampo', () => {
  it('aceita moeda com vírgula', () => {
    expect(telaParaValor(def({ tipo: 'moeda' }), '2.350,50')).toBe('2350.50')
    expect(validarCampo(def({ tipo: 'moeda', rotulo: 'Salário' }), 'abc')).toBe('Informe um valor em reais em "Salário".')
  })
  it('recusa opção fora da lista', () => {
    expect(validarCampo(def({ tipo: 'lista', opcoes: ['A', 'B'], rotulo: 'Fase' }), 'C')).toBe('Escolha uma opção da lista em "Fase".')
  })
  it('recusa texto curto acima do limite', () => {
    expect(validarCampo(def({ tipo: 'texto', rotulo: 'Vara' }), 'a'.repeat(301))).toBe('"Vara" passa de 300 caracteres.')
  })
  it('vazio é permitido (limpa o campo)', () => {
    expect(validarCampo(def({ tipo: 'data' }), '')).toBeNull()
  })
})
