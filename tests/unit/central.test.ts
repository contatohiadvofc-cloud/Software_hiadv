import { acimaDoLimite, avisoAssinatura, planoMinimo, pode, recursoDaRota, validarNovo, type EscritorioCentral } from '../../src/data/central'

describe('Central HiAdv', () => {
  it('sem assinatura, tudo aberto; com assinatura, só a lista', () => {
    expect(pode(null, 'ia')).toBe(true)
    expect(pode({ plano: 'pro', situacao: 'ativo', testeAte: null, recursos: ['casos'] }, 'financeiro')).toBe(false)
  })
  it('plano mínimo pelo nome de tela', () => {
    expect(planoMinimo('financeiro')).toBe('Pleno')
    expect(planoMinimo('ia')).toBe('Sênior')
    expect(planoMinimo('casos')).toBe('Júnior')
  })
  it('rota → recurso', () => {
    expect(recursoDaRota('/financeiro')).toBe('financeiro')
    expect(recursoDaRota('/area/administrativo')).toBe('casos')
    expect(recursoDaRota('/configuracoes')).toBeNull()
  })
  it('avisos de assinatura', () => {
    const hoje = new Date('2026-11-21T12:00:00')
    expect(avisoAssinatura({ plano: 'pro', situacao: 'teste', testeAte: '2026-11-23', recursos: [] }, hoje)).toBe('O teste termina em 2 dias.')
    expect(avisoAssinatura({ plano: 'pro', situacao: 'teste', testeAte: '2026-11-01', recursos: [] }, hoje)).toMatch(/terminou/)
    expect(avisoAssinatura({ plano: 'pro', situacao: 'ativo', testeAte: null, recursos: [] }, hoje)).toBeNull()
    expect(avisoAssinatura({ plano: 'pro', situacao: 'suspenso', testeAte: null, recursos: [] }, hoje)).toMatch(/suspenso/)
  })
  it('limites ultrapassados', () => {
    const e = { limites: { masters: 1, colaboradores: 1, oabs: 1, iaMensal: 0 }, uso: { masters: 2, colaboradores: 1, oabs: 1, iaMes: 4 } } as EscritorioCentral
    expect(acimaDoLimite(e)).toEqual(['Masters 2/1'])
  })
  it('novo escritório pede nome e e-mail do Master', () => {
    expect(validarNovo({ nome: 'X', cidade: '', oab: '', masterNome: 'Ana', masterEmail: 'a@b.co', plano: 'pro', fundador: false })).toMatch(/nome do escritório/)
    expect(validarNovo({ nome: 'Rocha', cidade: '', oab: '', masterNome: 'Ana', masterEmail: 'ana', plano: 'pro', fundador: false })).toMatch(/E-mail/)
    expect(validarNovo({ nome: 'Rocha', cidade: '', oab: '', masterNome: 'Ana', masterEmail: 'ana@rocha.co', plano: 'pro', fundador: false })).toBeNull()
  })
})
