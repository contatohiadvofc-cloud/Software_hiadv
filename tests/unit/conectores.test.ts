import { expect, test } from 'vitest'
import { CONECTORES, filtrarConectores } from '../../src/data/conectores'

test('busca ignora acento e categoria filtra', () => {
  expect(filtrarConectores(CONECTORES, 'publicacoes', 'todas').map((c) => c.id)).toContain('escavador')
  expect(filtrarConectores(CONECTORES, '', 'financeiro').map((c) => c.id)).toEqual(['asaas'])
  expect(filtrarConectores(CONECTORES, 'xyz', 'todas')).toEqual([])
})

test('todo conector diz o que faz, como conectar e quem responde', () => {
  for (const c of CONECTORES) {
    expect(c.servicos.length).toBeGreaterThan(0)
    expect(c.comoConectar.length).toBeGreaterThan(0)
    expect(c.responsavel.length).toBeGreaterThan(10)
  }
  expect(new Set(CONECTORES.map((c) => c.id)).size).toBe(CONECTORES.length)
})

test('ferramentas com chave usam um serviço do cofre', () => {
  for (const c of CONECTORES.filter((x) => x.leituraPendente)) expect(c.servico).toBeTruthy()
  expect(CONECTORES.find((c) => c.id === 'cnj')!.nome).not.toMatch(/DataJud/)
})
