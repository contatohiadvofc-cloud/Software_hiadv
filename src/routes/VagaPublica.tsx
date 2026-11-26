import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useApi } from '../lib/contexto'
import { salarioTela, validarCandidatura, validarCurriculo, type FormCandidatura } from '../data/recrutamento'
import { Field } from '../design/components/Field'

const VAZIO: FormCandidatura = { nome: '', email: '', whatsapp: '', cidade: '', uf: '', linkedin: '', respostas: {}, consentimento: false, bancoTalentos: false }
const dataTela = (iso: string) => iso.split('-').reverse().join('/')
const iniciais = (n: string) => n.split(/\s+/).filter((p) => p.length > 2 && !/^(de|da|do|dos|das|e)$/i.test(p)).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'V'

/** Página pública de uma vaga: hiadv.com.br/vagas/<escritório>/<vaga>. Candidatura sem login, com aceite da LGPD. */
export function VagaPublica() {
  const api = useApi()
  const { escritorio, vaga } = useParams({ strict: false }) as { escritorio: string; vaga: string }
  const q = useQuery({ queryKey: ['vaga-publica', escritorio, vaga], queryFn: () => api.vagaPublica(escritorio, vaga), retry: false, refetchOnWindowFocus: false })
  const [f, setF] = useState<FormCandidatura>(VAZIO)
  const [cv, setCv] = useState<File | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)
  const [abrir, setAbrir] = useState(false)
  const form = useRef<HTMLElement>(null)
  const v = q.data
  useEffect(() => { document.title = v ? `${v.titulo} · ${v.escritorio}` : 'Vaga' }, [v])
  useEffect(() => { if (abrir) form.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }) }, [abrir])
  const enviar = useMutation({ mutationFn: () => api.candidaturaEnviar(v!.id, f, cv), onSuccess: () => { setEnviado(true); window.scrollTo?.(0, 0) }, onError: (e) => setErro((e as Error).message) })
  function candidatar(e: FormEvent) { e.preventDefault(); const m = validarCandidatura(f, v?.perguntas ?? []); setErro(m); if (!m) enviar.mutate() }

  if (q.isLoading) return <main className="vg"><p className="vg-centro" role="status">Carregando a vaga…</p></main>
  if (q.isError) return <main className="vg"><p className="vg-centro" role="alert">Não foi possível carregar a vaga. Verifique a internet e tente de novo.</p></main>
  if (!v) return <main className="vg"><section className="vg-centro"><h1>Vaga não encontrada</h1><p>O endereço pode estar errado ou a vaga foi retirada.</p></section></main>

  if (enviado) return (
    <main className="vg"><section className="vg-centro" role="status"><h1>Inscrição recebida.</h1>
      <p>Obrigado, {f.nome.split(' ')[0]}. A equipe do {v.escritorio} vai analisar e dar retorno pelo WhatsApp ou e-mail informado.</p></section></main>
  )

  const lista = (titulo: string, itens: string[]) => itens.length > 0 && <section className="vg-sec"><h2>{titulo}</h2><ul>{itens.map((i) => <li key={i}>{i}</li>)}</ul></section>
  return (
    <main className="vg">
      <article className="vg-coluna">
        <div className="vg-capa" aria-hidden="true" />
        <header className="vg-topo">
          <span className="vg-logo" aria-hidden="true">{iniciais(v.escritorio)}</span>
          <p className="vg-emp">{v.escritorio}{v.cidadeEscritorio ? ` · ${v.cidadeEscritorio}` : ''}</p>
          <h1>{v.titulo}</h1>
          <p className="vg-meta">{[v.regime, v.modalidade, v.jornada, v.cidade, `${v.quantidade} ${v.quantidade === 1 ? 'vaga' : 'vagas'}`].filter(Boolean).map((x) => <span key={x}>{x}</span>)}</p>
        </header>
        {(
          <div className="vg-salario">
            {v.salario !== null ? <div><small>Salário</small><b>{salarioTela(v.salario)}</b>{v.salarioObs && <small>{v.salarioObs}</small>}</div> : <div><small>Salário</small><b>A combinar</b></div>}
            {v.inscricoesAte && <div className="vg-dir"><small>Inscrições até</small><b>{dataTela(v.inscricoesAte)}</b></div>}
          </div>
        )}
        {v.beneficios.length > 0 && <section className="vg-sec"><h2>Benefícios</h2><ul className="vg-beneficios">{v.beneficios.map((b) => <li key={b}>{b}</li>)}</ul></section>}
        {lista('O que você vai fazer', v.atividades)}
        {lista('O que buscamos', v.requisitos)}
        {lista('Diferenciais', v.diferenciais)}
        <section className="vg-sec"><h2>Como é o processo</h2>
          <ol className="vg-etapas"><li>Inscrição com currículo</li><li>Análise da equipe</li><li>Entrevista por vídeo ou presencial</li><li>Proposta</li></ol></section>

        {!v.aberta && <p className="vg-aviso" role="status">Esta vaga não está recebendo inscrições no momento.</p>}

        {v.aberta && abrir && (
          <section className="vg-sec vg-form" ref={form} aria-labelledby="vg-insc">
            <h2 id="vg-insc">Sua inscrição</h2>
            <form onSubmit={candidatar} noValidate>
              <Field label="Nome completo" autoComplete="name" maxLength={120} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
              <Field label="E-mail" type="email" autoComplete="email" maxLength={160} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
              <Field label="WhatsApp" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="(49) 99999-0000" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} />
              <div className="vg-duas">
                <Field label="Cidade" autoComplete="address-level2" maxLength={80} value={f.cidade} onChange={(e) => setF({ ...f, cidade: e.target.value })} />
                <Field label="UF" maxLength={2} value={f.uf} onChange={(e) => setF({ ...f, uf: e.target.value.toUpperCase() })} />
              </div>
              <Field label="LinkedIn (opcional)" inputMode="url" maxLength={200} placeholder="https://www.linkedin.com/in/..." value={f.linkedin} onChange={(e) => setF({ ...f, linkedin: e.target.value })} />
              <label className="adm-campo"><span>Currículo em PDF (opcional, até 5 MB)</span>
                <input className="hv-input" type="file" accept="application/pdf,.pdf" onChange={(e) => {
                  const a = e.target.files?.[0] ?? null
                  if (a) { const m = validarCurriculo(a); if (m) { setErro(m); e.target.value = ''; setCv(null); return } }
                  setErro(null); setCv(a)
                }} />
              </label>
              {v.perguntas.map((p, i) => (
                <label key={i} className="adm-campo"><span>{p}</span>
                  <textarea className="hv-input" rows={3} maxLength={1500} value={f.respostas[String(i)] ?? ''} onChange={(e) => setF({ ...f, respostas: { ...f.respostas, [String(i)]: e.target.value } })} />
                </label>
              ))}
              <label className="ad-consent"><input type="checkbox" checked={f.consentimento} onChange={(e) => setF({ ...f, consentimento: e.target.checked })} />
                <span>Concordo que o {v.escritorio} use estes dados só para este processo seletivo. Eles são apagados em até 6 meses, e posso pedir a exclusão antes.</span></label>
              <label className="ad-consent"><input type="checkbox" checked={f.bancoTalentos} onChange={(e) => setF({ ...f, bancoTalentos: e.target.checked })} />
                <span>Quero ficar no banco de talentos para outras vagas por até 1 ano (opcional).</span></label>
              {erro && <p className="ad-erro" role="alert">{erro}</p>}
              <button type="submit" className="vg-botao" disabled={enviar.isPending}>{enviar.isPending ? 'Enviando…' : 'Enviar inscrição'}</button>
            </form>
          </section>
        )}
        <footer className="vg-rodape">Vaga publicada pelo {v.escritorio} no HiAdv</footer>
      </article>
      {v.aberta && !abrir && <div className="vg-fixo"><button type="button" className="vg-botao" onClick={() => setAbrir(true)}>Candidatar-se</button><small>Leva cerca de 3 minutos.</small></div>}
    </main>
  )
}
