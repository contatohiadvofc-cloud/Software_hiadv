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
        <span className="lateral-item lateral-breve" aria-disabled="true">Clientes<small>em breve</small></span>
        <span className="lateral-item lateral-breve" aria-disabled="true">Agenda<small>em breve</small></span>
        <span className="lateral-item lateral-breve" aria-disabled="true">Sara<small>em breve</small></span>
        {gestor && <span className="lateral-item lateral-breve" aria-disabled="true">Gestão<small>em breve</small></span>}
      </div>
    </nav>
  )
}
