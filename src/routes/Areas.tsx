import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useAreas } from '../data/consultas'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'
import { OfficeSwitcher } from '../shell/OfficeSwitcher'
import { TEXTO_SEM_AREAS } from '../shell/Sidebar'
import { Button } from '../design/components/Button'
import { useSessao } from '../lib/contexto'
import { NovoCasoDialog } from './Cadastro'

/** No celular: escritório em uso e a lista de áreas (no computador ficam na barra lateral). */
export function Areas() {
  const areas = useAreas()
  const { perfil } = useSessao()
  const gestor = perfil?.papel === 'master' || perfil?.papel === 'code'
  const [novoCaso, setNovoCaso] = useState(false)
  const nav = useNavigate()
  return (
    <div className="pagina">
      <div className="pagina-cabeca">
        <h1>Áreas do escritório</h1>
        <div className="pagina-acoes"><Button onClick={() => setNovoCaso(true)}>Novo caso</Button></div>
      </div>
      <NovoCasoDialog aberto={novoCaso} aoFechar={() => setNovoCaso(false)}
        aoCriar={(_id, area) => { setNovoCaso(false); nav({ to: '/area/$slug', params: { slug: area } }) }} />
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
        {gestor && (
          <div className="hv-panel-body">
            <Link to="/configuracoes" hash="areas-de-atuacao" className="areas-ligar">Ligar outra área (cível, bancário, penal…)</Link>
          </div>
        )}
      </Panel>
      <Panel title="Do escritório" labelId="areas-mais">
        <ul className="areas-lista">
          <li><Link to="/atendimentos" className="areas-item">Atendimentos (novos contatos)<span aria-hidden="true">›</span></Link></li>
          <li><Link to="/publicacoes" className="areas-item">Publicações e intimações<span aria-hidden="true">›</span></Link></li>
          {gestor && <li><Link to="/relatorios" className="areas-item">Relatórios<span aria-hidden="true">›</span></Link></li>}
          {gestor && <li><Link to="/financeiro" className="areas-item">Financeiro<span aria-hidden="true">›</span></Link></li>}
          <li><Link to="/biblioteca" className="areas-item">Biblioteca<span aria-hidden="true">›</span></Link></li>
          <li><Link to="/indicar" className="areas-item">Indique o HiAdv<span aria-hidden="true">›</span></Link></li>
          {perfil?.papel === 'code' && <li><Link to="/adesoes" className="areas-item">Adesões<span aria-hidden="true">›</span></Link></li>}
          <li><Link to="/configuracoes" className="areas-item">Configurações<span aria-hidden="true">›</span></Link></li>
        </ul>
      </Panel>
    </div>
  )
}
