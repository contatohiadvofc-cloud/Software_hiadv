import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { lerValor, limitesDoMes, mensagemCobranca, mesVizinho, moeda, nomeDoMes, previaParcelas, resumoDoMes, validarHonorario, validarLancamento,
  type Lancamento, type NovoHonorario, type NovoLancamento, type TipoHonorario } from '../data/financeiro'
import { dataTela } from '../data/publicacoes'
import { linkWhatsapp } from '../data/clientes'
import { diaSP } from '../data/seuDia'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'
import { Button } from '../design/components/Button'
import { Dialog } from '../design/components/Dialog'
import { Field } from '../design/components/Field'
import { useToast } from '../design/components/Toast'
import { EscolherCliente } from './EscolherCliente'

function useInvalidarFinanceiro() {
  const qc = useQueryClient()
  return () => { qc.invalidateQueries({ queryKey: ['financeiro'] }); qc.invalidateQueries({ queryKey: ['honorarios'] }) }
}

export function NovoHonorarioDialog({ aberto, aoFechar, cliente }: { aberto: boolean; aoFechar: () => void; cliente?: { id: string; nome: string } }) {
  const api = useApi()
  const toast = useToast()
  const invalidar = useInvalidarFinanceiro()
  const hoje = diaSP(new Date())
  const [cli, setCli] = useState<{ id: string; nome: string } | null>(cliente ?? null)
  const [h, setH] = useState<Omit<NovoHonorario, 'cliente'>>({ caso: null, tipo: 'misto', descricao: '', valorFixo: '', parcelas: '1', primeiroVencimento: hoje, percentualExito: '30' })
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => { if (aberto) { setCli(cliente ?? null); setErro(null); setH({ caso: null, tipo: 'misto', descricao: '', valorFixo: '', parcelas: '1', primeiroVencimento: hoje, percentualExito: '30' }) } }, [aberto]) // eslint-disable-line react-hooks/exhaustive-deps
  const criar = useMutation({
    mutationFn: () => api.honorarioCriar({ ...h, cliente: cli!.id }),
    onSuccess: () => { toast('Contrato de honorários lançado.'); invalidar(); aoFechar() },
    onError: (e) => setErro((e as Error).message),
  })
  const valor = lerValor(h.valorFixo)
  const n = Number(h.parcelas)
  const previa = h.tipo !== 'exito' && valor && Number.isInteger(n) && n >= 1 && n <= 60 && h.primeiroVencimento ? previaParcelas(valor, n, h.primeiroVencimento) : []
  function enviar(e: FormEvent) {
    e.preventDefault()
    const m = validarHonorario({ ...h, cliente: cli?.id ?? '' }); setErro(m)
    if (!m) criar.mutate()
  }
  const tipos: [TipoHonorario, string][] = [['fixo', 'Valor fixo'], ['exito', 'Só êxito'], ['misto', 'Fixo + êxito']]
  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o) aoFechar() }} title="Novo contrato de honorários">
      <form className="hv-dialog-body ficha-form" onSubmit={enviar} noValidate>
        <EscolherCliente valor={cli} aoEscolher={setCli} />
        <div className="segmentos" role="group" aria-label="Tipo de honorário">
          {tipos.map(([t, nome]) => <button key={t} type="button" aria-pressed={h.tipo === t} onClick={() => setH({ ...h, tipo: t })}>{nome}</button>)}
        </div>
        {h.tipo !== 'exito' && (
          <div className="ficha-campos">
            <Field label="Valor fixo (R$)" inputMode="decimal" value={h.valorFixo} placeholder="3.000,00" onChange={(e) => setH({ ...h, valorFixo: e.target.value })} />
            <Field label="Parcelas" inputMode="numeric" maxLength={2} value={h.parcelas} onChange={(e) => setH({ ...h, parcelas: e.target.value.replace(/\D/g, '') })} />
            <Field label="Primeiro vencimento" type="date" value={h.primeiroVencimento} onChange={(e) => setH({ ...h, primeiroVencimento: e.target.value })} />
          </div>
        )}
        {h.tipo !== 'fixo' && <Field label="Êxito (% do que o cliente receber)" inputMode="decimal" maxLength={6} value={h.percentualExito} onChange={(e) => setH({ ...h, percentualExito: e.target.value })} />}
        <Field label="Descrição (opcional)" maxLength={300} value={h.descricao} placeholder="Ex.: Auxílio-acidente, conforme contrato assinado" onChange={(e) => setH({ ...h, descricao: e.target.value })} />
        {previa.length > 0 && <p className="hv-hint">{previa.length === 1 ? `Uma parcela de ${moeda(previa[0].valor)} em ${dataTela(previa[0].vencimento)}.` : `${previa.length} parcelas de ${moeda(previa[0].valor)}, de ${dataTela(previa[0].vencimento)} a ${dataTela(previa[previa.length - 1].vencimento)}.`}</p>}
        {erro && <p className="hv-error" role="alert">{erro}</p>}
        <div className="catalogo-linha">
          <Button type="submit" loading={criar.isPending}>Lançar contrato</Button>
          <Button variant="ghost" onClick={aoFechar}>Cancelar</Button>
        </div>
      </form>
    </Dialog>
  )
}

function NovoLancamentoDialog({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const api = useApi()
  const toast = useToast()
  const invalidar = useInvalidarFinanceiro()
  const vazio = (): NovoLancamento => ({ sentido: 'saida', titulo: '', valor: '', vencimento: diaSP(new Date()), etiqueta: '', cliente: null, pago: true })
  const [l, setL] = useState<NovoLancamento>(vazio)
  const [cli, setCli] = useState<{ id: string; nome: string } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => { if (aberto) { setL(vazio()); setCli(null); setErro(null) } }, [aberto]) // eslint-disable-line react-hooks/exhaustive-deps
  const salvar = useMutation({
    mutationFn: () => api.finLancar({ ...l, cliente: cli?.id ?? null }),
    onSuccess: () => { toast(l.sentido === 'entrada' ? 'Entrada lançada.' : 'Saída lançada.'); invalidar(); aoFechar() },
    onError: (e) => setErro((e as Error).message),
  })
  function enviar(e: FormEvent) { e.preventDefault(); const m = validarLancamento(l); setErro(m); if (!m) salvar.mutate() }
  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o) aoFechar() }} title="Nova entrada ou saída">
      <form className="hv-dialog-body ficha-form" onSubmit={enviar} noValidate>
        <div className="segmentos" role="group" aria-label="Tipo de lançamento">
          <button type="button" aria-pressed={l.sentido === 'entrada'} onClick={() => setL({ ...l, sentido: 'entrada' })}>Entrada</button>
          <button type="button" aria-pressed={l.sentido === 'saida'} onClick={() => setL({ ...l, sentido: 'saida' })}>Saída</button>
        </div>
        <Field label="Descrição" maxLength={120} value={l.titulo} placeholder={l.sentido === 'saida' ? 'Ex.: Conta de luz de novembro' : 'Ex.: Consulta avulsa'} onChange={(e) => setL({ ...l, titulo: e.target.value })} />
        <div className="ficha-campos">
          <Field label="Valor (R$)" inputMode="decimal" value={l.valor} onChange={(e) => setL({ ...l, valor: e.target.value })} />
          <Field label={l.pago ? 'Data do pagamento' : 'Vencimento'} type="date" value={l.vencimento} onChange={(e) => setL({ ...l, vencimento: e.target.value })} />
          <Field label="Etiqueta (opcional)" maxLength={40} value={l.etiqueta} placeholder={l.sentido === 'saida' ? 'Despesas' : 'Honorários'} onChange={(e) => setL({ ...l, etiqueta: e.target.value })} />
        </div>
        {l.sentido === 'entrada' && <EscolherCliente valor={cli} aoEscolher={setCli} opcional />}
        <label className="hv-check"><input type="checkbox" checked={l.pago} onChange={(e) => setL({ ...l, pago: e.target.checked })} /><span>Já foi {l.sentido === 'entrada' ? 'recebido' : 'pago'}</span></label>
        {erro && <p className="hv-error" role="alert">{erro}</p>}
        <div className="catalogo-linha">
          <Button type="submit" loading={salvar.isPending}>Lançar</Button>
          <Button variant="ghost" onClick={aoFechar}>Cancelar</Button>
        </div>
      </form>
    </Dialog>
  )
}

function Linha({ l, hoje, escritorio, aoBaixar }: { l: Lancamento; hoje: string; escritorio: string; aoBaixar: (l: Lancamento, pago: boolean) => void }) {
  const atrasado = !l.pagoEm && l.sentido === 'entrada' && l.vencimento < hoje
  const wa = atrasado ? linkWhatsapp(l.telefone) : null
  return (
    <li className="fin-linha" data-sentido={l.sentido} data-atrasado={atrasado ? 'true' : undefined}>
      <div className="fin-texto">
        <span className="fin-titulo">{l.clienteId ? <Link to="/clientes/$id" params={{ id: l.clienteId }}>{l.titulo}</Link> : l.titulo}</span>
        <span className="fin-sub">{l.etiqueta} · {l.pagoEm ? `${l.sentido === 'entrada' ? 'recebido' : 'pago'} em ${dataTela(l.pagoEm)}` : `${atrasado ? 'venceu' : 'vence'} em ${dataTela(l.vencimento)}`}</span>
      </div>
      <span className="fin-valor">{l.sentido === 'saida' ? '− ' : ''}{moeda(l.valor)}</span>
      <div className="fin-acoes">
        {wa && <a className="hv-btn" data-variant="ghost" data-size="sm" href={`${wa}?text=${encodeURIComponent(mensagemCobranca(l, escritorio))}`} target="_blank" rel="noreferrer">Lembrete no WhatsApp</a>}
        {l.pagoEm
          ? <Button size="sm" variant="ghost" aria-label={`Desfazer baixa: ${l.titulo}`} onClick={() => aoBaixar(l, false)}>Desfazer</Button>
          : <Button size="sm" variant="secondary" aria-label={`${l.sentido === 'entrada' ? 'Recebido' : 'Pago'}: ${l.titulo}`} onClick={() => aoBaixar(l, true)}>{l.sentido === 'entrada' ? 'Recebido' : 'Pago'}</Button>}
      </div>
    </li>
  )
}

/** Financeiro do escritório (só Gestor Master): resumo do mês, atrasados com lembrete, a receber e lançamentos. */
export function Financeiro() {
  const api = useApi()
  const toast = useToast()
  const invalidar = useInvalidarFinanceiro()
  const { perfil } = useSessao()
  const gestor = perfil?.papel === 'master' || !!perfil?.code
  const hoje = diaSP(new Date())
  const [mes, setMes] = useState(hoje.slice(0, 7))
  const [dialogo, setDialogo] = useState<'contrato' | 'lancamento' | null>(null)
  const { de, ate } = limitesDoMes(mes)
  const q = useQuery({ queryKey: ['financeiro', perfil?.escritorioId, mes], queryFn: () => api.finLista(de, ate), enabled: !!perfil && gestor })
  const r = useMemo(() => resumoDoMes(q.data ?? [], mes, hoje), [q.data, mes, hoje])
  const doMes = (q.data ?? []).filter((l) => l.vencimento >= de && l.vencimento <= ate)
  const baixar = useMutation({
    mutationFn: (v: { l: Lancamento; pago: boolean }) => api.finBaixar(v.l.id, v.pago ? hoje : null),
    onSuccess: (_d, v) => {
      invalidar()
      if (v.pago) toast(`${v.l.sentido === 'entrada' ? 'Recebimento' : 'Pagamento'} registrado.`, 'neutral', { rotulo: 'Desfazer', fazer: () => baixar.mutate({ l: v.l, pago: false }) })
    },
    onError: (e) => toast((e as Error).message, 'danger'),
  })
  const aoBaixar = (l: Lancamento, pago: boolean) => baixar.mutate({ l, pago })
  const escritorio = perfil?.escritorioNome ?? 'escritório'

  if (perfil && !gestor) return <div className="pagina"><Panel><Empty title="O financeiro fica com o Gestor Master." /></Panel></div>

  const cartoes: [string, number, string?][] = [
    ['Recebido no mês', r.recebido], ['A receber no mês', r.aReceber], ['Em atraso', r.atrasado, 'alerta'], ['Despesas do mês', r.despesas], ['Resultado (recebido − pago)', r.resultado],
  ]
  return (
    <div className="pagina">
      <div className="pagina-cabeca">
        <div><h1>Financeiro</h1></div>
        <div className="pagina-acoes">
          <Button variant="secondary" onClick={() => setDialogo('lancamento')}>Nova entrada ou saída</Button>
          <Button onClick={() => setDialogo('contrato')}>Novo contrato</Button>
        </div>
      </div>
      <div className="fin-mes" role="group" aria-label="Mês">
        <Button size="sm" variant="ghost" aria-label="Mês anterior" onClick={() => setMes(mesVizinho(mes, -1))}>‹</Button>
        <strong aria-live="polite">{nomeDoMes(mes)}</strong>
        <Button size="sm" variant="ghost" aria-label="Próximo mês" onClick={() => setMes(mesVizinho(mes, 1))}>›</Button>
      </div>

      {q.isError && <Panel><ErrorState onRetry={() => q.refetch()} /></Panel>}
      {q.isSuccess && (
        <>
          <dl className="fin-cartoes">
            {cartoes.map(([rot, v, tom]) => <div key={rot} className="fin-cartao" data-tom={tom && v > 0 ? tom : undefined}><dt>{rot}</dt><dd>{moeda(v)}</dd></div>)}
          </dl>
          {r.atrasados.length > 0 && (
            <Panel title={`Em atraso (${r.atrasados.length})`} labelId="fin-atraso">
              <ul className="fin-lista">{r.atrasados.map((l) => <Linha key={l.id} l={l} hoje={hoje} escritorio={escritorio} aoBaixar={aoBaixar} />)}</ul>
              <p className="hv-hint hv-panel-body">O lembrete abre o WhatsApp com uma mensagem cordial pronta. Você revisa e envia.</p>
            </Panel>
          )}
          <Panel title="Lançamentos do mês" labelId="fin-mes-lista">
            {doMes.length === 0
              ? <Empty title="Nada lançado neste mês.">Lance um contrato de honorários ou uma entrada ou saída.</Empty>
              : <ul className="fin-lista">{doMes.map((l) => <Linha key={l.id} l={l} hoje={hoje} escritorio={escritorio} aoBaixar={aoBaixar} />)}</ul>}
          </Panel>
        </>
      )}
      {q.isLoading && <p className="muted" role="status">Carregando…</p>}

      <NovoHonorarioDialog aberto={dialogo === 'contrato'} aoFechar={() => setDialogo(null)} />
      <NovoLancamentoDialog aberto={dialogo === 'lancamento'} aoFechar={() => setDialogo(null)} />
    </div>
  )
}
