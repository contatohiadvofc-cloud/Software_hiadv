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
  it('IA leva ao Sênior, com plano para começar enquanto não é liberado', () => {
    expect(recomendar({ atuacao: 'sozinho', prioridades: ['ia'] })).toMatchObject({ plano: 'supremo', comecarCom: 'pro' })
    expect(recomendar({ atuacao: 'equipe', prioridades: ['ia'] })).toMatchObject({ plano: 'supremo', comecarCom: 'premium' })
  })
  it('preços e fundador conferem com o documento de planos', () => {
    expect(PLANOS.map((p) => [p.id, p.preco, p.fundador])).toEqual([['pro', 109.9, 109.9], ['premium', 189.9, 169.9], ['supremo', 297, 200]])
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
