import { Carregando } from '../design/components/Carregando'
import { useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '../lib/contexto'
import { validarToken } from '../data/portal'
import { linkWhatsapp } from '../data/clientes'
import { dataTela } from '../data/publicacoes'
import { Panel } from '../design/components/Panel'
import { ErrorState } from '../design/components/ErrorState'

const quandoTela = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })

/** Página do cliente: abre só pelo link pessoal, sem senha. Mostra o mínimo, em linguagem simples. */
export function Acompanhar() {
  const { token } = useParams({ strict: false }) as { token: string }
  const api = useApi()
  const ok = validarToken(token ?? '')
  const q = useQuery({ queryKey: ['acompanhar', token], queryFn: () => api.portal(token), enabled: ok, retry: false, refetchOnWindowFocus: false })
  const p = q.data
  const wa = p ? linkWhatsapp(p.escritorio.whatsapp) : null

  return (
    <main className="acomp">
      <div className="acomp-caixa">
        {(!ok || (q.isSuccess && !p)) && (
          <Panel>
            <div className="hv-panel-body">
              <h1 className="acomp-titulo">Este link não está mais valendo</h1>
              <p className="muted">Ele pode ter vencido ou sido trocado por um novo. Peça um link atualizado ao seu escritório.</p>
            </div>
          </Panel>
        )}
        {q.isLoading && <Carregando texto="Carregando…" />}
        {q.isError && <Panel><ErrorState onRetry={() => q.refetch()} /></Panel>}
        {p && <>
          <header className="acomp-cabeca">
            <p className="acomp-escritorio">{p.escritorio.nome}</p>
            <h1 className="acomp-titulo">Olá{p.cliente ? `, ${p.cliente}` : ''}!</h1>
            <p className="muted">Aqui você acompanha o andamento do seu caso.</p>
          </header>

          <Panel title={p.casos.length === 1 ? 'Seu caso' : 'Seus casos'} labelId="acomp-casos">
            {p.casos.length === 0 && <p className="hv-panel-body muted">O seu caso está sendo cadastrado. Em breve aparece aqui.</p>}
            <ul className="acomp-lista">
              {p.casos.map((c, i) => (
                <li key={i} className="acomp-caso" data-concluido={c.concluido ? 'true' : undefined}>
                  <span className="acomp-area">{c.area}</span>
                  <strong className="acomp-fase">{c.fase}</strong>
                  {c.desde && !c.concluido && <span className="muted">Nesta fase desde {dataTela(c.desde)}</span>}
                </li>
              ))}
            </ul>
          </Panel>

          {p.compromissos.length > 0 && (
            <Panel title="Seus próximos compromissos" labelId="acomp-comp">
              <ul className="acomp-lista">
                {p.compromissos.map((c, i) => (
                  <li key={i} className="acomp-caso">
                    <span className="acomp-area">{c.tipo}</span>
                    <strong className="acomp-fase">{quandoTela(c.quando)}</strong>
                    {c.local && <span className="muted">{c.local}</span>}
                  </li>
                ))}
              </ul>
              <p className="hv-panel-body hv-hint">Leve documento com foto e todos os exames e laudos que tiver. Na dúvida, fale com o escritório antes.</p>
            </Panel>
          )}

          {wa && <a className="hv-btn acomp-wa" data-variant="primary" href={`${wa}?text=${encodeURIComponent('Olá! Estou vendo o acompanhamento do meu caso e tenho uma dúvida.')}`} target="_blank" rel="noopener noreferrer">Falar com o escritório no WhatsApp</a>}
          <p className="acomp-rodape muted">Este link é pessoal e vale até {dataTela(p.expiraEm.slice(0, 10))}. Não compartilhe. As informações são atualizadas pela equipe do escritório.</p>
        </>}
      </div>
    </main>
  )
}
