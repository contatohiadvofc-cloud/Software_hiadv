import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { linkPortal, mensagemPortal } from '../data/portal'
import { linkWhatsapp } from '../data/clientes'
import { dataTela } from '../data/publicacoes'
import { Panel } from '../design/components/Panel'
import { Button } from '../design/components/Button'
import { useToast } from '../design/components/Toast'

/** Link de acompanhamento: o cliente vê a fase do caso e os próximos compromissos, sem senha. O envio é sempre pelo advogado. */
export function AcompanhamentoCliente({ cliente }: { cliente: { id: string; nome: string; telefone: string | null } }) {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const { perfil } = useSessao()
  const chave = ['portal', perfil?.escritorioId, cliente.id]
  const sit = useQuery({ queryKey: chave, queryFn: () => api.portalSituacao(cliente.id), enabled: !!perfil })
  const [link, setLink] = useState<string | null>(null)
  const gerar = useMutation({
    mutationFn: () => api.portalGerar(cliente.id),
    onSuccess: (r) => {
      setLink(linkPortal(window.location.origin + window.location.pathname.replace(/\/clientes\/.*$/, ''), r.token, import.meta.env.VITE_PREVIA === '1'))
      qc.invalidateQueries({ queryKey: chave })
    },
    onError: (e) => toast((e as Error).message),
  })
  const revogar = useMutation({
    mutationFn: () => api.portalRevogar(cliente.id),
    onSuccess: () => { setLink(null); toast('Link desativado. O cliente não consegue mais abrir.'); qc.invalidateQueries({ queryKey: chave }) },
    onError: (e) => toast((e as Error).message),
  })
  const wa = linkWhatsapp(cliente.telefone)
  const msg = link ? mensagemPortal(cliente.nome, perfil?.escritorioNome ?? 'escritório', link) : ''
  async function copiar() {
    try { await navigator.clipboard.writeText(link!); toast('Link copiado.') } catch { toast('Não deu para copiar. Selecione o link e copie.') }
  }
  const s = sit.data
  return (
    <Panel title="Acompanhamento pelo cliente" labelId="cli-acomp">
      <div className="hv-panel-body catalogo-pilha">
        <p className="muted">O cliente abre um link pessoal (sem senha) e vê a fase do caso em linguagem simples e os próximos compromissos. Não aparece nenhum documento nem anotação interna.</p>
        {s?.ativo && !link && <p className="hv-hint">Link ativo até {dataTela(s.expiraEm!.slice(0, 10))}. {s.acessos ? `Aberto ${s.acessos} ${s.acessos === 1 ? 'vez' : 'vezes'}.` : 'Ainda não foi aberto.'} Por segurança, o link só aparece quando é gerado; gere um novo para enviar de novo.</p>}
        {link && <>
          <div className="hv-field">
            <label htmlFor="acomp-link">Link do cliente</label>
            <input id="acomp-link" className="hv-input" readOnly value={link} onFocus={(e) => e.target.select()} />
            <span className="hv-hint">Vale por 90 dias. Gerar outro desativa este.</span>
          </div>
          <div className="catalogo-linha">
            {wa && <a className="hv-btn" data-variant="primary" data-size="sm" href={`${wa}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">Enviar pelo WhatsApp</a>}
            <Button size="sm" variant="secondary" onClick={copiar}>Copiar link</Button>
          </div>
          {!wa && <p className="hv-hint">Cadastre o telefone do cliente para enviar direto pelo WhatsApp.</p>}
        </>}
        <div className="catalogo-linha">
          <Button size="sm" variant={link ? 'ghost' : 'secondary'} loading={gerar.isPending} onClick={() => gerar.mutate()}>{s?.ativo || link ? 'Gerar link novo' : 'Gerar link de acompanhamento'}</Button>
          {(s?.ativo || link) && <Button size="sm" variant="ghost" loading={revogar.isPending} onClick={() => revogar.mutate()}>Desativar link</Button>}
        </div>
      </div>
    </Panel>
  )
}
