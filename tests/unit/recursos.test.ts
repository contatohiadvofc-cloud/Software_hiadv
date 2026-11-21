import { readFileSync } from 'node:fs'
import { RECURSOS, recursosVisiveis } from '../../src/data/recursos'

describe('recursos do HiAdv', () => {
  it('colaborador não vê o que é só do gestor', () => {
    const c = recursosVisiveis(false)
    expect(c.ativar).toHaveLength(0)
    expect(c.ligado.some((r) => r.id === 'financeiro')).toBe(false)
    expect(recursosVisiveis(true).ativar.map((r) => r.id)).toEqual(['ia', 'zapsign'])
  })
  it('todo recurso para ativar tem passo a passo e custo', () => {
    for (const r of RECURSOS.filter((x) => x.grupo !== 'ligado')) {
      expect(r.passos?.length, r.id).toBeGreaterThan(0)
      expect(r.custo, r.id).toBeTruthy()
    }
  })
  it('ids únicos e sem promessa de resultado', () => {
    expect(new Set(RECURSOS.map((r) => r.id)).size).toBe(RECURSOS.length)
    expect(JSON.stringify(RECURSOS)).not.toMatch(/garant|ganhe|100%/i)
  })
  it('docs/RECURSOS.md está em dia com o app (npm run recursos)', () => {
    const doc = readFileSync('docs/RECURSOS.md', 'utf8')
    for (const r of RECURSOS) { expect(doc, r.id).toContain(r.nome); for (const p of r.passos ?? []) expect(doc, r.id).toContain(p) }
  })
})
