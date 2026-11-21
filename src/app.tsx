import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createHashHistory, createRootRoute, createRoute, createRouter, Outlet, redirect, RouterProvider } from '@tanstack/react-router'
import type { Api } from './data/api'
import { SessaoExpirada } from './data/api'
import { ApiProvider, SessaoProvider } from './lib/contexto'
import { ToastProvider } from './design/components/Toast'
import { AppShell } from './shell/AppShell'
import { Login } from './routes/Login'
import { SeuDia } from './routes/SeuDia'
import { Area } from './routes/Area'
import { Areas } from './routes/Areas'
import { Catalogo } from './routes/Catalogo'
import { Tarefas } from './routes/Tarefas'
import { Clientes } from './routes/Clientes'
import { Cliente } from './routes/Cliente'
import { Agenda } from './routes/Agenda'
import { Biblioteca } from './routes/Biblioteca'
import { Configuracoes } from './routes/Configuracoes'

const raiz = createRootRoute({ component: () => <Outlet />, head: () => ({ meta: [{ title: 'HiAdv' }] }) })
const inicio = createRoute({ getParentRoute: () => raiz, path: '/', beforeLoad: () => { throw redirect({ to: '/seu-dia', replace: true }) } })
const login = createRoute({
  getParentRoute: () => raiz, path: '/login', component: Login, head: () => ({ meta: [{ title: 'Entrar · HiAdv' }] }),
  validateSearch: (s: Record<string, unknown>): { volta?: string } => (typeof s.volta === 'string' ? { volta: s.volta } : {}),
})
const catalogo = createRoute({ getParentRoute: () => raiz, path: '/catalogo', component: Catalogo, head: () => ({ meta: [{ title: 'Design system · HiAdv' }] }) })
const dentro = createRoute({ getParentRoute: () => raiz, id: 'dentro', component: () => <AppShell><Outlet /></AppShell> })
const seuDia = createRoute({ getParentRoute: () => dentro, path: '/seu-dia', component: SeuDia, head: () => ({ meta: [{ title: 'Seu dia · HiAdv' }] }) })
const area = createRoute({ getParentRoute: () => dentro, path: '/area/$slug', component: Area, head: () => ({ meta: [{ title: 'Área · HiAdv' }] }) })
const listaAreas = createRoute({ getParentRoute: () => dentro, path: '/areas', component: Areas, head: () => ({ meta: [{ title: 'Áreas · HiAdv' }] }) })
const tarefas = createRoute({ getParentRoute: () => dentro, path: '/tarefas', component: Tarefas, head: () => ({ meta: [{ title: 'Tarefas · HiAdv' }] }) })
const clientes = createRoute({ getParentRoute: () => dentro, path: '/clientes', component: Clientes, head: () => ({ meta: [{ title: 'Clientes · HiAdv' }] }) })
const cliente = createRoute({ getParentRoute: () => dentro, path: '/clientes/$id', component: Cliente, head: () => ({ meta: [{ title: 'Cliente · HiAdv' }] }) })
const agenda = createRoute({ getParentRoute: () => dentro, path: '/agenda', component: Agenda, head: () => ({ meta: [{ title: 'Agenda · HiAdv' }] }) })
const biblioteca = createRoute({ getParentRoute: () => dentro, path: '/biblioteca', component: Biblioteca, head: () => ({ meta: [{ title: 'Biblioteca · HiAdv' }] }) })
const configuracoes = createRoute({ getParentRoute: () => dentro, path: '/configuracoes', component: Configuracoes, head: () => ({ meta: [{ title: 'Configurações · HiAdv' }] }) })
const naoEncontrada = createRoute({ getParentRoute: () => raiz, path: '$', beforeLoad: () => { throw redirect({ to: '/seu-dia', replace: true }) } })

const arvore = raiz.addChildren([inicio, login, catalogo, dentro.addChildren([seuDia, tarefas, agenda, clientes, cliente, biblioteca, configuracoes, area, listaAreas]), naoEncontrada])

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
