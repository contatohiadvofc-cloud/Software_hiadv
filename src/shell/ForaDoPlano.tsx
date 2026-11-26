import { Link } from '@tanstack/react-router'
import { nomeRecurso, planoMinimo } from '../data/central'
import { Panel } from '../design/components/Panel'

/** Tela que aparece no lugar de um recurso que o escritório (ou a pessoa) não tem liberado. Sem propaganda: só o que é e onde está. */
export function ForaDoPlano({ recurso }: { recurso: string }) {
  return (
    <div className="pagina">
      <Panel>
        <div className="hv-panel-body fora-plano">
          <h1>{nomeRecurso(recurso)}</h1>
          <p>Este recurso não está liberado para você. Ele faz parte do plano {planoMinimo(recurso)}; o Gestor do escritório pode pedir a liberação ao HiAdv.</p>
          <Link to="/seu-dia" className="hv-btn" data-variant="secondary" data-size="md">Ir para Seu dia</Link>
        </div>
      </Panel>
    </div>
  )
}
