import { describe, expect, it } from 'vitest'
import { embaralhar, lerVariante } from '../../src/site/variantes'

describe('variantes do site', () => {
  it('lê a versão da URL e cai na A', () => {
    expect(lerVariante('?v=b')).toBe('b'); expect(lerVariante('?v=C')).toBe('c')
    expect(lerVariante('?v=4')).toBe('4'); expect(lerVariante('?v=7')).toBe('a'); expect(lerVariante('?v=z')).toBe('a'); expect(lerVariante('')).toBe('a')
  })
  it('embaralha e acerta o texto aos poucos', () => {
    expect(embaralhar('Olá mundo', 1)).toBe('Olá mundo')
    const meio = embaralhar('abcdef', 0.5, () => 0)
    expect(meio.slice(0, 3)).toBe('abc'); expect(meio.slice(3)).not.toBe('def')
    expect(embaralhar('a b', 0, () => 0)[1]).toBe(' ')
  })
})
