import { describe, it, expect } from 'vitest'
import { progressoFixo, palavrasAcesas, etapaAtiva } from '../../src/site/movimento'
describe('movimento do site', () => {
  it('progresso do bloco fixo vai de 0 a 1', () => {
    expect(progressoFixo(0, 2000, 800)).toBe(0); expect(progressoFixo(-600, 2000, 800)).toBe(0.5); expect(progressoFixo(-5000, 2000, 800)).toBe(1); expect(progressoFixo(0, 500, 800)).toBe(1)
  })
  it('palavras acendem conforme o texto sobe', () => {
    expect(palavrasAcesas(900, 200, 800, 20)).toBe(0); expect(palavrasAcesas(-400, 200, 800, 20)).toBe(20)
  })
  it('etapa ativa', () => { expect(etapaAtiva(0, 5)).toBe(0); expect(etapaAtiva(0.5, 5)).toBe(2); expect(etapaAtiva(1, 5)).toBe(4) })
})
