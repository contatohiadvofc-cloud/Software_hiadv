import { Link } from '@tanstack/react-router'
import { useNaoLidas } from '../data/consultas'

const ICONES = {
  dia: <><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2" /></>,
  tarefas: <path d="M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />,
  conversas: <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 1 1 21 11.5z" />,
  agenda: <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />,
  clientes: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />,
  areas: <><rect x="3" y="4" width="5" height="16" rx="1.5" /><rect x="10" y="4" width="5" height="11" rx="1.5" /><rect x="17" y="4" width="4" height="7" rx="1.5" /></>,
}

const ITENS = [
  ['/seu-dia', 'Seu dia', 'dia'], ['/tarefas', 'Tarefas', 'tarefas'], ['/conversas', 'Conversas', 'conversas'],
  ['/clientes', 'Clientes', 'clientes'], ['/areas', 'Áreas', 'areas'],
] as const

/** Barra inferior do celular. A busca fica no topo da tela. */
export function BottomBar() {
  const nao = useNaoLidas()
  return (
    <nav className="inferior" aria-label="Navegação do celular">
      {ITENS.map(([to, rotulo, ic]) => (
        <Link key={to} to={to} className="inferior-item" activeProps={{ 'aria-current': 'page' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONES[ic]}</svg>
          <span>{rotulo}</span>
          {to === '/conversas' && nao > 0 && <b className="inferior-badge" aria-label={`${nao} mensagens não lidas`}>{nao > 99 ? '99+' : nao}</b>}
        </Link>
      ))}
    </nav>
  )
}
