import { describe, expect, it, beforeEach } from 'vitest'
import { proximaVelocidade, resumirPicos, salvarVelocidade, velocidadeSalva } from '../../src/lib/audioPlayer'
describe('player de áudio', () => {
  beforeEach(() => localStorage.clear())
  it('velocidade gira 1 → 1,5 → 2 → 1 e fica lembrada', () => {
    expect(proximaVelocidade(1)).toBe(1.5); expect(proximaVelocidade(1.5)).toBe(2); expect(proximaVelocidade(2)).toBe(1)
    expect(velocidadeSalva()).toBe(1); salvarVelocidade(2); expect(velocidadeSalva()).toBe(2)
    localStorage.setItem('hiadv-audio-vel', '7'); expect(velocidadeSalva()).toBe(1)
  })
  it('onda: n barras, normalizada e com mínimo visível', () => {
    const d = new Float32Array(1000); for (let i = 500; i < 600; i++) d[i] = 0.8
    const p = resumirPicos(d, 10)
    expect(p).toHaveLength(10); expect(Math.max(...p)).toBe(1); expect(Math.min(...p)).toBeCloseTo(0.12)
    expect(resumirPicos(new Float32Array(5), 32)).toHaveLength(32)
  })
})
