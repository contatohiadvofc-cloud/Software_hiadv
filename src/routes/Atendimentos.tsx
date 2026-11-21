import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { useAreas } from '../data/consultas'
import { ETAPAS_ABERTAS, MOTIVOS_PERDA, ORIGENS, colunasDoFunil, contatoAtrasado, nomeEtapaLead, validarLead, type EtapaLead, type Lead, type NovoLead } from '../data/atendimentos'
import { PRODUTOS_PREV, areaPrevidenciaria } from '../data/cadastro'
import { linkWhatsapp, telefoneTela } from '../data/clientes'
import { dataTela } from '../data/publicacoes'
import { diaSP } from '../data/seuDia'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'
import { Button } from '../design/components/Button'
import { Dialog } from '../design/components/Dialog'
import { Field } from '../design/components/Field'
import { useToast } from '../design/components/Toast'

const VAZIO: NovoLead = { nome: '', telefone: '', origem: '', area: '', assunto: '', responsavel: '', proximoContato: '' }
const chaveLeads = (esc?: string | null) => ['leads', esc]

function LeadDialog({ lead, aberto, aoFechar }: { lead: Lead | null; aberto: boolean; aoFechar: () => void }) {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const { perfil } = useSessao()
  const areas = useAreas()
  const equipe = useQuery({ queryKey: ['equipe', perfil?.escritorioId], queryFn: () => api.equipe(), enabled: !!perfil && aberto, staleTime: 10 * 60_000 })
  const [l, setL] = useState<NovoLead>(VAZIO)
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => {
    if (!aberto) return
    setErro(null)
    setL(lead ? { nome: lead.nome, telefone: lead.telefone ?? '', origem: lead.origem ?? '', area: lead.area ?? '', assunto: lead.assunto ?? '', responsavel: lead.responsavel ?? '', proximoContato: lead.proximoContato ?? '' } : VAZIO)
  }, [aberto]) // eslint-disable-line react-hooks/exhaustive-deps
  const salvar = useMutation({
    mutationFn: () => api.salvarLead(lead?.id ?? null, l),
    onSuccess: () => { toast(lead ? 'Atendimento atualizado.' : 'Atendimento incluído.'); qc.invalidateQueries({ queryKey: ['leads'] }); aoFechar() },
    onError: (e) => setErro((e as Error).message),
  })
  function enviar(e: FormEvent) {
    e.preventDefault()
    const m = validarLead(l); setErro(m)
    if (!m) salvar.mutate()
  }
  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o) aoFechar() }} title={lead ? 'Editar atendimento' : 'Novo atendimento'}>
      <form className="hv-dialog-body ficha-form" onSubmit={enviar} noValidate>
        <Field label="Nome" autoFocus maxLength={160} autoComplete="off" value={l.nome} onChange={(e) => setL({ ...l, nome: e.target.value })} />
        <Field label="Telefone ou WhatsApp (opcional)" inputMode="tel" maxLength={20} autoComplete="off" placeholder="(49) 99999-0000" value={l.telefone} onChange={(e) => setL({ ...l, telefone: e.target.value })} />
        <div className="ficha-campos">
          <div className="hv-field">
            <label htmlFor="ld-origem">Como chegou</label>
            <select id="ld-origem" className="hv-input" value={l.origem} onChange={(e) => setL({ ...l, origem: e.target.value })}>
              <option value="">Não informado</option>
              {ORIGENS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="hv-field">
            <label htmlFor="ld-area">Área provável</label>
            <select id="ld-area" className="hv-input" value={l.area} onChange={(e) => setL({ ...l, area: e.target.value })}>
              <option value="">A definir</option>
              {(areas.data ?? []).map((a) => <option key={a.area} value={a.area}>{a.nome}</option>)}
            </select>
          </div>
        </div>
        <div className="hv-field">
          <label htmlFor="ld-assunto">O que a pessoa contou (opcional)</label>
          <textarea id="ld-assunto" className="hv-input textarea" rows={3} maxLength={2000} value={l.assunto} onChange={(e) => setL({ ...l, assunto: e.target.value })} />
        </div>
        <div className="ficha-campos">
          <div className="hv-field">
            <label htmlFor="ld-resp">Quem atende</label>
            <select id="ld-resp" className="hv-input" value={l.responsavel} onChange={(e) => setL({ ...l, responsavel: e.target.value })}>
              <option value="">{lead ? 'Ninguém' : 'Eu'}</option>
              {(equipe.data ?? []).map((p) => <option key={p.email} value={p.email}>{p.nome}</option>)}
            </select>
          </div>
          <Field label="Próximo contato" type="date" value={l.proximoContato} onChange={(e) => setL({ ...l, proximoContato: e.target.value })} />
        </div>
        {erro && <p className="hv-error" role="alert">{erro}</p>}
        <div className="catalogo-linha">
          <Button type="submit" loading={salvar.isPending}>{lead ? 'Salvar' : 'Incluir atendimento'}</Button>
          <Button variant="ghost" onClick={aoFechar}>Cancelar</Button>
        </div>
      </form>
    </Dialog>
  )
}

function ConverterDialog({ lead, aoFechar }: { lead: Lead | null; aoFechar: () => void }) {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const nav = useNavigate()
  const areas = useAreas()
  const [area, setArea] = useState('')
  const [produto, setProduto] = useState('auxilio_acidente')
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => { if (lead) { setErro(null); setProduto('auxilio_acidente'); setArea(lead.area && areas.data?.some((a) => a.area === lead.area) ? lead.area : areas.data?.[0]?.area ?? '') } }, [lead]) // eslint-disable-line react-hooks/exhaustive-deps
  const converter = useMutation({
    mutationFn: () => api.converterLead(lead!.id, area, areaPrevidenciaria(area) ? produto : null),
    onSuccess: (r) => {
      toast(`${lead!.nome} virou cliente e o caso foi aberto.`)
      qc.invalidateQueries({ queryKey: ['leads'] }); qc.invalidateQueries({ queryKey: ['clientes'] }); qc.invalidateQueries({ queryKey: ['quadro'] })
      aoFechar(); nav({ to: '/clientes/$id', params: { id: r.cliente } })
    },
    onError: (e) => setErro((e as Error).message),
  })
  return (
    <Dialog open={!!lead} onOpenChange={(o) => { if (!o) aoFechar() }} title="Virou cliente">
      <form className="hv-dialog-body ficha-form" onSubmit={(e) => { e.preventDefault(); if (!area) return setErro('Escolha a área.'); converter.mutate() }} noValidate>
        <p className="muted">{lead?.nome} entra como cliente (se o telefone já existir, usamos o cadastro dele) e o caso abre na primeira etapa da área.</p>
        <div className="hv-field">
          <label htmlFor="cv-area">Área do caso</label>
          <select id="cv-area" className="hv-input" value={area} onChange={(e) => setArea(e.target.value)}>
            {(areas.data ?? []).map((a) => <option key={a.area} value={a.area}>{a.nome}</option>)}
          </select>
          <span className="hv-hint">Área que ainda não aparece? Ligue em Configurações, Áreas de atuação.</span>
        </div>
        {areaPrevidenciaria(area) && (
          <div className="hv-field">
            <label htmlFor="cv-produto">Benefício</label>
            <select id="cv-produto" className="hv-input" value={produto} onChange={(e) => setProduto(e.target.value)}>
              {PRODUTOS_PREV.map((p) => <option key={p.valor} value={p.valor}>{p.nome}</option>)}
            </select>
          </div>
        )}
        {erro && <p className="hv-error" role="alert">{erro}</p>}
        <div className="catalogo-linha">
          <Button type="submit" loading={converter.isPending}>Cadastrar cliente e abrir caso</Button>
          <Button variant="ghost" onClick={aoFechar}>Cancelar</Button>
        </div>
      </form>
    </Dialog>
  )
}

function PerdidoDialog({ lead, aoFechar }: { lead: Lead | null; aoFechar: () => void }) {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const [motivo, setMotivo] = useState(MOTIVOS_PERDA[0])
  const [outro, setOutro] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => { if (lead) { setMotivo(MOTIVOS_PERDA[0]); setOutro(''); setErro(null) } }, [lead])
  const final = motivo === 'Outro' ? outro.trim() : motivo
  const salvar = useMutation({
    mutationFn: () => api.etapaLead(lead!.id, 'perdido', final),
    onSuccess: () => { toast('Atendimento encerrado.'); qc.invalidateQueries({ queryKey: ['leads'] }); aoFechar() },
    onError: (e) => setErro((e as Error).message),
  })
  return (
    <Dialog open={!!lead} onOpenChange={(o) => { if (!o) aoFechar() }} title="Não fechou">
      <form className="hv-dialog-body ficha-form" onSubmit={(e) => { e.preventDefault(); if (final.length < 2) return setErro('Diga o motivo.'); salvar.mutate() }} noValidate>
        <div className="hv-field">
          <label htmlFor="pd-motivo">Motivo</label>
          <select id="pd-motivo" className="hv-input" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            {MOTIVOS_PERDA.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {motivo === 'Outro' && <Field label="Qual?" maxLength={200} autoFocus value={outro} onChange={(e) => setOutro(e.target.value)} />}
        <p className="hv-hint">O motivo aparece nos Relatórios, para entender onde os atendimentos se perdem.</p>
        {erro && <p className="hv-error" role="alert">{erro}</p>}
        <div className="catalogo-linha">
          <Button type="submit" loading={salvar.isPending}>Encerrar atendimento</Button>
          <Button variant="ghost" onClick={aoFechar}>Cancelar</Button>
        </div>
      </form>
    </Dialog>
  )
}

function CartaoLead({ l, hoje, equipe, aoEditar, aoMover }: { l: Lead; hoje: string; equipe: Map<string, string>; aoEditar: (l: Lead) => void; aoMover: (l: Lead, e: EtapaLead) => void }) {
  const wa = linkWhatsapp(l.telefone)
  const atrasado = contatoAtrasado(l, hoje)
  return (
    <li className="cartao" draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', l.id); e.dataTransfer.effectAllowed = 'move' }}>
      <button type="button" className="cartao-nome" onClick={() => aoEditar(l)}>{l.nome}</button>
      {l.assunto && <span className="cartao-sub lead-assunto">{l.assunto}</span>}
      <span className="cartao-meta">
        {l.origem && <span>{l.origem}</span>}
        {l.proximoContato && <span data-parado={atrasado ? 'true' : undefined}>{atrasado ? 'Contato atrasado' : l.proximoContato === hoje ? 'Falar hoje' : `Falar em ${dataTela(l.proximoContato)}`}</span>}
        {l.responsavel && <span>{equipe.get(l.responsavel) ?? l.responsavel.split('@')[0]}</span>}
      </span>
      <div className="lead-acoes">
        {wa && <a className="hv-btn" data-variant="secondary" data-size="sm" href={wa} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${l.nome}, ${telefoneTela(l.telefone)}`}>WhatsApp</a>}
        <label className="cartao-mover">
          <span className="sr-only">Mover {l.nome} para</span>
          <select value="" onChange={(e) => e.target.value && aoMover(l, e.target.value as EtapaLead)}>
            <option value="">Mover para…</option>
            {ETAPAS_ABERTAS.filter((e) => e !== l.etapa).map((e) => <option key={e} value={e}>{nomeEtapaLead(e)}</option>)}
            <option value="contratou">Virou cliente</option>
            <option value="perdido">Não fechou</option>
          </select>
        </label>
      </div>
    </li>
  )
}

/** Atendimentos: quem entrou em contato e ainda não é cliente, do primeiro contato até contratar (ou não). */
export function Atendimentos() {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const { perfil } = useSessao()
  const q = useQuery({ queryKey: chaveLeads(perfil?.escritorioId), queryFn: () => api.leads(), enabled: !!perfil })
  const equipe = useQuery({ queryKey: ['equipe', perfil?.escritorioId], queryFn: () => api.equipe(), enabled: !!perfil, staleTime: 10 * 60_000 })
  const nomes = useMemo(() => new Map((equipe.data ?? []).map((p) => [p.email, p.nome])), [equipe.data])
  const [editar, setEditar] = useState<Lead | null>(null)
  const [novo, setNovo] = useState(false)
  const [converter, setConverter] = useState<Lead | null>(null)
  const [perdido, setPerdido] = useState<Lead | null>(null)
  const [aba, setAba] = useState<EtapaLead>('novo')
  const [alvo, setAlvo] = useState<EtapaLead | null>(null)
  const [fechados, setFechados] = useState(false)
  const hoje = diaSP(new Date())
  const cols = useMemo(() => colunasDoFunil(q.data ?? []), [q.data])

  const mover = useMutation({
    mutationFn: ({ l, etapa }: { l: Lead; etapa: Exclude<EtapaLead, 'contratou' | 'perdido'> }) => api.etapaLead(l.id, etapa),
    onMutate: async ({ l, etapa }) => {
      const k = chaveLeads(perfil?.escritorioId)
      await qc.cancelQueries({ queryKey: k })
      const antes = qc.getQueryData<Lead[]>(k)
      qc.setQueryData<Lead[]>(k, (d) => d?.map((x) => (x.id === l.id ? { ...x, etapa } : x)))
      return { antes }
    },
    onSuccess: (_r, { l, etapa }) => toast(`${l.nome}: ${nomeEtapaLead(etapa)}.`),
    onError: (e, _v, ctx) => { if (ctx?.antes) qc.setQueryData(chaveLeads(perfil?.escritorioId), ctx.antes); toast((e as Error).message) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })
  function pedir(l: Lead, etapa: EtapaLead) {
    if (etapa === l.etapa) return
    if (etapa === 'contratou') return setConverter(l)
    if (etapa === 'perdido') return setPerdido(l)
    mover.mutate({ l, etapa })
  }
  function soltar(e: DragEvent, etapa: EtapaLead) {
    e.preventDefault(); setAlvo(null)
    const l = q.data?.find((x) => x.id === e.dataTransfer.getData('text/plain'))
    if (l) pedir(l, etapa)
  }
  const abertos = ETAPAS_ABERTAS.reduce((n, e) => n + cols[e].length, 0)
  const encerrados = [...cols.contratou, ...cols.perdido].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))

  return (
    <div className="pagina pagina-larga">
      <div className="pagina-cabeca">
        <div>
          <h1>Atendimentos</h1>
          <p className="muted">{q.isSuccess ? `${abertos} em andamento. ` : ''}Quem entrou em contato e ainda não é cliente.</p>
        </div>
        <div className="pagina-acoes"><Button onClick={() => setNovo(true)}>Novo atendimento</Button></div>
      </div>

      {q.isLoading && <p className="muted" role="status">Carregando os atendimentos…</p>}
      {q.isError && <Panel><ErrorState onRetry={() => q.refetch()} /></Panel>}
      {q.isSuccess && q.data.length === 0 && (
        <Panel><Empty title="Nenhum atendimento ainda." action={<Button onClick={() => setNovo(true)}>Incluir o primeiro</Button>}>Inclua aqui cada pessoa que chamar no WhatsApp, Instagram ou telefone, para ninguém ficar sem resposta.</Empty></Panel>
      )}
      {q.isSuccess && q.data.length > 0 && <>
        <div className="etapas-abas" role="tablist" aria-label="Etapas do atendimento">
          {ETAPAS_ABERTAS.map((e) => (
            <button key={e} type="button" role="tab" className="etapa-aba" aria-selected={aba === e} data-vazia={cols[e].length === 0 ? 'true' : undefined} onClick={() => setAba(e)}>
              {nomeEtapaLead(e)} <span className="etapa-aba-n">{cols[e].length}</span>
            </button>
          ))}
        </div>
        <div className="quadro quadro-3" role="region" aria-label="Quadro de atendimentos" tabIndex={0}>
          {ETAPAS_ABERTAS.map((e) => (
            <section key={e} className="coluna" data-ativa={aba === e ? 'true' : undefined} data-alvo={alvo === e ? 'true' : undefined} aria-label={`${nomeEtapaLead(e)}: ${cols[e].length}`}
              onDragOver={(ev) => { ev.preventDefault(); setAlvo(e) }} onDragLeave={() => setAlvo(null)} onDrop={(ev) => soltar(ev, e)}>
              <h2 className="coluna-titulo"><span>{nomeEtapaLead(e)}</span><span className="coluna-n">{cols[e].length}</span></h2>
              <ul className="coluna-lista">{cols[e].map((l) => <CartaoLead key={l.id} l={l} hoje={hoje} equipe={nomes} aoEditar={setEditar} aoMover={pedir} />)}</ul>
              {cols[e].length === 0 && <p className="coluna-vazia">Ninguém nesta etapa.</p>}
            </section>
          ))}
        </div>
        {encerrados.length > 0 && (
          <Panel title="Encerrados nos últimos 60 dias" labelId="ld-fechados">
            <div className="hv-panel-body"><Button size="sm" variant="ghost" aria-expanded={fechados} onClick={() => setFechados(!fechados)}>{fechados ? 'Esconder' : `Ver ${encerrados.length}`}</Button></div>
            {fechados && <ul className="fin-lista">{encerrados.map((l) => (
              <li key={l.id} className="fin-linha"><div className="fin-texto"><span className="fin-titulo">{l.nome}</span>
                <span className="fin-sub">{nomeEtapaLead(l.etapa)}{l.motivoPerda ? ` · ${l.motivoPerda}` : ''}{l.origem ? ` · ${l.origem}` : ''}</span></div></li>
            ))}</ul>}
          </Panel>
        )}
      </>}

      <LeadDialog lead={editar} aberto={novo || !!editar} aoFechar={() => { setNovo(false); setEditar(null) }} />
      <ConverterDialog lead={converter} aoFechar={() => setConverter(null)} />
      <PerdidoDialog lead={perdido} aoFechar={() => setPerdido(null)} />
    </div>
  )
}
