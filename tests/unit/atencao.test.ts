import { lerItemAtencao, ordenarAtencao, rotuloAtencao, validarRegras, REGRAS_PADRAO, type ItemAtencao } from '../../src/data/atencao'

const base: ItemAtencao = { tipo: 'prazo', id: '1', evento: null, titulo: 'A', detalhe: '', dia: '2026-11-25', responsavel: null, clienteId: null, casoId: null, gravidade: 'media', escalado: false }

describe('precisa de atenção', () => {
  it('ordena por gravidade, tipo e data', () => {
    const r = ordenarAtencao([
      { ...base, id: 'p-media', dia: '2026-11-24' },
      { ...base, id: 'parado-alta', tipo: 'parado', gravidade: 'alta', dia: '2026-10-01' },
      { ...base, id: 'prazo-alta', gravidade: 'alta', dia: '2026-11-23' },
      { ...base, id: 'prep-alta', tipo: 'preparo', evento: 'pericia', gravidade: 'alta', dia: '2026-11-23' },
    ])
    expect(r.map((x) => x.id)).toEqual(['prazo-alta', 'prep-alta', 'parado-alta', 'p-media'])
  })
  it('nomeia cada tipo', () => {
    expect(rotuloAtencao({ tipo: 'prazo', evento: null })).toBe('Prazo fatal')
    expect(rotuloAtencao({ tipo: 'parado', evento: null })).toBe('Caso parado')
    expect(rotuloAtencao({ tipo: 'preparo', evento: 'audiencia' })).toBe('Preparar audiência')
    expect(rotuloAtencao({ tipo: 'preparo', evento: 'pericia' })).toBe('Preparar perícia')
  })
  it('lê o item do servidor com segurança', () => {
    const it = lerItemAtencao({ tipo: 'preparo', id: 'x', evento: 'audiencia', titulo: 'Fulano', detalhe: 'Audiência 23/11', dia: '2026-11-23', responsavel: '', cliente_id: 'c1', caso_id: null, gravidade: 'alta', escalado: true })
    expect(it).toMatchObject({ tipo: 'preparo', evento: 'audiencia', responsavel: null, clienteId: 'c1', casoId: null, gravidade: 'alta', escalado: true })
    expect(lerItemAtencao({ tipo: 'estranho', id: 2 }).tipo).toBe('prazo')
  })
  it('valida as regras do escritório', () => {
    expect(validarRegras(REGRAS_PADRAO)).toBeNull()
    expect(validarRegras({ ...REGRAS_PADRAO, paradoDias: 1 })).toMatch(/parado/)
    expect(validarRegras({ ...REGRAS_PADRAO, preparoDias: 31 })).toMatch(/Preparação/)
    expect(validarRegras({ ...REGRAS_PADRAO, fatalAlertaDias: 1.5 })).toMatch(/fatal/)
  })
})

describe('rodízio e falhas', () => {
  it('lê o rodízio só com listas', async () => {
    const { lerRodizio, textoFalha } = await import('../../src/data/atencao')
    expect(lerRodizio({ trabalhista: ['a@x', 'b@y'], ruim: 'x' })).toEqual({ trabalhista: ['a@x', 'b@y'] })
    expect(lerRodizio(null)).toEqual({})
    expect(lerRodizio(['a'])).toEqual({})
    expect(textoFalha({ detalhe: 'Agente interno não concluiu: modelo ausente' })).toBe('modelo ausente')
    expect(textoFalha({ detalhe: 'Rodízio não concluiu: ' })).toBe('Erro sem detalhe.')
  })
})
