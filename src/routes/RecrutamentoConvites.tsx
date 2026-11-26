import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../lib/contexto'
import { NOMES_RESPOSTA, entrevistaVazia, linkResposta, listaDeTexto, propostaDaVaga, salarioTela, textoConvite, textoProposta, validarEntrevista, validarProposta,
  type Candidatura, type Entrevista, type Proposta, type Vaga } from '../data/recrutamento'
import { linkWhatsapp } from '../data/clientes'
import { Button } from '../design/components/Button'
import { Field } from '../design/components/Field'
import { useToast } from '../design/components/Toast'

const origem = () => (typeof window !== 'undefined' ? window.location.origin : 'https://hiadv.com.br')
const dataBr = (iso: string) => iso.split('-').reverse().join('/')

/** Mensagem pronta: o gestor copia ou abre o WhatsApp já escrito e decide enviar. Nada sai sozinho. */
function MensagemPronta({ texto, whatsapp }: { texto: string; whatsapp: string }) {
  const toast = useToast()
  const wa = linkWhatsapp(whatsapp)
  const copiar = async () => { try { await navigator.clipboard.writeText(texto); toast('Mensagem copiada.') } catch { toast('Não foi possível copiar. Selecione o texto e copie.', 'danger') } }
  return (
    <div className="rh-msg">
      <p className="muted sm">Mensagem pronta para o candidato. Revise e envie você mesmo:</p>
      <pre className="rh-msg-texto" tabIndex={0}>{texto}</pre>
      <div className="rh-acoes rh-acoes-esq">
        <Button variant="secondary" size="sm" onClick={copiar}>Copiar mensagem</Button>
        {wa && <a className="hv-btn" data-variant="secondary" data-size="sm" href={`${wa}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer">Abrir no WhatsApp</a>}
      </div>
    </div>
  )
}

function FormEntrevista({ c, aoSalvar, aoCancelar }: { c: Candidatura; aoSalvar: () => void; aoCancelar: () => void }) {
  const api = useApi(); const qc = useQueryClient(); const toast = useToast()
  const [e, setE] = useState<Entrevista>(() => c.entrevista ?? entrevistaVazia())
  const [erro, setErro] = useState<string | null>(null)
  const salvar = useMutation({ mutationFn: () => api.entrevistaSalvar(c.id, e), onSuccess: () => { toast('Entrevista marcada.'); qc.invalidateQueries({ queryKey: ['candidaturas'] }); qc.invalidateQueries({ queryKey: ['vagas'] }); aoSalvar() }, onError: (x) => setErro((x as Error).message) })
  function enviar(ev: FormEvent) { ev.preventDefault(); const m = validarEntrevista(e); setErro(m); if (!m) salvar.mutate() }
  return (
    <form className="rh-form rh-sub" onSubmit={enviar} noValidate aria-label="Chamar para entrevista">
      <div className="segmentos" role="group" aria-label="Tipo de entrevista">
        <button type="button" aria-pressed={e.modo === 'video'} onClick={() => setE({ ...e, modo: 'video' })}>Por vídeo</button>
        <button type="button" aria-pressed={e.modo === 'presencial'} onClick={() => setE({ ...e, modo: 'presencial' })}>Presencial</button>
      </div>
      <div className="rh-tres">
        <Field label="Dia" type="date" value={e.data} onChange={(x) => setE({ ...e, data: x.target.value })} />
        <Field label="Hora" type="time" value={e.hora} onChange={(x) => setE({ ...e, hora: x.target.value })} />
        <label className="adm-campo"><span>Duração</span>
          <select className="hv-input" value={e.duracao} onChange={(x) => setE({ ...e, duracao: Number(x.target.value) })}>{[20, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} minutos</option>)}</select>
        </label>
      </div>
      {e.modo === 'presencial' ? (
        <div className="rh-duas">
          <Field label="Endereço" maxLength={300} placeholder="Rua, número, sala e cidade" value={e.local} onChange={(x) => setE({ ...e, local: x.target.value })} />
          <Field label="O que levar (opcional)" maxLength={300} placeholder="Documento com foto" value={e.levar} onChange={(x) => setE({ ...e, levar: x.target.value })} />
        </div>
      ) : (
        <>
          <Field label="Link da chamada (opcional)" inputMode="url" maxLength={300} placeholder="https://" hint="Se ficar vazio, a mensagem avisa que o link chega antes do horário." value={e.link} onChange={(x) => setE({ ...e, link: x.target.value })} />
          <label className="alternar"><input type="checkbox" checked={e.gravacao} onChange={(x) => setE({ ...e, gravacao: x.target.checked })} /> Pedir aceite para gravar e transcrever a conversa</label>
        </>
      )}
      <Field label="Quem entrevista (opcional)" maxLength={200} placeholder="Felipe e Daniele" value={e.com} onChange={(x) => setE({ ...e, com: x.target.value })} />
      {erro && <p className="ad-erro" role="alert">{erro}</p>}
      <div className="rh-acoes"><Button variant="secondary" onClick={aoCancelar}>Cancelar</Button><Button type="submit" loading={salvar.isPending}>Marcar entrevista</Button></div>
    </form>
  )
}

function FormProposta({ c, vaga, aoSalvar, aoCancelar }: { c: Candidatura; vaga: Vaga; aoSalvar: () => void; aoCancelar: () => void }) {
  const api = useApi(); const qc = useQueryClient(); const toast = useToast()
  const [p, setP] = useState<Proposta>(() => c.proposta ?? propostaDaVaga(vaga))
  const [ben, setBen] = useState(p.beneficios.join('\n'))
  const [erro, setErro] = useState<string | null>(null)
  const salvar = useMutation({ mutationFn: () => api.propostaSalvar(c.id, p), onSuccess: () => { toast('Proposta registrada.'); qc.invalidateQueries({ queryKey: ['candidaturas'] }); qc.invalidateQueries({ queryKey: ['vagas'] }); aoSalvar() }, onError: (x) => setErro((x as Error).message) })
  function enviar(ev: FormEvent) { ev.preventDefault(); const m = validarProposta(p); setErro(m); if (!m) salvar.mutate() }
  return (
    <form className="rh-form rh-sub" onSubmit={enviar} noValidate aria-label="Fazer proposta">
      <p className="muted sm">Preenchido com os dados da vaga. Ajuste o que precisar.</p>
      <div className="rh-duas">
        <Field label="Cargo" maxLength={100} value={p.cargo} onChange={(x) => setP({ ...p, cargo: x.target.value })} />
        <label className="adm-campo"><span>Regime</span>
          <select className="hv-input" value={p.regime} onChange={(x) => setP({ ...p, regime: x.target.value })}>{['CLT', 'Estágio', 'PJ', 'Associado', 'Temporário'].map((r) => <option key={r}>{r}</option>)}</select>
        </label>
      </div>
      <div className="rh-tres">
        <Field label="Salário (R$)" inputMode="decimal" value={p.salario === null ? '' : String(p.salario).replace('.', ',')}
          onChange={(x) => { const t = x.target.value.replace(/[^\d,]/g, '').replace(',', '.'); setP({ ...p, salario: t === '' ? null : Number(t) }) }} />
        <Field label="Bonificação (opcional)" maxLength={120} value={p.bonus} onChange={(x) => setP({ ...p, bonus: x.target.value })} />
        <Field label="Jornada" maxLength={80} value={p.jornada} onChange={(x) => setP({ ...p, jornada: x.target.value })} />
      </div>
      <div className="rh-tres">
        <Field label="Início" type="date" value={p.inicio} onChange={(x) => setP({ ...p, inicio: x.target.value })} />
        <Field label="Responder até" type="date" value={p.responderAte} onChange={(x) => setP({ ...p, responderAte: x.target.value })} />
        <Field label="Local" maxLength={120} value={p.local} onChange={(x) => setP({ ...p, local: x.target.value })} />
      </div>
      <label className="adm-campo"><span>Benefícios <small className="muted">· um por linha</small></span>
        <textarea className="hv-input" rows={3} value={ben} onChange={(x) => { setBen(x.target.value); setP({ ...p, beneficios: listaDeTexto(x.target.value) }) }} />
      </label>
      <label className="adm-campo"><span>Mensagem pessoal (opcional)</span>
        <textarea className="hv-input" rows={2} maxLength={1000} value={p.mensagem} onChange={(x) => setP({ ...p, mensagem: x.target.value })} />
      </label>
      {erro && <p className="ad-erro" role="alert">{erro}</p>}
      <div className="rh-acoes"><Button variant="secondary" onClick={aoCancelar}>Cancelar</Button><Button type="submit" loading={salvar.isPending}>Registrar proposta</Button></div>
    </form>
  )
}

/** Bloco da ficha: entrevista e proposta, com a resposta do candidato e a mensagem pronta para enviar. */
export function ConvitesCandidato({ c, vaga, escritorio }: { c: Candidatura; vaga: Vaga; escritorio: string }) {
  const [aberto, setAberto] = useState<'entrevista' | 'proposta' | null>(null)
  const link = c.token ? linkResposta(origem(), c.token) : null
  return (
    <div className="rh-convites">
      {c.resposta && <p className="rh-resposta" role="status"><strong>{NOMES_RESPOSTA[c.resposta.tipo]}</strong>{c.resposta.msg ? `: “${c.resposta.msg}”` : ''}</p>}
      {c.entrevista && aberto !== 'entrevista' && (
        <section className="rh-bloco" aria-label="Entrevista marcada"><h3>Entrevista {c.entrevista.modo === 'video' ? 'por vídeo' : 'presencial'}</h3>
          <p>{dataBr(c.entrevista.data)} às {c.entrevista.hora} · {c.entrevista.duracao} min{c.entrevista.modo === 'presencial' ? ` · ${c.entrevista.local}` : ''}</p>
          {link && <MensagemPronta texto={textoConvite(c.nome, escritorio, vaga.titulo, c.entrevista, link)} whatsapp={c.whatsapp} />}
        </section>
      )}
      {c.proposta && aberto !== 'proposta' && (
        <section className="rh-bloco" aria-label="Proposta registrada"><h3>Proposta</h3>
          <p>{c.proposta.cargo} · {salarioTela(c.proposta.salario)} · início {dataBr(c.proposta.inicio)} · responder até {dataBr(c.proposta.responderAte)}</p>
          {link && <MensagemPronta texto={textoProposta(c.nome, escritorio, c.proposta, link)} whatsapp={c.whatsapp} />}
        </section>
      )}
      {aberto === 'entrevista' && <FormEntrevista c={c} aoSalvar={() => setAberto(null)} aoCancelar={() => setAberto(null)} />}
      {aberto === 'proposta' && <FormProposta c={c} vaga={vaga} aoSalvar={() => setAberto(null)} aoCancelar={() => setAberto(null)} />}
      {!aberto && (
        <div className="rh-acoes rh-acoes-esq">
          <Button variant="secondary" size="sm" onClick={() => setAberto('entrevista')}>{c.entrevista ? 'Remarcar entrevista' : 'Chamar para entrevista'}</Button>
          <Button variant="secondary" size="sm" onClick={() => setAberto('proposta')}>{c.proposta ? 'Ajustar proposta' : 'Fazer proposta'}</Button>
        </div>
      )}
    </div>
  )
}
