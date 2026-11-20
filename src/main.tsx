import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './design/base.css'
import './shell/shell.css'
import { App } from './app'
import { lerEnv } from './env'
import { criarApiSupabase } from './data/apiSupabase'
import { criarApiDemo } from './data/apiDemo'
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
let api: Api
if (demo) {
  api = criarApiDemo()
} else {
  const env = lerEnv(import.meta.env)
  api = criarApiSupabase(env.supabaseUrl, env.supabaseKey)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App api={api} />
  </StrictMode>,
)
