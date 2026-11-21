import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { oabTela } from '../data/publicacoes'
import { Button } from '../design/components/Button'
import { useToast } from '../design/components/Toast'

/** OABs que o HiAdv consulta todo dia no DJEN (publicações) para o escritório. */
export function OabsAcompanhadas() {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const { perfil } = useSessao()
  const q = useQuery({ queryKey: ['oabs', perfil?.escritorioId], queryFn: () => api.oabs(), enabled: !!perfil })
  const [lista, setLista] = useState<string[]>([])
  const [nova, setNova] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => { if (q.data) setLista(q.data.oabs) }, [q.data])
  const salvar = useMutation({
    mutationFn: (l: string[]) => api.salvarOabs(l),
    onSuccess: (l) => { setLista(l); qc.invalidateQueries({ queryKey: ['oabs'] }); toast('OABs salvas. As publicações chegam na próxima busca diária.') },
    onError: (e) => setErro((e as Error).message),
  })

  function adicionar() {
    setErro(null)
    const n = oabTela(nova)
    if (!n) return setErro('Não entendi a OAB. Use número e estado, por exemplo 12.345/SC.')
    if (lista.includes(n)) return setErro('Essa OAB já está na lista.')
    if (lista.length >= 10) return setErro('Até 10 OABs por escritório.')
    salvar.mutate([...lista, n]); setNova('')
  }
  const daEquipe = (q.data?.daEquipe ?? []).filter((e) => !lista.includes(oabTela(e.oab) ?? e.oab))

  return (
    <div className="hv-panel-body">
      <p className="muted">O HiAdv busca uma vez por dia, no Diário de Justiça Eletrônico Nacional (DJEN), as publicações dessas OABs. Processos novos entram sozinhos, e intimação com prazo vira tarefa. Sem custo.</p>
      {lista.length > 0 && (
        <ul className="oab-lista">
          {lista.map((o) => (
            <li key={o}><span>{o}</span>
              <Button size="sm" variant="ghost" aria-label={`Tirar ${o}`} disabled={salvar.isPending} onClick={() => salvar.mutate(lista.filter((x) => x !== o))}>Tirar</Button>
            </li>
          ))}
        </ul>
      )}
      {daEquipe.length > 0 && <p className="hv-hint">Também acompanhadas pelo cadastro dos Gestores Master: {daEquipe.map((e) => `${e.oab} (${e.nome})`).join(', ')}.</p>}
      <form className="oab-nova" onSubmit={(e) => { e.preventDefault(); adicionar() }}>
        <div className="hv-field">
          <label htmlFor="oab-nova">Adicionar OAB</label>
          <input id="oab-nova" className="hv-input" placeholder="12.345/SC" maxLength={20} autoComplete="off" value={nova} onChange={(e) => setNova(e.target.value)} />
        </div>
        <Button type="submit" variant="secondary" loading={salvar.isPending}>Adicionar</Button>
      </form>
      {erro && <p className="hv-error" role="alert">{erro}</p>}
    </div>
  )
}
