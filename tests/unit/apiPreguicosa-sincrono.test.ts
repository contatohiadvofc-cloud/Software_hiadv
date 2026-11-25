
import { it as it2, expect as expect2, vi as vi2 } from 'vitest'
import { criarApiPreguicosa as criar2 } from '../../src/data/apiPreguicosa'
it2('canal da chamada e assinatura do chat respondem na hora, sem promessa', async () => {
  const aoSinal = vi2.fn(); const parar = vi2.fn()
  const api = criar2(async () => ({ reuniaoCanal: () => ({ aoSinal, aoPresenca() {}, async entrar() {}, enviar() {}, sair() {} }), chatAssinar: () => parar }) as never, () => true)
  const c = api.reuniaoCanal('r1')!
  expect2(typeof c.aoSinal).toBe('function')
  c.aoSinal(() => {})
  const p = api.chatAssinar('c1', () => {})
  expect2(typeof p).toBe('function')
  await new Promise((r) => setTimeout(r, 0))
  expect2(aoSinal).toHaveBeenCalled(); p(); expect2(parar).toHaveBeenCalled()
})
