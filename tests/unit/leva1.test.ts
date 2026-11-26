import { describe, it, expect } from 'vitest'
import { IR_PARA } from '../../src/shell/Atalhos'

describe('atalhos', () => {
  it('cada letra leva a uma tela diferente', () => {
    const rotas = Object.values(IR_PARA).map((x) => x.rota)
    expect(new Set(rotas).size).toBe(rotas.length)
    expect(IR_PARA.c?.rota).toBe('/conversas')
  })
})
