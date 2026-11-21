import { Link } from '@tanstack/react-router'
import { useAreas } from '../data/consultas'
import { useSessao } from '../lib/contexto'
import { Marca } from './Marca'
import { OfficeSwitcher } from './OfficeSwitcher'

export const TEXTO_SEM_AREAS = 'Seu escritório ainda não tem áreas ativas. Peça ao Gestor Master para ativar.'

function Icone({ d }: { d: string }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
}

export function Sidebar() {
  const { perfil } = useSessao()
  const areas = useAreas()
  const gestor = perfil?.papel === 'master' || perfil?.papel === 'code'

  return (
    <nav className="lateral" aria-label="Navegação principal">
      <div className="lateral-topo"><Marca /></div>
      <OfficeSwitcher />
      <div className="lateral-grupo">
        <Link to="/seu-dia" className="lateral-item" activeProps={{ 'aria-current': 'page' }}>
          <Icone d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />Seu dia
        </Link>
        <Link to="/tarefas" className="lateral-item" activeProps={{ 'aria-current': 'page' }}>
          <Icone d="M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />Tarefas
        </Link>
        <Link to="/agenda" className="lateral-item" activeProps={{ 'aria-current': 'page' }}>
          <Icone d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />Agenda
        </Link>
        <Link to="/clientes" className="lateral-item" activeProps={{ 'aria-current': 'page' }}>
          <Icone d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />Clientes
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
        {gestor && <span className="lateral-item lateral-breve" aria-disabled="true">Gestão<small>em breve</small></span>}
      </div>
    </nav>
  )
}
