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
