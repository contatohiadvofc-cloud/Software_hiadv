import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearch } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useApi } from '../lib/contexto'
import { PERGUNTAS, PLANOS, WHATSAPP_HIADV, alternar, codigoValido, plano as dadosPlano, preco, recomendar, validarAdesao,
  type FormAdesao, type PlanoId, type Respostas } from '../data/adesao'
import { Field } from '../design/components/Field'

type Etapa = 'inicio' | number | 'relatorio' | 'enviado'
const VAZIO: FormAdesao = { nome: '', email: '', whatsapp: '', oab: '', escritorio: '', cidade: '', uf: '', consentimento: false }

function Sinal() {
  return (
    <span className="ad-marca">
      <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#ffffff" />
        <path d="M10 7.5v17M22 13.5v11M10 16h12" stroke="#7a1f33" strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="22" cy="8" r="2.1" fill="#f0b7c2" />
      </svg>
      <span>HiAdv</span>
    </span>
  )
}

/** Página pública: 5 perguntas, o plano recomendado e o pedido de adesão. Nada é liberado sem a equipe do HiAdv. */
export function Aderir() {
  const api = useApi()
  const busca = useSearch({ strict: false }) as { ref?: string; previa?: string }
  const ref = busca.ref && codigoValido(busca.ref) ? busca.ref.toUpperCase() : null
  const vagas = useQuery({ queryKey: ['adesao-vagas'], queryFn: () => api.adesaoVagas(), retry: false, refetchOnWindowFocus: false })
  const [etapa, setEtapa] = useState<Etapa>('inicio')
  const [r, setR] = useState<Respostas>({})
  const [escolhido, setEscolhido] = useState<PlanoId | null>(null)
  const [f, setF] = useState<FormAdesao>(VAZIO)
  const [erro, setErro] = useState<string | null>(null)
  const rec = useMemo(() => recomendar(r), [r])
  const plano = escolhido ?? rec.plano
  const fundador = (vagas.data ?? 0) > 0

  useEffect(() => { document.title = 'Aderir ao HiAdv' }, [])
  useEffect(() => { window.scrollTo?.(0, 0) }, [etapa])

  const enviar = useMutation({
    mutationFn: () => api.adesaoEnviar({ ...f, plano, recomendado: rec.plano, respostas: r, ref }),
    onSuccess: () => setEtapa('enviado'),
    onError: (e) => setErro((e as Error).message),
  })
  function pedir(e: FormEvent) {
    e.preventDefault()
    const m = validarAdesao(f); setErro(m)
    if (!m) enviar.mutate()
  }

  const passo = typeof etapa === 'number' ? PERGUNTAS[etapa] : null
  const respondida = passo ? (passo.multipla ? ((r[passo.id] as string[] | undefined)?.length ?? 0) > 0 : !!r[passo.id]) : false
  const avancar = () => setEtapa(typeof etapa === 'number' && etapa < PERGUNTAS.length - 1 ? etapa + 1 : 'relatorio')
  const p = dadosPlano(plano)

  return (
    <main className="ad">
      <div className="ad-coluna">
        <header className="ad-topo"><Sinal />{ref && <span className="ad-ref">Indicação {ref}</span>}<a className="voltar-site" href={ref ? `/?ref=${ref}` : '/'}><span aria-hidden="true">‹</span> Voltar ao site</a></header>

        {etapa === 'inicio' && (
          <section className="ad-inicio" aria-labelledby="ad-titulo">
            {busca.previa === 'usada' && <p className="ad-nota" role="status">Você já fez a prévia hoje neste aparelho. O próximo passo é o teste de 14 dias, com os dados do seu escritório e sem perder nada ao contratar.</p>}
            <h1 id="ad-titulo">Qual HiAdv combina com o seu escritório?</h1>
            <p>Cinco perguntas, menos de um minuto. No fim você vê o plano recomendado, o que ele inclui e pede a adesão. Quem libera o acesso é a equipe do HiAdv, pelo WhatsApp.</p>
            <button type="button" className="ad-botao ad-botao-claro" onClick={() => setEtapa(0)}>Começar</button>
            {fundador && <p className="ad-nota">Lançamento: restam {vagas.data} de 20 vagas de fundador, com implantação assistida sem custo.</p>}
          </section>
        )}

        {passo && typeof etapa === 'number' && (
          <section className="ad-cartao" aria-labelledby="ad-pergunta">
            <div className="ad-progresso" role="progressbar" aria-label="Progresso" aria-valuemin={1} aria-valuemax={PERGUNTAS.length} aria-valuenow={etapa + 1}>
              <span style={{ width: `${((etapa + 1) / PERGUNTAS.length) * 100}%` }} />
            </div>
            <p className="ad-contador">Pergunta {etapa + 1} de {PERGUNTAS.length}</p>
            <h2 id="ad-pergunta">{passo.titulo}</h2>
            {passo.dica && <p className="ad-dica">{passo.dica}</p>}
            <div className="ad-opcoes" role="group" aria-labelledby="ad-pergunta">
              {passo.opcoes.map((o) => {
                const marcado = passo.multipla ? ((r[passo.id] as string[] | undefined) ?? []).includes(o.valor) : r[passo.id] === o.valor
                return (
                  <button key={o.valor} type="button" className="ad-opcao" aria-pressed={marcado}
                    onClick={() => {
                      if (passo.multipla) setR({ ...r, [passo.id]: alternar(r[passo.id] as string[] | undefined, o.valor, passo.max) })
                      else { setR({ ...r, [passo.id]: o.valor }); setTimeout(avancar, 160) }
                    }}>
                    {o.rotulo}
                  </button>
                )
              })}
            </div>
            <div className="ad-navega">
              <button type="button" className="ad-voltar" onClick={() => setEtapa(etapa === 0 ? 'inicio' : etapa - 1)}>Voltar</button>
              {passo.multipla && <button type="button" className="ad-botao" disabled={!respondida} onClick={avancar}>{etapa === PERGUNTAS.length - 1 ? 'Ver meu plano' : 'Continuar'}</button>}
            </div>
          </section>
        )}

        {etapa === 'relatorio' && (
          <>
            <section className="ad-cartao ad-relatorio" aria-labelledby="ad-plano">
              <p className="ad-contador">Seu plano recomendado</p>
              <h2 id="ad-plano" className="ad-plano-nome">{dadosPlano(rec.plano).nome}</h2>
              <ul className="ad-motivos">{rec.motivos.map((m) => <li key={m}>{m}</li>)}</ul>
              {rec.plano === 'supremo' && rec.comecarCom && (
                <p className="ad-aviso">O Sênior é liberado quando a IA e a leitura no Google Drive ficarem prontas. Você pode entrar na lista agora ou começar pelo {dadosPlano(rec.comecarCom).nome} e mudar depois.</p>
              )}
            </section>

            <section className="ad-cartao" aria-labelledby="ad-escolha">
              <h2 id="ad-escolha">Escolha o plano</h2>
              <div className="ad-planos" role="radiogroup" aria-labelledby="ad-escolha">
                {PLANOS.map((x) => (
                  <button key={x.id} type="button" role="radio" aria-checked={plano === x.id} className="ad-plano" onClick={() => setEscolhido(x.id)}>
                    <span className="ad-plano-topo"><strong>{x.nome}</strong>{x.id === rec.plano && <span className="ad-selo">Recomendado</span>}{x.emBreve && <span className="ad-selo ad-selo-claro">Em breve</span>}</span>
                    <span className="ad-preco">{preco(fundador ? x.fundador : x.preco)}<small>/mês</small></span>
                    {fundador && x.fundador < x.preco && <span className="ad-depois">Fundador por 12 meses, depois {preco(x.preco)}</span>}
                    <span className="ad-resumo">{x.resumo}</span>
                  </button>
                ))}
              </div>
              <h3 className="ad-sub">O que o {p.nome} inclui</h3>
              <ul className="ad-inclui">{p.destaques.map((d) => <li key={d}>{d}</li>)}</ul>
              <p className="ad-dica">{p.limites}. 14 dias grátis.{fundador ? ' Fundadores ganham a implantação assistida.' : ''} Sem cartão para começar.</p>
            </section>

            <section className="ad-cartao" aria-labelledby="ad-dados">
              <h2 id="ad-dados">{p.emBreve ? 'Entrar na lista do Sênior' : 'Pedir adesão'}</h2>
              <p className="ad-dica">{p.emBreve ? 'Avisamos você pelo WhatsApp assim que o Sênior for liberado. Nada é cobrado agora.' : 'A equipe do HiAdv chama você pelo WhatsApp para liberar o acesso e ajudar na configuração.'}</p>
              <form className="ad-form" onSubmit={pedir} noValidate>
                <Field label="Nome completo" autoComplete="name" maxLength={160} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
                <Field label="E-mail" type="email" autoComplete="email" maxLength={160} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
                <Field label="WhatsApp" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="(49) 99999-0000" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} />
                <div className="ad-duas">
                  <Field label="OAB (opcional)" maxLength={20} placeholder="SC 12.345" value={f.oab} onChange={(e) => setF({ ...f, oab: e.target.value })} />
                  <Field label="Escritório (opcional)" maxLength={160} value={f.escritorio} onChange={(e) => setF({ ...f, escritorio: e.target.value })} />
                </div>
                <div className="ad-duas ad-cidade">
                  <Field label="Cidade (opcional)" maxLength={80} value={f.cidade} onChange={(e) => setF({ ...f, cidade: e.target.value })} />
                  <Field label="UF" maxLength={2} value={f.uf} onChange={(e) => setF({ ...f, uf: e.target.value.toUpperCase() })} />
                </div>
                <label className="ad-consent">
                  <input type="checkbox" checked={f.consentimento} onChange={(e) => setF({ ...f, consentimento: e.target.checked })} />
                  <span>Concordo que o HiAdv use estes dados só para falar comigo sobre a adesão.</span>
                </label>
                {erro && <p className="ad-erro" role="alert">{erro}</p>}
                <div className="ad-navega">
                  <button type="button" className="ad-voltar" onClick={() => setEtapa(PERGUNTAS.length - 1)}>Voltar</button>
                  <button type="submit" className="ad-botao" disabled={enviar.isPending}>{enviar.isPending ? 'Enviando…' : p.emBreve ? 'Entrar na lista' : 'Pedir adesão'}</button>
                </div>
              </form>
            </section>
          </>
        )}

        {etapa === 'enviado' && (
          <section className="ad-inicio" aria-labelledby="ad-ok" role="status">
            <h1 id="ad-ok">{p.emBreve ? 'Você está na lista.' : 'Pedido recebido.'}</h1>
            <p>{p.emBreve ? 'Assim que o Sênior for liberado, avisamos você pelo WhatsApp.' : 'Em breve a equipe do HiAdv chama você pelo WhatsApp para liberar o acesso. Se preferir, fale agora.'}</p>
            <a className="ad-botao ad-botao-claro" href={`https://wa.me/55${WHATSAPP_HIADV}?text=${encodeURIComponent(`Olá! Acabei de pedir ${p.emBreve ? 'para entrar na lista do Sênior' : `a adesão ao plano ${p.nome}`} do HiAdv.`)}`} target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
          </section>
        )}

        <footer className="ad-rodape">HiAdv · gestão para escritórios de advocacia · hiadvofc@gmail.com</footer>
      </div>
    </main>
  )
}
