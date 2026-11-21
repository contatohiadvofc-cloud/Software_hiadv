import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { CAMPOS_QUALIFICACAO, qualificacao, type DadosCliente as Dados } from '../data/modelos'
import { Panel } from '../design/components/Panel'
import { Button } from '../design/components/Button'
import { Field } from '../design/components/Field'
import { useToast } from '../design/components/Toast'

/** Dados de qualificação usados nos documentos (procuração, contrato, declarações). */
export function DadosCliente({ clienteId }: { clienteId: string }) {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const { perfil } = useSessao()
  const q = useQuery({ queryKey: ['documento-dados', perfil?.escritorioId, clienteId, ''], queryFn: () => api.documentoDados(clienteId, null), enabled: !!perfil })
  const [editando, setEditando] = useState(false)
  const [f, setF] = useState<Record<string, string>>({})
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => {
    if (!q.data) return
    const c = q.data.cliente as Record<string, unknown>
    setF(Object.fromEntries(CAMPOS_QUALIFICACAO.map((x) => [x.chave, String(c[x.chave] ?? '')])))
  }, [q.data])
  const salvar = useMutation({
    mutationFn: () => api.salvarDadosCliente(clienteId, f as Partial<Dados>),
    onSuccess: () => { toast('Dados salvos.'); setEditando(false); qc.invalidateQueries({ queryKey: ['documento-dados'] }) },
    onError: (e) => setErro((e as Error).message),
  })
  function enviar(e: FormEvent) { e.preventDefault(); setErro(null); salvar.mutate() }
  const faltam = CAMPOS_QUALIFICACAO.filter((x) => !f[x.chave]?.trim()).length
  return (
    <Panel title="Dados para documentos" labelId="cli-dados">
      {!editando ? (
        <div className="hv-panel-body">
          {q.data && <p className="dados-qualificacao">{qualificacao(q.data.cliente)}</p>}
          {faltam > 0 && <p className="hv-hint">{faltam} {faltam === 1 ? 'dado em branco' : 'dados em branco'}. Os documentos marcam o que faltar.</p>}
          <Button size="sm" variant="secondary" onClick={() => setEditando(true)}>Completar dados</Button>
        </div>
      ) : (
        <form className="hv-panel-body ficha-form" onSubmit={enviar} noValidate>
          <div className="ficha-campos">
            {CAMPOS_QUALIFICACAO.map((c) => (
              <Field key={c.chave} label={c.rotulo} type={c.chave === 'nascimento' ? 'date' : 'text'} maxLength={c.chave === 'uf' ? 2 : c.chave === 'cep' ? 9 : 160}
                inputMode={c.chave === 'cep' ? 'numeric' : undefined} placeholder={c.dica} value={f[c.chave] ?? ''} onChange={(e) => setF({ ...f, [c.chave]: e.target.value })} />
            ))}
          </div>
          {erro && <p className="hv-error" role="alert">{erro}</p>}
          <div className="catalogo-linha"><Button type="submit" loading={salvar.isPending}>Salvar dados</Button><Button variant="ghost" onClick={() => setEditando(false)}>Cancelar</Button></div>
        </form>
      )}
    </Panel>
  )
}
