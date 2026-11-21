import { criarApiPreguicosa } from '../../src/data/apiPreguicosa'
import type { Api } from '../../src/data/api'

function falsa() {
  const ouvintes: Array<(l: boolean) => void> = []
  const a = {
    temSessao: vi.fn(async () => true),
    perfil: vi.fn(async () => ({ email: 'a@b.c' })),
    aoMudarSessao: vi.fn((fn: (l: boolean) => void) => { ouvintes.push(fn); return () => ouvintes.splice(ouvintes.indexOf(fn), 1) }),
  }
  return { a: a as unknown as Api, ouvintes }
}

describe('api preguiçosa', () => {
  it('sem token salvo, diz que não há sessão sem baixar o servidor', async () => {
    const carregar = vi.fn(async () => falsa().a)
    const api = criarApiPreguicosa(carregar, () => false)
    expect(await api.temSessao()).toBe(false)
    expect(carregar).not.toHaveBeenCalled()
  })
  it('com token, carrega uma vez e repassa as chamadas', async () => {
    const f = falsa()
    const carregar = vi.fn(async () => f.a)
    const api = criarApiPreguicosa(carregar, () => true)
    expect(await api.temSessao()).toBe(true)
    expect(await api.perfil()).toEqual({ email: 'a@b.c' })
    expect(carregar).toHaveBeenCalledTimes(1)
  })
  it('ouvinte de sessão registrado antes do carregamento passa a valer depois', async () => {
    const f = falsa()
    const api = criarApiPreguicosa(async () => f.a, () => false)
    const visto: boolean[] = []
    const parar = api.aoMudarSessao((l) => visto.push(l))
    expect(f.ouvintes).toHaveLength(0)
    api.aquecer()
    await new Promise((r) => setTimeout(r, 0))
    f.ouvintes[0](false)
    expect(visto).toEqual([false])
    parar()
    expect(f.ouvintes).toHaveLength(0)
  })
  it('não parece uma promessa (await na própria api não trava)', async () => {
    const api = criarApiPreguicosa(async () => falsa().a, () => false)
    expect((api as unknown as { then?: unknown }).then).toBeUndefined()
  })
})
