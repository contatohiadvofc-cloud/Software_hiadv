import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { agruparTarefas, nomeDe, validarNovaTarefa, type NovaTarefa, type Pessoa, type Tarefa } from '../data/tarefas'
import { quandoTexto } from '../data/seuDia'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'
import { Button } from '../design/components/Button'
import { Dialog } from '../design/components/Dialog'
import { useToast } from '../design/components/Toast'
import { PrazoDialog } from './Prazo'

const VAZIA: NovaTarefa = { titulo: '', responsavel: '', prazo: '', detalhe: '' }

function Linha({ t, equipe, urgente, agora, aoConcluir }: { t: Tarefa; equipe: Pessoa[]; urgente: boolean; agora: Date; aoConcluir: (t: Tarefa) => void }) {
  return (
    <li className="hv-row tarefa">
      <button type="button" className="tarefa-check" aria-label={`Concluir: ${t.titulo}`} onClick={() => aoConcluir(t)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="m5 12 5 5L20 7" /></svg>
      </button>
      <span className="texto">
        <span className="titulo">{t.titulo}{t.fatal && <span className="tarefa-fatal">Prazo fatal</span>}</span>
        {t.detalhe && <span className="sub">{t.detalhe}</span>}
      </span>
      <span className="quando" data-urgente={urgente ? 'true' : undefined}>{quandoTexto({ id: t.id, tipo: 'tarefa', titulo: '', sub: '', dia: t.prazo, hora: null, quem: '' }, agora)}</span>
      <span className="quem">{nomeDe(t.responsavel, equipe)}</span>
    </li>
  )
}

export function Tarefas() {
  const api = useApi()
  const { perfil } = useSessao()
  const qc = useQueryClient()
  const toast = useToast()
  const gestor = perfil?.papel === 'master' || perfil?.papel === 'code'
  const [quem, setQuem] = useState<string>('minhas')
  const [novaAberta, setNovaAberta] = useState(false)
  const [prazoAberto, setPrazoAberto] = useState(false)
  const [nova, setNova] = useState<NovaTarefa>(VAZIA)
  const [erro, setErro] = useState<string | null>(null)

  const pessoa = quem === 'minhas' ? perfil?.email ?? null : quem === 'todas' ? null : quem
  const chave = ['tarefas', perfil?.escritorioId, pessoa]
  const equipe = useQuery({ queryKey: ['equipe', perfil?.escritorioId], queryFn: () => api.equipe(), enabled: !!perfil, staleTime: 10 * 60_000 })
  const q = useQuery({ queryKey: chave, queryFn: () => api.tarefas(pessoa), enabled: !!perfil })
  const agora = useMemo(() => new Date(), [q.dataUpdatedAt])
  const g = useMemo(() => agruparTarefas(q.data ?? [], agora), [q.data, agora])
  const total = q.data?.length ?? 0
  const pessoas = equipe.data ?? []

  const atualizarListas = () => { qc.invalidateQueries({ queryKey: ['tarefas'] }); qc.invalidateQueries({ queryKey: ['seu-dia'] }) }

  const mudar = useMutation({
    mutationFn: (v: { id: string; status: 'feita' | 'aberta' }) => api.mudarTarefa(v.id, v.status),
    onMutate: async (v) => {
      if (v.status !== 'feita') return {}
      await qc.cancelQueries({ queryKey: chave })
      const antes = qc.getQueryData<Tarefa[]>(chave)
      if (antes) qc.setQueryData<Tarefa[]>(chave, antes.filter((t) => t.id !== v.id))
      return { antes }
    },
    onError: (e, _v, ctx) => {
      if (ctx?.antes) qc.setQueryData(chave, ctx.antes)
      toast(`Não foi possível atualizar: ${(e as Error).message}`, 'danger')
    },
    onSettled: atualizarListas,
  })

  function concluir(t: Tarefa) {
    mudar.mutate({ id: t.id, status: 'feita' }, {
      onSuccess: () => toast('Tarefa concluída.', 'neutral', { rotulo: 'Desfazer', fazer: () => mudar.mutate({ id: t.id, status: 'aberta' }) }),
    })
  }

  const criar = useMutation({
    mutationFn: (n: NovaTarefa) => api.criarTarefa(n),
    onSuccess: () => { toast('Tarefa criada.'); setNovaAberta(false); setNova(VAZIA); atualizarListas() },
    onError: (e) => setErro((e as Error).message),
  })

  function enviar(e: FormEvent) {
    e.preventDefault()
    const m = validarNovaTarefa(nova)
    setErro(m)
    if (!m) criar.mutate(nova)
  }

  function abrirNova() {
    setNova({ ...VAZIA, responsavel: perfil?.email ?? '' }); setErro(null); setNovaAberta(true)
  }

  const grupos: Array<[string, Tarefa[], boolean]> = [
    ['Atrasadas', g.atrasadas, true], ['Hoje', g.hoje, false], ['Próximos 7 dias', g.semana, false], ['Mais adiante', g.depois, false], ['Sem data', g.semData, false],
  ]

  return (
    <div className="pagina">
      <div className="pagina-cabeca">
        <div>
          <h1>Tarefas</h1>
          {q.isSuccess && <p className="muted">{total} {total === 1 ? 'aberta' : 'abertas'}</p>}
        </div>
        <div className="pagina-acoes">
          <label className="filtro">
            <span className="sr-only">Mostrar tarefas de</span>
            <select className="hv-input" value={quem} onChange={(e) => setQuem(e.target.value)}>
              <option value="minhas">Minhas</option>
              <option value="todas">{gestor ? 'Toda a equipe' : 'Minhas e da equipe'}</option>
              {gestor && pessoas.filter((p) => p.email !== perfil?.email).map((p) => <option key={p.email} value={p.email}>{p.nome}</option>)}
            </select>
          </label>
          <Button variant="secondary" onClick={() => setPrazoAberto(true)}>Calcular prazo</Button>
          <Button onClick={abrirNova}>Nova tarefa</Button>
        </div>
      </div>

      <Panel>
        {q.isLoading && <p className="hv-panel-body muted" role="status">Carregando…</p>}
        {q.isError && <ErrorState onRetry={() => q.refetch()} />}
        {q.isSuccess && total === 0 && <Empty title="Nenhuma tarefa aberta aqui.">Crie uma em “Nova tarefa”.</Empty>}
        {q.isSuccess && total > 0 && grupos.map(([titulo, itens, urgente]) => itens.length > 0 && (
          <div key={titulo}>
            <h3 className="hv-group-title"><span>{titulo}</span><span>{itens.length}</span></h3>
            <ul className="seu-dia-lista">{itens.map((t) => <Linha key={t.id} t={t} equipe={pessoas} urgente={urgente} agora={agora} aoConcluir={concluir} />)}</ul>
          </div>
        ))}
      </Panel>

      <PrazoDialog aberto={prazoAberto} aoFechar={() => setPrazoAberto(false)} />
      <Dialog open={novaAberta} onOpenChange={setNovaAberta} title="Nova tarefa">
        <form className="hv-dialog-body catalogo-pilha" onSubmit={enviar} noValidate>
          <div className="hv-field">
            <label htmlFor="nt-titulo">O que precisa ser feito</label>
            <input id="nt-titulo" className="hv-input" value={nova.titulo} maxLength={200} autoFocus onChange={(e) => setNova({ ...nova, titulo: e.target.value })} />
          </div>
          <div className="ficha-campos">
            <div className="hv-field">
              <label htmlFor="nt-resp">Responsável</label>
              <select id="nt-resp" className="hv-input" value={nova.responsavel} onChange={(e) => setNova({ ...nova, responsavel: e.target.value })}>
                <option value="">Equipe (sem responsável)</option>
                {pessoas.map((p) => <option key={p.email} value={p.email}>{p.nome}</option>)}
              </select>
            </div>
            <div className="hv-field">
              <label htmlFor="nt-prazo">Prazo</label>
              <input id="nt-prazo" type="date" className="hv-input" value={nova.prazo} onChange={(e) => setNova({ ...nova, prazo: e.target.value })} />
            </div>
          </div>
          <div className="hv-field">
            <label htmlFor="nt-detalhe">Detalhe (opcional)</label>
            <textarea id="nt-detalhe" className="hv-input textarea" rows={3} value={nova.detalhe} onChange={(e) => setNova({ ...nova, detalhe: e.target.value })} />
          </div>
          {erro && <p className="hv-error" role="alert">{erro}</p>}
          <div className="catalogo-linha">
            <Button type="submit" disabled={criar.isPending}>{criar.isPending ? 'Criando…' : 'Criar tarefa'}</Button>
            <Button variant="ghost" onClick={() => setNovaAberta(false)}>Cancelar</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
