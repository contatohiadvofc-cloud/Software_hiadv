import { ROTEIRO, comecarPrevia } from './previa/previa'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './design/base.css'
import './shell/shell.css'
import { App, definirSemSessao } from './app'
import { lerEnv } from './env'
import type { Api } from './data/api'

// O app instalado abre em /app.html: mostra o endereço do sistema (o site de apresentação fica só em "/").
if (location.pathname === '/app.html') {
  const q = new URLSearchParams(location.search); q.delete('origem')
  history.replaceState(null, '', '/seu-dia' + (q.toString() ? '?' + q : '') + location.hash)
}

// "Experimente o HiAdv": entra direto no escritório fictício, sem cadastro e sem salvar nada.
if (location.pathname === '/experimentar') {
    // ?ir=/rota abre direto numa parada do roteiro (só rotas do roteiro)
  const ir = new URLSearchParams(location.search).get('ir')
  const destino = ir && ROTEIRO.some((p) => p.rota === ir) ? ir : '/seu-dia'
  if (comecarPrevia()) { sessionStorage.setItem('hiadv-previa-entrar', '1'); history.replaceState(null, '', destino) }
  else history.replaceState(null, '', '/aderir?previa=usada')
}

try {
  const t = localStorage.getItem('hiadv-tema')
  document.documentElement.dataset.theme = t === 'light' ? 'light' : 'dark'
} catch { document.documentElement.dataset.theme = 'dark' }

const pediuDemo = new URLSearchParams(location.search).has('demo')
try { if (pediuDemo) sessionStorage.setItem('hiadv-modo-demo', '1') } catch { /* sem armazenamento */ }
let lembrouDemo = false
try { lembrouDemo = sessionStorage.getItem('hiadv-modo-demo') === '1' } catch { /* sem armazenamento */ }
const demo = import.meta.env.VITE_DEMO === '1' || pediuDemo || lembrouDemo
async function iniciar() {
  let api: Api
  if (demo) {
    const { criarApiDemo } = await import('./data/apiDemo')
    api = criarApiDemo()
  } else {
    const env = lerEnv(import.meta.env)
    const { criarApiPreguicosa, haTokenSalvo } = await import('./data/apiPreguicosa')
    const preguicosa = criarApiPreguicosa(async () => (await import('./data/apiSupabase')).criarApiSupabase(env.supabaseUrl, env.supabaseKey), haTokenSalvo)
    // Começa a baixar assim que a pessoa interage (tocar, clicar, digitar): quando apertar Entrar, já está pronto.
    for (const ev of ['pointerdown', 'keydown', 'focusin']) addEventListener(ev, () => preguicosa.aquecer(), { once: true, passive: true })
    api = preguicosa
    definirSemSessao(() => !haTokenSalvo())
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App api={api} />
    </StrictMode>,
  )
}
void iniciar()

// O modo offline (service worker) só entra depois que a página abriu, para não disputar a primeira carga.
if (import.meta.env.PROD && import.meta.env.VITE_PREVIA !== '1' && 'serviceWorker' in navigator) {
  const registrar = () => setTimeout(() => { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => { /* segue sem offline */ }) }, 2500)
  if (document.readyState === 'complete') registrar(); else window.addEventListener('load', registrar, { once: true })
}
