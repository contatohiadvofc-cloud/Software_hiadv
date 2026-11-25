import type { Api } from './api'
import type { CanalChamada } from './chamada'

/** Api que só baixa o cliente do servidor quando precisa.
 *  Quem abre o HiAdv sem estar logado vê o login na hora; o módulo do Supabase
 *  só chega quando a pessoa começa a digitar (ou quando alguma função é chamada). */
export function criarApiPreguicosa(carregar: () => Promise<Api>, temToken: () => boolean): Api & { aquecer(): void } {
  let pronta: Promise<Api> | null = null
  const ouvintes = new Set<{ fn: (logado: boolean) => void; parar?: () => void }>()
  const obter = () => {
    if (!pronta) {
      pronta = carregar()
      pronta.then((a) => { for (const o of ouvintes) o.parar = a.aoMudarSessao(o.fn) }, () => { pronta = null })
    }
    return pronta
  }
  const especiais: Record<string, unknown> = {
    aquecer: () => { void obter() },
    temSessao: async () => (temToken() ? (await obter()).temSessao() : false),
    aoMudarSessao: (fn: (logado: boolean) => void) => {
      const o: { fn: (logado: boolean) => void; parar?: () => void } = { fn }
      ouvintes.add(o)
      if (pronta) pronta.then((a) => { if (ouvintes.has(o) && !o.parar) o.parar = a.aoMudarSessao(fn) }, () => {})
      return () => { ouvintes.delete(o); o.parar?.() }
    },
    // Funções que respondem na hora (não devolvem promessa): a ligação com o servidor fica por baixo.
    chatAssinar: (conversa: string, aoChegar: () => void) => {
      let parar: (() => void) | null = null
      let cancelado = false
      void obter().then((a) => { if (!cancelado) parar = a.chatAssinar(conversa, aoChegar) }, () => {})
      return () => { cancelado = true; parar?.() }
    },
    reuniaoCanal: (id: string): CanalChamada => {
      const real = obter().then((a) => a.reuniaoCanal(id))
      return {
        aoSinal(fn) { void real.then((c) => c?.aoSinal(fn)) },
        aoPresenca(fn) { void real.then((c) => c?.aoPresenca(fn)) },
        async entrar(eu) { const c = await real; if (!c) throw new Error('Chamada indisponível.'); await c.entrar(eu) },
        enviar(s) { void real.then((c) => c?.enviar(s)) },
        sair() { void real.then((c) => c?.sair(), () => {}) },
      }
    },
  }
  return new Proxy({} as Api & { aquecer(): void }, {
    get(_alvo, nome) {
      if (typeof nome !== 'string' || nome === 'then') return undefined
      if (nome in especiais) return especiais[nome]
      return (...args: unknown[]) => obter().then((a) => (a as unknown as Record<string, (...x: unknown[]) => unknown>)[nome](...args))
    },
  })
}

/** O Supabase guarda a sessão em "sb-<projeto>-auth-token". */
export function haTokenSalvo(): boolean {
  try { return Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k)) } catch { return true }
}
