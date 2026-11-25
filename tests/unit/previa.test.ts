import { comecarPrevia, minutosRestantes, marcarVista, encerrarPrevia, emPrevia } from '../../src/previa/previa'

beforeEach(() => { sessionStorage.clear(); localStorage.clear() })
test('prévia dura 20 minutos e marca o roteiro', () => {
  const t0 = Date.now()
  expect(comecarPrevia(t0)).toBe(true)
  expect(emPrevia()).toBe(true)
  expect(minutosRestantes(t0 + 5 * 60000)).toBe(15)
  expect(minutosRestantes(t0 + 21 * 60000)).toBe(0)
  expect(marcarVista('/areas/judicial')).toContain('/areas')
})
test('uma prévia por dia no mesmo aparelho', () => {
  expect(comecarPrevia()).toBe(true)
  encerrarPrevia()
  expect(comecarPrevia()).toBe(false)
})
