import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { PLANOS, type PlanoId } from '../data/adesao'
import { NOMES_SITUACAO, acimaDoLimite, nomeRecurso, validarNovo, type AssinaturaForm, type EscritorioCentral, type NovoEscritorio, type Situacao } from '../data/central'
import { dataTela } from '../data/publicacoes'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'
import { Badge } from '../design/components/Badge'
import { Button } from '../design/components/Button'
import { useToast } from '../design/components/Toast'

const nomePlano = (id: PlanoId | null) => (id ? PLANOS.find((p) => p.id === id)?.nome ?? id : 'Sem plano (tudo aberto)')
const tom = (s: Situacao | null) => (s === 'ativo' ? 'success' : s === 'teste' ? 'info' : s === 'atraso' ? 'warning' : 'neutral') as 'success' | 'info' | 'warning' | 'neutral'

function formDe(e: EscritorioCentral): AssinaturaForm {
  return { plano: e.plano ?? 'premium', situacao: e.situacao ?? 'ativo', fundador: e.fundador, testeAte: e.testeAte ?? '', pagoAte: e.pagoAte ?? '', obs: e.obs ?? '', masters: '', colaboradores: '', oabs: '', iaMensal: '' }
}

function Assinatura({ e }: { e: EscritorioCentral }) {
  const api = useApi(); const qc = useQueryClient(); const toast = useToast()
  const [f, setF] = useState<AssinaturaForm>(() => formDe(e))
  useEffect(() => setF(formDe(e)), [e])
  const salvar = useMutation({
    mutationFn: () => api.centralAssinatura(e.id, f),
    onSuccess: () => { toast('Plano salvo.'); qc.invalidateQueries({ queryKey: ['central'] }) },
    onError: (x) => toast((x as Error).message, 'danger'),
  })
  const campo = (k: keyof AssinaturaForm) => (ev: { target: { value: string } }) => setF({ ...f, [k]: ev.target.value })
  return (
    <form className="ct-form" onSubmit={(ev) => { ev.preventDefault(); salvar.mutate() }}>
      <label className="adm-campo"><span>Plano</span>
        <select className="hv-input" value={f.plano} onChange={campo('plano')}>{PLANOS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
      <label className="adm-campo"><span>Situação</span>
        <select className="hv-input" value={f.situacao} onChange={campo('situacao')}>{(Object.keys(NOMES_SITUACAO) as Situacao[]).map((s) => <option key={s} value={s}>{NOMES_SITUACAO[s]}</option>)}</select></label>
      <label className="adm-campo"><span>Teste até</span><input className="hv-input" type="date" value={f.testeAte} onChange={campo('testeAte')} /></label>
      <label className="adm-campo"><span>Pago até</span><input className="hv-input" type="date" value={f.pagoAte} onChange={campo('pagoAte')} /></label>
      <label className="alternar"><input type="checkbox" checked={f.fundador} onChange={(ev) => setF({ ...f, fundador: ev.target.checked })} /> Fundador</label>
      <details className="ct-limites">
        <summary>Limites diferentes do plano</summary>
        <div className="ct-form">
          {([['masters', 'Masters'], ['colaboradores', 'Colaboradores'], ['oabs', 'OABs'], ['iaMensal', 'Usos de IA por mês']] as const).map(([k, rot]) => (
            <label key={k} className="adm-campo"><span>{rot}</span><input className="hv-input" type="number" min={0} max={10000} inputMode="numeric" placeholder="do plano" value={f[k]} onChange={campo(k)} /></label>
          ))}
        </div>
      </details>
      <label className="adm-campo ct-obs"><span>Anotação interna</span><input className="hv-input" maxLength={500} value={f.obs} onChange={campo('obs')} /></label>
      <Button type="submit" loading={salvar.isPending}>Salvar plano</Button>
    </form>
  )
}

function Detalhe({ e }: { e: EscritorioCentral }) {
  const api = useApi(); const qc = useQueryClient(); const toast = useToast()
  const q = useQuery({ queryKey: ['central', e.id], queryFn: () => api.centralEscritorio(e.id) })
  const [validade, setValidade] = useState('')
  const ok = (m: string) => { toast(m); qc.invalidateQueries({ queryKey: ['central'] }) }
  const erro = (x: unknown) => toast((x as Error).message, 'danger')
  const ajuste = useMutation({ mutationFn: (v: { r: string; valor: 'plano' | 'liberado' | 'bloqueado' }) => api.centralAjuste(e.id, v.r, v.valor, v.valor === 'plano' ? null : validade || null), onSuccess: () => ok('Recurso ajustado.'), onError: erro })
  const pessoa = useMutation({ mutationFn: (v: { email: string; r: string; bloquear: boolean }) => api.pessoaAjuste(e.id, v.email, v.r, v.bloquear, null), onSuccess: () => ok('Acesso da pessoa ajustado.'), onError: erro })
  if (q.isLoading) return <p className="muted" role="status">Carregando…</p>
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />
  const d = q.data
  const valorDe = (r: string) => d.ajustes.find((a) => a.recurso === r)?.valor ?? 'plano'
  const liberados = d.recursos.filter((r) => r.liberado).map((r) => r.recurso)
  return (
    <div className="ct-detalhe">
      <section aria-labelledby={`ct-pl-${e.id}`}><h3 id={`ct-pl-${e.id}`}>Plano e pagamento</h3><Assinatura e={e} /></section>
      <section aria-labelledby={`ct-rc-${e.id}`}>
        <h3 id={`ct-rc-${e.id}`}>Recursos do escritório</h3>
        <p className="muted">O plano define o padrão. Liberar ou bloquear aqui vale por cima dele{validade ? `, até ${dataTela(validade)}` : ''}.</p>
        <label className="adm-campo ct-validade"><span>Validade dos próximos ajustes (opcional)</span><input className="hv-input" type="date" value={validade} onChange={(ev) => setValidade(ev.target.value)} /></label>
        <ul className="ct-recursos">
          {d.recursos.map((r) => {
            const aj = d.ajustes.find((a) => a.recurso === r.recurso)
            return (
              <li key={r.recurso}>
                <span className="ct-rec-nome">{nomeRecurso(r.recurso)}
                  <small>{r.liberado ? 'Liberado' : 'Fechado'}{aj ? ` por ajuste${aj.validoAte ? ` até ${dataTela(aj.validoAte)}` : ''}` : r.noPlano ? ' pelo plano' : ' (fora do plano)'}</small></span>
                <select className="hv-input" aria-label={`Ajuste de ${nomeRecurso(r.recurso)}`} value={valorDe(r.recurso)} onChange={(ev) => ajuste.mutate({ r: r.recurso, valor: ev.target.value as 'plano' | 'liberado' | 'bloqueado' })}>
                  <option value="plano">Segue o plano</option><option value="liberado">Liberado</option><option value="bloqueado">Bloqueado</option>
                </select>
              </li>
            )
          })}
        </ul>
      </section>
      <section aria-labelledby={`ct-ps-${e.id}`}>
        <h3 id={`ct-ps-${e.id}`}>Pessoas</h3>
        <p className="muted">Uma pessoa nunca recebe o que o escritório não tem; aqui dá para fechar um recurso só para ela.</p>
        {d.pessoas.length === 0 && <p className="muted">Ninguém cadastrado ainda.</p>}
        <ul className="ct-pessoas">
          {d.pessoas.map((p) => (
            <li key={p.email}>
              <span className="ct-rec-nome">{p.nome}<small>{p.email} · {p.papel === 'master' ? 'Gestor Master' : p.papel === 'parceiro' ? 'Parceiro' : 'Colaborador'}</small></span>
              <div className="ct-bloqueios">
                {p.bloqueios.map((b) => (
                  <button key={b.recurso} type="button" className="ct-chip" onClick={() => pessoa.mutate({ email: p.email, r: b.recurso, bloquear: false })} aria-label={`Devolver ${nomeRecurso(b.recurso)} para ${p.nome}`}>
                    {nomeRecurso(b.recurso)} fechado <span aria-hidden="true">×</span>
                  </button>
                ))}
                <select className="hv-input" aria-label={`Fechar um recurso para ${p.nome}`} value="" onChange={(ev) => { if (ev.target.value) pessoa.mutate({ email: p.email, r: ev.target.value, bloquear: true }) }}>
                  <option value="">Fechar um recurso…</option>
                  {liberados.filter((r) => !p.bloqueios.some((b) => b.recurso === r)).map((r) => <option key={r} value={r}>{nomeRecurso(r)}</option>)}
                </select>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby={`ct-hs-${e.id}`}>
        <h3 id={`ct-hs-${e.id}`}>Histórico</h3>
        {d.historico.length === 0 ? <p className="muted">Nenhuma mudança registrada.</p> : (
          <ul className="ct-historico">{d.historico.map((h, i) => <li key={i}><span>{dataTela(h.quando.slice(0, 10))}</span> {h.acao} <small>· {h.quem}</small></li>)}</ul>
        )}
      </section>
    </div>
  )
}

function ConfigGoogleForm() {
  const api = useApi(); const qc = useQueryClient(); const toast = useToast()
  const q = useQuery({ queryKey: ['config-google'], queryFn: () => api.configGoogle() })
  const [f, setF] = useState({ clientId: '', apiKey: '', appId: '' })
  const salvar = useMutation({
    mutationFn: () => api.configGoogleSalvar(f),
    onSuccess: () => { toast('Configuração do Google salva.'); setF({ clientId: '', apiKey: '', appId: '' }); qc.invalidateQueries({ queryKey: ['config-google'] }) },
    onError: (x) => toast((x as Error).message, 'danger'),
  })
  return (
    <form className="ct-form" onSubmit={(ev) => { ev.preventDefault(); salvar.mutate() }}>
      <p className="muted ct-obs">{q.data?.cfg ? `Configurado (projeto ${q.data.cfg.appId}). Preencha de novo só para trocar.` : 'Ainda não configurado: o Drive fica indisponível para todos os escritórios.'} São identificadores públicos do app do HiAdv no Google Cloud, não senhas.</p>
      <label className="adm-campo ct-obs"><span>ID do cliente OAuth</span><input className="hv-input" maxLength={200} placeholder="...apps.googleusercontent.com" value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value })} /></label>
      <label className="adm-campo"><span>Chave de API (restrita a hiadv.com.br)</span><input className="hv-input" maxLength={200} placeholder="AIza..." value={f.apiKey} onChange={(e) => setF({ ...f, apiKey: e.target.value })} /></label>
      <label className="adm-campo"><span>Número do projeto</span><input className="hv-input" inputMode="numeric" maxLength={20} value={f.appId} onChange={(e) => setF({ ...f, appId: e.target.value })} /></label>
      <Button type="submit" variant="secondary" loading={salvar.isPending}>Salvar configuração</Button>
    </form>
  )
}

const NOVO: NovoEscritorio = { nome: '', cidade: '', oab: '', masterNome: '', masterEmail: '', plano: 'premium', fundador: false }

function NovoEscritorioForm({ aoCriar }: { aoCriar: (id: string) => void }) {
  const api = useApi(); const qc = useQueryClient(); const toast = useToast()
  const [n, setN] = useState<NovoEscritorio>(NOVO)
  const [erro, setErro] = useState<string | null>(null)
  const criar = useMutation({
    mutationFn: () => api.centralNovo(n),
    onSuccess: (id) => { toast('Escritório criado. O Gestor Master entra pelo "Primeiro acesso".'); setN(NOVO); qc.invalidateQueries({ queryKey: ['central'] }); aoCriar(id) },
    onError: (x) => setErro((x as Error).message),
  })
  const campo = (k: keyof NovoEscritorio) => (ev: { target: { value: string } }) => setN({ ...n, [k]: ev.target.value })
  return (
    <form className="ct-form" onSubmit={(ev) => { ev.preventDefault(); const e = validarNovo(n); setErro(e); if (!e) criar.mutate() }} noValidate>
      <label className="adm-campo"><span>Nome do escritório</span><input className="hv-input" maxLength={160} value={n.nome} onChange={campo('nome')} /></label>
      <label className="adm-campo"><span>Cidade/UF</span><input className="hv-input" maxLength={80} value={n.cidade} onChange={campo('cidade')} /></label>
      <label className="adm-campo"><span>OAB do Gestor Master</span><input className="hv-input" maxLength={20} placeholder="OAB/SC 00.000" value={n.oab} onChange={campo('oab')} /></label>
      <label className="adm-campo"><span>Nome do Gestor Master</span><input className="hv-input" maxLength={120} value={n.masterNome} onChange={campo('masterNome')} /></label>
      <label className="adm-campo"><span>E-mail do Gestor Master</span><input className="hv-input" type="email" maxLength={160} value={n.masterEmail} onChange={campo('masterEmail')} /></label>
      <label className="adm-campo"><span>Plano</span>
        <select className="hv-input" value={n.plano} onChange={campo('plano')}>{PLANOS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
      <label className="alternar"><input type="checkbox" checked={n.fundador} onChange={(ev) => setN({ ...n, fundador: ev.target.checked })} /> Fundador (60 dias de teste)</label>
      {erro && <p className="hv-error" role="alert">{erro}</p>}
      <Button type="submit" loading={criar.isPending}>Criar escritório</Button>
    </form>
  )
}

/** Central HiAdv: o Deividy escolhe o plano de cada escritório e libera ou fecha recursos, para o escritório ou para uma pessoa. */
export function Central() {
  const api = useApi()
  const { perfil } = useSessao()
  const code = perfil?.papel === 'code'
  const q = useQuery({ queryKey: ['central'], queryFn: () => api.centralEscritorios(), enabled: !!perfil && code })
  const [aberto, setAberto] = useState<string | null>(null)
  const [novo, setNovo] = useState(false)
  if (perfil && !code) return <div className="pagina"><Panel><Empty title="Esta tela é da administração do HiAdv." /></Panel></div>
  return (
    <div className="pagina">
      <div className="pagina-cabeca">
        <div><h1>Central HiAdv</h1><p className="muted">Plano, pagamento e recursos de cada escritório. Tudo o que muda aqui fica no histórico.</p></div>
        <Button variant="secondary" onClick={() => setNovo(!novo)} aria-expanded={novo}>{novo ? 'Fechar' : 'Novo escritório'}</Button>
      </div>
      {novo && <Panel title="Novo escritório" labelId="ct-novo"><div className="hv-panel-body"><NovoEscritorioForm aoCriar={(id) => { setNovo(false); setAberto(id) }} /></div></Panel>}
      {q.isLoading && <p className="muted" role="status">Carregando…</p>}
      {q.isError && <Panel><ErrorState onRetry={() => q.refetch()} /></Panel>}
      {q.isSuccess && q.data.length === 0 && <Panel><Empty title="Nenhum escritório ainda." /></Panel>}
      {q.data && q.data.length > 0 && (
        <Panel>
          <ul className="ct-lista">
            {q.data.map((e) => {
              const acima = acimaDoLimite(e)
              return (
                <li key={e.id} className="ct-item">
                  <button type="button" className="ct-cabeca" aria-expanded={aberto === e.id} onClick={() => setAberto(aberto === e.id ? null : e.id)}>
                    <span className="fin-texto">
                      <span className="fin-titulo">{e.nome}</span>
                      <span className="fin-sub">{[e.cidade, nomePlano(e.plano), e.fundador ? 'fundador' : null,
                        e.situacao === 'teste' && e.testeAte ? `teste até ${dataTela(e.testeAte)}` : null,
                        e.pagoAte ? `pago até ${dataTela(e.pagoAte)}` : null].filter(Boolean).join(' · ')}</span>
                      <span className="fin-sub">{e.uso.masters} Master · {e.uso.colaboradores} colaboradores · {e.uso.oabs} OAB{e.uso.iaMes ? ` · IA ${e.uso.iaMes} no mês` : ''}{e.ajustes ? ` · ${e.ajustes} ajuste${e.ajustes > 1 ? 's' : ''}` : ''}</span>
                      {acima.length > 0 && <span className="ct-acima">Acima do plano: {acima.join(', ')}</span>}
                    </span>
                    {e.situacao && <Badge tone={tom(e.situacao)}>{NOMES_SITUACAO[e.situacao]}</Badge>}
                  </button>
                  {aberto === e.id && <Detalhe e={e} />}
                </li>
              )
            })}
          </ul>
        </Panel>
      )}
      <Panel title="Google Drive do HiAdv" labelId="ct-google"><div className="hv-panel-body"><ConfigGoogleForm /></div></Panel>
    </div>
  )
}
