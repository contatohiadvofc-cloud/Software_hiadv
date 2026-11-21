import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createHashHistory, createRootRoute, createRoute, createRouter, lazyRouteComponent, Outlet, redirect, RouterProvider } from '@tanstack/react-router'
import type { Api } from './data/api'
import { SessaoExpirada } from './data/api'
import { ApiProvider, SessaoProvider } from './lib/contexto'
import { ToastProvider } from './design/components/Toast'
import { Login } from './routes/Login'

const LSeuDia = lazyRouteComponent(() => import('./routes/SeuDia'), 'SeuDia')
const LArea = lazyRouteComponent(() => import('./routes/Area'), 'Area')
const LAreas = lazyRouteComponent(() => import('./routes/Areas'), 'Areas')
const LCatalogo = lazyRouteComponent(() => import('./routes/Catalogo'), 'Catalogo')
const LTarefas = lazyRouteComponent(() => import('./routes/Tarefas'), 'Tarefas')
const LClientes = lazyRouteComponent(() => import('./routes/Clientes'), 'Clientes')
const LCliente = lazyRouteComponent(() => import('./routes/Cliente'), 'Cliente')
const LAgenda = lazyRouteComponent(() => import('./routes/Agenda'), 'Agenda')
const LBiblioteca = lazyRouteComponent(() => import('./routes/Biblioteca'), 'Biblioteca')
const LPublicacoes = lazyRouteComponent(() => import('./routes/Publicacoes'), 'Publicacoes')
const LFinanceiro = lazyRouteComponent(() => import('./routes/Financeiro'), 'Financeiro')
const LRelatorios = lazyRouteComponent(() => import('./routes/Relatorios'), 'Relatorios')
const LAtendimentos = lazyRouteComponent(() => import('./routes/Atendimentos'), 'Atendimentos')
const LAderir = lazyRouteComponent(() => import('./routes/Aderir'), 'Aderir')
const LIndicar = lazyRouteComponent(() => import('./routes/Indicar'), 'Indicar')
const LAdesoes = lazyRouteComponent(() => import('./routes/Adesoes'), 'Adesoes')
const LAcompanhar = lazyRouteComponent(() => import('./routes/Acompanhar'), 'Acompanhar')
const LConfiguracoes = lazyRouteComponent(() => import('./routes/Configuracoes'), 'Configuracoes')
const LAppShell = lazyRouteComponent(() => import('./shell/AppShell'), 'AppShellRota')

// Sem sessão salva no aparelho, as páginas internas mandam direto para o login (sem baixar a casca do app).
let semSessaoSalva: () => boolean = () => false
export function definirSemSessao(fn: () => boolean) { semSessaoSalva = fn }

const raiz = createRootRoute({ component: () => <Outlet />, head: () => ({ meta: [{ title: 'HiAdv' }] }) })
const inicio = createRoute({ getParentRoute: () => raiz, path: '/', beforeLoad: () => { throw redirect({ to: '/seu-dia', replace: true }) } })
const login = createRoute({
  getParentRoute: () => raiz, path: '/login', component: Login, head: () => ({ meta: [{ title: 'Entrar · HiAdv' }] }),
  validateSearch: (s: Record<string, unknown>): { volta?: string } => (typeof s.volta === 'string' ? { volta: s.volta } : {}),
})
const catalogo = createRoute({ getParentRoute: () => raiz, path: '/catalogo', component: LCatalogo, head: () => ({ meta: [{ title: 'Design system · HiAdv' }] }) })
const dentro = createRoute({
  getParentRoute: () => raiz, id: 'dentro', component: LAppShell,
  beforeLoad: ({ location }) => {
    if (semSessaoSalva()) throw redirect({ to: '/login', search: location.pathname === '/seu-dia' ? {} : { volta: location.pathname }, replace: true })
  },
})
const seuDia = createRoute({ getParentRoute: () => dentro, path: '/seu-dia', component: LSeuDia, head: () => ({ meta: [{ title: 'Seu dia · HiAdv' }] }) })
const area = createRoute({ getParentRoute: () => dentro, path: '/area/$slug', component: LArea, head: () => ({ meta: [{ title: 'Área · HiAdv' }] }) })
const listaAreas = createRoute({ getParentRoute: () => dentro, path: '/areas', component: LAreas, head: () => ({ meta: [{ title: 'Áreas · HiAdv' }] }) })
const tarefas = createRoute({ getParentRoute: () => dentro, path: '/tarefas', component: LTarefas, head: () => ({ meta: [{ title: 'Tarefas · HiAdv' }] }) })
const clientes = createRoute({ getParentRoute: () => dentro, path: '/clientes', component: LClientes, head: () => ({ meta: [{ title: 'Clientes · HiAdv' }] }) })
const cliente = createRoute({ getParentRoute: () => dentro, path: '/clientes/$id', component: LCliente, head: () => ({ meta: [{ title: 'Cliente · HiAdv' }] }) })
const agenda = createRoute({ getParentRoute: () => dentro, path: '/agenda', component: LAgenda, head: () => ({ meta: [{ title: 'Agenda · HiAdv' }] }) })
const biblioteca = createRoute({ getParentRoute: () => dentro, path: '/biblioteca', component: LBiblioteca, head: () => ({ meta: [{ title: 'Biblioteca · HiAdv' }] }) })
const publicacoes = createRoute({ getParentRoute: () => dentro, path: '/publicacoes', component: LPublicacoes, head: () => ({ meta: [{ title: 'Publicações · HiAdv' }] }) })
const financeiro = createRoute({ getParentRoute: () => dentro, path: '/financeiro', component: LFinanceiro, head: () => ({ meta: [{ title: 'Financeiro · HiAdv' }] }) })
const relatorios = createRoute({ getParentRoute: () => dentro, path: '/relatorios', component: LRelatorios, head: () => ({ meta: [{ title: 'Relatórios · HiAdv' }] }) })
const configuracoes = createRoute({ getParentRoute: () => dentro, path: '/configuracoes', component: LConfiguracoes, head: () => ({ meta: [{ title: 'Configurações · HiAdv' }] }) })
const atendimentos = createRoute({ getParentRoute: () => dentro, path: '/atendimentos', component: LAtendimentos, head: () => ({ meta: [{ title: 'Atendimentos · HiAdv' }] }) })
// Página pública do cliente: fora da casca do app, sem login.
const acompanhar = createRoute({ getParentRoute: () => raiz, path: '/acompanhar/$token', component: LAcompanhar, head: () => ({ meta: [{ title: 'Acompanhamento do seu caso' }, { name: 'robots', content: 'noindex' }, { name: 'referrer', content: 'no-referrer' }] }) })
const aderir = createRoute({
  getParentRoute: () => raiz, path: '/aderir', component: LAderir, head: () => ({ meta: [{ title: 'Aderir ao HiAdv' }] }),
  validateSearch: (s: Record<string, unknown>): { ref?: string } => (typeof s.ref === 'string' ? { ref: s.ref } : {}),
})
const indicar = createRoute({ getParentRoute: () => dentro, path: '/indicar', component: LIndicar, head: () => ({ meta: [{ title: 'Indique o HiAdv · HiAdv' }] }) })
const adesoes = createRoute({ getParentRoute: () => dentro, path: '/adesoes', component: LAdesoes, head: () => ({ meta: [{ title: 'Adesões · HiAdv' }] }) })
const naoEncontrada = createRoute({ getParentRoute: () => raiz, path: '$', beforeLoad: () => { throw redirect({ to: '/seu-dia', replace: true }) } })

const arvore = raiz.addChildren([inicio, login, catalogo, acompanhar, aderir, dentro.addChildren([seuDia, atendimentos, indicar, adesoes, tarefas, agenda, clientes, cliente, biblioteca, publicacoes, financeiro, relatorios, configuracoes, area, listaAreas]), naoEncontrada])

export function criarRouter() {
  // A prévia de demonstração roda dentro de uma página hospedada: usa endereços com # para não depender do servidor.
  const previa = import.meta.env.VITE_PREVIA === '1'
  return createRouter({ routeTree: arvore, defaultPreload: false, ...(previa ? { history: createHashHistory() } : {}) })
}

declare module '@tanstack/react-router' {
  interface Register { router: ReturnType<typeof criarRouter> }
}

export function criarQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (n, erro) => !(erro instanceof SessaoExpirada) && n < 1,
        refetchOnWindowFocus: true,
      },
    },
  })
}

export function App({ api, router = criarRouter(), qc = criarQueryClient() }: { api: Api; router?: ReturnType<typeof criarRouter>; qc?: QueryClient }) {
  return (
    <QueryClientProvider client={qc}>
      <ApiProvider api={api}>
        <ToastProvider>
          <SessaoProvider>
            <RouterProvider router={router} />
          </SessaoProvider>
        </ToastProvider>
      </ApiProvider>
    </QueryClientProvider>
  )
}
