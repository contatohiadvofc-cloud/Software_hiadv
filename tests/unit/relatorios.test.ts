import { gargalos, largura, mesCurto, type Relatorio } from '../../src/data/relatorios'

describe('relatórios', () => {
  it('barras proporcionais com mínimo visível', () => {
    expect(largura(0, 10)).toBe(0)
    expect(largura(1, 1000)).toBe(4)
    expect(largura(5, 10)).toBe(50)
    expect(largura(3, 0)).toBe(0)
  })
  it('gargalos do pior para o melhor, a partir de 7 dias', () => {
    const r = { etapas: [
      { area: 'a', etapa: 'x', casos: 1, media_dias: 3, maior_dias: 3 },
      { area: 'a', etapa: 'y', casos: 2, media_dias: 12, maior_dias: 20 },
      { area: 'b', etapa: 'z', casos: 5, media_dias: 30, maior_dias: 60 },
    ] } as Relatorio
    expect(gargalos(r).map((e) => e.etapa)).toEqual(['z', 'y'])
  })
  it('mês curto', () => { expect(mesCurto('2026-11')).toBe('nov/26') })
})
