import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useApi, useSessao } from '../lib/contexto'
import { NOMES_ORIGEM, LIMITE_TEXTO, LIMITE_TITULO, alertasTexto, idsDosGrupos, quandoCurto, resumoPublicacao, validarAtualizacao,
  type Atualizacao, type GrupoAtualizacoes, type StatusAtualizacao } from '../data/suporte'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'
import { Badge } from '../design/components/Badge'
import { Button } from '../design/components/Button'
import { Dialog } from '../design/components/Dialog'
import { Carregando } from '../design/components/Carregando'
import { useToast } from '../design/components/Toast'

type Aba = 'revisar' | 'publicadas' | 'conversas'

function ItemRascunho({ a, marcado, aoMarcar }: { a: Atualizacao; marcado: boolean; aoMarcar: (v: boolean) => void }) {
  const api = useApi(); const qc = useQueryClient(); const toast = useToast()
  const [editando, setEditando] = useState(false)
  const [titulo, setTitulo] = useState(a.titulo)
  const [texto, setTexto] = useState(a.texto)
  const [erro, setErro] = useState<string | null>(null)
  const alertas = alertasTexto(editando ? texto : a.texto)
  const salvar = useMutation({
    mutationFn: () => api.suporteSalvar(a.id, titulo, texto),
    onSuccess: () => { setEditando(false); toast('Rascunho salvo.'); qc.invalidateQueries({ queryKey: ['suporte'] }) },
    onError: (e) => setErro((e as Error).message),
  })
  const descartar = useMutation({
    mutationFn: () => api.suporteDescartar([a.id]),
    onSuccess: () => { toast('Rascunho descartado. Ele não vai para o cliente.'); qc.invalidateQueries({ queryKey: ['suporte'] }) },
  })
  function enviar(e: FormEvent) { e.preventDefault(); const m = validarAtualizacao(titulo, texto); setErro(m); if (!m) salvar.mutate() }
  return (
    <li className="sp-item" data-marcado={marcado || undefined}>
      <label className="sp-marca">
        <input type="checkbox" checked={marcado} onChange={(e) => aoMarcar(e.target.checked)} aria-label={`Incluir "${a.titulo}" na publicação`} />
      </label>
      <div className="sp-corpo">
        <div className="sp-meta">
          <Badge tone={a.origem === 'manual' ? 'info' : 'neutral'}>{NOMES_ORIGEM[a.origem]}</Badge>
          <span className="muted">{quandoCurto(a.criadoEm)}</span>
          {a.editadoPor && <span className="muted">· editado</span>}
        </div>
        {editando ? (
          <form className="sp-editar" onSubmit={enviar} noValidate>
            <label className="adm-campo"><span>Título que o cliente vê</span>
              <input className="hv-input" value={titulo} maxLength={LIMITE_TITULO} onChange={(e) => setTitulo(e.target.value)} autoFocus />
            </label>
            <label className="adm-campo"><span>Texto <small className="muted">· {texto.trim().length}/{LIMITE_TEXTO}</small></span>
              <textarea className="hv-input" rows={4} value={texto} maxLength={LIMITE_TEXTO} onChange={(e) => setTexto(e.target.value)} />
            </label>
            {erro && <p className="ad-erro" role="alert">{erro}</p>}
            <div className="sp-acoes">
              <Button type="submit" size="sm" loading={salvar.isPending}>Salvar</Button>
              <Button variant="ghost" size="sm" onClick={() => { setEditando(false); setTitulo(a.titulo); setTexto(a.texto); setErro(null) }}>Cancelar</Button>
            </div>
          </form>
        ) : (
          <>
            <p className="sp-titulo">{a.titulo}</p>
            <p className="sp-texto">{a.texto}</p>
          </>
        )}
        {a.interno && <p className="sp-interno"><span>No processo:</span> {a.interno}</p>}
        {alertas.length > 0 && <ul className="sp-alertas">{alertas.map((x) => <li key={x}>{x}</li>)}</ul>}
        {!editando && (
          <div className="sp-acoes">
            <Button variant="secondary" size="sm" onClick={() => setEditando(true)}>Editar</Button>
            <Button variant="ghost" size="sm" loading={descartar.isPending} onClick={() => descartar.mutate()}>Descartar</Button>
          </div>
        )}
      </div>
    </li>
  )
}

function GrupoCliente({ g, marcados, aoMarcar }: { g: GrupoAtualizacoes; marcados: Set<string>; aoMarcar: (ids: string[], v: boolean) => void }) {
  const todos = g.itens.every((i) => marcados.has(i.id))
  return (
    <section className="sp-grupo" aria-label={`Atualizações de ${g.cliente}`}>
      <header className="sp-grupo-cab">
        <label className="sp-marca">
          <input type="checkbox" checked={todos} onChange={(e) => aoMarcar(g.itens.map((i) => i.id), e.target.checked)} aria-label={`Marcar todas de ${g.cliente}`} />
        </label>
        <div className="sp-grupo-nome">
          <Link to="/clientes/$id" params={{ id: g.clienteId }} className="sp-cliente">{g.cliente}</Link>
          <span className="muted">{g.itens.length} {g.itens.length === 1 ? 'atualização' : 'atualizações'}</span>
        </div>
        {!g.temAcesso && <Badge tone="warning">Sem link do Meu Processo</Badge>}
      </header>
      {!g.temAcesso && <p className="sp-aviso">Este cliente ainda não tem o link do Meu Processo. A atualização fica guardada e aparece quando ele entrar. Gere o link na ficha do cliente.</p>}
      <ul className="sp-itens">
        {g.itens.map((a) => <ItemRascunho key={a.id} a={a} marcado={marcados.has(a.id)} aoMarcar={(v) => aoMarcar([a.id], v)} />)}
      </ul>
    </section>
  )
}

function Revisar() {
  const api = useApi(); const qc = useQueryClient(); const toast = useToast()
  const gerar = useQuery({ queryKey: ['suporte', 'gerar'], queryFn: () => api.suporteGerar(), staleTime: 60_000 })
  const q = useQuery({ queryKey: ['suporte', 'fila', 'rascunho', gerar.dataUpdatedAt], queryFn: () => api.suporteFila('rascunho'), enabled: !gerar.isLoading })
  const grupos = q.data ?? []
  const [desmarcados, setDesmarcados] = useState<Set<string>>(new Set())
  const marcados = useMemo(() => new Set(idsDosGrupos(grupos).filter((id) => !desmarcados.has(id))), [grupos, desmarcados])
  const [confirmar, setConfirmar] = useState(false)
  const aoMarcar = (ids: string[], v: boolean) => setDesmarcados((d) => { const n = new Set(d); for (const id of ids) { if (v) n.delete(id); else n.add(id) } return n })
  const clientesMarcados = grupos.filter((g) => g.itens.some((i) => marcados.has(i.id))).length
  const publicar = useMutation({
    mutationFn: () => api.suportePublicar([...marcados]),
    onSuccess: (r) => { setConfirmar(false); setDesmarcados(new Set()); toast(resumoPublicacao(r.publicadas, r.clientes)); qc.invalidateQueries({ queryKey: ['suporte'] }) },
    onError: (e) => toast((e as Error).message, 'danger'),
  })
  if (gerar.isLoading || q.isLoading) return <Carregando texto="Conferindo as novidades dos processos…" />
  if (q.isError) return <Panel><ErrorState onRetry={() => q.refetch()} /></Panel>
  if (!grupos.length) return (
    <Panel><Empty title="Nada para revisar agora.">Quando houver andamento no processo, perícia ou audiência marcada, mudança de etapa ou documento pedido, o rascunho para o cliente aparece aqui.</Empty></Panel>
  )
  return (
    <>
      <div className="sp-barra" role="region" aria-label="Publicação">
        <p><strong>{marcados.size}</strong> de {idsDosGrupos(grupos).length} marcadas · {clientesMarcados} {clientesMarcados === 1 ? 'cliente' : 'clientes'}</p>
        <div className="sp-acoes">
          <Button variant="ghost" size="sm" onClick={() => setDesmarcados(marcados.size ? new Set(idsDosGrupos(grupos)) : new Set())}>{marcados.size ? 'Desmarcar todas' : 'Marcar todas'}</Button>
          <Button disabled={!marcados.size} onClick={() => setConfirmar(true)}>Publicar {marcados.size || ''}</Button>
        </div>
      </div>
      <div className="sp-grupos">{grupos.map((g) => <GrupoCliente key={g.clienteId} g={g} marcados={marcados} aoMarcar={aoMarcar} />)}</div>
      <Dialog open={confirmar} onOpenChange={setConfirmar} title="Publicar no Meu Processo">
        <div className="sp-confirma">
          <p>Vão ser publicadas <strong>{marcados.size} {marcados.size === 1 ? 'atualização' : 'atualizações'}</strong> para <strong>{clientesMarcados} {clientesMarcados === 1 ? 'cliente' : 'clientes'}</strong>. Cada cliente vê só a sua, no app Meu Processo.</p>
          <p className="muted">Fica registrado quem publicou e quando. Depois de publicada, a atualização não volta para rascunho.</p>
          <div className="sp-acoes">
            <Button loading={publicar.isPending} onClick={() => publicar.mutate()}>Publicar agora</Button>
            <Button variant="ghost" onClick={() => setConfirmar(false)}>Voltar</Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}

function Publicadas() {
  const api = useApi()
  const q = useQuery({ queryKey: ['suporte', 'fila', 'publicada'], queryFn: () => api.suporteFila('publicada') })
  if (q.isLoading) return <Carregando texto="Carregando…" />
  if (q.isError) return <Panel><ErrorState onRetry={() => q.refetch()} /></Panel>
  const grupos = q.data ?? []
  if (!grupos.length) return <Panel><Empty title="Nenhuma atualização publicada nos últimos 60 dias." /></Panel>
  return (
    <div className="sp-grupos">
      {grupos.map((g) => (
        <section key={g.clienteId} className="sp-grupo" aria-label={`Publicadas para ${g.cliente}`}>
          <header className="sp-grupo-cab"><div className="sp-grupo-nome"><Link to="/clientes/$id" params={{ id: g.clienteId }} className="sp-cliente">{g.cliente}</Link></div></header>
          <ul className="sp-itens">
            {g.itens.map((a) => (
              <li key={a.id} className="sp-item sp-item-feito">
                <div className="sp-corpo">
                  <div className="sp-meta">
                    <Badge tone={a.lidaEm ? 'success' : 'neutral'}>{a.lidaEm ? 'Lida pelo cliente' : 'Ainda não lida'}</Badge>
                    <span className="muted">Publicada {a.publicadoEm ? quandoCurto(a.publicadoEm) : ''}{a.publicadoPor ? ` por ${a.publicadoPor.split('@')[0]}` : ''}</span>
                  </div>
                  <p className="sp-titulo">{a.titulo}</p>
                  <p className="sp-texto">{a.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Conversas() {
  const api = useApi(); const qc = useQueryClient(); const toast = useToast()
  const lista = useQuery({ queryKey: ['suporte', 'conversas'], queryFn: () => api.suporteConversas(), refetchInterval: 20_000 })
  const [ativo, setAtivo] = useState<string | null>(null)
  const msgs = useQuery({ queryKey: ['suporte', 'mensagens', ativo], queryFn: () => api.suporteMensagens(ativo!), enabled: !!ativo, refetchInterval: 10_000 })
  const [texto, setTexto] = useState('')
  const fim = useRef<HTMLDivElement>(null)
  useEffect(() => { fim.current?.scrollIntoView({ block: 'end' }) }, [msgs.data?.length])
  const responder = useMutation({
    mutationFn: () => api.suporteResponder(ativo!, texto),
    onSuccess: () => { setTexto(''); qc.invalidateQueries({ queryKey: ['suporte', 'mensagens', ativo] }); qc.invalidateQueries({ queryKey: ['suporte', 'conversas'] }) },
    onError: (e) => toast((e as Error).message, 'danger'),
  })
  if (lista.isLoading) return <Carregando texto="Carregando…" />
  if (lista.isError) return <Panel><ErrorState onRetry={() => lista.refetch()} /></Panel>
  const conversas = lista.data ?? []
  if (!conversas.length) return <Panel><Empty title="Nenhuma conversa com clientes ainda.">Quando um cliente escrever pelo Meu Processo, a conversa aparece aqui.</Empty></Panel>
  const atual = conversas.find((c) => c.clienteId === ativo)
  return (
    <div className="sp-chat" data-aberta={ativo ? '' : undefined}>
      <ul className="sp-chat-lista" aria-label="Conversas com clientes">
        {conversas.map((c) => (
          <li key={c.clienteId}>
            <button type="button" className="sp-chat-item" aria-current={c.clienteId === ativo ? 'true' : undefined} onClick={() => setAtivo(c.clienteId)}>
              <span className="sp-chat-nome">{c.nome}{c.naoLidas > 0 && <span className="sp-chat-n" aria-label={`${c.naoLidas} não lidas`}>{c.naoLidas}</span>}</span>
              <span className="muted sp-chat-ultima">{c.ultima}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="sp-chat-fio">
        {!ativo ? <p className="muted sp-chat-vazio">Escolha uma conversa.</p> : (
          <>
            <div className="sp-chat-topo">
              <Button variant="ghost" size="sm" className="sp-chat-voltar" onClick={() => setAtivo(null)}>‹ Conversas</Button>
              <strong>{atual?.nome}</strong>
            </div>
            <div className="sp-chat-msgs" aria-live="polite">
              {msgs.isLoading && <Carregando texto="Carregando…" />}
              {(msgs.data ?? []).map((m) => (
                <div key={m.id} className="sp-msg" data-autor={m.autor}>
                  <p>{m.texto}</p>
                  <span className="muted">{m.autor === 'cliente' ? 'Cliente' : m.autor === 'sara' ? 'Sara' : (m.autorEmail ?? 'Equipe').split('@')[0]} · {quandoCurto(m.em)}</span>
                </div>
              ))}
              <div ref={fim} />
            </div>
            <form className="sp-chat-form" onSubmit={(e) => { e.preventDefault(); if (texto.trim()) responder.mutate() }}>
              <textarea className="hv-input" rows={2} value={texto} maxLength={2000} placeholder="Responder ao cliente" aria-label="Responder ao cliente"
                onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (texto.trim()) responder.mutate() } }} />
              <Button type="submit" loading={responder.isPending} disabled={!texto.trim()}>Enviar</Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function NovaAtualizacao({ aoFechar }: { aoFechar: () => void }) {
  const api = useApi(); const qc = useQueryClient(); const toast = useToast()
  const [busca, setBusca] = useState('')
  const [cliente, setCliente] = useState<{ id: string; nome: string } | null>(null)
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const achados = useQuery({ queryKey: ['clientes', busca], queryFn: () => api.clientes(busca), enabled: busca.trim().length >= 2 && !cliente })
  const criar = useMutation({
    mutationFn: () => api.suporteNova(cliente!.id, titulo, texto),
    onSuccess: () => { toast('Rascunho criado. Confira e publique junto com os outros.'); qc.invalidateQueries({ queryKey: ['suporte'] }); aoFechar() },
    onError: (e) => setErro((e as Error).message),
  })
  function enviar(e: FormEvent) {
    e.preventDefault()
    const m = !cliente ? 'Escolha o cliente.' : validarAtualizacao(titulo, texto)
    setErro(m); if (!m) criar.mutate()
  }
  return (
    <form className="sp-nova" onSubmit={enviar} noValidate>
      {cliente ? (
        <p className="sp-escolhido">Para <strong>{cliente.nome}</strong> <Button variant="ghost" size="sm" onClick={() => setCliente(null)}>Trocar</Button></p>
      ) : (
        <label className="adm-campo"><span>Cliente</span>
          <input className="hv-input" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite o nome ou CPF" autoFocus />
          {(achados.data ?? []).length > 0 && (
            <ul className="sp-achados">{(achados.data ?? []).slice(0, 6).map((c) => (
              <li key={c.id}><button type="button" onClick={() => setCliente({ id: c.id, nome: c.nome })}>{c.nome}</button></li>
            ))}</ul>
          )}
        </label>
      )}
      <label className="adm-campo"><span>Título que o cliente vê</span>
        <input className="hv-input" value={titulo} maxLength={LIMITE_TITULO} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Recebemos os seus documentos" />
      </label>
      <label className="adm-campo"><span>Texto <small className="muted">· {texto.trim().length}/{LIMITE_TEXTO}</small></span>
        <textarea className="hv-input" rows={5} value={texto} maxLength={LIMITE_TEXTO} onChange={(e) => setTexto(e.target.value)} />
      </label>
      {alertasTexto(texto).length > 0 && <ul className="sp-alertas">{alertasTexto(texto).map((x) => <li key={x}>{x}</li>)}</ul>}
      {erro && <p className="ad-erro" role="alert">{erro}</p>}
      <div className="sp-acoes">
        <Button type="submit" loading={criar.isPending}>Criar rascunho</Button>
        <Button variant="ghost" onClick={aoFechar}>Cancelar</Button>
      </div>
    </form>
  )
}

export function Suporte() {
  const api = useApi(); const { perfil } = useSessao()
  const [aba, setAba] = useState<Aba>('revisar')
  const [nova, setNova] = useState(false)
  const fila = useQuery({ queryKey: ['suporte', 'fila', 'contagem'], queryFn: () => api.suporteFila('rascunho' as StatusAtualizacao), enabled: !!perfil })
  const conversas = useQuery({ queryKey: ['suporte', 'conversas'], queryFn: () => api.suporteConversas(), enabled: !!perfil })
  const nRevisar = idsDosGrupos(fila.data ?? []).length
  const nConversas = (conversas.data ?? []).reduce((s, c) => s + c.naoLidas, 0)
  const abas: [Aba, string, number][] = [['revisar', 'Para revisar', nRevisar], ['publicadas', 'Publicadas', 0], ['conversas', 'Conversas', nConversas]]
  return (
    <div className="pagina">
      <div className="pagina-cabeca">
        <div><h1>Suporte ao cliente</h1><p className="muted">O HiAdv prepara as novidades de cada processo. Você confere, ajusta e publica no Meu Processo de cada cliente.</p></div>
        <Button onClick={() => setNova(true)}>Nova atualização</Button>
      </div>
      <div className="ct-abas" role="tablist" aria-label="Mesa do Suporte">
        {abas.map(([id, rotulo, n]) => (
          <button key={id} type="button" role="tab" aria-selected={aba === id} onClick={() => setAba(id)}>
            {rotulo}{n > 0 && <span className="sp-aba-n">{n}</span>}
          </button>
        ))}
      </div>
      <div className="sp-conteudo" role="tabpanel">
        {aba === 'revisar' && <Revisar />}
        {aba === 'publicadas' && <Publicadas />}
        {aba === 'conversas' && <Conversas />}
      </div>
      <Dialog open={nova} onOpenChange={setNova} title="Nova atualização para o cliente" variant="painel">
        {nova && <NovaAtualizacao aoFechar={() => setNova(false)} />}
      </Dialog>
    </div>
  )
}
