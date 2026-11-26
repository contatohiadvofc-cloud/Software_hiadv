import { createRoot } from 'react-dom/client'
import './mp.css'
import { MeuProcesso } from './App'
import { criarMpApi, criarRpc, tokenDoEndereco } from './dados'
import { lerEnv } from '../env'

const CHAVE = 'mp-token'
const raiz = createRoot(document.getElementById('mp')!)

function semLink() {
  raiz.render(
    <main className="mp-fora">
      <h1>Meu Processo</h1>
      <p>Para entrar, abra o link pessoal que o seu escritório enviou pelo WhatsApp. Depois disso, o app guarda o acesso neste aparelho.</p>
    </main>,
  )
}

async function iniciar() {
  let token = tokenDoEndereco(location.pathname, location.hash, location.search)
  if (token && token !== 'demo') {
    try { localStorage.setItem(CHAVE, token) } catch { /* sem armazenamento: segue só nesta visita */ }
  }
  if (!token) { try { token = localStorage.getItem(CHAVE) } catch { token = null } }
  // o link pessoal não fica no histórico nem aparece na barra de endereço
  if (location.pathname !== '/mp' || location.hash || location.search) history.replaceState(null, '', token === 'demo' ? '/mp#demo' : '/mp')
  if (!token) return semLink()
  if (token === 'demo') {
    const { criarMpDemo } = await import('./demo')
    raiz.render(<MeuProcesso api={criarMpDemo()} demo />)
    return
  }
  const env = lerEnv(import.meta.env)
  raiz.render(<MeuProcesso api={criarMpApi(criarRpc(env.supabaseUrl, env.supabaseKey), token)} demo={false} />)
}
void iniciar()

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // o app do cliente usa o mesmo service worker (arquivos do app guardados no aparelho; dados nunca)
  addEventListener('load', () => setTimeout(() => { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {}) }, 2500), { once: true })
}
