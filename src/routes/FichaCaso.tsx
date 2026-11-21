import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { Dialog } from '../design/components/Dialog'
import { Button } from '../design/components/Button'
import { Badge } from '../design/components/Badge'
import { ErrorState } from '../design/components/ErrorState'
import { useToast } from '../design/components/Toast'
import { validarCampo, valorParaTela, type CampoDef } from '../data/campos'
import { BENEFICIO_DEFS, diferencas, textoEvento, valorParaEdicao, type Ficha } from '../data/ficha'
import { diaSP } from '../data/seuDia'
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

function SecaoCampos({ id, titulo, defs, valores, vazio, aoSalvar }: {
  id: string; titulo: string; defs: CampoDef[]; valores: Record<string, unknown>; vazio: string
  aoSalvar: (mudou: Record<string, string>) => Promise<number>
}) {
  const toast = useToast()
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState<Record<string, string>>({})
  const [erros, setErros] = useState<Record<string, string>>({})
  const salvar = useMutation({
    mutationFn: aoSalvar,
    onSuccess: (n) => { toast(n === 0 ? 'Nada mudou.' : `${n} ${n === 1 ? 'campo salvo' : 'campos salvos'}.`); setEditando(false) },
    onError: (e) => toast(`Não foi possível salvar: ${(e as Error).message}`, 'danger'),
  })

  function abrir() {
    setRascunho(Object.fromEntries(defs.map((d) => [d.chave, valorParaEdicao(d, valores[d.chave])])))
    setErros({}); setEditando(true)
  }
  function enviar(e: FormEvent) {
    e.preventDefault()
    const novos: Record<string, string> = {}
    for (const d of defs) { const m = validarCampo(d, rascunho[d.chave] ?? ''); if (m) novos[d.chave] = m }
    setErros(novos)
    if (Object.keys(novos).length) return
    const mudou = diferencas(defs, valores, rascunho)
    if (Object.keys(mudou).length === 0) { setEditando(false); toast('Nada mudou.'); return }
    salvar.mutate(mudou)
  }

  return (
    <section aria-labelledby={id}>
      <div className="ficha-secao-cabeca">
        <h3 id={id}>{titulo}</h3>
        {defs.length > 0 && !editando && <Button size="sm" variant="ghost" onClick={abrir} aria-label={`Editar ${titulo.toLowerCase()}`}>Editar</Button>}
      </div>
      {defs.length === 0 && <p className="muted">{vazio}</p>}
      {defs.length > 0 && !editando && (
        <dl className="ficha-campos">
          {defs.map((d) => (
            <div key={d.chave} data-largo={d.tipo === 'texto_longo' ? 'true' : undefined}>
              <dt>{d.rotulo}</dt><dd>{valorParaTela(d, valores[d.chave])}</dd>
            </div>
          ))}
        </dl>
      )}
      {editando && (
        <form className="ficha-form" onSubmit={enviar} noValidate>
          <div className="ficha-campos">
            {defs.map((d) => <Entrada key={d.chave} d={d} valor={rascunho[d.chave] ?? ''} erro={erros[d.chave]} aoMudar={(v) => setRascunho((r) => ({ ...r, [d.chave]: v }))} />)}
          </div>
          <div className="catalogo-linha">
            <Button type="submit" disabled={salvar.isPending}>{salvar.isPending ? 'Salvando…' : 'Salvar'}</Button>
            <Button variant="ghost" onClick={() => setEditando(false)}>Cancelar</Button>
          </div>
        </form>
      )}
    </section>
  )
}

const dataCurta = (d: string) => { const [a, m, dd] = d.slice(0, 10).split('-'); return `${dd}/${m}/${a}` }

function Checklist({ f, aoMudar }: { f: Ficha; aoMudar: () => void }) {
  const api = useApi()
  const toast = useToast()
  const [marcando, setMarcando] = useState<string | null>(null)
  const [data, setData] = useState(diaSP(new Date()))
  const m = useMutation({
    mutationFn: (v: { item: string; data: string | null }) => api.marcarChecklist(f.id, v.item, v.data),
    onSuccess: (_r, v) => { toast(v.data ? 'Item marcado.' : 'Item desmarcado.'); setMarcando(null); aoMudar() },
    onError: (e) => toast(`Não foi possível: ${(e as Error).message}`, 'danger'),
  })
  const feitos = f.checklist.filter((c) => c.feito).length
  return (
    <section aria-labelledby="ficha-check">
      <div className="ficha-secao-cabeca">
        <h3 id="ficha-check">Checklist</h3>
        {f.checklist.length > 0 && <span className="muted">{feitos} de {f.checklist.length}</span>}
      </div>
      {f.checklist.length === 0 ? <p className="muted">Sem checklist para este tipo de caso.</p> : (
        <ul className="ficha-check">
          {f.checklist.map((c) => (
            <li key={c.item} data-feito={c.feito ? 'true' : undefined}>
              <span className="ficha-check-linha">
                <span><span aria-hidden="true">{c.feito ? '✓' : '○'}</span> {c.rotulo}{c.feito && c.data && <span className="muted"> · {dataCurta(c.data)}</span>}</span>
                {c.feito
                  ? <Button size="sm" variant="ghost" aria-label={`Desmarcar ${c.rotulo}`} disabled={m.isPending} onClick={() => m.mutate({ item: c.item, data: null })}>Desmarcar</Button>
                  : marcando !== c.item && <Button size="sm" variant="ghost" aria-label={`Marcar ${c.rotulo}`} onClick={() => { setData(diaSP(new Date())); setMarcando(c.item) }}>Marcar</Button>}
              </span>
              {marcando === c.item && (
                <form className="ficha-check-form" onSubmit={(e) => { e.preventDefault(); m.mutate({ item: c.item, data }) }}>
                  <label htmlFor={`dt-${c.item}`}>Data do documento</label>
                  <input id={`dt-${c.item}`} type="date" className="hv-input" value={data} max={diaSP(new Date())} required onChange={(e) => setData(e.target.value)} />
                  <Button size="sm" type="submit" disabled={m.isPending || !data}>Confirmar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setMarcando(null)}>Cancelar</Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Relato({ f, aoSalvo }: { f: Ficha; aoSalvo: () => void }) {
  const api = useApi()
  const toast = useToast()
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState('')
  const salvar = useMutation({
    mutationFn: (t: string) => api.salvarRelato(f.id, t),
    onSuccess: () => { toast('Relato salvo.'); setEditando(false); aoSalvo() },
    onError: (e) => toast(`Não foi possível salvar: ${(e as Error).message}`, 'danger'),
  })
  return (
    <section aria-labelledby="ficha-relato">
      <div className="ficha-secao-cabeca">
        <h3 id="ficha-relato">Relato do cliente</h3>
        {!editando && <Button size="sm" variant="ghost" onClick={() => { setTexto(f.relato ?? ''); setEditando(true) }}>{f.relato ? 'Editar relato' : 'Escrever relato'}</Button>}
      </div>
      {!editando && (f.relato
        ? <p className="ficha-relato">{f.relato}</p>
        : <p className="muted">Conte aqui, com as palavras do cliente, o que aconteceu: como foi o acidente ou a doença, o trabalho que fazia na época, o tratamento e o que mudou na vida dele. Os agentes usam este texto para preparar as peças.</p>)}
      {editando && (
        <form className="ficha-form" onSubmit={(e) => { e.preventDefault(); salvar.mutate(texto) }}>
          <div className="hv-field">
            <label htmlFor="relato-texto" className="sr-only">Relato do cliente</label>
            <textarea id="relato-texto" className="hv-input textarea" rows={8} maxLength={20000} value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus />
            <span className="hv-hint">{texto.length.toLocaleString('pt-BR')} de 20.000 caracteres</span>
          </div>
          <div className="catalogo-linha">
            <Button type="submit" disabled={salvar.isPending}>{salvar.isPending ? 'Salvando…' : 'Salvar relato'}</Button>
            <Button variant="ghost" onClick={() => setEditando(false)}>Cancelar</Button>
          </div>
        </form>
      )}
    </section>
  )
}

function Conteudo({ f }: { f: Ficha }) {
  const api = useApi()
  const { perfil } = useSessao()
  const qc = useQueryClient()
  const atualizar = () => {
    qc.invalidateQueries({ queryKey: ['ficha', perfil?.escritorioId, f.id] })
    qc.invalidateQueries({ queryKey: ['quadro', perfil?.escritorioId, f.area] })
  }

  return (
    <div className="hv-dialog-body ficha">
      <div className="ficha-topo">
        <Badge tone="info">{rotuloEtapa(f.status)}</Badge>
        {f.produto && <span className="muted">{f.produto}</span>}
        {f.numeroCnj && <span className="muted">Processo {f.numeroCnj}</span>}
      </div>

      <Relato key={`r-${f.id}`} f={f} aoSalvo={atualizar} />

      {f.beneficio && (
        <SecaoCampos key={`b-${f.id}`} id="ficha-benef" titulo="Dados do benefício" defs={BENEFICIO_DEFS} valores={f.beneficio} vazio=""
          aoSalvar={async (m) => { const n = await api.salvarBeneficio(f.id, m); atualizar(); return n }} />
      )}

      {(!f.beneficio || f.defs.length > 0) && (
        <SecaoCampos key={`a-${f.id}`} id="ficha-dados" titulo="Dados da área" defs={f.defs} valores={f.campos} vazio="Esta área ainda não tem campos próprios."
          aoSalvar={async (m) => { const n = await api.salvarCampos(f.id, m); atualizar(); return n }} />
      )}

      <Checklist f={f} aoMudar={atualizar} />

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
