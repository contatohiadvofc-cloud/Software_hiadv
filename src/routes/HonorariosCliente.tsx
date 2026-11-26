import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { lerValor, moeda, type Honorario } from '../data/financeiro'
import { Panel } from '../design/components/Panel'
import { Button } from '../design/components/Button'
import { Dialog } from '../design/components/Dialog'
import { Field } from '../design/components/Field'
import { useToast } from '../design/components/Toast'
import { NovoHonorarioDialog } from './Financeiro'

const TIPO: Record<Honorario['tipo'], string> = { fixo: 'Valor fixo', exito: 'Êxito', misto: 'Fixo + êxito' }

/** Honorários do cliente (só Gestor): contratos, quanto entrou, quanto falta e o lançamento do êxito. */
export function HonorariosCliente({ cliente }: { cliente: { id: string; nome: string } }) {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const { perfil } = useSessao()
  const q = useQuery({ queryKey: ['honorarios', perfil?.escritorioId, cliente.id], queryFn: () => api.honorariosCliente(cliente.id), enabled: !!perfil })
  const [novo, setNovo] = useState(false)
  const [exito, setExito] = useState<Honorario | null>(null)
  const [recebido, setRecebido] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const lancar = useMutation({
    mutationFn: () => api.honorarioExito(exito!.id, lerValor(recebido)!),
    onSuccess: (v) => { toast(`Êxito de ${moeda(v)} lançado no financeiro.`); qc.invalidateQueries({ queryKey: ['honorarios'] }); qc.invalidateQueries({ queryKey: ['financeiro'] }); setExito(null) },
    onError: (e) => setErro((e as Error).message),
  })
  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!lerValor(recebido)) return setErro('Informe o valor que o cliente recebeu.')
    setErro(null); lancar.mutate()
  }
  const v = lerValor(recebido)
  return (
    <Panel title="Honorários" labelId="cli-hon">
      {(q.data ?? []).length === 0 && q.isSuccess && <p className="hv-panel-body muted">Nenhum contrato de honorários lançado.</p>}
      <ul className="fin-lista">
        {(q.data ?? []).map((h) => (
          <li key={h.id} className="fin-linha">
            <div className="fin-texto">
              <span className="fin-titulo">{TIPO[h.tipo]}{h.valorFixo ? ` · ${moeda(h.valorFixo)}${h.parcelas && h.parcelas > 1 ? ` em ${h.parcelas}x` : ''}` : ''}{h.percentualExito ? ` · ${h.percentualExito}% de êxito` : ''}</span>
              <span className="fin-sub">Recebido {moeda(h.recebido)} · a receber {moeda(h.aReceber)}{h.atrasado > 0 ? ` · em atraso ${moeda(h.atrasado)}` : ''}{h.descricao ? ` · ${h.descricao}` : ''}</span>
            </div>
            {h.percentualExito ? <div className="fin-acoes"><Button size="sm" variant="secondary" onClick={() => { setExito(h); setRecebido(''); setErro(null) }}>Lançar êxito</Button></div> : null}
          </li>
        ))}
      </ul>
      <div className="hv-panel-body"><Button size="sm" variant="secondary" onClick={() => setNovo(true)}>Novo contrato de honorários</Button></div>
      <NovoHonorarioDialog aberto={novo} aoFechar={() => setNovo(false)} cliente={cliente} />
      <Dialog open={!!exito} onOpenChange={(o) => { if (!o) setExito(null) }} title="Lançar êxito">
        <form className="hv-dialog-body ficha-form" onSubmit={enviar} noValidate>
          <Field label="Quanto o cliente recebeu (R$)" inputMode="decimal" autoFocus value={recebido} placeholder="Ex.: 12.000,00" onChange={(e) => setRecebido(e.target.value)} />
          {v && exito?.percentualExito ? <p className="hv-hint">Honorário de {exito.percentualExito}%: {moeda(Math.round(v * exito.percentualExito) / 100)}.</p> : null}
          {erro && <p className="hv-error" role="alert">{erro}</p>}
          <div className="catalogo-linha"><Button type="submit" loading={lancar.isPending}>Lançar no financeiro</Button><Button variant="ghost" onClick={() => setExito(null)}>Cancelar</Button></div>
        </form>
      </Dialog>
    </Panel>
  )
}
