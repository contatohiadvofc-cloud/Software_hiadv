import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { useAreas } from '../data/consultas'
import { CATALOGO_AREAS } from '../data/areas'
import { Button } from '../design/components/Button'
import { Dialog } from '../design/components/Dialog'
import { useToast } from '../design/components/Toast'

export function useLigarArea() {
  const api = useApi()
  const qc = useQueryClient()
  const { perfil } = useSessao()
  return useMutation({
    mutationFn: ({ area, ativa }: { area: string; ativa: boolean }) => api.ativarArea(area, ativa),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['areas', perfil?.escritorioId] })
      qc.invalidateQueries({ queryKey: ['etapas-escritorio'] })
    },
  })
}

/** Gestor liga ou desliga áreas do catálogo. Desligar não apaga nada: os casos ficam guardados. */
export function AreasDeAtuacao() {
  const areas = useAreas()
  const ligar = useLigarArea()
  const toast = useToast()
  const [desligando, setDesligando] = useState<{ area: string; nome: string } | null>(null)
  const ativas = new Set((areas.data ?? []).map((a) => a.area))
  const nomeAtual = (area: string) => areas.data?.find((a) => a.area === area)?.nome

  function mudar(area: string, nome: string, ativa: boolean) {
    ligar.mutate({ area, ativa }, {
      onSuccess: () => { toast(ativa ? `${nome} ligada. Ela já aparece no menu e no "Novo caso".` : `${nome} desligada. Os casos dela ficam guardados.`); setDesligando(null) },
      onError: (e) => toast((e as Error).message),
    })
  }

  return (
    <div className="hv-panel-body">
      <p className="cfg-dica">Cada área ligada ganha quadro próprio com as etapas prontas.</p>
      <ul className="area-catalogo">
        {CATALOGO_AREAS.map((a) => {
          const ligada = ativas.has(a.area)
          const nome = nomeAtual(a.area) ?? a.nome
          return (
            <li key={a.area} className="area-catalogo-item">
              <div>
                <strong>{nome}</strong>
                <span className="muted">{a.exemplo}</span>
              </div>
              {ligada
                ? <Button size="sm" variant="ghost" aria-label={`Desligar ${nome}`} onClick={() => setDesligando({ area: a.area, nome })}>Desligar</Button>
                : <Button size="sm" variant="secondary" aria-label={`Ligar ${nome}`} loading={ligar.isPending && ligar.variables?.area === a.area} onClick={() => mudar(a.area, nome, true)}>Ligar</Button>}
            </li>
          )
        })}
      </ul>
      <Dialog open={!!desligando} onOpenChange={(o) => { if (!o) setDesligando(null) }} title={`Desligar ${desligando?.nome ?? ''}?`}>
        <div className="hv-dialog-body catalogo-pilha">
          <p>O quadro dessa área sai do menu e ela deixa de aparecer no "Novo caso". Nada é apagado: os casos ficam guardados e voltam quando você ligar a área de novo.</p>
          <div className="catalogo-linha">
            <Button variant="danger" loading={ligar.isPending} onClick={() => desligando && mudar(desligando.area, desligando.nome, false)}>Desligar</Button>
            <Button variant="ghost" onClick={() => setDesligando(null)}>Cancelar</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
