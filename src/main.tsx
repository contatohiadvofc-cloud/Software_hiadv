import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './design/base.css'
import './shell/shell.css'
import { App, definirSemSessao } from './app'
import { lerEnv } from './env'
import type { Api } from './data/api'

try {
  const t = localStorage.getItem('hiadv-tema')
  if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t
} catch { /* sem armazenamento */ }

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
