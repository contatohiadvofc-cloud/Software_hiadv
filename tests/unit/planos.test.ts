import { RECURSOS_POR_PLANO, planoMinimo } from '../../src/data/planos'
import { PLANOS } from '../../src/data/adesao'

test('preços de 24/11/2026', () => {
  expect(PLANOS.map((p) => p.preco)).toEqual([119.9, 197.9, 397.5, 524.5])
})
test('cada plano contém o anterior', () => {
  expect(RECURSOS_POR_PLANO.pro.every((r) => RECURSOS_POR_PLANO.premium.includes(r))).toBe(true)
  expect(RECURSOS_POR_PLANO.premium.every((r) => RECURSOS_POR_PLANO.supremo.includes(r))).toBe(true)
})
test('plano mínimo de cada recurso', () => {
  expect(planoMinimo('intimacoes_conectadas')).toBe('pro')
  expect(planoMinimo('calculadoras')).toBe('premium')
  expect(planoMinimo('assinatura')).toBe('premium')
  expect(planoMinimo('identificador')).toBe('senior')
  expect(planoMinimo('sara')).toBe('supremo')
  expect(RECURSOS_POR_PLANO.senior).not.toContain('ia')
  expect(RECURSOS_POR_PLANO.senior).not.toContain('sara')
})

import { avisoAssinatura } from '../../src/data/central'
test('aviso de mensalidade só a partir de 3 dias corridos de atraso', () => {
  const base = { plano: 'pro' as const, situacao: 'ativo' as const, testeAte: null, pagoAte: '2026-12-10', recursos: [] }
  expect(avisoAssinatura(base, new Date(2026, 11, 12))).toBeNull()
  expect(avisoAssinatura(base, new Date(2026, 11, 13))).toMatch(/venceu em 10\/12/)
})
