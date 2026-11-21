import { cnjTela, oabTela, porDia, prazoNoTexto, resumirPulados, validarPrazo, type Publicacao } from '../../src/data/publicacoes'

const pub = (id: number, quando: string): Publicacao => ({ id, quando, publicacao: true, titulo: 't', texto: null, processoId: 'p', numeroCnj: null, clienteId: null, cliente: null, tarefa: null })

describe('publicações e prazos', () => {
  it('formata o número CNJ', () => {
    expect(cnjTela('50023588220264047212')).toBe('5002358-82.2026.4.04.7212')
    expect(cnjTela('123')).toBe('123')
  })
  it('agrupa por dia no fuso de Brasília', () => {
    const g = porDia([pub(1, '2026-11-21T01:00:00Z'), pub(2, '2026-11-21T15:00:00Z'), pub(3, '2026-11-19T12:00:00Z')])
    expect(g.map((x) => [x.dia, x.itens.map((i) => i.id)])).toEqual([['2026-11-21', [2]], ['2026-11-20', [1]], ['2026-11-19', [3]]])
  })
  it('acha o prazo escrito na publicação', () => {
    expect(prazoNoTexto('Intime-se a parte autora para, no prazo de 15 (quinze) dias, manifestar-se')).toBe(15)
    expect(prazoNoTexto('no PRAZO COMUM DE 5 DIAS')).toBe(5)
    expect(prazoNoTexto('Vista ao INSS.')).toBeNull()
  })
  it('resume o recesso num período e não repete o Natal', () => {
    const p = [
      { dia: '2026-12-08', nome: 'Dia da Justiça' },
      ...['2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24', '2026-12-25', '2026-12-28', '2027-01-20'].map((dia) => ({ dia, nome: 'Suspensão de prazos (CPC, art. 220)' })),
      { dia: '2026-12-25', nome: 'Natal' },
    ]
    expect(resumirPulados(p)).toEqual(['08/12/2026: Dia da Justiça', '21/12/2026 a 28/12/2026: suspensão de prazos', '20/01/2027: Suspensão de prazos (CPC, art. 220)'])
  })
  it('valida o pedido e a OAB', () => {
    expect(validarPrazo({ inicio: '', dias: 15, contagem: 'uteis', justica: 'federal', disponibilizacao: true })).toBe('Informe a data.')
    expect(validarPrazo({ inicio: '2026-11-20', dias: 0, contagem: 'uteis', justica: 'federal', disponibilizacao: true })).toBe('Informe de 1 a 365 dias.')
    expect(oabTela('30297/sc')).toBe('OAB/SC 30.297')
    expect(oabTela('OAB/SC 37.550')).toBe('OAB/SC 37.550')
    expect(oabTela('12345')).toBeNull()
  })
})
