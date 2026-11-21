import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { Dialog } from '../design/components/Dialog'
import { Button } from '../design/components/Button'
import { Badge } from '../design/components/Badge'
import { ErrorState } from '../design/components/ErrorState'
import { useToast } from '../design/components/Toast'
import { validarCampo, valorParaTela, type CampoDef } from '../data/campos'
import { diferencas, textoEvento, valorParaEdicao, type Ficha } from '../data/ficha'
import { rotuloEtapa } from '../data/quadro'

const quando = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })

function Entrada({ d, valor, erro, aoMudar }: { d: CampoDef; valor: string; erro?: string; aoMudar: (v: string) => void }) {
  const id = `campo-${d.chave}`
  const comum = { id, 'aria-invalid': erro ? ('true' as const) : undefined, 'aria-describedby': erro ? `${id}-erro` : undefined }
  let controle
  if (d.tipo === 'texto_longo') controle = <textarea {...comum} className="hv-input textarea" rows={4} value={valor} onChange={(e) => aoMudar(e.target.value)} />
  else if (d.tipo === 'lista' || d.tipo === 'sim_nao') {
    const opcoes = d.tipo === 'sim_nao' ? [['true', 'Sim'], ['false', 'Não']] : (d.opcoes ?? []).map((o) => [o, o])
    controle = (
      <select {...comum} className="hv-input" value={valor} onChange={(e) => aoMudar(e.target.value)}>
        <option value="">–</option>
        {opcoes.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
      </select>
    )
  } else controle = (
    <input {...comum} className="hv-input" type={d.tipo === 'data' ? 'date' : 'text'} inputMode={d.tipo === 'moeda' || d.tipo === 'numero' ? 'decimal' : undefined}
      placeholder={d.tipo === 'moeda' ? '0,00' : undefined} value={valor} onChange={(e) => aoMudar(e.target.value)} />
  )
  return (
    <div className="hv-field" data-largo={d.tipo === 'texto_longo' ? 'true' : undefined}>
      <label htmlFor={id}>{d.rotulo}</label>
      {controle}
      {erro && <span id={`${id}-erro`} className="hv-error" role="alert">{erro}</span>}
    </div>
  )
}

function Conteudo({ f }: { f: Ficha }) {
  const api = useApi()
  const { perfil } = useSessao()
  const qc = useQueryClient()
  const toast = useToast()
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState<Record<string, string>>({})
  const [erros, setErros] = useState<Record<string, string>>({})

  useEffect(() => { setEditando(false) }, [f.id])

  const salvar = useMutation({
    mutationFn: (campos: Record<string, string>) => api.salvarCampos(f.id, campos),
    onSuccess: (n) => {
      toast(n === 0 ? 'Nada mudou.' : `${n} ${n === 1 ? 'campo salvo' : 'campos salvos'}.`)
      setEditando(false)
      qc.invalidateQueries({ queryKey: ['ficha', perfil?.escritorioId, f.id] })
      qc.invalidateQueries({ queryKey: ['quadro', perfil?.escritorioId, f.area] })
    },
    onError: (e) => toast(`Não foi possível salvar: ${(e as Error).message}`, 'danger'),
  })

  function abrirEdicao() {
    setRascunho(Object.fromEntries(f.defs.map((d) => [d.chave, valorParaEdicao(d, f.campos[d.chave])])))
    setErros({}); setEditando(true)
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    const novos: Record<string, string> = {}
    for (const d of f.defs) { const m = validarCampo(d, rascunho[d.chave] ?? ''); if (m) novos[d.chave] = m }
    setErros(novos)
    if (Object.keys(novos).length) return
    const mudou = diferencas(f.defs, f.campos, rascunho)
    if (Object.keys(mudou).length === 0) { setEditando(false); toast('Nada mudou.'); return }
    salvar.mutate(mudou)
  }

  const feitos = f.checklist.filter((c) => c.feito).length

  return (
    <div className="hv-dialog-body ficha">
      <div className="ficha-topo">
        <Badge tone="info">{rotuloEtapa(f.status)}</Badge>
        {f.produto && <span className="muted">{f.produto}</span>}
        {f.numeroCnj && <span className="muted">Processo {f.numeroCnj}</span>}
      </div>

      <section aria-labelledby="ficha-dados">
        <div className="ficha-secao-cabeca">
          <h3 id="ficha-dados">Dados da área</h3>
          {f.defs.length > 0 && !editando && <Button size="sm" variant="ghost" onClick={abrirEdicao}>Editar</Button>}
        </div>
        {f.defs.length === 0 && <p className="muted">Esta área ainda não tem campos próprios.</p>}
        {f.defs.length > 0 && !editando && (
          <dl className="ficha-campos">
            {f.defs.map((d) => (
              <div key={d.chave} data-largo={d.tipo === 'texto_longo' ? 'true' : undefined}>
                <dt>{d.rotulo}</dt><dd>{valorParaTela(d, f.campos[d.chave])}</dd>
              </div>
            ))}
          </dl>
        )}
        {editando && (
          <form className="ficha-form" onSubmit={enviar} noValidate>
            <div className="ficha-campos">
              {f.defs.map((d) => (
                <Entrada key={d.chave} d={d} valor={rascunho[d.chave] ?? ''} erro={erros[d.chave]}
                  aoMudar={(v) => setRascunho((r) => ({ ...r, [d.chave]: v }))} />
              ))}
            </div>
            <div className="catalogo-linha">
              <Button type="submit" disabled={salvar.isPending}>{salvar.isPending ? 'Salvando…' : 'Salvar campos'}</Button>
              <Button variant="ghost" onClick={() => setEditando(false)}>Cancelar</Button>
            </div>
          </form>
        )}
      </section>

      <section aria-labelledby="ficha-check">
        <div className="ficha-secao-cabeca">
          <h3 id="ficha-check">Checklist</h3>
          {f.checklist.length > 0 && <span className="muted">{feitos} de {f.checklist.length}</span>}
        </div>
        {f.checklist.length === 0 ? <p className="muted">Sem checklist para este tipo de caso.</p> : (
          <ul className="ficha-check">
            {f.checklist.map((c) => <li key={c.item} data-feito={c.feito ? 'true' : undefined}><span aria-hidden="true">{c.feito ? '✓' : '○'}</span> {c.rotulo}<span className="sr-only">{c.feito ? ' (feito)' : ' (pendente)'}</span></li>)}
          </ul>
        )}
      </section>

      <section aria-labelledby="ficha-hist">
        <h3 id="ficha-hist">Histórico</h3>
        {f.historico.length === 0 ? <p className="muted">Nada registrado ainda.</p> : (
          <ol className="ficha-hist">
            {f.historico.map((h, i) => (
              <li key={i}><span>{textoEvento(h)}</span><span className="muted">{h.em ? quando.format(new Date(h.em)) : ''}{h.quem ? ` · ${h.quem}` : ''}</span></li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

export function FichaCaso({ casoId, nome, aoFechar }: { casoId: string | null; nome: string; aoFechar: () => void }) {
  const api = useApi()
  const { perfil } = useSessao()
  const q = useQuery({ queryKey: ['ficha', perfil?.escritorioId, casoId], queryFn: () => api.ficha(casoId!), enabled: !!casoId })
  return (
    <Dialog open={!!casoId} onOpenChange={(v) => !v && aoFechar()} title={q.data?.cliente ?? nome} variant="painel">
      {q.isLoading && <p className="hv-dialog-body muted" role="status">Abrindo a ficha…</p>}
      {q.isError && <div className="hv-dialog-body"><ErrorState onRetry={() => q.refetch()} /></div>}
      {q.data && <Conteudo f={q.data} />}
    </Dialog>
  )
}
