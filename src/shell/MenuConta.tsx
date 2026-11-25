import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useSessao } from '../lib/contexto'
import { Button } from '../design/components/Button'

function iniciais(nome: string) {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || '?'
}

function lerTema(): 'light' | 'dark' {
  try { return (localStorage.getItem('hiadv-tema') as 'light' | 'dark') || 'dark' } catch { return 'dark' }
}

export function aplicarTema(t: 'light' | 'dark') {
  document.documentElement.dataset.theme = t
  try { localStorage.setItem('hiadv-tema', t) } catch { /* sem armazenamento: só nesta visita */ }
}

export function MenuConta() {
  const sessao = useSessao()
  const nav = useNavigate()
  const [tema, setTema] = useState<'light' | 'dark'>(lerTema)
  useEffect(() => { aplicarTema(tema) }, [tema])
  const nome = sessao.perfil?.nome ?? ''
  return (
    <div className="conta">
      <button type="button" className="conta-tema" onClick={() => setTema(tema === 'light' ? 'dark' : 'light')}
        aria-label={tema === 'light' ? 'Usar tema escuro' : 'Usar tema claro'} title={tema === 'light' ? 'Modo escuro' : 'Modo claro'}>
        {tema === 'light'
          ? <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
          : <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>}
        <span>{tema === 'light' ? 'Escuro' : 'Claro'}</span>
      </button>
      <span className="conta-avatar" title={nome} aria-label={nome}>{iniciais(nome)}</span>
      <Button variant="secondary" size="sm" onClick={async () => { await sessao.sair(); nav({ to: '/login' }) }}>Sair</Button>
    </div>
  )
}
