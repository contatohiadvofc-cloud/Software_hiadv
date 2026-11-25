import { describe, it, expect, beforeEach } from 'vitest'
import { trecho, dataHoraCompleta } from '../../src/data/conversas'
import { lerPrefs, salvarPrefs, PADRAO, NOTAS } from '../../src/lib/avisos'

describe('busca no histórico', () => {
  it('mostra o trecho em volta do termo', () => {
    const t = 'a'.repeat(100) + ' perícia marcada para terça ' + 'b'.repeat(100)
    const r = trecho(t, 'perícia', 20)
    expect(r).toContain('perícia marcada')
    expect(r.startsWith('…') && r.endsWith('…')).toBe(true)
  })
  it('registra data e hora completas', () => {
    expect(dataHoraCompleta('2026-11-25T21:07:00Z')).toMatch(/25\/11\/2026/)
  })
})

describe('preferências de aviso', () => {
  beforeEach(() => localStorage.clear())
  it('começa no padrão e guarda a escolha', () => {
    expect(lerPrefs()).toEqual(PADRAO)
    salvarPrefs({ ...PADRAO, som: 'sino', popup: false })
    expect(lerPrefs().som).toBe('sino')
    expect(lerPrefs().popup).toBe(false)
  })
  it('todo som tem notas audíveis e curtas', () => {
    for (const n of Object.values(NOTAS)) for (const [hz, , dur] of n) { expect(hz).toBeGreaterThan(300); expect(dur).toBeLessThanOrEqual(0.5) }
  })
})

import { teveFala, PEDACO_MS } from '../../src/lib/transcritorReuniao'
describe('transcrição da chamada', () => {
  it('só manda pedaço com fala de verdade', () => {
    expect(teveFala(2, 150)).toBe(false)
    expect(teveFala(7, 150)).toBe(true)
    expect(PEDACO_MS).toBeLessThanOrEqual(30_000)
  })
})
