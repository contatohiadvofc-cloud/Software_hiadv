import { Carregando } from '../design/components/Carregando'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useApi, useSessao } from '../lib/contexto'
import { PLANOS, type PlanoId } from '../data/adesao'
import { NOMES_SITUACAO, acimaDoLimite, dataIso, faixaSaude, isoParaTela, mascaraData, nomeRecurso, validarNovo, type AssinaturaForm, type EscritorioCentral, type NovoEscritorio, type Situacao } from '../data/central'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'
import { Badge } from '../design/components/Badge'
import { Button } from '../design/components/Button'
import { Dialog } from '../design/components/Dialog'
import { useToast } from '../design/components/Toast'

const nomePlano = (id: PlanoId | null) => (id ? PLANOS.find((p) => p.id === id)?.nome ?? id : 'Sem plano (tudo aberto)')
const tom = (s: Situacao | null) => (s === 'ativo' ? 'success' : s === 'teste' ? 'info' : s === 'atraso' ? 'warning' : 'neutral') as 'success' | 'info' | 'warning' | 'neutral'
const reais = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const FORMAS = [['pix', 'Pix'], ['boleto', 'Boleto'], ['cartao', 'Cartão'], ['transferencia', 'Transferência'], ['outro', 'Outro']] as const
const hojeIso = () => new Date().toLocaleDateString('sv-SE')

/** Campo de data com as barras fixas: a pessoa digita só os números. Hora é opcional. */
export function CampoData({ rotulo, valor, aoMudar, comHora }: { rotulo: string; valor: string; aoMudar: (iso: string) => void; comHora?: boolean }) {
  const [txt, setTxt] = useState(() => isoParaTela(valor))
  const [hora, setHora] = useState(() => (valor.length > 10 ? valor.slice(11, 16) : ''))
  useEffect(() => { setTxt(isoParaTela(valor)); setHora(valor.length > 10 ? valor.slice(11, 16) : '') }, [valor])
  const invalida = txt.length === 10 && !dataIso(txt)
  const emitir = (t: string, h: string) => { const iso = dataIso(t); if (iso) aoMudar(h && /^\d{2}:\d{2}$/.test(h) ? `${iso}T${h}` : iso); else if (!t) aoMudar('') }
  return (
    <span className="ct-data">
      <label className="adm-campo"><span>{rotulo}</span>
        <input className="hv-input" inputMode="numeric" placeholder="dd/mm/aaaa" maxLength={10} value={txt} aria-invalid={invalida || undefined}
          onChange={(e) => { const t = mascaraData(e.target.value); setTxt(t); emitir(t, hora) }} /></label>
      {comHora && <label className="adm-campo ct-hora"><span>Hora (opcional)</span>
        <input className="hv-input" inputMode="numeric" placeholder="hh:mm" maxLength={5} value={hora}
          onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 4); const h = d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d; setHora(h); emitir(txt, h) }} /></label>}
      {invalida && <small className="hv-error" role="alert">Data não existe.</small>}
    </span>
  )
}

function BarraSaude({ n }: { n: number | null | undefined }) {
  const f = faixaSaude(n)
  return (
    <span className="ct-saude" data-tom={f.tom} title={`Saúde ${n ?? '—'}/100: ${f.rotulo}`}>
      <span className="ct-saude-trilho" aria-hidden="true"><span style={{ width: `${n ?? 0}%` }} /></span>
      <span className="ct-saude-txt">{n == null ? 'sem dados' : `${n} · ${f.rotulo}`}</span>
    </span>
  )
}

function PainelReceita() {
  const api = useApi()
  const q = useQuery({ queryKey: ['central', 'painel'], queryFn: () => api.centralPainel() })
  if (q.isLoading) return <Carregando texto="Carregando receita…" />
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />
  const p = q.data
  const max = Math.max(1, ...p.dias.map((d) => d.recebido + d.previsto))
  const hoje = new Date().getDate()
  return (
    <section className="ct-painel" aria-labelledby="ct-receita">
      <div className="ct-kpis">
        <div><span className="ct-kpi-rot" id="ct-receita">Recebido em {isoParaTela(p.inicio).slice(3)}</span><strong>{reais(p.recebido)}</strong></div>
        <div><span className="ct-kpi-rot">Mensalidades ativas</span><strong>{reais(p.previsto)}</strong></div>
        <div data-tom={p.emAtraso > 0 ? 'atraso' : undefined}><span className="ct-kpi-rot">Em atraso</span><strong>{reais(p.emAtraso)}</strong></div>
      </div>
      <div className="ct-grafico" role="img" aria-label={`Receita do dia 1 ao dia ${p.dias.length}: recebido ${reais(p.recebido)}`}>
        {p.dias.map((d) => (
          <span key={d.dia} className="ct-dia" data-hoje={d.dia === hoje || undefined} title={`Dia ${d.dia}: recebido ${reais(d.recebido)}${d.previsto ? `, previsto ${reais(d.previsto)}` : ''}`}>
            <span className="ct-barra-prev" style={{ height: `${(d.previsto / max) * 100}%` }} />
            <span className="ct-barra-rec" style={{ height: `${(d.recebido / max) * 100}%` }} />
          </span>
        ))}
      </div>
      <div className="ct-eixo" aria-hidden="true"><span>1</span><span>{Math.ceil(p.dias.length / 2)}</span><span>{p.dias.length}</span></div>
      <p className="ct-legenda"><span className="ct-leg-rec" /> recebido <span className="ct-leg-prev" /> vencimentos que ainda vêm</p>
    </section>
  )
}

function formDe(e: EscritorioCentral): AssinaturaForm {
  return { plano: e.plano ?? 'premium', situacao: e.situacao ?? 'ativo', fundador: e.fundador, testeAte: e.testeAte ?? '', pagoAte: e.pagoAte ?? '', obs: e.obs ?? '', masters: '', colaboradores: '', oabs: '', iaMensal: '' }
}

function AbaAssinatura({ e }: { e: EscritorioCentral }) {
  const api = useApi(); const qc = useQueryClient(); const toast = useToast()
  const [f, setF] = useState<AssinaturaForm>(() => formDe(e))
  useEffect(() => setF(formDe(e)), [e])
  const [pg, setPg] = useState({ valor: e.preco ? String(e.preco).replace('.', ',') : '', pagoEm: hojeIso(), forma: 'pix' })
  const pagamentos = useQuery({ queryKey: ['central', e.id, 'pagamentos'], queryFn: () => api.centralPagamentos(e.id) })
  const ok = (m: string) => { toast(m); qc.invalidateQueries({ queryKey: ['central'] }) }
  const erro = (x: unknown) => toast((x as Error).message, 'danger')
  const salvar = useMutation({ mutationFn: () => api.centralAssinatura(e.id, f), onSuccess: () => ok('Plano salvo.'), onError: erro })
  const pagar = useMutation({
    mutationFn: () => { const v = Number(pg.valor.replace(/\./g, '').replace(',', '.')); if (!(v > 0)) throw new Error('Informe o valor pago.'); if (!pg.pagoEm) throw new Error('Informe a data do pagamento.'); return api.centralPagamento(e.id, v, pg.pagoEm.slice(0, 10), pg.forma) },
    onSuccess: (prox) => ok(`Pagamento registrado.${prox ? ` Próximo vencimento: ${isoParaTela(prox)}.` : ''}`), onError: erro,
  })
  const campo = (k: keyof AssinaturaForm) => (ev: { target: { value: string } }) => setF({ ...f, [k]: ev.target.value })
  return (
    <div className="ct-aba">
      <section aria-labelledby={`ct-pg-${e.id}`}>
        <h3 id={`ct-pg-${e.id}`}>Registrar pagamento</h3>
        <p className="muted">Ao registrar, o "pago até" avança um mês e a situação volta para ativo.</p>
        <form className="ct-form" onSubmit={(ev) => { ev.preventDefault(); pagar.mutate() }}>
          <label className="adm-campo"><span>Valor (R$)</span><input className="hv-input" inputMode="decimal" value={pg.valor} onChange={(ev) => setPg({ ...pg, valor: ev.target.value.replace(/[^\d,.]/g, '') })} /></label>
          <CampoData rotulo="Pago em" valor={pg.pagoEm} aoMudar={(v) => setPg({ ...pg, pagoEm: v })} />
          <label className="adm-campo"><span>Forma</span><select className="hv-input" value={pg.forma} onChange={(ev) => setPg({ ...pg, forma: ev.target.value })}>{FORMAS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}</select></label>
          <Button type="submit" loading={pagar.isPending}>Registrar pagamento</Button>
        </form>
        {pagamentos.data && pagamentos.data.length > 0 && (
          <ul className="ct-historico">{pagamentos.data.map((p, i) => <li key={i}><span>{isoParaTela(p.pagoEm)}</span> {reais(p.valor)} · {FORMAS.find((f) => f[0] === p.forma)?.[1] ?? p.forma} <small>· competência {isoParaTela(p.competencia)}</small></li>)}</ul>
        )}
      </section>
      <section aria-labelledby={`ct-pl-${e.id}`}>
        <h3 id={`ct-pl-${e.id}`}>Plano</h3>
        <form className="ct-form" onSubmit={(ev) => { ev.preventDefault(); salvar.mutate() }}>
          <label className="adm-campo"><span>Plano</span>
            <select className="hv-input" value={f.plano} onChange={campo('plano')}>{PLANOS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
          <label className="adm-campo"><span>Situação</span>
            <select className="hv-input" value={f.situacao} onChange={campo('situacao')}>{(Object.keys(NOMES_SITUACAO) as Situacao[]).map((s) => <option key={s} value={s}>{NOMES_SITUACAO[s]}</option>)}</select></label>
          <CampoData rotulo="Teste até" valor={f.testeAte} aoMudar={(v) => setF({ ...f, testeAte: v })} />
          <CampoData rotulo="Pago até" valor={f.pagoAte} aoMudar={(v) => setF({ ...f, pagoAte: v })} />
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
      </section>
    </div>
  )
}

type Estado = 'plano' | 'liberado' | 'bloqueado'
const ROT_ESTADO: Record<Estado, string> = { plano: 'Segue o plano', liberado: 'Liberado', bloqueado: 'Bloqueado' }

function AbaControle({ e }: { e: EscritorioCentral }) {
  const api = useApi(); const qc = useQueryClient(); const toast = useToast()
  const q = useQuery({ queryKey: ['central', e.id], queryFn: () => api.centralEscritorio(e.id) })
  const [pedido, setPedido] = useState<{ r: string; valor: Estado } | null>(null)
  const [motivo, setMotivo] = useState(''); const [validade, setValidade] = useState('')
  const aplicar = useMutation({
    mutationFn: async () => {
      if (!pedido) return
      if (motivo.trim().length < 3) throw new Error('Escreva o motivo (fica no histórico).')
      await api.centralAjuste(e.id, pedido.r, pedido.valor, pedido.valor === 'plano' ? null : validade || null)
      await api.centralMotivo(e.id, `${nomeRecurso(pedido.r)} → ${ROT_ESTADO[pedido.valor]}: ${motivo.trim()}`)
    },
    onSuccess: () => { toast('Recurso ajustado e registrado no histórico.'); setPedido(null); setMotivo(''); setValidade(''); qc.invalidateQueries({ queryKey: ['central'] }) },
    onError: (x) => toast((x as Error).message, 'danger'),
  })
  if (q.isLoading) return <Carregando texto="Carregando…" />
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />
  const d = q.data
  const valorDe = (r: string): Estado => d.ajustes.find((a) => a.recurso === r)?.valor ?? 'plano'
  return (
    <div className="ct-aba">
      <p className="muted">O plano define o padrão. Toque no estado para mudar; o motivo é obrigatório e tudo fica no histórico.</p>
      <ul className="ct-recursos">
        {d.recursos.map((r) => {
          const atual = valorDe(r.recurso); const aj = d.ajustes.find((a) => a.recurso === r.recurso)
          return (
            <li key={r.recurso}>
              <span className="ct-rec-nome">{nomeRecurso(r.recurso)}
                <small>{r.liberado ? 'Liberado' : 'Fechado'}{aj ? ` por ajuste${aj.validoAte ? ` até ${isoParaTela(aj.validoAte)}` : ''}` : r.noPlano ? ' pelo plano' : ' (fora do plano)'}</small></span>
              <span className="ct-estados" role="group" aria-label={`Ajuste de ${nomeRecurso(r.recurso)}`}>
                {(['plano', 'liberado', 'bloqueado'] as Estado[]).map((v) => (
                  <button key={v} type="button" className="ct-estado" data-v={v} aria-pressed={atual === v} onClick={() => { if (v !== atual) { setPedido({ r: r.recurso, valor: v }); setMotivo('') } }}>{ROT_ESTADO[v]}</button>
                ))}
              </span>
              {pedido?.r === r.recurso && (
                <form className="ct-form ct-motivo" onSubmit={(ev) => { ev.preventDefault(); aplicar.mutate() }}>
                  <label className="adm-campo ct-obs"><span>Motivo para "{ROT_ESTADO[pedido.valor]}"</span><input className="hv-input" autoFocus maxLength={300} value={motivo} onChange={(ev) => setMotivo(ev.target.value)} /></label>
                  {pedido.valor !== 'plano' && <CampoData rotulo="Vale até (opcional)" valor={validade} aoMudar={setValidade} />}
                  <Button type="submit" loading={aplicar.isPending}>Aplicar</Button>
                  <Button type="button" variant="ghost" onClick={() => setPedido(null)}>Cancelar</Button>
                </form>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function AbaPessoas({ e }: { e: EscritorioCentral }) {
  const api = useApi(); const qc = useQueryClient(); const toast = useToast()
  const q = useQuery({ queryKey: ['central', e.id], queryFn: () => api.centralEscritorio(e.id) })
  const pessoa = useMutation({ mutationFn: (v: { email: string; r: string; bloquear: boolean }) => api.pessoaAjuste(e.id, v.email, v.r, v.bloquear, null), onSuccess: () => { toast('Acesso da pessoa ajustado.'); qc.invalidateQueries({ queryKey: ['central'] }) }, onError: (x) => toast((x as Error).message, 'danger') })
  if (q.isLoading) return <Carregando texto="Carregando…" />
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />
  const d = q.data; const liberados = d.recursos.filter((r) => r.liberado).map((r) => r.recurso)
  return (
    <div className="ct-aba">
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
    </div>
  )
}

function AbaHistorico({ e }: { e: EscritorioCentral }) {
  const api = useApi()
  const q = useQuery({ queryKey: ['central', e.id], queryFn: () => api.centralEscritorio(e.id) })
  if (q.isLoading) return <Carregando texto="Carregando…" />
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />
  return q.data.historico.length === 0 ? <p className="muted ct-aba">Nenhuma mudança registrada.</p> : (
    <ul className="ct-historico ct-aba">{q.data.historico.map((h, i) => <li key={i}><span>{isoParaTela(h.quando)}</span> {h.acao} <small>· {h.quem}</small></li>)}</ul>
  )
}

function AbaResumo({ e }: { e: EscritorioCentral }) {
  const acima = acimaDoLimite(e)
  const lim = (u: number, l: number | null) => (l ? `${u} de ${l}` : String(u))
  const itens: [string, string][] = [
    ['Gestor Master', [e.masterNome, ...e.oabsMaster].filter(Boolean).join(' · ') || '—'],
    ['Pago até', isoParaTela(e.pagoAte) || '—'],
    ['Último acesso', isoParaTela(e.ultimoAcesso) || '—'],
    ['Casos', String(e.casos ?? '—')],
  ]
  const uso: [string, string][] = [
    ['Master', lim(e.uso.masters, e.limites.masters)],
    ['Colaboradores', lim(e.uso.colaboradores, e.limites.colaboradores)],
    ['OABs', lim(e.uso.oabs, e.limites.oabs)],
    ['IA no mês', lim(e.uso.iaMes, e.limites.iaMensal)],
  ]
  return (
    <div className="ct-aba">
      <div className="ct-r-plano">
        <div><span className="ct-r-rot">Plano</span><strong>{nomePlano(e.plano)}</strong>{e.fundador && <span className="ct-r-selo">Fundador</span>}</div>
        <div className="ct-r-preco">{e.preco ? <><strong>{reais(e.preco)}</strong><span>/mês</span></> : <span>—</span>}</div>
      </div>
      <div className="ct-r-saude"><span className="ct-r-rot">Saúde de uso</span><BarraSaude n={e.saude} /></div>
      {acima.length > 0 && <p className="ct-acima">Acima do plano: {acima.join(', ')}</p>}
      <div className="ct-r-uso">{uso.map(([k, v]) => <div key={k}><span className="ct-r-rot">{k}</span><strong>{v}</strong></div>)}</div>
      <dl className="ct-resumo">{itens.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {e.obs && <p className="ct-r-obs"><span className="ct-r-rot">Anotação</span>{e.obs}</p>}
    </div>
  )
}

const ABAS = ['Resumo', 'Pessoas', 'Assinatura', 'Controle', 'Automações', 'Histórico'] as const
type Aba = (typeof ABAS)[number]

function Ficha({ e, aoFechar }: { e: EscritorioCentral; aoFechar: () => void }) {
  const [aba, setAba] = useState<Aba>('Resumo')
  return (
    <Dialog open onOpenChange={(v) => { if (!v) aoFechar() }} title={e.nome} variant="painel" hideTitle>
      <div className="ct-ficha">
        <header className="ct-f-cabeca">
          <span className="ct-f-pasta" aria-hidden="true"><i /><b>{e.nome.replace(/\(.*?\)/g, '').split(/\s+/).filter((x) => x.length > 2).slice(0, 2).map((x) => x[0]!.toUpperCase()).join('') || 'E'}</b></span>
          <div className="ct-f-titulos">
            <h2>{e.nome}</h2>
            <p>{[e.cidade, nomePlano(e.plano)].filter(Boolean).join(' · ')}</p>
            <div className="ct-f-selos">
              {e.situacao && <span className="ct-f-selo" data-s={e.situacao}>{NOMES_SITUACAO[e.situacao]}{e.situacao === 'teste' && e.testeAte ? ` até ${isoParaTela(e.testeAte)}` : ''}</span>}
              {!e.ativo && <span className="ct-f-selo" data-s="suspenso">Acesso suspenso</span>}
            </div>
          </div>
          <button type="button" className="ct-f-fechar" aria-label="Fechar" onClick={aoFechar}>×</button>
        </header>
        <div className="ct-abas" role="tablist" aria-label="Partes da ficha">
          {ABAS.map((a) => <button key={a} type="button" role="tab" id={`ct-tab-${a}`} aria-selected={aba === a} aria-controls="ct-aba-corpo" onClick={() => setAba(a)}>{a}</button>)}
        </div>
        <div id="ct-aba-corpo" role="tabpanel" aria-labelledby={`ct-tab-${aba}`}>
          {aba === 'Resumo' && <AbaResumo e={e} />}
          {aba === 'Pessoas' && <AbaPessoas e={e} />}
          {aba === 'Assinatura' && <AbaAssinatura e={e} />}
          {aba === 'Controle' && <AbaControle e={e} />}
          {aba === 'Automações' && <p className="muted ct-aba">As automações deste escritório aparecem aqui quando o motor de automações for ligado (editor em frase e em fluxo). Você poderá ver, pausar e corrigir cada regra.</p>}
          {aba === 'Histórico' && <AbaHistorico e={e} />}
        </div>
      </div>
    </Dialog>
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
const PASSOS = ['Escritório', 'Gestor Master', 'Plano'] as const

function NovoEscritorioForm({ aoCriar }: { aoCriar: (id: string) => void }) {
  const api = useApi(); const qc = useQueryClient(); const toast = useToast()
  const [n, setN] = useState<NovoEscritorio>(NOVO)
  const [passo, setPasso] = useState(0)
  const [erro, setErro] = useState<string | null>(null)
  const criar = useMutation({
    mutationFn: () => api.centralNovo(n),
    onSuccess: (id) => { toast('Escritório criado. O Gestor Master entra pelo "Primeiro acesso".'); setN(NOVO); setPasso(0); qc.invalidateQueries({ queryKey: ['central'] }); aoCriar(id) },
    onError: (x) => setErro((x as Error).message),
  })
  const campo = (k: keyof NovoEscritorio) => (ev: { target: { value: string } }) => setN({ ...n, [k]: ev.target.value })
  const checar = (): string | null => {
    if (passo === 0) return n.nome.trim().length < 2 ? 'Informe o nome do escritório.' : null
    if (passo === 1) return validarNovo(n)
    return validarNovo(n)
  }
  const avancar = () => { const e = checar(); setErro(e); if (e) return; if (passo < 2) setPasso(passo + 1); else criar.mutate() }
  return (
    <form className="ct-novo" onSubmit={(ev) => { ev.preventDefault(); avancar() }} noValidate>
      <ol className="ct-passos">{PASSOS.map((p, i) => <li key={p} aria-current={i === passo ? 'step' : undefined} data-feito={i < passo || undefined}>{p}</li>)}</ol>
      <div className="ct-form">
        {passo === 0 && <>
          <label className="adm-campo"><span>Nome do escritório</span><input className="hv-input" autoFocus maxLength={160} value={n.nome} onChange={campo('nome')} /></label>
          <label className="adm-campo"><span>Cidade/UF</span><input className="hv-input" maxLength={80} value={n.cidade} onChange={campo('cidade')} /></label>
        </>}
        {passo === 1 && <>
          <label className="adm-campo"><span>Nome do Gestor Master</span><input className="hv-input" autoFocus maxLength={120} value={n.masterNome} onChange={campo('masterNome')} /></label>
          <label className="adm-campo"><span>E-mail do Gestor Master</span><input className="hv-input" type="email" maxLength={160} value={n.masterEmail} onChange={campo('masterEmail')} /></label>
          <label className="adm-campo"><span>OAB do Gestor Master</span><input className="hv-input" maxLength={20} placeholder="OAB/SC 00.000" value={n.oab} onChange={campo('oab')} /></label>
        </>}
        {passo === 2 && <>
          <fieldset className="ct-planos"><legend>Plano</legend>
            {PLANOS.map((p) => <label key={p.id} className="ct-plano" data-on={n.plano === p.id || undefined}><input type="radio" name="plano" checked={n.plano === p.id} onChange={() => setN({ ...n, plano: p.id })} /> {p.nome}</label>)}
          </fieldset>
          <label className="alternar"><input type="checkbox" checked={n.fundador} onChange={(ev) => setN({ ...n, fundador: ev.target.checked })} /> Fundador (implantação assistida sem custo)</label>
          <p className="muted ct-obs">Confira: {n.nome} · {n.masterNome} ({n.masterEmail}) · começa em teste de 14 dias.</p>
        </>}
      </div>
      {erro && <p className="hv-error" role="alert">{erro}</p>}
      <div className="ct-novo-acoes">
        {passo > 0 && <Button type="button" variant="ghost" onClick={() => { setErro(null); setPasso(passo - 1) }}>Voltar</Button>}
        <Button type="submit" loading={criar.isPending}>{passo < 2 ? 'Continuar' : 'Criar escritório'}</Button>
      </div>
    </form>
  )
}

type Filtro = 'todos' | Situacao
type Vista = 'cartoes' | 'tabela'

/** Central HiAdv: receita do mês, saúde de cada escritório e a ficha completa (plano, pagamento, recursos, pessoas, histórico). */
export function Central() {
  const api = useApi()
  const { perfil } = useSessao()
  const code = !!perfil?.code
  const q = useQuery({ queryKey: ['central'], queryFn: () => api.centralEscritorios(), enabled: !!perfil && code })
  const [aberto, setAberto] = useState<string | null>(null)
  const [novo, setNovo] = useState(false)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [vista, setVista] = useState<Vista>('cartoes')
  const [busca, setBusca] = useState('')
  const lista = useMemo(() => (q.data ?? []).filter((e) => (filtro === 'todos' || e.situacao === filtro) && (!busca.trim() || `${e.nome} ${e.cidade ?? ''} ${e.masterNome ?? ''}`.toLowerCase().includes(busca.trim().toLowerCase()))), [q.data, filtro, busca])
  const conta = (s: Situacao) => (q.data ?? []).filter((e) => e.situacao === s).length
  const ficha = q.data?.find((e) => e.id === aberto) ?? null
  if (perfil && !code) return <div className="pagina"><Panel><Empty title="Esta tela é da administração do HiAdv." /></Panel></div>
  return (
    <div className="pagina">
      <div className="pagina-cabeca">
        <div><h1>Central HiAdv</h1><p className="muted">Receita, saúde e controle de cada escritório. Tudo o que muda aqui fica no histórico.</p></div>
        <div className="ct-cabeca-acoes"><Link to="/central/manuais" className="hv-btn" data-variant="secondary">Manuais do Coder</Link>
        <Button variant={novo ? 'secondary' : 'primary'} onClick={() => setNovo(!novo)} aria-expanded={novo}>{novo ? 'Fechar' : 'Novo escritório'}</Button></div>
      </div>
      {novo && <Panel title="Novo escritório" labelId="ct-novo"><div className="hv-panel-body"><NovoEscritorioForm aoCriar={(id) => { setNovo(false); setAberto(id) }} /></div></Panel>}
      <Panel><div className="hv-panel-body"><PainelReceita /></div></Panel>
      {q.isLoading && <Carregando texto="Carregando…" />}
      {q.isError && <Panel><ErrorState onRetry={() => q.refetch()} /></Panel>}
      {q.isSuccess && q.data.length === 0 && <Panel><Empty title="Nenhum escritório ainda.">Os escritórios aparecem aqui quando uma adesão é ativada.</Empty></Panel>}
      {q.data && q.data.length > 0 && (
        <Panel>
          <div className="ct-barra">
            <div className="ct-chips" role="group" aria-label="Filtrar por situação">
              {(['todos', 'ativo', 'teste', 'atraso', 'suspenso'] as Filtro[]).map((f) => (
                <button key={f} type="button" className="ct-filtro" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
                  {f === 'todos' ? `Todos ${q.data.length}` : `${NOMES_SITUACAO[f]} ${conta(f)}`}</button>
              ))}
            </div>
            <input className="hv-input ct-busca" type="search" placeholder="Buscar escritório" aria-label="Buscar escritório" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <div className="ct-chips" role="group" aria-label="Forma de ver">
              <button type="button" className="ct-filtro" aria-pressed={vista === 'cartoes'} onClick={() => setVista('cartoes')}>Cartões</button>
              <button type="button" className="ct-filtro" aria-pressed={vista === 'tabela'} onClick={() => setVista('tabela')}>Tabela</button>
            </div>
          </div>
          {lista.length === 0 && <p className="muted hv-panel-body">Nenhum escritório com esse filtro.</p>}
          {vista === 'cartoes' ? (
            <ul className="ct-cartoes">
              {lista.map((e) => {
                const acima = acimaDoLimite(e)
                return (
                  <li key={e.id}>
                    <button type="button" className="ct-cartao" onClick={() => setAberto(e.id)} aria-haspopup="dialog">
                      <span className="ct-cartao-topo"><span className="fin-titulo">{e.nome}</span>{e.situacao && <Badge tone={tom(e.situacao)}>{NOMES_SITUACAO[e.situacao]}</Badge>}</span>
                      <span className="fin-sub">{[e.cidade, nomePlano(e.plano), e.fundador ? 'fundador' : null].filter(Boolean).join(' · ')}</span>
                      <span className="fin-sub">{e.situacao === 'teste' && e.testeAte ? `Teste até ${isoParaTela(e.testeAte)}` : e.pagoAte ? `Pago até ${isoParaTela(e.pagoAte)}` : 'Sem pagamento registrado'}</span>
                      <span className="fin-sub">{e.uso.masters} Master · {e.uso.colaboradores} colaboradores · {e.uso.oabs} OAB{e.ajustes ? ` · ${e.ajustes} ajuste${e.ajustes > 1 ? 's' : ''}` : ''}</span>
                      {acima.length > 0 && <span className="ct-acima">Acima do plano: {acima.join(', ')}</span>}
                      <BarraSaude n={e.saude} />
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="ct-tabela-rolo">
              <table className="ct-tabela">
                <thead><tr><th>Escritório</th><th>Plano</th><th>Situação</th><th>Pago até</th><th>Equipe</th><th>Saúde</th></tr></thead>
                <tbody>{lista.map((e) => (
                  <tr key={e.id}>
                    <td><button type="button" className="ct-link" onClick={() => setAberto(e.id)}>{e.nome}</button><small>{e.cidade}</small></td>
                    <td>{nomePlano(e.plano)}</td>
                    <td>{e.situacao ? NOMES_SITUACAO[e.situacao] : '—'}</td>
                    <td>{isoParaTela(e.pagoAte) || '—'}</td>
                    <td>{e.uso.masters + e.uso.colaboradores}</td>
                    <td><BarraSaude n={e.saude} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
      {ficha && <Ficha e={ficha} aoFechar={() => setAberto(null)} />}
      <Panel title="Google Drive do HiAdv" labelId="ct-google"><div className="hv-panel-body"><ConfigGoogleForm /></div></Panel>
    </div>
  )
}
