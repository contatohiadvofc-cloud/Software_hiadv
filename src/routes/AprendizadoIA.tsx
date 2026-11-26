import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { ACOES_IA, type AcaoIA } from '../data/iaPrompts'
import { LIMITE_ORIENTACAO, problemaOrientacao, satisfacao, sugerirOrientacao, type FeedbackIA, type OrientacaoIA } from '../data/iaAprendizado'
import { Button } from '../design/components/Button'
import { useToast } from '../design/components/Toast'

const nomeAcao = (a: AcaoIA | null) => (a ? ACOES_IA.find((x) => x.id === a)?.nome ?? a : 'Todas as tarefas')

/** Avaliação de um rascunho da IA, logo abaixo do resultado. */
export function AvaliarIA({ acao, pedido }: { acao: AcaoIA; pedido: string }) {
  const api = useApi(); const toast = useToast()
  const [modo, setModo] = useState<'pergunta' | 'contar' | 'feito'>('pergunta')
  const [como, setComo] = useState('')
  const enviar = useMutation({
    mutationFn: (util: boolean) => api.iaAvaliar(acao, pedido, util, util ? '' : como),
    onSuccess: (_, util) => { setModo('feito'); toast(util ? 'Obrigado! Isso ajuda a IA do escritório.' : 'Recebido. Os gestores vão ver e a IA passa a seguir o que for aprovado.') },
    onError: (e) => toast((e as Error).message, 'danger'),
  })
  if (modo === 'feito') return <p className="ia-avaliado muted" role="status">Avaliação enviada.</p>
  return (
    <div className="ia-avaliar" role="group" aria-label="Avaliar o rascunho">
      {modo === 'pergunta' ? (
        <>
          <span>Este rascunho ajudou?</span>
          <Button size="sm" variant="secondary" loading={enviar.isPending} onClick={() => enviar.mutate(true)}>Ajudou</Button>
          <Button size="sm" variant="secondary" onClick={() => setModo('contar')}>Não era isso</Button>
        </>
      ) : (
        <>
          <label className="hv-label" htmlFor="ia-como">Como você queria? A IA aprende com isso, só no seu escritório.</label>
          <textarea id="ia-como" className="hv-input" rows={3} maxLength={1000} value={como} onChange={(e) => setComo(e.target.value)}
            placeholder="Ex.: queria os quesitos numerados no formato 1 -, 2 - e no máximo 15." />
          <div className="pagina-acoes">
            <Button size="sm" loading={enviar.isPending} disabled={como.trim().length < 5} onClick={() => enviar.mutate(false)}>Enviar</Button>
            <Button size="sm" variant="ghost" onClick={() => setModo('pergunta')}>Voltar</Button>
          </div>
        </>
      )}
    </div>
  )
}

function Pendente({ f }: { f: FeedbackIA }) {
  const api = useApi(); const toast = useToast(); const qc = useQueryClient()
  const [texto, setTexto] = useState(sugerirOrientacao(f))
  const [acao, setAcao] = useState<AcaoIA | ''>(f.acao)
  const erro = problemaOrientacao(texto)
  const atualizar = () => qc.invalidateQueries({ queryKey: ['ia-aprendizado'] })
  const aprovar = useMutation({ mutationFn: () => api.iaOrientacaoSalvar(null, acao || null, texto, f.id), onSuccess: () => { toast('Orientação ligada. A IA já segue a partir do próximo pedido.'); atualizar() }, onError: (e) => toast((e as Error).message, 'danger') })
  const recusar = useMutation({ mutationFn: () => api.iaFeedbackRecusar(f.id), onSuccess: atualizar, onError: (e) => toast((e as Error).message, 'danger') })
  return (
    <li className="iaa-item">
      <p className="muted">{f.quem} · {nomeAcao(f.acao)}{f.pedido ? ` · “${f.pedido.slice(0, 120)}”` : ''}</p>
      <p><strong>Queria:</strong> {f.comoQueria}</p>
      <label className="hv-label" htmlFor={`iaa-t-${f.id}`}>Orientação para a IA</label>
      <textarea id={`iaa-t-${f.id}`} className="hv-input" rows={2} maxLength={LIMITE_ORIENTACAO} value={texto} onChange={(e) => setTexto(e.target.value)} />
      <label className="hv-label" htmlFor={`iaa-a-${f.id}`}>Vale para</label>
      <select id={`iaa-a-${f.id}`} className="hv-input" value={acao} onChange={(e) => setAcao(e.target.value as AcaoIA | '')}>
        <option value="">Todas as tarefas</option>
        {ACOES_IA.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
      </select>
      {erro && texto.trim() && <p className="hv-error" role="alert">{erro}</p>}
      <div className="pagina-acoes">
        <Button size="sm" disabled={!!erro} loading={aprovar.isPending} onClick={() => aprovar.mutate()}>Aprovar e ligar</Button>
        <Button size="sm" variant="ghost" loading={recusar.isPending} onClick={() => recusar.mutate()}>Recusar</Button>
      </div>
    </li>
  )
}

function Orientacao({ o }: { o: OrientacaoIA }) {
  const api = useApi(); const toast = useToast(); const qc = useQueryClient()
  const alternar = useMutation({ mutationFn: () => api.iaOrientacaoAtiva(o.id, !o.ativo), onSuccess: () => qc.invalidateQueries({ queryKey: ['ia-aprendizado'] }), onError: (e) => toast((e as Error).message, 'danger') })
  return (
    <li className="iaa-item" data-ativo={o.ativo ? 'sim' : 'nao'}>
      <p>{o.texto}</p>
      <p className="muted">{nomeAcao(o.acao)} · usada {o.usos} {o.usos === 1 ? 'vez' : 'vezes'} · {o.ativo ? 'ligada' : 'desligada'}</p>
      <Button size="sm" variant="secondary" loading={alternar.isPending} onClick={() => alternar.mutate()}>{o.ativo ? 'Desligar' : 'Ligar'}</Button>
    </li>
  )
}

/** Tela dos gestores: o que a equipe pediu e o que a IA do escritório já aprendeu. Vale só para este escritório. */
export function AprendizadoIA() {
  const api = useApi(); const toast = useToast(); const qc = useQueryClient(); const { perfil } = useSessao()
  const q = useQuery({ queryKey: ['ia-aprendizado', perfil?.escritorioId], queryFn: () => api.iaAprendizado(), enabled: !!perfil })
  const [nova, setNova] = useState('')
  const [acao, setAcao] = useState<AcaoIA | ''>('')
  const erro = problemaOrientacao(nova)
  const criar = useMutation({ mutationFn: () => api.iaOrientacaoSalvar(null, acao || null, nova), onSuccess: () => { setNova(''); toast('Orientação ligada.'); qc.invalidateQueries({ queryKey: ['ia-aprendizado'] }) }, onError: (e) => toast((e as Error).message, 'danger') })
  if (q.isLoading) return <div className="hv-panel-body"><p className="muted">Carregando…</p></div>
  if (q.isError || !q.data) return <div className="hv-panel-body"><p className="hv-error">Não foi possível abrir o aprendizado da IA agora.</p></div>
  const d = q.data; const pct = satisfacao(d.resumo)
  return (
    <div className="hv-panel-body iaa">
      <p className="muted">A IA aprende o jeito de escrever do seu escritório. Ela não muda regras, segurança nem o sistema, e nada daqui vale para outros escritórios.</p>
      <p className="iaa-resumo">{pct == null ? 'Ainda não há avaliações nos últimos 30 dias.' : `Nos últimos 30 dias, ${pct}% dos rascunhos ajudaram (${d.resumo.uteis} de ${d.resumo.uteis + d.resumo.naoUteis}).`}</p>
      <h3>Pedidos da equipe para revisar</h3>
      {d.pendentes.length ? <ul className="iaa-lista">{d.pendentes.map((f) => <Pendente key={f.id} f={f} />)}</ul> : <p className="muted">Nenhum pedido novo.</p>}
      <h3>Orientações do escritório</h3>
      {d.orientacoes.length ? <ul className="iaa-lista">{d.orientacoes.map((o) => <Orientacao key={o.id} o={o} />)}</ul> : <p className="muted">Nenhuma orientação ainda.</p>}
      <h3>Nova orientação</h3>
      <label className="hv-label" htmlFor="iaa-nova">O que a IA deve fazer</label>
      <textarea id="iaa-nova" className="hv-input" rows={2} maxLength={LIMITE_ORIENTACAO} value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Ex.: nas minutas, use a fonte do escritório e cite as ementas em bloco separado." />
      <label className="hv-label" htmlFor="iaa-nova-acao">Vale para</label>
      <select id="iaa-nova-acao" className="hv-input" value={acao} onChange={(e) => setAcao(e.target.value as AcaoIA | '')}>
        <option value="">Todas as tarefas</option>
        {ACOES_IA.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
      </select>
      {erro && nova.trim() && <p className="hv-error" role="alert">{erro}</p>}
      <Button size="sm" disabled={!!erro} loading={criar.isPending} onClick={() => criar.mutate()}>Ligar orientação</Button>
    </div>
  )
}
