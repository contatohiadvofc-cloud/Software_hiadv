import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { ETAPAS, MODELOS, NOMES_FUNCAO, NOMES_STATUS_VAGA, agruparPorEtapa, linkVaga, listaDeTexto, nomeEtapa, salarioTela, textoDivulgacao, validarVaga, vagaVazia,
  type Candidatura, type DadosVaga, type Etapa, type Funcao, type StatusVaga, type Vaga } from '../data/recrutamento'
import { linkWhatsapp, telefoneTela } from '../data/clientes'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'
import { Badge } from '../design/components/Badge'
import { Button } from '../design/components/Button'
import { Dialog } from '../design/components/Dialog'
import { Field } from '../design/components/Field'
import { useToast } from '../design/components/Toast'

const tomStatus = (s: StatusVaga) => (s === 'aberta' ? 'success' : s === 'pausada' ? 'warning' : 'neutral') as 'success' | 'warning' | 'neutral'
const origem = () => (typeof window !== 'undefined' ? window.location.origin : 'https://hiadv.com.br')

function Lista({ rotulo, valor, aoMudar, dica }: { rotulo: string; valor: string[]; aoMudar: (v: string[]) => void; dica?: string }) {
  const [txt, setTxt] = useState(valor.join('\n'))
  return (
    <label className="adm-campo rh-lista"><span>{rotulo}{dica && <small className="muted"> · {dica}</small>}</span>
      <textarea className="hv-input" rows={3} value={txt} onChange={(e) => { setTxt(e.target.value); aoMudar(listaDeTexto(e.target.value)) }} />
    </label>
  )
}

function EditorVaga({ inicial, aoFechar }: { inicial: (DadosVaga & { id?: string }) | null; aoFechar: () => void }) {
  const api = useApi(); const qc = useQueryClient(); const toast = useToast()
  const [v, setV] = useState<DadosVaga & { id?: string }>(() => inicial ?? vagaVazia())
  const [erro, setErro] = useState<string | null>(null)
  const [chave, setChave] = useState(0)
  const salvar = useMutation({ mutationFn: () => api.vagaSalvar(v), onSuccess: () => { toast('Vaga salva.'); qc.invalidateQueries({ queryKey: ['vagas'] }); aoFechar() }, onError: (e) => setErro((e as Error).message) })
  const trocarFuncao = (f: Funcao) => {
    const m = MODELOS[f]
    // só preenche com o modelo o que ainda está vazio ou igual ao modelo anterior, para não apagar o que o gestor escreveu
    const anterior = MODELOS[v.funcao]
    const igual = (a: string[], b: string[]) => a.join('|') === b.join('|')
    setV({ ...v, funcao: f, titulo: !v.titulo || v.titulo === anterior.titulo ? m.titulo : v.titulo,
      atividades: !v.atividades.length || igual(v.atividades, anterior.atividades) ? [...m.atividades] : v.atividades,
      requisitos: !v.requisitos.length || igual(v.requisitos, anterior.requisitos) ? [...m.requisitos] : v.requisitos,
      diferenciais: !v.diferenciais.length || igual(v.diferenciais, anterior.diferenciais) ? [...m.diferenciais] : v.diferenciais,
      perguntas: !v.perguntas.length || igual(v.perguntas, anterior.perguntas) ? [...m.perguntas] : v.perguntas })
    setChave((k) => k + 1)
  }
  function enviar(e: FormEvent) { e.preventDefault(); const m = validarVaga(v); setErro(m); if (!m) salvar.mutate() }
  return (
    <form className="rh-form" onSubmit={enviar} noValidate>
      <div className="rh-duas">
        <label className="adm-campo"><span>Função</span>
          <select className="hv-input" value={v.funcao} onChange={(e) => trocarFuncao(e.target.value as Funcao)}>
            {(Object.keys(NOMES_FUNCAO) as Funcao[]).map((f) => <option key={f} value={f}>{NOMES_FUNCAO[f]}</option>)}
          </select>
        </label>
        <Field label="Cargo" maxLength={100} value={v.titulo} onChange={(e) => setV({ ...v, titulo: e.target.value })} />
      </div>
      <div className="rh-tres">
        <label className="adm-campo"><span>Regime</span>
          <select className="hv-input" value={v.regime} onChange={(e) => setV({ ...v, regime: e.target.value })}>{['CLT', 'Estágio', 'PJ', 'Associado', 'Temporário'].map((x) => <option key={x}>{x}</option>)}</select>
        </label>
        <label className="adm-campo"><span>Modalidade</span>
          <select className="hv-input" value={v.modalidade} onChange={(e) => setV({ ...v, modalidade: e.target.value })}>{['Remoto', 'Presencial', 'Híbrido'].map((x) => <option key={x}>{x}</option>)}</select>
        </label>
        <Field label="Vagas" type="number" min={1} max={50} inputMode="numeric" value={v.quantidade} onChange={(e) => setV({ ...v, quantidade: Number(e.target.value) || 1 })} />
      </div>
      <div className="rh-duas">
        <Field label="Jornada" maxLength={80} value={v.jornada} onChange={(e) => setV({ ...v, jornada: e.target.value })} />
        <Field label={v.modalidade === 'Remoto' ? 'Cidade (opcional)' : 'Cidade'} maxLength={80} value={v.cidade} onChange={(e) => setV({ ...v, cidade: e.target.value })} />
      </div>
      <div className="rh-tres">
        <Field label="Salário (R$)" inputMode="decimal" placeholder="2300,00" value={v.salario === null ? '' : String(v.salario).replace('.', ',')}
          onChange={(e) => { const t = e.target.value.replace(/[^\d,]/g, '').replace(',', '.'); setV({ ...v, salario: t === '' ? null : Number(t) }) }} />
        <Field label="Complemento do salário" maxLength={120} placeholder="+ bonificação por meta" value={v.salarioObs} onChange={(e) => setV({ ...v, salarioObs: e.target.value })} />
        <Field label="Inscrições até" type="date" value={v.inscricoesAte ?? ''} onChange={(e) => setV({ ...v, inscricoesAte: e.target.value || null })} />
      </div>
      <label className="alternar"><input type="checkbox" checked={v.mostrarSalario} onChange={(e) => setV({ ...v, mostrarSalario: e.target.checked })} /> Mostrar o salário na página da vaga</label>
      <div key={chave} className="rh-listas">
        <Lista rotulo="Benefícios" dica="um por linha" valor={v.beneficios} aoMudar={(x) => setV((a) => ({ ...a, beneficios: x }))} />
        <Lista rotulo="O que a pessoa vai fazer" valor={v.atividades} aoMudar={(x) => setV((a) => ({ ...a, atividades: x }))} />
        <Lista rotulo="Requisitos" valor={v.requisitos} aoMudar={(x) => setV((a) => ({ ...a, requisitos: x }))} />
        <Lista rotulo="Diferenciais" valor={v.diferenciais} aoMudar={(x) => setV((a) => ({ ...a, diferenciais: x }))} />
        <Lista rotulo="Perguntas para o candidato" dica="resposta obrigatória" valor={v.perguntas} aoMudar={(x) => setV((a) => ({ ...a, perguntas: x }))} />
      </div>
      <p className="muted sm">A página pública não pede idade, foto, estado civil, endereço nem dados de saúde.</p>
      {erro && <p className="ad-erro" role="alert">{erro}</p>}
      <div className="rh-acoes"><Button variant="secondary" onClick={aoFechar}>Cancelar</Button><Button type="submit" loading={salvar.isPending}>Salvar vaga</Button></div>
    </form>
  )
}

function CartaoCandidato({ c, gestor, aoAbrir, aoArrastar }: { c: Candidatura; gestor: boolean; aoAbrir: () => void; aoArrastar: (id: string | null) => void }) {
  return (
    <li className="rh-card" draggable={gestor} onDragStart={() => aoArrastar(c.id)} onDragEnd={() => aoArrastar(null)}>
      <button type="button" className="rh-card-abrir" onClick={aoAbrir}>
        <strong>{c.nome}</strong>
        <span className="muted sm">{[c.cidade, c.uf].filter(Boolean).join('/') || 'Cidade não informada'}</span>
        <span className="rh-card-pe">{c.nota ? <span aria-label={`Nota ${c.nota} de 5`}>{'★'.repeat(c.nota)}{'☆'.repeat(5 - c.nota)}</span> : <span className="muted sm">Sem nota</span>}
          {c.curriculoPath && <Badge tone="info">CV</Badge>}</span>
      </button>
    </li>
  )
}

function FichaCandidato({ c, perguntas, gestor, aoFechar }: { c: Candidatura; perguntas: string[]; gestor: boolean; aoFechar: () => void }) {
  const api = useApi(); const qc = useQueryClient(); const toast = useToast()
  const [obs, setObs] = useState(c.obs ?? '')
  const [apagar, setApagar] = useState(false)
  const ok = (m: string) => { toast(m); qc.invalidateQueries({ queryKey: ['candidaturas'] }); qc.invalidateQueries({ queryKey: ['vagas'] }) }
  const erro = (e: unknown) => toast((e as Error).message, 'danger')
  const mudar = useMutation({ mutationFn: (m: { etapa?: Etapa; nota?: number; obs?: string }) => api.candidaturaAtualizar(c.id, m), onSuccess: () => ok('Candidato atualizado.'), onError: erro })
  const remover = useMutation({ mutationFn: () => api.candidaturaApagar(c.id), onSuccess: () => { ok('Candidatura apagada.'); aoFechar() }, onError: erro })
  const cv = useMutation({ mutationFn: () => api.curriculoLink(c.curriculoPath!), onSuccess: (u) => window.open(u, '_blank', 'noopener'), onError: erro })
  const wa = linkWhatsapp(c.whatsapp)
  return (
    <div className="rh-ficha">
      <p className="muted">{c.email} · {telefoneTela(c.whatsapp)}{c.cidade ? ` · ${c.cidade}${c.uf ? `/${c.uf}` : ''}` : ''}</p>
      <div className="rh-acoes rh-acoes-esq">
        {wa && <a className="hv-btn" data-variant="secondary" data-size="sm" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
        <a className="hv-btn" data-variant="secondary" data-size="sm" href={`mailto:${c.email}`}>E-mail</a>
        {c.linkedin && <a className="hv-btn" data-variant="secondary" data-size="sm" href={c.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>}
        {c.curriculoPath && <Button variant="secondary" size="sm" loading={cv.isPending} onClick={() => cv.mutate()}>Abrir currículo</Button>}
      </div>
      {perguntas.length > 0 && (
        <dl className="rh-respostas">{perguntas.map((p, i) => <div key={i}><dt>{p}</dt><dd>{c.respostas[String(i)] || <span className="muted">Sem resposta</span>}</dd></div>)}</dl>
      )}
      {gestor ? (
        <>
          <div className="rh-duas">
            <label className="adm-campo"><span>Etapa</span>
              <select className="hv-input" value={c.etapa} onChange={(e) => mudar.mutate({ etapa: e.target.value as Etapa })}>
                {ETAPAS.filter((e) => e.id !== 'banco' || c.bancoTalentos || c.etapa === 'banco').map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </label>
            <fieldset className="rh-nota"><legend>Nota</legend>
              {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-pressed={c.nota === n} aria-label={`Nota ${n}`} onClick={() => mudar.mutate({ nota: n })}>{n <= (c.nota ?? 0) ? '★' : '☆'}</button>)}
            </fieldset>
          </div>
          <label className="adm-campo"><span>Anotação interna</span>
            <textarea className="hv-input" rows={3} maxLength={1000} value={obs} onChange={(e) => setObs(e.target.value)} onBlur={() => { if (obs !== (c.obs ?? '')) mudar.mutate({ obs }) }} />
          </label>
          {!c.bancoTalentos && <p className="muted sm">Não aceitou ficar no banco de talentos: os dados saem do sistema 6 meses após a inscrição.</p>}
          {!apagar ? <Button variant="ghost" size="sm" onClick={() => setApagar(true)}>Apagar a pedido do candidato</Button> : (
            <div className="rh-confirma" role="alert"><span>Apagar {c.nome} e o currículo? Não dá para desfazer.</span>
              <Button variant="secondary" size="sm" onClick={() => setApagar(false)}>Cancelar</Button>
              <Button variant="danger" size="sm" loading={remover.isPending} onClick={() => remover.mutate()}>Confirmar</Button></div>
          )}
        </>
      ) : <p className="muted">Etapa: {nomeEtapa(c.etapa)}. Só o gestor move candidatos.</p>}
    </div>
  )
}

function Funil({ vaga, gestor }: { vaga: Vaga; gestor: boolean }) {
  const api = useApi(); const qc = useQueryClient(); const toast = useToast()
  const q = useQuery({ queryKey: ['candidaturas', vaga.id], queryFn: () => api.candidaturas(vaga.id) })
  const [aberto, setAberto] = useState<string | null>(null)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const grupos = useMemo(() => agruparPorEtapa(q.data ?? []), [q.data])
  const mover = useMutation({ mutationFn: (m: { id: string; etapa: Etapa }) => api.candidaturaAtualizar(m.id, { etapa: m.etapa }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['candidaturas'] }); qc.invalidateQueries({ queryKey: ['vagas'] }) }, onError: (e) => toast((e as Error).message, 'danger') })
  const atual = (q.data ?? []).find((c) => c.id === aberto) ?? null
  if (q.isLoading) return <p className="muted" role="status">Carregando candidatos…</p>
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />
  if (!q.data?.length) return <Empty title="Nenhuma inscrição ainda.">{vaga.status === 'aberta' ? 'Divulgue o link da vaga: as inscrições aparecem aqui em cards.' : 'Publique a vaga para começar a receber inscrições.'}</Empty>
  return (
    <>
      <div className="rh-funil" role="list" aria-label="Etapas do funil">
        {ETAPAS.map((e) => (
          <section key={e.id} role="listitem" className="rh-coluna" aria-label={`${e.nome}: ${grupos[e.id].length}`}
            onDragOver={(ev) => { if (gestor && arrastando) ev.preventDefault() }}
            onDrop={(ev) => { ev.preventDefault(); if (gestor && arrastando) { mover.mutate({ id: arrastando, etapa: e.id }); setArrastando(null) } }}>
            <h3>{e.nome} <span className="muted">{grupos[e.id].length}</span></h3>
            <ul>{grupos[e.id].map((c) => (
              <CartaoCandidato key={c.id} c={c} gestor={gestor} aoAbrir={() => setAberto(c.id)} aoArrastar={setArrastando} />
            ))}</ul>
          </section>
        ))}
      </div>
      <Dialog open={!!atual} onOpenChange={(v) => { if (!v) setAberto(null) }} title={atual?.nome ?? 'Candidato'} variant="painel">
        {atual && <FichaCandidato c={atual} perguntas={vaga.perguntas} gestor={gestor} aoFechar={() => setAberto(null)} />}
      </Dialog>
    </>
  )
}

function CartaoVaga({ v, gestor, escritorio, ativa, aoAbrir, aoEditar }: { v: Vaga; gestor: boolean; escritorio: string; ativa: boolean; aoAbrir: () => void; aoEditar: () => void }) {
  const api = useApi(); const qc = useQueryClient(); const toast = useToast()
  const link = linkVaga(origem(), v.escritorioSlug, v.slug)
  const status = useMutation({ mutationFn: (s: StatusVaga) => api.vagaStatus(v.id, s), onSuccess: () => { toast('Vaga atualizada.'); qc.invalidateQueries({ queryKey: ['vagas'] }) }, onError: (e) => toast((e as Error).message, 'danger') })
  const copiar = async (t: string, m: string) => { try { await navigator.clipboard.writeText(t); toast(m) } catch { toast('Não foi possível copiar. Selecione e copie manualmente.', 'danger') } }
  return (
    <li className="rh-vaga" data-ativa={ativa || undefined}>
      <button type="button" className="rh-vaga-abrir" onClick={aoAbrir} aria-expanded={ativa}>
        <span className="rh-vaga-topo"><strong>{v.titulo}</strong><Badge tone={tomStatus(v.status)}>{NOMES_STATUS_VAGA[v.status]}</Badge></span>
        <span className="muted sm">{[NOMES_FUNCAO[v.funcao], v.regime, v.modalidade, v.mostrarSalario && v.salario !== null ? salarioTela(v.salario) : null].filter(Boolean).join(' · ')}</span>
        <span className="sm">{v.total} {v.total === 1 ? 'inscrição' : 'inscrições'}{v.novos ? ` · ${v.novos} ${v.novos === 1 ? 'nova' : 'novas'}` : ''}</span>
      </button>
      {gestor && (
        <div className="rh-acoes rh-acoes-esq">
          <Button variant="secondary" size="sm" onClick={aoEditar}>Editar</Button>
          {v.status !== 'aberta' && v.status !== 'encerrada' && <Button size="sm" loading={status.isPending} onClick={() => status.mutate('aberta')}>Publicar</Button>}
          {v.status === 'aberta' && <Button variant="secondary" size="sm" onClick={() => status.mutate('pausada')}>Pausar</Button>}
          {v.status !== 'encerrada' && v.status !== 'rascunho' && <Button variant="ghost" size="sm" onClick={() => status.mutate('encerrada')}>Encerrar</Button>}
          {v.status === 'encerrada' && <Button variant="secondary" size="sm" onClick={() => status.mutate('aberta')}>Reabrir</Button>}
          {link && v.status === 'aberta' && <>
            <Button variant="secondary" size="sm" onClick={() => copiar(link, 'Link copiado.')}>Copiar link</Button>
            <Button variant="secondary" size="sm" onClick={() => copiar(textoDivulgacao(v, escritorio, link), 'Texto para as redes copiado.')}>Copiar texto para as redes</Button>
            <a className="hv-btn" data-variant="ghost" data-size="sm" href={link} target="_blank" rel="noopener noreferrer">Ver página</a>
          </>}
        </div>
      )}
    </li>
  )
}

/** Vagas do escritório e o funil de candidatos. A equipe vê; quem cria, publica e move candidatos é o gestor. */
export function Recrutamento() {
  const api = useApi()
  const { perfil } = useSessao()
  const gestor = perfil?.papel === 'master' || !!perfil?.code
  const q = useQuery({ queryKey: ['vagas'], queryFn: () => api.vagas(), enabled: !!perfil })
  const [ativa, setAtiva] = useState<string | null>(null)
  const [editando, setEditando] = useState<(DadosVaga & { id?: string }) | null | 'nova'>(null)
  const vagas = q.data ?? []
  const vaga = vagas.find((v) => v.id === ativa) ?? null
  const escritorio = perfil?.escritorioNome ?? 'nosso escritório'
  return (
    <div className="pagina">
      <div className="pagina-cabeca">
        <div><h1>Recrutamento</h1><p className="muted">Vagas, página pública com inscrição e os candidatos em cards por etapa.</p></div>
        {gestor && <Button onClick={() => setEditando('nova')}>Nova vaga</Button>}
      </div>
      {q.isLoading && <p className="muted" role="status">Carregando…</p>}
      {q.isError && <Panel><ErrorState onRetry={() => q.refetch()} /></Panel>}
      {q.isSuccess && vagas.length === 0 && (
        <Panel><Empty title="Nenhuma vaga criada.">{gestor ? 'Toque em Nova vaga: o HiAdv já sugere atividades, requisitos e perguntas da função.' : 'Quando o gestor abrir uma vaga, ela aparece aqui.'}</Empty></Panel>
      )}
      {vagas.length > 0 && (
        <Panel title="Vagas"><ul className="rh-vagas">{vagas.map((v) => (
          <CartaoVaga key={v.id} v={v} gestor={gestor} escritorio={escritorio} ativa={v.id === ativa} aoAbrir={() => setAtiva(v.id === ativa ? null : v.id)}
            aoEditar={() => setEditando({ ...v })} />
        ))}</ul></Panel>
      )}
      {vaga && <Panel title={`Candidatos · ${vaga.titulo}`}><Funil vaga={vaga} gestor={gestor} /></Panel>}
      <Dialog open={editando !== null} onOpenChange={(v) => { if (!v) setEditando(null) }} title={editando && editando !== 'nova' && editando.id ? 'Editar vaga' : 'Nova vaga'} variant="painel">
        {editando !== null && <EditorVaga inicial={editando === 'nova' ? null : editando} aoFechar={() => setEditando(null)} />}
      </Dialog>
    </div>
  )
}
