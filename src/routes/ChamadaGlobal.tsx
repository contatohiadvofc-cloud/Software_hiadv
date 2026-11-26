import { useQueryClient } from '@tanstack/react-query'
import { fecharChamada, useChamadaAtiva } from '../lib/chamadaAtiva'
import { Chamada } from './Chamada'

/** Mantém a chamada viva em qualquer tela do HiAdv (reduzida no canto enquanto a pessoa trabalha). */
export function ChamadaGlobal() {
  const c = useChamadaAtiva()
  const qc = useQueryClient()
  if (!c) return null
  return <Chamada key={c.id} id={c.id} video={c.video} titulo={c.titulo} eu={c.eu}
    aoSair={() => { fecharChamada(); void qc.invalidateQueries({ queryKey: ['reuniao', c.conversa] }); void qc.invalidateQueries({ queryKey: ['reunioes', c.conversa] }) }} />
}
