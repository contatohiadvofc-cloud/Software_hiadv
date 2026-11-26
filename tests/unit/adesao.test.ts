import { alternar, codigoValido, linkIndicacao, mensagemIndicacao, recomendar, respostasCompletas, resumoIndicacoes, validarAdesao, PLANOS } from '../../src/data/adesao'

describe('adesão', () => {
  it('recomenda o Júnior para quem trabalha sozinho e foca em prazos', () => {
    const r = recomendar({ atuacao: 'sozinho', processos: 'ate100', oabs: '1', areas: ['previdenciario'], prioridades: ['prazos', 'contatos'] })
    expect(r.plano).toBe('pro')
    expect(r.motivos.length).toBeGreaterThan(0)
  })
  it('recomenda o Pleno para equipe, várias OABs ou financeiro', () => {
    expect(recomendar({ atuacao: 'equipe', prioridades: ['prazos'] }).plano).toBe('premium')
    expect(recomendar({ atuacao: 'sozinho', oabs: '2a3', prioridades: ['prazos'] }).plano).toBe('premium')
    expect(recomendar({ atuacao: 'sozinho', prioridades: ['financeiro'] }).plano).toBe('premium')
    expect(recomendar({ atuacao: 'grande', oabs: '4mais' }).motivos.join(' ')).toContain('adicional')
  })
  it('IA leva ao Sênior, já liberado, com a IA própria do escritório', () => {
    expect(recomendar({ atuacao: 'sozinho', prioridades: ['ia'] })).toMatchObject({ plano: 'senior', comecarCom: null })
    expect(recomendar({ atuacao: 'grande', prioridades: ['ia'] }).motivos.join(' ')).toMatch(/Master/)
  })
  it('preços e fundador conferem com o documento de planos', () => {
    expect(PLANOS.map((p) => [p.id, p.preco, p.fundador])).toEqual([['pro', 119.9, 119.9], ['premium', 197.9, 197.9], ['senior', 397.5, 397.5], ['supremo', 524.5, 524.5]])
    expect(PLANOS.find((p) => p.id === 'supremo')?.emBreve).toBe(true)
  })
  it('valida o formulário', () => {
    const f = { nome: 'Carla Souza', email: 'carla@exemplo.com', whatsapp: '(49) 98888-1111', oab: '', escritorio: '', cidade: '', uf: '', consentimento: true }
    expect(validarAdesao(f)).toBeNull()
    expect(validarAdesao({ ...f, email: 'carla' })).toBe('E-mail inválido.')
    expect(validarAdesao({ ...f, whatsapp: '9999' })).toMatch(/DDD/)
    expect(validarAdesao({ ...f, consentimento: false })).toMatch(/Marque/)
    expect(validarAdesao({ ...f, uf: 'S' })).toMatch(/UF/)
  })
  it('respostas completas e máximo de escolhas', () => {
    expect(respostasCompletas({ atuacao: 'sozinho', processos: 'ate100', oabs: '1', areas: ['civel'] })).toBe(false)
    expect(respostasCompletas({ atuacao: 'sozinho', processos: 'ate100', oabs: '1', areas: ['civel'], prioridades: ['prazos'] })).toBe(true)
    expect(alternar(['a', 'b', 'c'], 'd', 3)).toEqual(['a', 'b', 'c'])
    expect(alternar(['a', 'b'], 'a')).toEqual(['b'])
  })
})

describe('indicações', () => {
  it('código, link e mensagem', () => {
    expect(codigoValido('ana7k2q')).toBe(true)
    expect(codigoValido('ABC')).toBe(false)
    expect(codigoValido('ABCDEF0')).toBe(false) // 0 e 1 não entram (confundem)
    expect(linkIndicacao('https://hiadv.com.br/', 'ANA7K2Q')).toBe('https://hiadv.com.br/aderir?ref=ANA7K2Q')
    expect(linkIndicacao('https://x.app', 'ANA7K2Q', true)).toBe('https://x.app/#/aderir?ref=ANA7K2Q')
    expect(mensagemIndicacao('L')).not.toMatch(/garant|ganhe|100%/i)
  })
  it('resumo', () => {
    expect(resumoIndicacoes([{ status: 'ativada', cortesia: 'aplicada' }, { status: 'nova', cortesia: 'nenhuma' }, { status: 'ativada', cortesia: 'pendente' }])).toEqual({ total: 3, ativadas: 2, meses: 2 })
  })
})

import { REGRA_CORTESIA as REGRA20 } from '../../src/data/adesao'
it('indicação vale 20% em uma mensalidade por indicação, e soma', () => {
  expect(REGRA20).toContain('20% de desconto em uma mensalidade')
  expect(REGRA20).toContain('quem indica 3 tem 3 mensalidades com 20% de desconto')
})
