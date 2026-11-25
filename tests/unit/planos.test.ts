import { RECURSOS_POR_PLANO, planoMinimo } from '../../src/data/planos'
import { PLANOS } from '../../src/data/adesao'

test('preços de 24/11/2026', () => {
  expect(PLANOS.map((p) => p.preco)).toEqual([119.9, 197.9, 397.5])
})
test('cada plano contém o anterior', () => {
  expect(RECURSOS_POR_PLANO.pro.every((r) => RECURSOS_POR_PLANO.premium.includes(r))).toBe(true)
  expect(RECURSOS_POR_PLANO.premium.every((r) => RECURSOS_POR_PLANO.supremo.includes(r))).toBe(true)
})
test('plano mínimo de cada recurso', () => {
  expect(planoMinimo('intimacoes_conectadas')).toBe('pro')
  expect(planoMinimo('calculadoras')).toBe('premium')
  expect(planoMinimo('assinatura')).toBe('premium')
  expect(planoMinimo('identificador')).toBe('supremo')
})
