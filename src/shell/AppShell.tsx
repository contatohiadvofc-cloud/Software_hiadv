import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useSessao } from '../lib/contexto'
import { SessaoExpirada } from '../data/api'
import { Sidebar } from './Sidebar'
import { BottomBar } from './BottomBar'
import { CommandSearch } from './CommandSearch'
import { MenuConta } from './MenuConta'
import { Kbd } from '../design/components/Kbd'

export function AppShell({ children }: { children: ReactNode }) {
  const sessao = useSessao()
  const loc = useLocation()
  const nav = useNavigate()
  const qc = useQueryClient()
  const [buscando, setBuscando] = useState(false)
  const indo = useRef(false)

  // Sem sessão: vai ao login uma única vez, guardando para onde voltar.
  useEffect(() => {
    if (sessao.estado === 'fora' && !indo.current) {
      indo.current = true
      nav({ to: '/login', search: { volta: loc.pathname }, replace: true })
    }
    if (sessao.estado === 'dentro') indo.current = false
  }, [sessao.estado, nav, loc.pathname])

  // Sessão expirada em qualquer consulta: volta ao login e depois retorna aqui.
  useEffect(() => qc.getQueryCache().subscribe((ev) => {
    if (ev.type === 'updated' && ev.query.state.error instanceof SessaoExpirada) {
      sessao.sair('Sua sessão terminou. Entre de novo.')
    }
  }), [qc, sessao, nav, loc.pathname])

  // Ctrl+K e "/" abrem a busca.
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement
      const digitando = alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable)
      if ((e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !digitando)) {
        e.preventDefault()
        setBuscando(true)
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  if (sessao.estado !== 'dentro') return <div className="carregando" role="status">Carregando o HiAdv…</div>

  return (
    <div className="app">
      <Sidebar />
      <div className="app-col">
        <header className="topo">
          <button type="button" className="topo-busca" onClick={() => setBuscando(true)}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <span>Buscar cliente, caso, processo ou CPF</span>
            <Kbd>Ctrl K</Kbd>
          </button>
          <MenuConta />
        </header>
        <main className="conteudo" id="conteudo">{children}</main>
      </div>
      <BottomBar />
      <CommandSearch open={buscando} onOpenChange={setBuscando} />
    </div>
  )
}
