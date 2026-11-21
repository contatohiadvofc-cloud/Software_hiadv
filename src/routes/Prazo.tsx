import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { dataTela, resumirPulados, validarPrazo, type Contagem, type Justica, type PedidoPrazo, type ResultadoPrazo } from '../data/publicacoes'
import { diaSP } from '../data/seuDia'
import { Dialog } from '../design/components/Dialog'
import { Button } from '../design/components/Button'
import { useToast } from '../design/components/Toast'

export type PrazoInicial = { inicio?: string; dias?: number | null; disponibilizacao?: boolean; titulo?: string; detalhe?: string; processoId?: string | null }

/** Calculadora de prazos (CPC, arts. 219, 220 e 224), com a opção de virar tarefa. */
export function PrazoDialog({ aberto, aoFechar, inicial }: { aberto: boolean; aoFechar: () => void; inicial?: PrazoInicial }) {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const { perfil } = useSessao()
  const equipe = useQuery({ queryKey: ['equipe', perfil?.escritorioId], queryFn: () => api.equipe(), enabled: !!perfil && aberto, staleTime: 10 * 60_000 })
  const [p, setP] = useState<PedidoPrazo>({ inicio: '', dias: 15, contagem: 'uteis', justica: 'federal', disponibilizacao: true })
  const [diasTexto, setDiasTexto] = useState('15')
  const [res, setRes] = useState<ResultadoPrazo | null>(null)
  const [titulo, setTitulo] = useState('')
  const [resp, setResp] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!aberto) return
    const dias = inicial?.dias ?? 15
    setP({ inicio: inicial?.inicio ?? diaSP(new Date()), dias, contagem: 'uteis', justica: 'federal', disponibilizacao: inicial?.disponibilizacao ?? true })
    setDiasTexto(String(dias)); setRes(null); setErro(null)
    setTitulo(inicial?.titulo ?? ''); setResp(perfil?.email ?? '')
  }, [aberto]) // eslint-disable-line react-hooks/exhaustive-deps

  const calcular = useMutation({
    mutationFn: (x: PedidoPrazo) => api.calcularPrazo(x),
    onSuccess: setRes, onError: (e) => setErro((e as Error).message),
  })
  const criar = useMutation({
    mutationFn: () => api.criarTarefa({ titulo: titulo.trim(), responsavel: resp, prazo: res!.fim, detalhe: inicial?.detalhe ?? '', processoId: inicial?.processoId ?? null }),
    onSuccess: () => {
      toast(`Tarefa criada com prazo em ${dataTela(res!.fim)}.`)
      qc.invalidateQueries({ queryKey: ['tarefas'] }); qc.invalidateQueries({ queryKey: ['seu-dia'] }); qc.invalidateQueries({ queryKey: ['publicacoes'] })
      aoFechar()
    },
    onError: (e) => setErro((e as Error).message),
  })

  function mudar(x: Partial<PedidoPrazo>) { setP({ ...p, ...x }); setRes(null) }
  function enviar(e: FormEvent) {
    e.preventDefault(); setErro(null)
    const pedido = { ...p, dias: Number(diasTexto) }
    const m = validarPrazo(pedido); if (m) return setErro(m)
    calcular.mutate(pedido)
  }

  const passou = res && res.coberturaAte && res.fim > res.coberturaAte
  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o) aoFechar() }} title="Calcular prazo">
      <form className="hv-dialog-body ficha-form" onSubmit={enviar} noValidate>
        <div className="ficha-campos">
          <div className="hv-field">
            <label htmlFor="pz-inicio">{p.disponibilizacao ? 'Disponibilizada no DJEN em' : 'Intimado(a) em'}</label>
            <input id="pz-inicio" className="hv-input" type="date" value={p.inicio} onChange={(e) => mudar({ inicio: e.target.value })} />
          </div>
          <div className="hv-field">
            <label htmlFor="pz-dias">Prazo (dias)</label>
            <input id="pz-dias" className="hv-input" inputMode="numeric" maxLength={3} value={diasTexto} onChange={(e) => { setDiasTexto(e.target.value.replace(/\D/g, '')); setRes(null) }} />
          </div>
          <div className="hv-field">
            <label htmlFor="pz-contagem">Contagem</label>
            <select id="pz-contagem" className="hv-input" value={p.contagem} onChange={(e) => mudar({ contagem: e.target.value as Contagem })}>
              <option value="uteis">Dias úteis (CPC)</option>
              <option value="corridos">Dias corridos</option>
            </select>
          </div>
          <div className="hv-field">
            <label htmlFor="pz-justica">Justiça</label>
            <select id="pz-justica" className="hv-input" value={p.justica} onChange={(e) => mudar({ justica: e.target.value as Justica })}>
              <option value="federal">Federal</option>
              <option value="estadual">Estadual</option>
              <option value="trabalho">Do Trabalho</option>
            </select>
          </div>
        </div>
        <label className="hv-check">
          <input type="checkbox" checked={p.disponibilizacao} onChange={(e) => mudar({ disponibilizacao: e.target.checked })} />
          <span>A data é a da disponibilização no Diário (DJEN): a publicação conta no dia útil seguinte</span>
        </label>
        <div className="catalogo-linha"><Button type="submit" variant={res ? 'secondary' : 'primary'} loading={calcular.isPending}>Calcular</Button></div>

        {res && (
          <div className="prazo-resultado" role="status">
            <p className="prazo-fim">Último dia: <strong>{dataTela(res.fim)}</strong></p>
            <p className="muted">Publicação considerada em {dataTela(res.publicacao)}; a contagem começa no dia útil seguinte.</p>
            {res.pulados.length > 0 && (
              <details><summary>Dias que não contaram ({resumirPulados(res.pulados).length})</summary>
                <ul>{resumirPulados(res.pulados).map((x) => <li key={x}>{x}</li>)}</ul>
              </details>
            )}
            <p className="hv-hint">Feriados estaduais, municipais e suspensões do tribunal (falta de expediente, sistema fora do ar) não entram na conta. Confira no calendário do tribunal.</p>
            {passou && <p className="hv-hint">O calendário de feriados do HiAdv vai até {dataTela(res.coberturaAte!)}; confira os dias depois disso.</p>}
          </div>
        )}
        {res && (
          <fieldset className="cad-grupo">
            <legend>Virar tarefa</legend>
            <div className="hv-field">
              <label htmlFor="pz-titulo">O que precisa ser feito</label>
              <input id="pz-titulo" className="hv-input" maxLength={200} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Manifestar sobre o laudo" />
            </div>
            <div className="hv-field">
              <label htmlFor="pz-resp">Responsável</label>
              <select id="pz-resp" className="hv-input" value={resp} onChange={(e) => setResp(e.target.value)}>
                <option value="">Equipe (sem responsável)</option>
                {(equipe.data ?? []).map((x) => <option key={x.email} value={x.email}>{x.nome}</option>)}
              </select>
            </div>
            <Button disabled={titulo.trim().length < 2} loading={criar.isPending} onClick={() => criar.mutate()}>Criar tarefa com prazo em {dataTela(res.fim)}</Button>
          </fieldset>
        )}
        {erro && <p className="hv-error" role="alert">{erro}</p>}
      </form>
    </Dialog>
  )
}
