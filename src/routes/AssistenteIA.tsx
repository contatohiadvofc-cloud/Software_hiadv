import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { useRecursos } from '../data/consultas'
import { ACOES_IA, montarPedidoIA, type AcaoIA, type PedidoIA } from '../data/iaPrompts'
import { escolherArquivos, escolherPasta, lerTexto, nomeArquivo, salvarNoDrive, type ArquivoDrive } from '../lib/drive'
import { Dialog } from '../design/components/Dialog'
import { Button } from '../design/components/Button'
import { useToast } from '../design/components/Toast'

export type ContextoIA = {
  cliente?: { id: string; nome: string }
  casos?: { id: string; descricao: string; dados: Record<string, string | null | undefined> }[]
  acao?: AcaoIA
  texto?: string
}

/** Assistente de IA (plano Sênior). Escreve rascunhos para o advogado revisar; nada é enviado nem protocolado daqui. */
export function AssistenteIA({ open, onOpenChange, ctx }: { open: boolean; onOpenChange: (v: boolean) => void; ctx: ContextoIA }) {
  const api = useApi(); const toast = useToast(); const qc = useQueryClient()
  const { perfil } = useSessao()
  const recursos = useRecursos()
  const google = useQuery({ queryKey: ['config-google', perfil?.escritorioId], queryFn: () => api.configGoogle(), enabled: open && !!perfil, staleTime: 10 * 60_000 })
  const uso = useQuery({ queryKey: ['ia-uso', perfil?.escritorioId], queryFn: () => api.iaUsoMes(), enabled: open && !!perfil })
  const [acao, setAcao] = useState<AcaoIA>(ctx.acao ?? 'quesitos')
  const [casoId, setCasoId] = useState(ctx.casos?.[0]?.id ?? '')
  const [instrucao, setInstrucao] = useState('')
  const [texto, setTexto] = useState(ctx.texto ?? '')
  const [arquivos, setArquivos] = useState<(ArquivoDrive & { texto?: string; erro?: string })[]>([])
  const [lendo, setLendo] = useState(false)
  const [resultado, setResultado] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const cfg = google.data?.cfg ?? null
  const podeDrive = recursos.pode('drive') && !!cfg && !!google.data?.driveLigado
  const avisoDrive = !recursos.pode('drive') ? null : !cfg ? 'O Google Drive ainda não foi configurado pelo HiAdv.' : !google.data?.driveLigado ? 'Para usar arquivos do Drive, o Gestor liga o Google Drive em Configurações, Integrações.' : null

  const caso = ctx.casos?.find((c) => c.id === casoId)
  const pedido = (): PedidoIA => ({
    acao, instrucao, texto,
    caso: { cliente: ctx.cliente?.nome, ...(caso?.dados ?? {}) },
    arquivos: arquivos.filter((a) => a.texto).map((a) => ({ nome: a.nome, texto: a.texto! })),
  })
  const gerar = useMutation({
    mutationFn: (p: PedidoIA) => api.iaGerar(p),
    onSuccess: (t) => { setResultado(t); setErro(null); qc.invalidateQueries({ queryKey: ['ia-uso'] }) },
    onError: (e) => setErro((e as Error).message),
  })

  async function buscarNoDrive() {
    if (!cfg) return
    setErro(null)
    try {
      const novos = await escolherArquivos(cfg)
      if (!novos.length) return
      setLendo(true)
      const lidos = await Promise.all(novos.map(async (a) => {
        try { return { ...a, texto: await lerTexto(cfg, a) } } catch (e) { return { ...a, erro: (e as Error).message } }
      }))
      setArquivos((atual) => [...atual.filter((x) => !lidos.some((l) => l.id === x.id)), ...lidos])
    } catch (e) { setErro((e as Error).message) } finally { setLendo(false) }
  }

  const salvar = useMutation({
    mutationFn: async () => {
      if (!cfg) throw new Error('Drive não configurado.')
      const pasta = await escolherPasta(cfg)
      if (!pasta) return null
      const titulo = ACOES_IA.find((a) => a.id === acao)?.nome ?? 'Rascunho'
      return salvarNoDrive(cfg, pasta, nomeArquivo(`${titulo} (rascunho)`, ctx.cliente?.nome ?? ''), resultado)
    },
    onSuccess: (link) => { if (link) toast('Rascunho salvo no Drive.') ; if (link) window.open(link, '_blank', 'noopener') },
    onError: (e) => toast((e as Error).message, 'danger'),
  })

  const info = ACOES_IA.find((a) => a.id === acao)
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Assistente de IA" variant="painel">
      <div className="hv-dialog-body ia">
        <p className="muted">Escreve um rascunho com os dados do HiAdv e o que você colar ou escolher. Revise antes de usar: a decisão é sempre do advogado.
          {uso.data?.limite ? ` Usos neste mês: ${uso.data.usados} de ${uso.data.limite}.` : ''}</p>
        <label className="adm-campo"><span>O que você precisa</span>
          <select className="hv-input" value={acao} onChange={(e) => setAcao(e.target.value as AcaoIA)}>{ACOES_IA.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}</select></label>
        {info && <p className="ia-dica">{info.dica}</p>}
        {ctx.casos && ctx.casos.length > 0 && (
          <label className="adm-campo"><span>Caso</span>
            <select className="hv-input" value={casoId} onChange={(e) => setCasoId(e.target.value)}>
              <option value="">Sem caso</option>{ctx.casos.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
            </select></label>
        )}
        <label className="adm-campo"><span>Instrução {acao === 'minuta' ? '' : '(opcional)'}</span>
          <textarea className="hv-input" rows={3} maxLength={4000} value={instrucao} onChange={(e) => setInstrucao(e.target.value)}
            placeholder={acao === 'minuta' ? 'Ex.: réplica à contestação do INSS, rebater a perda da qualidade de segurado.' : 'Ex.: profissão na época do acidente, foco na mobilidade do joelho.'} /></label>
        <label className="adm-campo"><span>Texto (cole aqui, se tiver)</span>
          <textarea className="hv-input" rows={5} maxLength={60000} value={texto} onChange={(e) => setTexto(e.target.value)} /></label>
        <div className="ia-drive">
          {podeDrive && <Button variant="secondary" size="sm" loading={lendo} onClick={buscarNoDrive}>Escolher arquivos do Drive</Button>}
          {avisoDrive && <p className="muted">{avisoDrive}</p>}
          {arquivos.length > 0 && (
            <ul className="ia-arquivos">
              {arquivos.map((a) => (
                <li key={a.id}>
                  <span>{a.nome}{a.erro ? <small className="ia-erro"> · {a.erro}</small> : <small> · lido</small>}</span>
                  <button type="button" className="hv-btn" data-variant="ghost" data-size="sm" aria-label={`Tirar ${a.nome}`} onClick={() => setArquivos(arquivos.filter((x) => x.id !== a.id))}>×</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {erro && <p className="hv-error" role="alert">{erro}</p>}
        <Button loading={gerar.isPending} onClick={() => {
          const p = pedido()
          try { montarPedidoIA(p) } catch (e) { setErro((e as Error).message); return }
          gerar.mutate(p)
        }}>Gerar rascunho</Button>
        {resultado && (
          <section className="ia-resultado" aria-labelledby="ia-res">
            <h3 id="ia-res">Rascunho para revisar</h3>
            <textarea className="hv-input" rows={14} aria-labelledby="ia-res" value={resultado} onChange={(e) => setResultado(e.target.value)} />
            <div className="pagina-acoes">
              <Button variant="secondary" size="sm" onClick={() => navigator.clipboard?.writeText(resultado).then(() => toast('Copiado.'), () => toast('Não foi possível copiar.', 'danger'))}>Copiar</Button>
              {podeDrive && <Button variant="secondary" size="sm" loading={salvar.isPending} onClick={() => salvar.mutate()}>Salvar no Drive</Button>}
            </div>
          </section>
        )}
      </div>
    </Dialog>
  )
}
