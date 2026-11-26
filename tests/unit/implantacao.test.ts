import { describe, expect, it } from 'vitest'
import { IMPLANTACAO } from '../../src/data/adesao'
describe('implantação assistida', () => {
  it('tem 6 semanas, cada uma com treino', () => {
    expect(IMPLANTACAO.semanas).toHaveLength(6)
    IMPLANTACAO.semanas.forEach((s, i) => { expect(s.titulo.startsWith(`Semana ${i + 1}`)).toBe(true); expect(s.itens.some((x) => x.startsWith('Treino'))).toBe(true) })
  })
  it('custa R$ 8.000 com as formas de pagamento combinadas', () => {
    expect(IMPLANTACAO.valor).toBe(8000)
    for (const f of ['Dinheiro', 'débito', 'Pix', '10x', '3x no boleto']) expect(IMPLANTACAO.pagamento).toContain(f)
  })
})

import { PLANOS, limiteChamada, recomendar } from '../../src/data/adesao'
import { qualidadeVideo } from '../../src/data/chamada'

describe('nova grade de planos (26/11/2026)', () => {
  it('acessos de cada plano e o Master como único "em breve"', () => {
    expect(PLANOS.map((p) => [p.nome, p.acessos.gestores, p.acessos.colaboradores, p.acessos.total])).toEqual([
      ['Júnior', 2, 1, 2], ['Pleno', 3, 6, 9], ['Sênior', 5, 8, 13], ['Master', 5, 8, 13]])
    expect(PLANOS.filter((p) => p.emBreve).map((p) => p.nome)).toEqual(['Master'])
    expect(PLANOS.find((p) => p.nome === 'Master')?.aPartirDe).toBe(true)
  })
  it('chamada comporta o total de acessos do plano; no Master, o contratado', () => {
    expect(limiteChamada('pro')).toBe(2); expect(limiteChamada('premium')).toBe(9); expect(limiteChamada('senior')).toBe(13)
    expect(limiteChamada('supremo', 20)).toBe(20); expect(limiteChamada('supremo')).toBe(13); expect(limiteChamada(null)).toBe(13)
  })
  it('chamadas grandes ficam com vídeo leve', () => {
    expect(qualidadeVideo(12).maxBitrate).toBeLessThan(qualidadeVideo(4).maxBitrate)
  })
  it('quem quer IA recebe o Sênior, já liberado', () => {
    expect(recomendar({ atuacao: 'equipe', prioridades: ['ia'] }).plano).toBe('senior')
  })
})
