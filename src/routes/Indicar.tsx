import { useQuery } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { NOMES_CORTESIA, NOMES_STATUS, REGRA_CORTESIA, linkIndicacao, mensagemIndicacao, plano, resumoIndicacoes } from '../data/adesao'
import { dataTela } from '../data/publicacoes'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'
import { Button } from '../design/components/Button'
import { Badge } from '../design/components/Badge'
import { useToast } from '../design/components/Toast'

/** Indique o HiAdv: link pessoal, quem aderiu por ele e as cortesias do escritório. */
export function Indicar() {
  const api = useApi()
  const toast = useToast()
  const { perfil } = useSessao()
  const gestor = perfil?.papel === 'master' || !!perfil?.code
  const cod = useQuery({ queryKey: ['indicacao-codigo', perfil?.email], queryFn: () => api.indicacaoCodigo(), enabled: !!perfil, staleTime: Infinity })
  const lista = useQuery({ queryKey: ['indicacoes', perfil?.escritorioId], queryFn: () => api.indicacoes(), enabled: !!perfil })
  const link = cod.data ? linkIndicacao(window.location.origin + window.location.pathname.replace(/\/indicar.*$/, ''), cod.data, import.meta.env.VITE_PREVIA === '1') : ''
  const res = resumoIndicacoes(lista.data ?? [])
  async function copiar() {
    try { await navigator.clipboard.writeText(link); toast('Link copiado.') } catch { toast('Não deu para copiar. Selecione o link e copie.') }
  }
  return (
    <div className="pagina">
      <div className="pagina-cabeca"><div><h1>Indique o HiAdv</h1><p className="muted">{REGRA_CORTESIA}</p></div></div>

      <Panel title="Seu link" labelId="ind-link">
        <div className="hv-panel-body catalogo-pilha">
          {cod.isError && <ErrorState onRetry={() => cod.refetch()} />}
          {cod.isLoading && <p className="muted" role="status">Preparando o seu link…</p>}
          {cod.data && <>
            <div className="hv-field">
              <label htmlFor="ind-url">Link pessoal de indicação</label>
              <input id="ind-url" className="hv-input" readOnly value={link} onFocus={(e) => e.target.select()} />
              <span className="hv-hint">Quem abrir o link responde 5 perguntas, vê o plano indicado e pede a adesão. A indicação fica registrada no seu nome.</span>
            </div>
            <div className="catalogo-linha">
              <a className="hv-btn" data-variant="primary" data-size="sm" href={`https://wa.me/?text=${encodeURIComponent(mensagemIndicacao(link))}`} target="_blank" rel="noopener noreferrer">Enviar pelo WhatsApp</a>
              <Button size="sm" variant="secondary" onClick={copiar}>Copiar link</Button>
            </div>
          </>}
        </div>
      </Panel>

      <Panel title={gestor ? 'Indicações do escritório' : 'Suas indicações'} labelId="ind-lista">
        {lista.isError && <ErrorState onRetry={() => lista.refetch()} />}
        {lista.isSuccess && lista.data.length === 0 && <Empty title="Ninguém aderiu pelo link ainda.">Quando alguém pedir a adesão pelo seu link, aparece aqui, com a situação e a cortesia.</Empty>}
        {lista.isSuccess && lista.data.length > 0 && <>
          <dl className="fin-cartoes ind-resumo">
            <div className="fin-cartao"><dt>Indicados</dt><dd>{res.total}</dd></div>
            <div className="fin-cartao"><dt>Ativados</dt><dd>{res.ativadas}</dd></div>
            <div className="fin-cartao"><dt>Mensalidades com 20%</dt><dd>{res.meses}</dd></div>
          </dl>
          <ul className="fin-lista">
            {lista.data.map((x) => (
              <li key={x.id} className="fin-linha">
                <div className="fin-texto">
                  <span className="fin-titulo">{x.primeiroNome} · {plano(x.plano).nome}</span>
                  <span className="fin-sub">{NOMES_STATUS[x.status]} desde {dataTela(x.criadoEm.slice(0, 10))}{gestor && !x.minha && x.quem ? ` · indicado por ${x.quem.split('@')[0]}` : ''}</span>
                </div>
                {x.cortesia !== 'nenhuma' && <Badge tone={x.cortesia === 'aplicada' ? 'success' : 'info'}>{NOMES_CORTESIA[x.cortesia]}</Badge>}
              </li>
            ))}
          </ul>
        </>}
      </Panel>
    </div>
  )
}
