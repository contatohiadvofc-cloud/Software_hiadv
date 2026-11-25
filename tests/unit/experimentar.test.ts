import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { ROTEIRO } from '../../src/previa/previa'

describe('seção Experimente do site', () => {
  const html = readFileSync('index.html', 'utf8')
  it('tem uma parada para cada item do roteiro da prévia, com tela que existe', () => {
    for (const p of ROTEIRO) {
      const m = html.match(new RegExp(`data-tela="(/site/[^"]+)"[^>]*data-rota="${p.rota}"`))
      expect(m, p.rota).toBeTruthy()
      expect(existsSync(`public${m![1]}`), m![1]).toBe(true)
    }
  })
})
