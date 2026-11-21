import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { duracaoTela, lerDuracao, minutosDecorridos, somaMinutos } from '../data/horas'
import { dataTela } from '../data/publicacoes'
import { diaSP } from '../data/seuDia'
import { Panel } from '../design/components/Panel'
import { Button } from '../design/components/Button'
import { Field } from '../design/components/Field'
import { useToast } from '../design/components/Toast'

const CHAVE_CRONO = 'hiadv-cronometro'
type Crono = { cliente: string; inicio: number }
function lerCrono(): Crono | null {
  try { const v = JSON.parse(localStorage.getItem(CHAVE_CRONO) ?? 'null'); return v && typeof v.inicio === 'number' ? v : null } catch { return null }
}
function gravarCrono(c: Crono | null) {
  try { if (c) localStorage.setItem(CHAVE_CRONO, JSON.stringify(c)); else localStorage.removeItem(CHAVE_CRONO) } catch { /* sem armazenamento: vale só nesta tela */ }
}

/** Horas trabalhadas no cliente: cronômetro ou lançamento manual. O colaborador vê as dele; o Gestor Master vê todas. */
export function HorasCliente({ clienteId }: { clienteId: string }) {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const { perfil } = useSessao()
  const chave = ['horas', perfil?.escritorioId, clienteId]
  const q = useQuery({ queryKey: chave, queryFn: () => api.horasCliente(clienteId), enabled: !!perfil })
  const [crono, setCrono] = useState<Crono | null>(() => { const c = lerCrono(); return c?.cliente === clienteId ? c : null })
  const [agora, setAgora] = useState(Date.now())
  const [duracao, setDuracao] = useState('')
  const [descricao, setDescricao] = useState('')
  const [dia, setDia] = useState(diaSP(new Date()))
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => { if (!crono) return; const t = setInterval(() => setAgora(Date.now()), 15000); return () => clearInterval(t) }, [crono])

  const lancar = useMutation({
    mutationFn: (minutos: number) => api.lancarHoras({ cliente: clienteId, caso: null, descricao, dia, minutos }),
    onSuccess: (_r, m) => { toast(`${duracaoTela(m)} registrados.`); setDuracao(''); setDescricao(''); setErro(null); qc.invalidateQueries({ queryKey: chave }) },
    onError: (e) => setErro((e as Error).message),
  })
  const remover = useMutation({
    mutationFn: (id: string) => api.removerHoras(id),
    onSuccess: () => { toast('Registro removido.'); qc.invalidateQueries({ queryKey: chave }) },
    onError: (e) => toast((e as Error).message),
  })
  function iniciar() { const c = { cliente: clienteId, inicio: Date.now() }; gravarCrono(c); setCrono(c); setAgora(Date.now()) }
  function parar() {
    const m = minutosDecorridos(crono!.inicio, Date.now())
    gravarCrono(null); setCrono(null); setDuracao(String(m)); setDia(diaSP(new Date()))
    toast(`Cronômetro parado em ${duracaoTela(m)}. Descreva o que foi feito e registre.`)
  }
  function enviar(e: FormEvent) {
    e.preventDefault()
    const m = lerDuracao(duracao)
    if (!m) return setErro('Informe o tempo, por exemplo 45, 1h30 ou 1:15.')
    lancar.mutate(m)
  }
  const lista = q.data ?? []
  return (
    <Panel title="Horas trabalhadas" labelId="cli-horas">
      <div className="hv-panel-body catalogo-pilha">
        <div className="catalogo-linha">
          {crono
            ? <><span className="horas-crono" role="timer" aria-live="off">Contando há {duracaoTela(minutosDecorridos(crono.inicio, agora))}</span><Button size="sm" onClick={parar}>Parar</Button></>
            : <Button size="sm" variant="secondary" onClick={iniciar}>Iniciar cronômetro</Button>}
          {lista.length > 0 && <span className="muted">Total: {duracaoTela(somaMinutos(lista))}</span>}
        </div>
        <form className="ficha-form" onSubmit={enviar} noValidate>
          <div className="ficha-campos">
            <Field label="Tempo" inputMode="text" maxLength={8} placeholder="1h30" value={duracao} onChange={(e) => setDuracao(e.target.value)} />
            <Field label="Dia" type="date" max={diaSP(new Date())} value={dia} onChange={(e) => setDia(e.target.value)} />
          </div>
          <Field label="O que foi feito (opcional)" maxLength={300} value={descricao} placeholder="Ex.: Reunião e análise do CNIS" onChange={(e) => setDescricao(e.target.value)} />
          {erro && <p className="hv-error" role="alert">{erro}</p>}
          <div><Button type="submit" size="sm" loading={lancar.isPending}>Registrar horas</Button></div>
        </form>
      </div>
      {lista.length > 0 && (
        <ul className="fin-lista">
          {lista.map((h) => (
            <li key={h.id} className="fin-linha">
              <div className="fin-texto">
                <span className="fin-titulo">{duracaoTela(h.minutos)}{h.descricao ? ` · ${h.descricao}` : ''}</span>
                <span className="fin-sub">{dataTela(h.dia)}{h.nome ? ` · ${h.nome}` : ''}</span>
              </div>
              {h.minha && <div className="fin-acoes"><Button size="sm" variant="ghost" aria-label={`Remover ${duracaoTela(h.minutos)} de ${dataTela(h.dia)}`} loading={remover.isPending && remover.variables === h.id} onClick={() => remover.mutate(h.id)}>Remover</Button></div>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
