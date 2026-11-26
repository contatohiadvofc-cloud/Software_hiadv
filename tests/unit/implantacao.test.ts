import { describe, expect, it } from 'vitest'
import { IMPLANTACAO } from '../../src/data/adesao'
describe('implantação assistida', () => {
  it('tem 7 dias, cada um com treino, e é só do plano Master', () => {
    expect(IMPLANTACAO.dias).toBe(7)
    expect(IMPLANTACAO.etapas).toHaveLength(7)
    IMPLANTACAO.etapas.forEach((s, i) => { expect(s.titulo.startsWith(`Dia ${i + 1}`)).toBe(true); expect(s.itens.some((x) => x.startsWith('Treino'))).toBe(true) })
    expect(IMPLANTACAO.plano).toBe('supremo')
    for (const t of ['estratégias comerciais', 'planejamento organizacional', 'Deividy', '7 dias']) expect(IMPLANTACAO.inclui).toContain(t)
  })
  it('custa R$ 800 com as formas de pagamento combinadas', () => {
    expect(IMPLANTACAO.valor).toBe(800)
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
