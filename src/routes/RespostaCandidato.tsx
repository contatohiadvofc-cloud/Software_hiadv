import { useEffect, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../lib/contexto'
import { NOMES_RESPOSTA, salarioTela, type TipoResposta } from '../data/recrutamento'

const dataBr = (iso: string) => iso.split('-').reverse().join('/')
const diaSemana = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' })

/** Link que o candidato recebe: confirma a entrevista ou pede outro horário; aceita ou recusa a proposta. Sem login. */
export function RespostaCandidato() {
  const api = useApi(); const qc = useQueryClient()
  const { token } = useParams({ strict: false }) as { token: string }
  const q = useQuery({ queryKey: ['resposta', token], queryFn: () => api.respostaVer(token), retry: false, refetchOnWindowFocus: false })
  const [pedir, setPedir] = useState(false)
  const [msg, setMsg] = useState('')
  const [confirmarAceite, setConfirmarAceite] = useState<TipoResposta | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const enviar = useMutation({ mutationFn: (t: TipoResposta) => api.respostaEnviar(token, t, msg),
    onSuccess: () => { setErro(null); setPedir(false); setConfirmarAceite(null); qc.invalidateQueries({ queryKey: ['resposta', token] }) }, onError: (e) => setErro((e as Error).message) })
  const r = q.data
  useEffect(() => { document.title = r ? `${r.vaga} · ${r.escritorio}` : 'Resposta' }, [r])
  if (q.isLoading) return <main className="vg"><p className="vg-centro" role="status">Carregando…</p></main>
  if (q.isError || !r) return <main className="vg"><section className="vg-centro"><h1>Link inválido</h1><p>Confira se o endereço está completo ou fale com o escritório.</p></section></main>
  const e = r.entrevista, p = r.proposta
  const mostrarProposta = !!p
  return (
    <main className="vg">
      <article className="vg-coluna vg-resp">
        <header className="vg-topo vg-topo-resp"><p className="vg-emp">{r.escritorio}</p><h1>Olá, {r.nome}!</h1><p className="vg-meta"><span>{r.vaga}</span></p></header>
        {r.resposta && <p className="vg-ok" role="status">Resposta registrada: <strong>{NOMES_RESPOSTA[r.resposta.tipo]}</strong>. O escritório já pode ver.</p>}
        {mostrarProposta ? (
          <section className="vg-sec">
            <h2>Sua proposta</h2>
            <dl className="vg-tabela">
              <div><dt>Cargo</dt><dd>{p.cargo} ({p.regime})</dd></div>
              <div><dt>Salário</dt><dd>{salarioTela(p.salario)}{p.bonus ? ` ${p.bonus}` : ''}</dd></div>
              {p.jornada && <div><dt>Jornada</dt><dd>{p.jornada}</dd></div>}
              {p.beneficios.length > 0 && <div><dt>Benefícios</dt><dd>{p.beneficios.join(', ')}</dd></div>}
              <div><dt>Início</dt><dd>{dataBr(p.inicio)}{p.local ? ` · ${p.local}` : ''}</dd></div>
              <div><dt>Responder até</dt><dd>{dataBr(p.responderAte)}</dd></div>
            </dl>
            {p.mensagem && <p className="vg-recado">{p.mensagem}</p>}
            {!confirmarAceite ? (
              <div className="vg-botoes">
                <button type="button" className="vg-botao" onClick={() => setConfirmarAceite('aceitar')}>Aceitar proposta</button>
                <button type="button" className="vg-botao vg-botao-claro" onClick={() => setConfirmarAceite('recusar')}>Recusar</button>
              </div>
            ) : (
              <div className="vg-confirma" role="alert">
                <p>{confirmarAceite === 'aceitar' ? 'Confirmar que você aceita esta proposta?' : 'Confirmar que você recusa esta proposta?'}</p>
                <div className="vg-botoes">
                  <button type="button" className="vg-botao" disabled={enviar.isPending} onClick={() => enviar.mutate(confirmarAceite)}>Confirmar</button>
                  <button type="button" className="vg-botao vg-botao-claro" onClick={() => setConfirmarAceite(null)}>Voltar</button>
                </div>
              </div>
            )}
          </section>
        ) : e ? (
          <section className="vg-sec">
            <h2>Entrevista {e.modo === 'video' ? 'por vídeo' : 'presencial'}</h2>
            <dl className="vg-tabela">
              <div><dt>Quando</dt><dd>{diaSemana(e.data)}, {dataBr(e.data)} às {e.hora} ({e.duracao} min)</dd></div>
              <div><dt>Onde</dt><dd>{e.modo === 'presencial' ? e.local : e.link ? <a href={e.link} target="_blank" rel="noopener noreferrer">Entrar na chamada</a> : 'O link chega antes do horário'}</dd></div>
              {e.com && <div><dt>Com</dt><dd>{e.com}</dd></div>}
              {e.modo === 'presencial' && e.levar && <div><dt>Levar</dt><dd>{e.levar}</dd></div>}
            </dl>
            {e.modo === 'video' && e.gravacao && <p className="vg-recado">Se você concordar na hora, a conversa é gravada e transcrita só para avaliar esta vaga.</p>}
            {!pedir ? (
              <div className="vg-botoes">
                <button type="button" className="vg-botao" disabled={enviar.isPending} onClick={() => enviar.mutate('confirmar')}>Confirmar presença</button>
                <button type="button" className="vg-botao vg-botao-claro" onClick={() => setPedir(true)}>Pedir outro horário</button>
              </div>
            ) : (
              <div className="vg-form">
                <label className="adm-campo"><span>Quais dias e horários ficam melhores?</span>
                  <textarea className="hv-input" rows={3} maxLength={500} value={msg} onChange={(x) => setMsg(x.target.value)} /></label>
                <div className="vg-botoes">
                  <button type="button" className="vg-botao" disabled={enviar.isPending} onClick={() => enviar.mutate('outro_horario')}>Enviar</button>
                  <button type="button" className="vg-botao vg-botao-claro" onClick={() => setPedir(false)}>Voltar</button>
                </div>
              </div>
            )}
          </section>
        ) : <p className="vg-sec">Ainda não há entrevista nem proposta para responder.</p>}
        {erro && <p className="ad-erro vg-sec" role="alert">{erro}</p>}
        <footer className="vg-rodape">Processo seletivo do {r.escritorio} no HiAdv</footer>
      </article>
    </main>
  )
}
