import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useSessao } from '../lib/contexto'
import { Button } from '../design/components/Button'

function iniciais(nome: string) {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || '?'
}

function lerTema(): 'light' | 'dark' {
  try { return (localStorage.getItem('hiadv-tema') as 'light' | 'dark') || 'light' } catch { return 'light' }
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
      <Button variant="ghost" size="sm" onClick={() => setTema(tema === 'light' ? 'dark' : 'light')}
        aria-label={tema === 'light' ? 'Usar tema escuro' : 'Usar tema claro'}>
        {tema === 'light' ? 'Escuro' : 'Claro'}
      </Button>
      <span className="conta-avatar" title={nome} aria-label={nome}>{iniciais(nome)}</span>
      <Button variant="secondary" size="sm" onClick={async () => { await sessao.sair(); nav({ to: '/login' }) }}>Sair</Button>
    </div>
  )
}
