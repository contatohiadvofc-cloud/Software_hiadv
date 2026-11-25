import { describe, it, expect } from 'vitest'
import { ganhoPortao, AJUSTE } from '../../src/lib/audioLimpo'
import { nivelVoz, FALANDO } from '../../src/data/chamada'

describe('tratamento de voz', () => {
  it('silêncio fica baixo e fala passa inteira', () => {
    expect(ganhoPortao(0.001)).toBe(AJUSTE.piso)
    expect(ganhoPortao(0.2)).toBe(1)
  })
  it('nível de voz: silêncio ~0, onda forte perto de 1', () => {
    expect(nivelVoz(new Uint8Array(512).fill(128))).toBe(0)
    const onda = Uint8Array.from({ length: 512 }, (_, i) => 128 + Math.round(60 * Math.sin(i / 4)))
    expect(nivelVoz(onda)).toBeGreaterThan(FALANDO)
  })
})
