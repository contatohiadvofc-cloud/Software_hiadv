import { Link } from '@tanstack/react-router'
import { useSessao } from '../lib/contexto'
import { useAreas, useNaoLidas, useRecursos } from '../data/consultas'
import { Marca } from './Marca'
import { OfficeSwitcher } from './OfficeSwitcher'

export const TEXTO_SEM_AREAS = 'Seu escritório ainda não tem áreas ativas. Peça ao Gestor Master para ativar.'

function Icone({ d }: { d: string }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
}

export function Sidebar() {
  const { perfil } = useSessao()
  const gestor = perfil?.papel === 'master' || !!perfil?.code
  const areas = useAreas()
  const { pode } = useRecursos()
  const nao = useNaoLidas()

  return (
    <nav className="lateral" aria-label="Navegação principal">
      <div className="lateral-topo"><Link to="/seu-dia" className="lateral-marca" aria-label="HiAdv: ir para Seu dia" title="Ir para Seu dia"><Marca /></Link></div>
      <OfficeSwitcher />
      <div className="lateral-grupo">
        <Link to="/seu-dia" className="lateral-item" activeProps={{ 'aria-current': 'page' }}>
          <Icone d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />Seu dia
        </Link>
        {pode('atendimentos') && (
          <Link to="/atendimentos" className="lateral-item" activeProps={{ 'aria-current': 'page' }}>
            <Icone d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8 9h8M8 13h5" />Atendimentos
          </Link>
        )}
        <Link to="/tarefas" className="lateral-item" activeProps={{ 'aria-current': 'page' }}>
          <Icone d="M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />Tarefas
        </Link>
        <Link to="/agenda" className="lateral-item" activeProps={{ 'aria-current': 'page' }}>
          <Icone d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />Agenda
        </Link>
        <Link to="/clientes" className="lateral-item" activeProps={{ 'aria-current': 'page' }}>
          <Icone d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />Clientes
        </Link>
        <Link to="/conversas" className="lateral-item" activeProps={{ 'aria-current': 'page' }}>
          <Icone d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 1 1 21 11.5z" />Conversas
          {nao > 0 && <b className="lateral-badge" aria-label={`${nao} mensagens não lidas`}>{nao > 99 ? '99+' : nao}</b>}
        </Link>
      </div>
      <div className="lateral-grupo">
        <span className="lateral-rotulo" id="rot-areas">Áreas do escritório</span>
        <ul aria-labelledby="rot-areas" className="lateral-lista">
          {areas.isLoading && <li className="lateral-nota">Carregando…</li>}
          {areas.isError && <li className="lateral-nota">Não foi possível carregar as áreas.</li>}
          {areas.data && areas.data.length === 0 && <li className="lateral-nota">{TEXTO_SEM_AREAS}</li>}
          {areas.data?.map((a) => (
            <li key={a.area}>
              <Link to="/area/$slug" params={{ slug: a.area }} className="lateral-item" activeProps={{ 'aria-current': 'page' }}>{a.nome}</Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="lateral-grupo lateral-rodape">
        <span className="lateral-item lateral-breve" aria-disabled="true">Sara<small>em breve</small></span>
        {pode('publicacoes') && (
          <Link to="/publicacoes" className="lateral-item" activeProps={{ 'aria-current': 'page' }}>
            <Icone d="M4 4h12l4 4v12H4zM8 10h8M8 14h8M8 18h5" />Publicações
          </Link>
        )}
        {gestor && pode('financeiro') && (
          <Link to="/financeiro" className="lateral-item" activeProps={{ 'aria-current': 'page' }}>
            <Icone d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />Financeiro
          </Link>
        )}
        {gestor && pode('relatorios') && (
          <Link to="/relatorios" className="lateral-item" activeProps={{ 'aria-current': 'page' }}>
            <Icone d="M4 20V10M10 20V4M16 20v-7M22 20H2" />Relatórios
          </Link>
        )}
        {!!perfil?.code && (
          <Link to="/central" className="lateral-item" activeProps={{ 'aria-current': 'page' }}>
            <Icone d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />Central HiAdv
          </Link>
        )}
        {!!perfil?.code && (
          <Link to="/adesoes" className="lateral-item" activeProps={{ 'aria-current': 'page' }}>
            <Icone d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6" />Adesões
          </Link>
        )}
        <Link to="/indicar" className="lateral-item" activeProps={{ 'aria-current': 'page' }}>
          <Icone d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H8a2.5 2.5 0 0 1 0-5c3 0 4 5 4 5zM12 7h4a2.5 2.5 0 0 0 0-5c-3 0-4 5-4 5z" />Indique o HiAdv
        </Link>
        <Link to="/integracoes" className="lateral-item" activeProps={{ 'aria-current': 'page' }}>
          <Icone d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4" />Integrações
        </Link>
        <Link to="/biblioteca" className="lateral-item" activeProps={{ 'aria-current': 'page' }}>
          <Icone d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" />Biblioteca
        </Link>
        <Link to="/configuracoes" className="lateral-item" activeProps={{ 'aria-current': 'page' }}>
          <Icone d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />Configurações
        </Link>
      </div>
    </nav>
  )
}
