import { useParams } from '@tanstack/react-router'
import { useAreas } from '../data/consultas'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'

/** Por enquanto, o cabeçalho da área. O quadro, a lista e a ficha do caso chegam na Fase 1. */
export function Area() {
  const { slug } = useParams({ strict: false }) as { slug: string }
  const areas = useAreas()
  const area = areas.data?.find((a) => a.area === slug)
  if (areas.isSuccess && !area) {
    return <div className="pagina"><Panel><Empty title="Esta área não está ativa no seu escritório." /></Panel></div>
  }
  return (
    <div className="pagina">
      <div className="pagina-cabeca"><h1>{area?.nome ?? '…'}</h1></div>
      <Panel>
        <Empty title="O quadro de casos desta área chega na próxima etapa do HiAdv 2.">
          Etapas, campos próprios da área, arrastar e soltar, lista e agenda.
        </Empty>
      </Panel>
    </div>
  )
}
