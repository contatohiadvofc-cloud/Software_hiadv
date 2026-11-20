import { Link } from '@tanstack/react-router'
import { useAreas } from '../data/consultas'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'
import { OfficeSwitcher } from '../shell/OfficeSwitcher'
import { TEXTO_SEM_AREAS } from '../shell/Sidebar'

/** No celular: escritório em uso e a lista de áreas (no computador ficam na barra lateral). */
export function Areas() {
  const areas = useAreas()
  return (
    <div className="pagina">
      <div className="pagina-cabeca"><h1>Áreas do escritório</h1></div>
      <OfficeSwitcher />
      <Panel>
        {areas.isLoading && <p className="hv-panel-body muted" role="status">Carregando…</p>}
        {areas.isError && <ErrorState onRetry={() => areas.refetch()} />}
        {areas.data?.length === 0 && <Empty title={TEXTO_SEM_AREAS} />}
        {!!areas.data?.length && (
          <ul className="areas-lista">
            {areas.data.map((a) => (
              <li key={a.area}><Link to="/area/$slug" params={{ slug: a.area }} className="areas-item">{a.nome}<span aria-hidden="true">›</span></Link></li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
