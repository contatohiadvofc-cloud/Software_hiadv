import { Carregando } from '../design/components/Carregando'
import { assumir, picos, proximaVelocidade, salvarVelocidade, soltar, tocarProximo, velocidadeSalva } from '../lib/audioPlayer'
import { useDeferredValue, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { useToast } from '../design/components/Toast'
import { Dialog } from '../design/components/Dialog'
import { Button } from '../design/components/Button'
import {
  INTERVALOS, LIMITE_AUDIO_SEG, linkWhatsApp, nomesComApelidos, dataHoraCompleta, trecho, eventoChamada, textoChamada, estaOnline, vistoTela, type EventoChamada, normalizarTelefone, telefoneTela, type Contato, type PessoaEquipe, type ReuniaoPassada, LIMITE_CHAMADA, LIMITE_TEXTO, temLink, NOMES_AREAS, REACOES, contarReacoes, duracaoTela, formatoAudio, horaMensagem, iniciais, montarBlocos,
  primeiroNome, publicoComunidade, quandoCurto, resumo, tamanhoTela, tipoAnexo, tituloConversa, validarArquivo, validarComunidade,
  type Anexo, type Comunidade, type ComunidadeForm, type Conversa, type Mensagem,
} from '../data/conversas'
import { Chamada } from './Chamada'
import { abrirMicLimpo, type MicLimpo } from '../lib/audioLimpo'
import { SONS, lerPrefs, marcarAberta, salvarPrefs, tocar, type PrefsAvisos } from '../lib/avisos'

type Sel = { tipo: 'conv'; id: string } | { tipo: 'com'; id: string } | { tipo: 'pessoa'; id: string } | { tipo: 'contato'; id: string } | { tipo: 'novo-contato'; id: '' } | null
type Aba = 'equipe' | 'comunidades' | 'contatos'

const I = {
  busca: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  novo: 'M12 5v14M5 12h14',
  voltar: 'M15 18l-6-6 6-6',
  clipe: 'M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5',
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3',
  enviar: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
  fone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
  video: 'M23 7l-7 5 7 5zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z',
  escudo: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  responder: 'M9 17l-5-5 5-5M4 12h11a5 5 0 0 1 5 5v2',
  lixo: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  fechar: 'M18 6 6 18M6 6l12 12',
  play: 'M7 4v16l13-8z',
  pausa: 'M7 4h4v16H7zM14 4h4v16h-4z',
  arquivo: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  grupo: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  predio: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4',
  parar: 'M7 7h10v10H7z',
  relogio: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  sino: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  texto: 'M4 6h16M4 12h16M4 18h10',
  balao: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 1 1 21 11.5z',
  agenda: 'M4 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7 17a5 5 0 0 1 10 0',
  telefone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
  lapis: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  megafone: 'M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13',
}
export function Ic({ d, t = 20 }: { d: string; t?: number }) {
  return <svg width={t} height={t} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
}

function Avatar({ nome, tipo, tam = 44, online }: { nome: string; tipo?: 'equipe' | 'grupo' | 'comunidade' | 'pessoa'; tam?: number; online?: boolean }) {
  const icone = tipo === 'equipe' ? I.predio : tipo === 'grupo' ? I.grupo : null
  return (
    <span className="cv-av" data-tipo={tipo ?? 'pessoa'} style={{ width: tam, height: tam, fontSize: tam * 0.36 }} aria-hidden="true">
      {icone ? <Ic d={icone} t={tam * 0.46} /> : iniciais(nome)}
      {online !== undefined && <i className="cv-presenca" data-on={online || undefined} />}
    </span>
  )
}

// ---------- página ----------
export function Conversas() {
  const api = useApi()
  const { perfil } = useSessao()
  const eu = perfil?.email ?? ''
  const [aba, setAba] = useState<Aba>(() => (new URLSearchParams(location.search).get('aba') === 'comunidades' ? 'comunidades' : 'equipe'))
  const params = new URLSearchParams(location.search)
  const [sel, setSel] = useState<Sel>(() => (params.get('c') ? { tipo: 'conv', id: params.get('c')! } : null))
  const [atender] = useState(() => params.get('atender'))
  const [ajustes, setAjustes] = useState(false)
  const [busca, setBusca] = useState('')
  const [nova, setNova] = useState(false)
  const [moderar, setModerar] = useState<Comunidade | 'nova' | null>(null)
  const convs = useQuery({ queryKey: ['chat-lista', perfil?.escritorioId], queryFn: () => api.chatLista(), refetchInterval: 20000 })
  const coms = useQuery({ queryKey: ['com-lista'], queryFn: () => api.comLista(), refetchInterval: 30000 })
  const pessoas = useQuery({ queryKey: ['chat-pessoas', perfil?.escritorioId], queryFn: () => api.chatPessoas(), refetchInterval: 60_000 })
  const contatos = useQuery({ queryKey: ['contatos', perfil?.escritorioId], queryFn: () => api.contatoLista(), staleTime: 60000 })
  const nomes = useMemo(() => nomesComApelidos(pessoas.data ?? [], contatos.data ?? []), [pessoas.data, contatos.data])
  const naoEquipe = (convs.data ?? []).reduce((s, c) => s + c.naoLidas, 0)
  const naoCom = (coms.data ?? []).reduce((s, c) => s + c.naoLidas, 0)
  const souModerador = !!perfil?.code

  // abre a primeira conversa no computador, para a tela não ficar vazia
  useEffect(() => {
    if (sel || innerWidth < 900) return
    if (aba === 'equipe' && convs.data?.[0]) setSel({ tipo: 'conv', id: convs.data[0].id })
    if (aba === 'comunidades' && coms.data?.[0]) setSel({ tipo: 'com', id: coms.data[0].id })
  }, [aba, convs.data, coms.data, sel])

  const termo = busca.trim().toLowerCase()
  const termoBusca = useDeferredValue(termo)
  const achados = useQuery({ queryKey: ['chat-busca', termoBusca], queryFn: () => api.chatBuscar(termoBusca), enabled: aba === 'equipe' && termoBusca.length >= 3, staleTime: 30_000 })
  const listaConv = (convs.data ?? []).filter((c) => !termo || tituloConversa(c, eu, nomes).toLowerCase().includes(termo))
  const listaCom = (coms.data ?? []).filter((c) => !termo || c.nome.toLowerCase().includes(termo))
  const conv = sel?.tipo === 'conv' ? convs.data?.find((c) => c.id === sel.id) : undefined
  const comu = sel?.tipo === 'com' ? coms.data?.find((c) => c.id === sel.id) : undefined

  return (
    <div className="cv" data-aberta={sel ? 'sim' : undefined}>
      <aside className="cv-lado" aria-label="Lista de conversas">
        <div className="cv-lado-cabeca">
          <h1>Conversas</h1>
          <button type="button" className="cv-icone-bt cv-sino" aria-label="Sons e avisos" title="Sons e avisos" onClick={() => setAjustes(true)}><Ic d={I.sino} /></button>
          {aba === 'equipe'
            ? <button type="button" className="cv-icone-bt" aria-label="Nova conversa" title="Nova conversa" onClick={() => setNova(true)}><Ic d={I.novo} /></button>
            : aba === 'contatos'
            ? <button type="button" className="cv-icone-bt" aria-label="Novo contato externo" title="Novo contato" onClick={() => setSel({ tipo: 'novo-contato', id: '' })}><Ic d={I.novo} /></button>
            : souModerador && <button type="button" className="cv-icone-bt" aria-label="Nova comunidade" title="Nova comunidade" onClick={() => setModerar('nova')}><Ic d={I.novo} /></button>}
        </div>
        <div className="cv-abas" role="tablist" aria-label="Tipo de conversa">
          <button type="button" role="tab" aria-selected={aba === 'equipe'} onClick={() => { setAba('equipe'); setSel(null) }}>Equipe{naoEquipe > 0 && <b className="cv-badge">{naoEquipe}</b>}</button>
          <button type="button" role="tab" aria-selected={aba === 'comunidades'} onClick={() => { setAba('comunidades'); setSel(null) }}>Comunidades{naoCom > 0 && <b className="cv-badge">{naoCom}</b>}</button>
          <button type="button" role="tab" aria-selected={aba === 'contatos'} onClick={() => { setAba('contatos'); setSel(null) }}>Contatos</button>
        </div>
        <label className="cv-busca"><Ic d={I.busca} t={17} /><input placeholder={aba === 'equipe' ? 'Buscar conversa ou o que foi dito' : aba === 'contatos' ? 'Buscar nome ou número' : 'Buscar comunidade'} aria-label="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} /></label>
        <ul className="cv-lista" role="list">
          {aba === 'equipe' && convs.isLoading && <li><Carregando avatar linhas={4} /></li>}
          {aba === 'equipe' && convs.isError && <li className="cv-vazio">Não deu para carregar as conversas. <button type="button" className="cv-link" onClick={() => convs.refetch()}>Tentar de novo</button></li>}
          {aba === 'equipe' && listaConv.map((c) => (
            <li key={c.id}>
              <button type="button" className="cv-item" aria-current={sel?.id === c.id || undefined} onClick={() => setSel({ tipo: 'conv', id: c.id })}>
                <Avatar nome={tituloConversa(c, eu, nomes)} tipo={c.tipo === 'direta' ? 'pessoa' : c.tipo}
                  online={c.tipo === 'direta' ? estaOnline((pessoas.data ?? []).find((x) => x.email !== eu && c.membros.includes(x.email))?.vistoEm) : undefined} />
                <span className="cv-item-meio">
                  <span className="cv-item-nome">{tituloConversa(c, eu, nomes)}</span>
                  <span className="cv-item-prev" data-nao={c.naoLidas > 0 || undefined}>{c.ultima && c.tipo !== 'direta' && c.ultima.autor !== eu ? `${primeiroNome(nomes.get(c.ultima.autor) ?? c.ultima.autor)}: ` : c.ultima?.autor === eu ? 'Você: ' : ''}{resumo(c.ultima)}</span>
                </span>
                <span className="cv-item-fim">
                  {c.ultima && <time>{quandoCurto(c.ultima.criadoEm)}</time>}
                  {c.naoLidas > 0 && <b className="cv-badge" aria-label={`${c.naoLidas} não lidas`}>{c.naoLidas}</b>}
                </span>
              </button>
            </li>
          ))}
          {aba === 'equipe' && convs.isSuccess && listaConv.length === 0 && !(termo.length >= 3) && <li className="cv-vazio">{termo ? 'Nenhuma conversa com esse nome.' : 'Nenhuma conversa ainda.'}</li>}
          {aba === 'equipe' && termo.length >= 3 && (
            <>
              <li className="cv-sep">Mensagens e áudios com “{busca.trim()}”</li>
              {achados.isFetching && !achados.data && <li className="cv-vazio">Procurando no histórico…</li>}
              {achados.data?.map((r) => {
                const conversa = convs.data?.find((c) => c.id === r.conversaId)
                const onde = conversa ? tituloConversa(conversa, eu, nomes) : (r.titulo ?? 'Conversa')
                const falado = !(r.texto ?? '').toLowerCase().includes(termo) && !!r.transcricao
                return (
                  <li key={r.id}>
                    <button type="button" className="cv-item cv-achado" onClick={() => setSel({ tipo: 'conv', id: r.conversaId })}>
                      <span className="cv-item-meio">
                        <span className="cv-item-nome">{onde}<small>{dataHoraCompleta(r.criadoEm)}</small></span>
                        <span className="cv-achado-txt">{r.autor === eu ? 'Você' : primeiroNome(nomes.get(r.autor) ?? r.autor)}{r.reuniaoId ? ' (na chamada)' : falado ? ' (áudio)' : ''}: {trecho(falado ? r.transcricao! : (r.texto ?? ''), busca.trim())}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
              {achados.isSuccess && achados.data.length === 0 && <li className="cv-vazio">Nada encontrado no que foi escrito ou falado (áudios transcritos).</li>}
            </>
          )}
          {aba === 'comunidades' && coms.isLoading && <li><Carregando avatar linhas={4} /></li>}
          {aba === 'comunidades' && listaCom.map((c) => (
            <li key={c.id}>
              <button type="button" className="cv-item" aria-current={sel?.id === c.id || undefined} onClick={() => setSel({ tipo: 'com', id: c.id })}>
                <span className="cv-av cv-av-com" aria-hidden="true">{c.quemPosta === 'moderadores' ? <Ic d={I.megafone} t={20} /> : iniciais(c.nome.replace(/HiAdv|Masters/g, '').trim() || c.nome)}</span>
                <span className="cv-item-meio">
                  <span className="cv-item-nome">{c.nome}{!c.ativa && <small className="cv-pausada">pausada</small>}</span>
                  <span className="cv-item-prev" data-nao={c.naoLidas > 0 || undefined}>{c.ultima ? `${primeiroNome(c.ultima.autorNome ?? '')}: ${resumo(c.ultima)}` : (c.descricao ?? 'Nenhuma mensagem ainda')}</span>
                </span>
                <span className="cv-item-fim">
                  {c.ultima && <time>{quandoCurto(c.ultima.criadoEm)}</time>}
                  {c.naoLidas > 0 && <b className="cv-badge" aria-label={`${c.naoLidas} não lidas`}>{c.naoLidas}</b>}
                </span>
              </button>
            </li>
          ))}
          {aba === 'comunidades' && coms.isSuccess && listaCom.length === 0 && (
            <li className="cv-vazio">{termo ? 'Nenhuma comunidade com esse nome.' : 'As comunidades do HiAdv reúnem os Gestores Master de todos os escritórios, por área. Elas aparecem aqui assim que forem abertas para o seu perfil.'}</li>
          )}
          {aba === 'contatos' && <ListaContatos termo={termo} eu={eu} pessoas={pessoas.data ?? []} contatos={contatos.data ?? []} nomes={nomes} sel={sel} escolher={setSel} />}
        </ul>
      </aside>

      <section className="cv-conversa" aria-label="Conversa aberta">
        {conv && <ConversaEquipe key={conv.id} c={conv} eu={eu} nomes={nomes} pessoas={pessoas.data ?? []} voltar={() => setSel(null)} atender={atender} />}
        {comu && <ConversaComunidade key={comu.id} c={comu} eu={eu} voltar={() => setSel(null)} moderar={() => setModerar(comu)} />}
        {(sel?.tipo === 'pessoa' || sel?.tipo === 'contato' || sel?.tipo === 'novo-contato') && (
          <PainelContato key={sel.tipo + sel.id} sel={sel} eu={eu} pessoas={pessoas.data ?? []} contatos={contatos.data ?? []} nomes={nomes}
            voltar={() => setSel(null)} abrirConversa={(id) => { setAba('equipe'); setSel({ tipo: 'conv', id }) }} aoSalvar={(id) => setSel({ tipo: 'contato', id })} />
        )}
        {!conv && !comu && !(sel?.tipo === 'pessoa' || sel?.tipo === 'contato' || sel?.tipo === 'novo-contato') && aba !== 'contatos' && (
          <div className="cv-nada">
            <span className="cv-nada-pasta" aria-hidden="true"><i /><b><Ic d={aba === 'equipe' ? I.grupo : I.megafone} t={30} /></b></span>
            <h2>{aba === 'equipe' ? 'Converse com a sua equipe' : 'Comunidades HiAdv'}</h2>
            <p>{aba === 'equipe' ? 'Texto, áudio, arquivos e chamada de voz ou vídeo, só com quem é do seu escritório.' : 'Troque experiência com Gestores Master de outros escritórios, por área de atuação.'}</p>
            {aba === 'equipe' && <Button onClick={() => setNova(true)}>Nova conversa</Button>}
          </div>
        )}
        {aba === 'contatos' && !sel && (
          <div className="cv-nada">
            <span className="cv-nada-pasta" aria-hidden="true"><i /><b><Ic d={I.agenda} t={30} /></b></span>
            <h2>Contatos do escritório</h2>
            <p>Dê a cada pessoa da equipe o nome que todos reconhecem e guarde números de fora (peritos, agências do INSS, parceiros) para ligar ou chamar no WhatsApp direto daqui.</p>
            <Button onClick={() => setSel({ tipo: 'novo-contato', id: '' })}>Novo contato</Button>
          </div>
        )}
      </section>

      {ajustes && <AjustesAvisos aoFechar={() => setAjustes(false)} />}
      {nova && <NovaConversa eu={eu} aoAbrir={(id) => { setNova(false); setSel({ tipo: 'conv', id }) }} aoFechar={() => setNova(false)} />}
      {moderar && <Moderacao c={moderar === 'nova' ? null : moderar} aoFechar={() => setModerar(null)} />}
    </div>
  )
}

// ---------- conversa da equipe ----------
function ConversaEquipe({ c, eu, nomes, pessoas, voltar, atender }: { c: Conversa; eu: string; nomes: Map<string, string>; pessoas: PessoaEquipe[]; voltar: () => void; atender?: string | null }) {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const papel = useSessao().perfil?.papel
  const gestor = papel === 'master' || papel === 'code'
  const [chamada, setChamada] = useState<{ id: string; video: boolean } | null>(null)
  const [historico, setHistorico] = useState(false)
  const ativa = useQuery({ queryKey: ['reuniao', c.id], queryFn: () => api.reuniaoAtiva(c.id), refetchInterval: 15000 })
  const titulo = tituloConversa(c, eu, nomes)
  // veio do aviso "Atender": entra direto na chamada
  const atendida = useRef(false)
  useEffect(() => {
    if (atender && !atendida.current && ativa.data?.id === atender) { atendida.current = true; setChamada({ id: ativa.data.id, video: ativa.data.video }) }
  }, [atender, ativa.data])
  useEffect(() => { marcarAberta(c.id); return () => marcarAberta(null) }, [c.id])
  const passadas = useQuery({ queryKey: ['reunioes', c.id], queryFn: () => api.reuniaoHistorico(c.id), refetchInterval: 15000 })
  const eventos = useMemo(() => (passadas.data ?? []).map((r) => eventoChamada(r, eu)), [passadas.data, eu])
  const outro = c.tipo === 'direta' ? pessoas.find((x) => x.email !== eu && c.membros.includes(x.email)) : undefined
  const online = pessoas.filter((x) => x.email !== eu && estaOnline(x.vistoEm)).length
  const sub = c.tipo === 'equipe' ? (online ? `Toda a equipe · ${online} online` : 'Toda a equipe do escritório')
    : c.tipo === 'grupo' ? c.membros.map((m) => primeiroNome(nomes.get(m) ?? m)).join(', ')
    : vistoTela(outro?.vistoEm)
  async function ligar(video: boolean) {
    try { const id = await api.reuniaoIniciar(c.id, video); setChamada({ id, video }); qc.invalidateQueries({ queryKey: ['reuniao', c.id] }) }
    catch (e) { toast((e as Error).message, 'danger') }
  }
  return (
    <>
      <Fio
        chave={['chat-msgs', c.id]} titulo={titulo} subtitulo={sub} avatar={<Avatar nome={titulo} tipo={c.tipo === 'direta' ? 'pessoa' : c.tipo} tam={40} />}
        voltar={voltar} eu={eu} mostrarAutor={c.tipo !== 'direta'} nomeDe={(m) => nomes.get(m.autor) ?? m.autor}
        carregar={() => api.chatMensagens(c.id)} enviar={(t, a, r) => api.chatEnviar(c.id, t, a, r).then(() => {})}
        reagir={(id, e) => api.chatReagir(id, e)} apagar={(id) => api.chatApagar(id)} podeApagar={(m) => m.autor === eu || (gestor && c.tipo !== 'direta')}
        lido={() => api.chatLido(c.id).then(() => qc.invalidateQueries({ queryKey: ['chat-lista'] }))}
        assinar={(fn) => api.chatAssinar(c.id, fn)} onde="chat" pasta={c.id} permite={{ anexos: true, audios: true, postar: true }}
        chamadas={eventos} nomePessoa={(e) => nomes.get(e) ?? e}
        aoEntrarChamada={ativa.data ? () => setChamada({ id: ativa.data!.id, video: ativa.data!.video }) : undefined}
        acoes={<>
          <button type="button" className="cv-icone-bt" aria-label="Chamadas anteriores e transcrições" title="Chamadas anteriores" onClick={() => setHistorico(true)}><Ic d={I.relogio} /></button>
          <button type="button" className="cv-icone-bt" aria-label="Chamada de voz" title="Chamada de voz" onClick={() => ligar(false)}><Ic d={I.fone} /></button>
          <button type="button" className="cv-icone-bt" aria-label="Chamada de vídeo" title="Chamada de vídeo" onClick={() => ligar(true)}><Ic d={I.video} /></button>
        </>}
        faixa={ativa.data && !chamada ? (
          <div className="cv-faixa-chamada">
            <span><i className="cv-pulso" aria-hidden="true" />{ativa.data.video ? 'Chamada de vídeo' : 'Chamada de voz'} em andamento · {ativa.data.participantes.map((p) => primeiroNome(nomes.get(p) ?? p)).join(', ')}</span>
            {ativa.data.participantes.length >= LIMITE_CHAMADA && !ativa.data.participantes.includes(eu)
              ? <button type="button" disabled title={`A chamada comporta até ${LIMITE_CHAMADA} pessoas por vez`}>Cheia ({LIMITE_CHAMADA}/{LIMITE_CHAMADA})</button>
              : <button type="button" onClick={() => setChamada({ id: ativa.data!.id, video: ativa.data!.video })}>Entrar</button>}
          </div>
        ) : null}
      />
      {historico && <HistoricoChamadas conversa={c.id} nomes={nomes} eu={eu} aoFechar={() => setHistorico(false)} />}
      {chamada && <Chamada id={chamada.id} video={chamada.video} titulo={titulo} eu={{ email: eu, nome: nomes.get(eu) ?? eu }} aoSair={() => { setChamada(null); qc.invalidateQueries({ queryKey: ['reuniao', c.id] }) }} />}
    </>
  )
}

// ---------- comunidade ----------
function ConversaComunidade({ c, eu, voltar, moderar }: { c: Comunidade; eu: string; voltar: () => void; moderar: () => void }) {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const pedir = useMutation({
    mutationFn: () => api.comPedirEntrada(c.id),
    onSuccess: () => { toast('Pedido enviado. A moderação do HiAdv vai analisar.'); qc.invalidateQueries({ queryKey: ['com-lista'] }) },
    onError: (e) => toast((e as Error).message, 'danger'),
  })
  if (!c.participo) return (
    <div className="cv-entrada">
      <header className="cv-fio-cabeca">
        <button type="button" className="cv-icone-bt cv-so-cel" aria-label="Voltar para a lista" onClick={voltar}><Ic d={I.voltar} /></button>
        <div className="cv-fio-tit"><h2>{c.nome}</h2><p>{publicoComunidade(c)}</p></div>
      </header>
      <div className="cv-entrada-corpo">
        <span className="cv-av cv-av-com" style={{ width: 64, height: 64 }} aria-hidden="true"><Ic d={I.escudo} t={26} /></span>
        <h2>Comunidade com entrada aprovada</h2>
        {c.descricao && <p>{c.descricao}</p>}
        {c.entrada === 'pendente' ? <p className="cv-entrada-status">Pedido enviado. Aguardando a moderação do HiAdv.</p>
          : c.entrada === 'recusado' ? <p className="cv-entrada-status">A moderação não aprovou a entrada do seu escritório por enquanto.</p>
          : <Button loading={pedir.isPending} onClick={() => pedir.mutate()}>Pedir entrada do escritório</Button>}
        <small>O pedido é feito por um Gestor Master e vale para a equipe do escritório.</small>
      </div>
    </div>
  )
  const bloqueio = !c.podePostar ? (c.quemPosta === 'moderadores' ? 'Nesta comunidade só a moderação do HiAdv publica.' : 'Seu envio nesta comunidade está pausado pela moderação.') : null
  return (
    <Fio
      chave={['com-msgs', c.id]} titulo={c.nome} subtitulo={publicoComunidade(c)}
      avatar={<span className="cv-av cv-av-com" style={{ width: 40, height: 40 }} aria-hidden="true">{c.quemPosta === 'moderadores' ? <Ic d={I.megafone} t={18} /> : iniciais(c.nome.replace(/HiAdv|Masters/g, '').trim() || c.nome)}</span>}
      voltar={voltar} eu={eu} mostrarAutor nomeDe={(m) => m.autorNome ?? m.autor} escritorioDe={(m) => m.autorEscritorio ?? null}
      carregar={() => api.comMensagens(c.id)}
      enviar={(t, a, r) => (!c.links && !c.moderador && t && temLink(t) ? Promise.reject(new Error('Esta comunidade não aceita links externos.')) : api.comEnviar(c.id, t, a, r))}
      reagir={(id, e) => api.comReagir(id, e)} apagar={(id) => api.comApagar(id)} podeApagar={(m) => m.autor === eu || c.moderador}
      lido={() => api.comLido(c.id).then(() => qc.invalidateQueries({ queryKey: ['com-lista'] }))}
      intervalo={6000} onde="comunidade" pasta={c.id} permite={{ anexos: c.anexos, audios: c.audios, postar: c.podePostar }} bloqueio={bloqueio}
      acoes={c.moderador ? <button type="button" className="cv-icone-bt" aria-label="Moderar comunidade" title="Moderar" onClick={moderar}><Ic d={I.escudo} /></button> : null}
      faixa={c.descricao ? <p className="cv-faixa-desc">{c.descricao}</p> : null}
    />
  )
}

// ---------- fio de mensagens (comum às duas) ----------
type FioProps = {
  chave: unknown[]; titulo: string; subtitulo: string; avatar: ReactNode; voltar: () => void; eu: string
  mostrarAutor: boolean; nomeDe: (m: Mensagem) => string; escritorioDe?: (m: Mensagem) => string | null
  carregar: () => Promise<Mensagem[]>; enviar: (texto: string | null, anexo: Anexo | null, resposta: string | null) => Promise<void>
  reagir: (id: string, e: string) => Promise<void>; apagar: (id: string) => Promise<void>; podeApagar: (m: Mensagem) => boolean
  lido: () => Promise<unknown>; assinar?: (fn: () => void) => () => void; intervalo?: number
  onde: 'chat' | 'comunidade'; pasta: string; permite: { anexos: boolean; audios: boolean; postar: boolean }; bloqueio?: string | null
  acoes?: ReactNode; faixa?: ReactNode
  chamadas?: EventoChamada[]; nomePessoa?: (email: string) => string; aoEntrarChamada?: () => void
}

function Fio(p: FioProps) {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const q = useQuery({ queryKey: p.chave, queryFn: p.carregar, refetchInterval: p.assinar ? 30000 : (p.intervalo ?? 8000) })
  const [resp, setResp] = useState<Mensagem | null>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const [pendentes, setPendentes] = useState<Mensagem[]>([])
  const fim = useRef<HTMLDivElement>(null)
  const lista = useRef<HTMLDivElement>(null)
  const atualizar = () => qc.invalidateQueries({ queryKey: p.chave })

  useEffect(() => p.assinar?.(() => { void atualizar() }), []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void p.lido() }, [q.data?.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const msgs = [...(q.data ?? []), ...pendentes]
  const [longe, setLonge] = useState(false)
  const [novas, setNovas] = useState(0)
  const ultimoTotal = useRef(0)
  useEffect(() => {
    const el = lista.current; if (!el) return
    const perto = el.scrollHeight - el.scrollTop - el.clientHeight < 240
    if (perto || pendentes.length) { fim.current?.scrollIntoView({ block: 'end' }); setNovas(0) }
    else if (ultimoTotal.current && msgs.length > ultimoTotal.current) setNovas((n) => n + msgs.length - ultimoTotal.current)
    ultimoTotal.current = msgs.length
  }, [msgs.length, pendentes.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const aoRolar = () => { const el = lista.current; if (!el) return; const l = el.scrollHeight - el.scrollTop - el.clientHeight > 400; setLonge(l); if (!l) setNovas(0) }
  const descer = () => { fim.current?.scrollIntoView({ block: 'end', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); setNovas(0) }
  useEffect(() => { fim.current?.scrollIntoView({ block: 'end' }) }, [q.isSuccess])

  const blocos = montarBlocos(msgs, new Date(), p.chamadas ?? [])
  const porId = new Map(msgs.map((m) => [m.id, m]))

  async function mandar(texto: string | null, anexo: Anexo | null) {
    const tmp: Mensagem = { id: `tmp-${Date.now()}`, autor: p.eu, texto, anexo, respostaA: resp?.id ?? null, reacoes: {}, criadoEm: new Date().toISOString(), editadoEm: null, enviando: true }
    setPendentes((x) => [...x, tmp])
    const r = resp?.id ?? null
    setResp(null)
    try { await p.enviar(texto, anexo, r); await atualizar() }
    catch (e) { toast((e as Error).message, 'danger') }
    finally { setPendentes((x) => x.filter((m) => m.id !== tmp.id)) }
  }

  return (
    <div className="cv-fio" onClick={() => setMenu(null)}>
      <header className="cv-fio-cabeca">
        <button type="button" className="cv-icone-bt cv-so-cel" aria-label="Voltar para a lista" onClick={p.voltar}><Ic d={I.voltar} /></button>
        {p.avatar}
        <div className="cv-fio-tit"><h2>{p.titulo}</h2><p>{p.subtitulo}</p></div>
        <div className="cv-fio-acoes">{p.acoes}</div>
      </header>
      {p.faixa}
      <div className="cv-msgs" ref={lista} onScroll={aoRolar} role="log" aria-live="polite" aria-label={`Mensagens de ${p.titulo}`}>
        {q.isLoading && <Carregando avatar texto="Carregando mensagens…" />}
        {q.isError && <p className="cv-vazio">Não deu para carregar. <button type="button" className="cv-link" onClick={() => q.refetch()}>Tentar de novo</button></p>}
        {q.isSuccess && msgs.length === 0 && <p className="cv-vazio cv-vazio-fio">Nenhuma mensagem ainda. Diga um oi 👋</p>}
        {blocos.map((b) => b.tipo === 'dia'
          ? <div key={`d-${b.chave}`} className="cv-dia"><span>{b.rotulo}</span></div>
          : b.tipo === 'chamada'
          ? <CartaoChamada key={`c-${b.e.id}`} e={b.e} meu={b.e.iniciadaPor === p.eu} nome={p.nomePessoa?.(b.e.iniciadaPor) ?? b.e.iniciadaPor} entrar={p.aoEntrarChamada} />
          : <Balao key={b.m.id} m={b.m} meu={b.m.autor === p.eu} eu={p.eu} agrupada={b.agrupada} ultima={b.ultimaDoGrupo}
              nome={p.mostrarAutor ? p.nomeDe(b.m) : null} escritorio={p.escritorioDe?.(b.m) ?? null}
              citada={b.m.respostaA ? porId.get(b.m.respostaA) ?? null : null} nomeCitada={(m) => (m.autor === p.eu ? 'Você' : p.nomeDe(m))}
              onde={p.onde} menuAberto={menu === b.m.id} abrirMenu={(v) => setMenu(v ? b.m.id : null)}
              responder={() => setResp(b.m)} reagir={async (e) => { setMenu(null); try { await p.reagir(b.m.id, e); await atualizar() } catch (x) { toast((x as Error).message, 'danger') } }}
              apagar={p.podeApagar(b.m) ? async () => { setMenu(null); try { await p.apagar(b.m.id); await atualizar() } catch (x) { toast((x as Error).message, 'danger') } } : null} />)}
        <div ref={fim} />
      </div>
      {(longe || novas > 0) && (
        <button type="button" className="cv-descer" onClick={descer} aria-label={novas ? `${novas} ${novas === 1 ? 'mensagem nova' : 'mensagens novas'}. Ir para o fim` : 'Ir para a última mensagem'}>
          {novas > 0 && <span className="cv-descer-n">{novas > 99 ? '99+' : novas}</span>}<Ic d="M6 9l6 6 6-6" t={20} />
        </button>
      )}
      {p.bloqueio
        ? <p className="cv-bloqueio">{p.bloqueio}</p>
        : <Compositor onde={p.onde} pasta={p.pasta} permite={p.permite} resposta={resp} nomeResposta={resp ? (resp.autor === p.eu ? 'você' : p.nomeDe(resp)) : ''} cancelarResposta={() => setResp(null)} aoEnviar={mandar} subir={(b, n, x) => api.chatSubir(p.onde, p.pasta, b, n, x)} />}
    </div>
  )
}

// ---------- balão ----------
function Balao(p: {
  m: Mensagem; meu: boolean; eu: string; agrupada: boolean; ultima: boolean; nome: string | null; escritorio: string | null
  citada: Mensagem | null; nomeCitada: (m: Mensagem) => string; onde: 'chat' | 'comunidade'
  menuAberto: boolean; abrirMenu: (v: boolean) => void; responder: () => void; reagir: (e: string) => void; apagar: (() => void) | null
}) {
  const { m } = p
  const reac = contarReacoes(m.reacoes, p.eu)
  const pressionar = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const linha = useRef<HTMLDivElement>(null)
  const baixo = p.menuAberto && (linha.current?.getBoundingClientRect().top ?? 999) < 320
  return (
    <div ref={linha} className="cv-linha" data-meu={p.meu || undefined} data-agrupada={p.agrupada || undefined} data-enviando={m.enviando || undefined}>
      {!p.meu && p.nome && <span className="cv-linha-av">{p.ultima ? <Avatar nome={p.nome} tam={30} /> : null}</span>}
      <div className="cv-balao-caixa">
        {!p.meu && p.nome && !p.agrupada && <span className="cv-autor">{p.nome}{p.escritorio && <small> · {p.escritorio}</small>}</span>}
        <div className="cv-balao" data-so-midia={(!m.texto && m.anexo && tipoAnexo(m.anexo.tipo) === 'imagem') || undefined}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); p.abrirMenu(true) }}
          onTouchStart={() => { pressionar.current = setTimeout(() => p.abrirMenu(true), 450) }} onTouchEnd={() => clearTimeout(pressionar.current)} onTouchMove={() => clearTimeout(pressionar.current)}
          onDoubleClick={() => p.reagir('❤️')}>
          {p.citada && <div className="cv-citada"><b>{p.nomeCitada(p.citada)}</b><span>{resumo(p.citada)}</span></div>}
          {m.anexo && <AnexoView a={m.anexo} onde={p.onde} meu={p.meu} />}
          {m.anexo && p.onde === 'chat' && tipoAnexo(m.anexo.tipo) === 'audio' && !m.enviando && <Transcricao m={m} meu={p.meu} />}
          {m.texto && <p className="cv-texto">{m.texto}</p>}
          <span className="cv-hora" title={m.enviando ? undefined : dataHoraCompleta(m.criadoEm)}>{m.enviando ? 'enviando…' : horaMensagem(m.criadoEm)}{m.editadoEm && ' · editada'}</span>
        </div>
        {reac.length > 0 && (
          <div className="cv-reacoes">{reac.map(([e, n, meu]) => <button key={e} type="button" data-meu={meu || undefined} aria-label={`${e} ${n}`} onClick={(ev) => { ev.stopPropagation(); p.reagir(e) }}>{e}{n > 1 && <small>{n}</small>}</button>)}</div>
        )}
      </div>
      {!m.enviando && (
        <div className="cv-acoes-msg" onClick={(e) => e.stopPropagation()}>
          <button type="button" aria-label="Reagir" title="Reagir" onClick={() => p.abrirMenu(!p.menuAberto)}>☺</button>
          <button type="button" aria-label="Responder" title="Responder" onClick={p.responder}><Ic d={I.responder} t={16} /></button>
        </div>
      )}
      {p.menuAberto && (
        <div className="cv-menu" role="menu" data-baixo={baixo || undefined} onClick={(e) => e.stopPropagation()}>
          <div className="cv-menu-emojis">{REACOES.map((e) => <button key={e} type="button" role="menuitem" aria-label={`Reagir com ${e}`} onClick={() => p.reagir(e)}>{e}</button>)}</div>
          <button type="button" role="menuitem" onClick={() => { p.responder(); p.abrirMenu(false) }}><Ic d={I.responder} t={16} />Responder</button>
          {m.texto && <button type="button" role="menuitem" onClick={() => { void navigator.clipboard?.writeText(m.texto!); p.abrirMenu(false) }}><Ic d={I.arquivo} t={16} />Copiar texto</button>}
          {p.apagar && <button type="button" role="menuitem" className="cv-perigo" onClick={p.apagar}><Ic d={I.lixo} t={16} />Apagar</button>}
        </div>
      )}
    </div>
  )
}

const urls = new Map<string, Promise<string>>()
function useUrl(onde: 'chat' | 'comunidade', path: string) {
  const api = useApi()
  const [url, setUrl] = useState<string | null>(null)
  const [erro, setErro] = useState(false)
  useEffect(() => {
    const k = `${onde}:${path}`
    if (!urls.has(k)) urls.set(k, api.chatUrl(onde, path))
    let vivo = true
    urls.get(k)!.then((u) => { if (vivo) setUrl(u) }).catch(() => { urls.delete(k); if (vivo) setErro(true) })
    return () => { vivo = false }
  }, [api, onde, path])
  return { url, erro }
}

/** Registro da chamada no meio da conversa: iniciada, em andamento, perdida, recusada ou concluída. */
function CartaoChamada({ e, meu, nome, entrar }: { e: EventoChamada; meu: boolean; nome: string; entrar?: () => void }) {
  const ruim = e.estado === 'perdida' || e.estado === 'sem-resposta' || e.estado === 'recusada' || e.estado === 'recusaram'
  return (
    <div className="cv-chamada-ev" data-meu={meu || undefined} data-estado={e.estado}>
      <span className="cv-chamada-ic" data-ruim={ruim || undefined} aria-hidden="true"><Ic d={e.video ? I.video : I.fone} t={16} /></span>
      <span className="cv-chamada-txt">
        <b>{textoChamada(e, primeiroNome(nome))}</b>
        <small title={dataHoraCompleta(e.quando)}>{meu ? 'Você ligou' : `${primeiroNome(nome)} ligou`} · {horaMensagem(e.quando)}</small>
      </span>
      {e.estado === 'andamento' && entrar && <button type="button" className="cv-chamada-entrar" onClick={entrar}>Entrar</button>}
    </div>
  )
}

/** Texto do áudio: o próprio áudio é transcrito sozinho logo após o envio; nos outros, um toque pede a transcrição. */
const tentados = new Set<string>()
function Transcricao({ m, meu }: { m: Mensagem; meu: boolean }) {
  const api = useApi()
  const qc = useQueryClient()
  const [texto, setTexto] = useState(m.transcricao ?? m.anexo?.texto ?? null)
  const [aberta, setAberta] = useState(false)
  const [estado, setEstado] = useState<'parado' | 'indo' | 'erro'>('parado')
  const [erro, setErro] = useState<string | null>(null)
  async function transcrever() {
    if (!m.anexo || tentados.has(m.id) && estado !== 'erro') return
    tentados.add(m.id); setEstado('indo')
    const r = await api.chatTranscrever(m.id, m.anexo.path)
    if (r.ok && r.texto) { setTexto(r.texto); setAberta(true); setEstado('parado'); void qc.invalidateQueries({ queryKey: ['chat-msgs'] }) }
    else { setEstado(r.configurada === false ? 'parado' : 'erro'); setErro(r.erro ?? 'Não deu para transcrever.') }
  }
  useEffect(() => { setTexto(m.transcricao ?? m.anexo?.texto ?? null) }, [m.transcricao, m.anexo?.texto])
  // meu áudio recém-enviado: guarda o texto que já veio da revisão, ou transcreve sozinho
  useEffect(() => {
    if (meu && !m.transcricao && m.anexo?.texto && !tentados.has(m.id)) { tentados.add(m.id); void api.chatTranscricaoSalvar(m.id, m.anexo.texto).catch(() => {}); return }
    if (meu && !m.anexo?.texto && !m.transcricao && Date.now() - new Date(m.criadoEm).getTime() < 3 * 60_000 && !tentados.has(m.id)) void transcrever()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (texto) return (
    <div className="cv-transcricao">
      <button type="button" className="cv-transcricao-bt" aria-expanded={aberta} onClick={() => setAberta(!aberta)}><Ic d={I.texto} t={14} />{aberta ? 'Ocultar texto' : 'Ver texto do áudio'}</button>
      {aberta && <p>{texto}</p>}
    </div>
  )
  return (
    <div className="cv-transcricao">
      <button type="button" className="cv-transcricao-bt" disabled={estado === 'indo'} onClick={() => { setErro(null); tentados.delete(m.id); void transcrever() }}>
        <Ic d={I.texto} t={14} />{estado === 'indo' ? 'Transcrevendo…' : 'Transcrever'}
      </button>
      {erro && <small className="cv-transcricao-erro">{erro}</small>}
    </div>
  )
}

function AnexoView({ a, onde, meu }: { a: Anexo; onde: 'chat' | 'comunidade'; meu: boolean }) {
  const t = tipoAnexo(a.tipo)
  const { url, erro } = useUrl(onde, a.path)
  if (erro) return <span className="cv-anexo-erro">Arquivo indisponível</span>
  if (t === 'imagem') return (
    <a className="cv-img" href={url ?? undefined} target="_blank" rel="noopener noreferrer" style={a.largura && a.altura ? { aspectRatio: `${a.largura} / ${a.altura}` } : undefined}>
      {url ? <img src={url} alt={a.nome} loading="lazy" decoding="async" /> : <span className="cv-img-carregando" />}
    </a>
  )
  if (t === 'audio') return <Audio url={url} duracao={a.duracao} meu={meu} />
  if (t === 'video') return url ? <video className="cv-video" src={url} controls playsInline preload="metadata" /> : <span className="cv-img-carregando" />
  return (
    <a className="cv-arquivo" href={url ?? undefined} target="_blank" rel="noopener noreferrer" download={a.nome}>
      <span className="cv-arquivo-ic" data-pdf={t === 'pdf' || undefined}><Ic d={I.arquivo} /></span>
      <span><b>{a.nome}</b><small>{t === 'pdf' ? 'PDF' : 'Arquivo'} · {tamanhoTela(a.tamanho)}</small></span>
    </a>
  )
}

/** Player de áudio leve: tocar/pausar, barra de progresso e velocidade 1x/1,5x/2x, como nos apps de mensagem. */
function Audio({ url, duracao, meu }: { url: string | null; duracao?: number; meu: boolean }) {
  const el = useRef<HTMLAudioElement>(null)
  const onda = useRef<HTMLDivElement>(null)
  const [tocando, setTocando] = useState(false)
  const [pos, setPos] = useState(0)
  const [dur, setDur] = useState(duracao ?? 0)
  const [vel, setVel] = useState(velocidadeSalva)
  const [falhou, setFalhou] = useState(false)
  const [ouvido, setOuvido] = useState(false)
  const falsas = useMemo(() => Array.from({ length: 32 }, (_, i) => 0.3 + Math.abs(Math.sin(i * 1.7 + (duracao ?? 3))) * 0.7), [duracao])
  const [barras, setBarras] = useState<number[]>(falsas)
  useEffect(() => { if (!url) return; let vivo = true; picos(url, 32).then((p) => { if (vivo) setBarras(p) }, () => {}); return () => { vivo = false } }, [url])
  const pct = dur ? Math.min(1, pos / dur) : 0
  const irPara = (fr: number) => { const a = el.current; if (!a || !dur) return; a.currentTime = Math.max(0, Math.min(dur, fr * dur)); setPos(a.currentTime) }
  const doPonteiro = (x: number) => { const r = onda.current!.getBoundingClientRect(); irPara((x - r.left) / r.width) }
  const alternar = () => { const a = el.current; if (!a) return; if (a.paused) { assumir(a); a.playbackRate = vel; void a.play().then(() => setFalhou(false), () => setFalhou(true)) } else a.pause() }
  return (
    <div className="cv-audio" data-meu={meu || undefined} data-ouvido={ouvido || undefined}>
      <button type="button" className="cv-audio-play" aria-label={tocando ? 'Pausar áudio' : 'Ouvir áudio'} disabled={!url} onClick={alternar}>
        <Ic d={tocando ? I.pausa : I.play} t={16} />
      </button>
      <div ref={onda} className="cv-onda" role="slider" tabIndex={url ? 0 : -1} aria-label="Posição do áudio" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(pos)} aria-valuetext={`${duracaoTela(pos)} de ${duracaoTela(dur)}`}
        onPointerDown={(e) => { if (!dur) return; e.currentTarget.setPointerCapture(e.pointerId); doPonteiro(e.clientX) }}
        onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) doPonteiro(e.clientX) }}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); irPara((pos + 5) / dur) } else if (e.key === 'ArrowLeft') { e.preventDefault(); irPara((pos - 5) / dur) } else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); alternar() } }}>
        {barras.map((h, i) => <i key={i} style={{ height: `${Math.round(h * 100)}%` }} data-on={(i + 0.5) / barras.length <= pct || undefined} />)}
        <b className="cv-onda-ponto" style={{ left: `${pct * 100}%` }} aria-hidden="true" />
      </div>
      <span className="cv-audio-t">{duracaoTela(tocando || pos ? pos : dur)}</span>
      <button type="button" className="cv-vel" aria-label={`Velocidade ${String(vel).replace('.', ',')} vezes. Tocar para mudar`} onClick={() => { const v = proximaVelocidade(vel); setVel(v); salvarVelocidade(v); if (el.current) el.current.playbackRate = v }}>{String(vel).replace('.', ',')}×</button>
      {url && <audio ref={el} src={url} preload="metadata" onPlay={(e) => { assumir(e.currentTarget); e.currentTarget.playbackRate = velocidadeSalva(); setVel(velocidadeSalva()); setTocando(true); setOuvido(true) }}
        onPause={(e) => { soltar(e.currentTarget); setTocando(false) }}
        onEnded={(e) => { setTocando(false); setPos(0); const a = e.currentTarget; soltar(a); tocarProximo(a) }}
        onError={() => setFalhou(true)} onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)} onLoadedMetadata={(e) => { const d = e.currentTarget.duration; if (Number.isFinite(d)) setDur(d) }} />}
      {falhou && url && <a className="cv-audio-falha" href={url} target="_blank" rel="noopener noreferrer" download>Este aparelho não tocou o áudio aqui. Toque para abrir.</a>}
    </div>
  )
}

// ---------- caixa de escrever ----------
async function reduzirImagem(f: File): Promise<{ blob: Blob; largura: number; altura: number }> {
  const bmp = await createImageBitmap(f)
  const lado = 1600, esc = Math.min(1, lado / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * esc), h = Math.round(bmp.height * esc)
  if (esc === 1 && f.size < 900 * 1024) return { blob: f, largura: w, altura: h }
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  cv.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
  const blob = await new Promise<Blob>((ok) => cv.toBlob((b) => ok(b ?? f), 'image/jpeg', 0.85))
  return { blob, largura: w, altura: h }
}

function Compositor(p: {
  onde: 'chat' | 'comunidade'; pasta: string; permite: { anexos: boolean; audios: boolean; postar: boolean }
  resposta: Mensagem | null; nomeResposta: string; cancelarResposta: () => void
  aoEnviar: (texto: string | null, anexo: Anexo | null) => Promise<void>
  subir: (b: Blob, nome: string, extra?: Partial<Anexo>) => Promise<Anexo>
}) {
  const toast = useToast()
  const [texto, setTexto] = useState('')
  const [subindo, setSubindo] = useState(false)
  const [gravando, setGravando] = useState<{ inicio: number } | null>(null)
  const [agora, setAgora] = useState(Date.now())
  const rec = useRef<{ mr: MediaRecorder; partes: Blob[]; cancelado: boolean; direto: boolean; mic: MicLimpo } | null>(null)
  const [revisao, setRevisao] = useState<{ blob: Blob; url: string; seg: number; texto: string | null; estado: 'transcrevendo' | 'pronto' | 'sem' } | null>(null)
  const [nivel, setNivel] = useState(0)
  const area = useRef<HTMLTextAreaElement>(null)
  const arq = useRef<HTMLInputElement>(null)

  useEffect(() => { if (p.resposta) area.current?.focus() }, [p.resposta])
  useEffect(() => { if (!gravando) return; const t = setInterval(() => { setAgora(Date.now()); setNivel(rec.current?.mic.nivel() ?? 0); if (Date.now() - gravando.inicio > LIMITE_AUDIO_SEG * 1000) pararGravacao(true) }, 120); return () => clearInterval(t) }, [gravando]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const el = area.current; if (!el) return; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 140)}px` }, [texto])

  async function enviarTexto(e?: FormEvent) {
    e?.preventDefault()
    const t = texto.trim()
    if (!t) return
    if (t.length > LIMITE_TEXTO) return toast(`A mensagem pode ter até ${LIMITE_TEXTO} caracteres.`, 'danger')
    setTexto('')
    await p.aoEnviar(t, null)
  }

  async function enviarArquivos(lista: FileList | null) {
    if (!lista?.length) return
    for (const f of [...lista].slice(0, 10)) {
      const erro = validarArquivo(f, p.permite)
      if (erro) { toast(erro, 'danger'); continue }
      setSubindo(true)
      try {
        let blob: Blob = f, extra: Partial<Anexo> = {}
        if (f.type.startsWith('image/') && !/gif|svg/.test(f.type)) {
          try { const r = await reduzirImagem(f); blob = r.blob; extra = { largura: r.largura, altura: r.altura } } catch { /* manda o original */ }
        }
        const a = await p.subir(blob, f.name, { ...extra, tipo: blob.type || f.type })
        await p.aoEnviar(texto.trim() || null, a)
        setTexto('')
      } catch (e) { toast((e as Error).message, 'danger') }
      finally { setSubindo(false) }
    }
    if (arq.current) arq.current.value = ''
  }

  async function gravar() {
    if (!p.permite.audios) return toast('Esta conversa não aceita áudios.', 'danger')
    if (typeof MediaRecorder === 'undefined') return toast('Este navegador não grava áudio. Use o Chrome, o Edge ou o Safari atualizados.', 'danger')
    try {
      const mic = await abrirMicLimpo()
      const tipo = formatoAudio((t) => MediaRecorder.isTypeSupported(t))
      const mr = new MediaRecorder(mic.stream, { ...(tipo ? { mimeType: tipo } : {}), audioBitsPerSecond: 48000 })
      const r = { mr, partes: [] as Blob[], cancelado: false, direto: false, mic }
      mr.ondataavailable = (e) => { if (e.data.size) r.partes.push(e.data) }
      mr.onstop = () => {
        mic.parar()
        const seg = (Date.now() - inicio) / 1000
        if (r.cancelado || seg < 0.8) return
        const blob = new Blob(r.partes, { type: (mr.mimeType || 'audio/webm').split(';')[0] })
        if (r.direto) void enviarAudio(blob, seg, null)
        else abrirRevisao(blob, seg)
      }
      rec.current = r
      const inicio = Date.now()
      mr.start(250)
      setGravando({ inicio }); setAgora(inicio)
    } catch { toast('Sem acesso ao microfone. Libere a permissão do navegador e tente de novo.', 'danger') }
  }
  async function enviarAudio(blob: Blob, seg: number, texto: string | null) {
    setSubindo(true)
    try {
      const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'
      const a = await p.subir(blob, `audio-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${ext}`, { duracao: Math.round(seg), tipo: blob.type, ...(texto ? { texto } : {}) })
      await p.aoEnviar(null, a)
    } catch (e) { toast((e as Error).message, 'danger') } finally { setSubindo(false) }
  }
  function abrirRevisao(blob: Blob, seg: number) {
    const url = URL.createObjectURL(blob)
    // a transcrição é feita logo depois do envio (aparece embaixo do áudio na conversa)
    setRevisao({ blob, url, seg, texto: null, estado: 'sem' })
  }
  function fecharRevisao() { if (revisao) URL.revokeObjectURL(revisao.url); setRevisao(null) }
  function pararGravacao(enviar: boolean, direto = false) {
    const r = rec.current; if (!r) return
    r.cancelado = !enviar
    r.direto = direto
    try { r.mr.stop() } catch { r.mic.parar() }
    rec.current = null; setGravando(null)
  }

  const temTexto = texto.trim().length > 0
  return (
    <div className="cv-comp">
      {p.resposta && (
        <div className="cv-resp">
          <div><b>Respondendo a {p.nomeResposta}</b><span>{resumo(p.resposta)}</span></div>
          <button type="button" className="cv-icone-bt" aria-label="Cancelar resposta" onClick={p.cancelarResposta}><Ic d={I.fechar} t={16} /></button>
        </div>
      )}
      {gravando ? (
        <div className="cv-gravando" role="status">
          <button type="button" className="cv-icone-bt" aria-label="Descartar áudio" onClick={() => pararGravacao(false)}><Ic d={I.lixo} /></button>
          <span className="cv-rec"><i aria-hidden="true" />Gravando {duracaoTela((agora - gravando.inicio) / 1000)}</span>
          <span className="cv-medidor" aria-hidden="true">{[0.15, 0.3, 0.5, 0.7, 0.9].map((x) => <i key={x} data-on={nivel >= x * 0.35 || undefined} />)}</span>
          <button type="button" className="cv-icone-bt cv-parar" aria-label="Parar e ouvir antes de enviar" title="Parar e ouvir" onClick={() => pararGravacao(true)}><Ic d={I.parar} /></button>
          <button type="button" className="cv-enviar" aria-label="Enviar áudio agora" onClick={() => pararGravacao(true, true)}><Ic d={I.enviar} t={18} /></button>
        </div>
      ) : revisao ? (
        <div className="cv-revisao" role="group" aria-label="Revisar áudio antes de enviar">
          <Audio url={revisao.url} duracao={revisao.seg} meu />
          {revisao.estado === 'transcrevendo' && <p className="cv-revisao-txt" aria-live="polite"><i className="cv-pontos" aria-hidden="true"><b /><b /><b /></i>Transcrevendo o áudio…</p>}
          {revisao.estado === 'pronto' && <p className="cv-revisao-txt">{revisao.texto}</p>}
          {revisao.estado === 'sem' && p.onde === 'chat' && <p className="cv-revisao-dica">Ouça antes de enviar. O texto do áudio aparece logo depois do envio.</p>}
          <div className="cv-revisao-bts">
            <button type="button" className="cv-revisao-excluir" onClick={fecharRevisao}><Ic d={I.lixo} t={16} />Excluir</button>
            <button type="button" className="cv-revisao-enviar" disabled={subindo} onClick={() => { const r = revisao; void enviarAudio(r.blob, r.seg, r.texto).then(() => { URL.revokeObjectURL(r.url); setRevisao(null) }) }}><Ic d={I.enviar} t={16} />{subindo ? 'Enviando…' : 'Enviar áudio'}</button>
          </div>
        </div>
      ) : (
        <form className="cv-comp-linha" onSubmit={enviarTexto}>
          {p.permite.anexos && (
            <>
              <button type="button" className="cv-icone-bt" aria-label="Enviar arquivo ou foto" title="Arquivo ou foto" disabled={subindo} onClick={() => arq.current?.click()}><Ic d={I.clipe} /></button>
              <input ref={arq} type="file" hidden multiple accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" onChange={(e) => void enviarArquivos(e.target.files)} />
            </>
          )}
          <textarea ref={area} rows={1} placeholder={subindo ? 'Enviando arquivo…' : 'Mensagem'} aria-label="Escrever mensagem" value={texto} maxLength={LIMITE_TEXTO}
            onChange={(e) => setTexto(e.target.value)}
            onPaste={(e) => { if (e.clipboardData.files.length && p.permite.anexos) { e.preventDefault(); void enviarArquivos(e.clipboardData.files) } }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && innerWidth > 700) { e.preventDefault(); void enviarTexto() } }} />
          {temTexto || !p.permite.audios
            ? <button type="submit" className="cv-enviar" aria-label="Enviar" disabled={!temTexto || subindo}><Ic d={I.enviar} t={18} /></button>
            : <button type="button" className="cv-enviar cv-enviar-mic" aria-label="Gravar áudio" disabled={subindo} onClick={() => void gravar()}><Ic d={I.mic} t={19} /></button>}
        </form>
      )}
    </div>
  )
}

// ---------- nova conversa ----------
function NovaConversa({ eu, aoAbrir, aoFechar }: { eu: string; aoAbrir: (id: string) => void; aoFechar: () => void }) {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const { perfil } = useSessao()
  const pessoas = useQuery({ queryKey: ['chat-pessoas', perfil?.escritorioId], queryFn: () => api.chatPessoas() })
  const [modo, setModo] = useState<'direta' | 'grupo'>('direta')
  const [nome, setNome] = useState('')
  const [escolhidos, setEscolhidos] = useState<string[]>([])
  const [filtro, setFiltro] = useState('')
  const outros = (pessoas.data ?? []).filter((x) => x.email !== eu && (!filtro || x.nome.toLowerCase().includes(filtro.toLowerCase())))
  const direta = useMutation({ mutationFn: (email: string) => api.chatDireta(email), onSuccess: (id) => { qc.invalidateQueries({ queryKey: ['chat-lista'] }); aoAbrir(id) }, onError: (e) => toast((e as Error).message, 'danger') })
  const grupo = useMutation({ mutationFn: () => api.chatGrupo(nome.trim(), escolhidos), onSuccess: (id) => { qc.invalidateQueries({ queryKey: ['chat-lista'] }); aoAbrir(id) }, onError: (e) => toast((e as Error).message, 'danger') })
  return (
    <Dialog open onOpenChange={(v) => { if (!v) aoFechar() }} title="Nova conversa">
      <div className="hv-dialog-body cv-nova">
        <div className="cv-abas" role="tablist" aria-label="Tipo">
          <button type="button" role="tab" aria-selected={modo === 'direta'} onClick={() => setModo('direta')}>Com uma pessoa</button>
          <button type="button" role="tab" aria-selected={modo === 'grupo'} onClick={() => setModo('grupo')}>Grupo</button>
        </div>
        {modo === 'grupo' && <label className="hv-field"><span>Nome do grupo</span><input className="hv-input" maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Metas de novembro" /></label>}
        <label className="cv-busca"><Ic d={I.busca} t={17} /><input placeholder="Buscar pessoa da equipe" aria-label="Buscar pessoa" value={filtro} onChange={(e) => setFiltro(e.target.value)} /></label>
        <ul className="cv-pessoas" role="list">
          {pessoas.isLoading && <li><Carregando avatar linhas={4} /></li>}
          {outros.map((x) => (
            <li key={x.email}>
              {modo === 'direta'
                ? <button type="button" className="cv-pessoa" disabled={direta.isPending} onClick={() => direta.mutate(x.email)}><Avatar nome={x.nome} tam={36} /><span>{x.nome}<small>{x.papel === 'master' ? 'Gestor Master' : x.papel === 'code' ? 'Coder' : 'Colaborador'}</small></span></button>
                : <label className="cv-pessoa"><input type="checkbox" checked={escolhidos.includes(x.email)} onChange={(e) => setEscolhidos(e.target.checked ? [...escolhidos, x.email] : escolhidos.filter((y) => y !== x.email))} /><Avatar nome={x.nome} tam={36} /><span>{x.nome}</span></label>}
            </li>
          ))}
          {pessoas.isSuccess && outros.length === 0 && <li className="cv-vazio">Ninguém com esse nome na equipe.</li>}
        </ul>
        {modo === 'grupo' && <div className="cv-nova-fim"><span>{escolhidos.length} {escolhidos.length === 1 ? 'pessoa' : 'pessoas'}</span><Button disabled={nome.trim().length < 2 || !escolhidos.length} loading={grupo.isPending} onClick={() => grupo.mutate()}>Criar grupo</Button></div>}
      </div>
    </Dialog>
  )
}

// ---------- chamadas anteriores ----------
function HistoricoChamadas({ conversa, nomes, eu, aoFechar }: { conversa: string; nomes: Map<string, string>; eu: string; aoFechar: () => void }) {
  const api = useApi()
  const toast = useToast()
  const [aberta, setAberta] = useState<ReuniaoPassada | null>(null)
  const lista = useQuery({ queryKey: ['reunioes', conversa], queryFn: () => api.reuniaoHistorico(conversa) })
  const falas = useQuery({ queryKey: ['reuniao-falas', aberta?.id], queryFn: () => api.reuniaoFalas(aberta!.id), enabled: !!aberta })
  const nome = (e: string) => (e === eu ? 'Você' : nomes.get(e) ?? e)
  const duracao = (r: ReuniaoPassada) => r.fim ? `${Math.max(1, Math.round((new Date(r.fim).getTime() - new Date(r.inicio).getTime()) / 60000))} min` : 'em andamento'
  function copiar() {
    const txt = (falas.data ?? []).map((f) => `[${horaMensagem(f.faladoEm)}] ${nome(f.autor)}: ${f.texto}`).join('\n')
    void navigator.clipboard?.writeText(txt).then(() => toast('Transcrição copiada.'), () => toast('Não deu para copiar.', 'danger'))
  }
  return (
    <Dialog open onOpenChange={(v) => { if (!v) aoFechar() }} title={aberta ? `Chamada de ${dataHoraCompleta(aberta.inicio)}` : 'Chamadas anteriores'} variant="painel">
      <div className="hv-dialog-body cv-hist">
        {!aberta && (
          <>
            {lista.isLoading && <Carregando avatar />}
            {lista.isSuccess && !lista.data.length && <p className="cv-vazio">Nenhuma chamada nesta conversa ainda. O que for dito nas próximas chamadas vira texto e aparece aqui.</p>}
            <ul className="cv-hist-lista" role="list">
              {lista.data?.map((r) => (
                <li key={r.id}>
                  <button type="button" className="cv-item" onClick={() => setAberta(r)}>
                    <span className="cv-av" data-tipo="externo" style={{ width: 40, height: 40 }} aria-hidden="true"><Ic d={r.video ? I.video : I.fone} t={18} /></span>
                    <span className="cv-item-meio">
                      <span className="cv-item-nome">{dataHoraCompleta(r.inicio)}</span>
                      <span className="cv-item-prev">{duracao(r)} · {r.participantes.map((p) => primeiroNome(nome(p))).join(', ') || primeiroNome(nome(r.iniciadaPor))} · {r.falas ? `${r.falas} ${r.falas === 1 ? 'trecho' : 'trechos'} transcritos` : 'sem transcrição'}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {aberta && (
          <>
            <div className="cv-hist-topo">
              <Button size="sm" variant="secondary" onClick={() => setAberta(null)}>Voltar</Button>
              {!!falas.data?.length && <Button size="sm" variant="secondary" onClick={copiar}>Copiar texto</Button>}
            </div>
            {falas.isLoading && <p className="cv-vazio">Carregando a transcrição…</p>}
            {falas.isSuccess && !falas.data.length && <p className="cv-vazio">Nada foi transcrito nesta chamada.</p>}
            <ol className="cv-falas">
              {falas.data?.map((f, i) => (
                <li key={i} data-meu={f.autor === eu || undefined}>
                  <span className="cv-falas-quem">{nome(f.autor)} <time title={dataHoraCompleta(f.faladoEm)}>{horaMensagem(f.faladoEm)}</time></span>
                  <p>{f.texto}</p>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </Dialog>
  )
}

// ---------- sons e avisos ----------
function AjustesAvisos({ aoFechar }: { aoFechar: () => void }) {
  const [p, setP] = useState<PrefsAvisos>(lerPrefs)
  const [perm, setPerm] = useState(typeof Notification === 'undefined' ? 'indisponivel' : Notification.permission)
  const mudar = (n: PrefsAvisos) => { setP(n); salvarPrefs(n) }
  return (
    <Dialog open onOpenChange={(v) => { if (!v) aoFechar() }} title="Sons e avisos" variant="painel">
      <div className="hv-dialog-body cv-mod">
        <fieldset className="cv-mod-grupo">
          <legend>Som de mensagem nova</legend>
          <div className="cv-seg">
            {SONS.map((s) => <button key={s.id} type="button" aria-pressed={p.som === s.id} onClick={() => { mudar({ ...p, som: s.id }); tocar(s.id) }}>{s.nome}</button>)}
          </div>
          <p className="cv-mod-dica">Toque num som para ouvir.</p>
        </fieldset>
        <fieldset className="cv-mod-grupo">
          <legend>Avisos</legend>
          <label className="cv-chave"><span>Janelinha na tela<small>Mostra quem mandou, em qualquer tela do HiAdv</small></span><input type="checkbox" role="switch" checked={p.popup} onChange={(e) => mudar({ ...p, popup: e.target.checked })} /></label>
          <label className="cv-chave"><span>Toque de chamada<small>Toca e mostra Atender ou Recusar quando alguém liga</small></span><input type="checkbox" role="switch" checked={p.chamada} onChange={(e) => mudar({ ...p, chamada: e.target.checked })} /></label>
          <label className="cv-chave"><span>Notificação do aparelho<small>Quando o HiAdv está em segundo plano</small></span><input type="checkbox" role="switch" checked={p.sistema && perm === 'granted'} disabled={perm === 'indisponivel' || perm === 'denied'}
            onChange={async (e) => {
              if (e.target.checked && perm !== 'granted') { const r = await Notification.requestPermission(); setPerm(r); mudar({ ...p, sistema: r === 'granted' }) }
              else mudar({ ...p, sistema: e.target.checked })
            }} /></label>
          {perm === 'denied' && <p className="cv-mod-dica">As notificações estão bloqueadas neste navegador. Libere nas configurações do site (cadeado ao lado do endereço).</p>}
          {perm === 'indisponivel' && <p className="cv-mod-dica">Neste aparelho, a notificação funciona com o HiAdv instalado na tela inicial.</p>}
        </fieldset>
      </div>
    </Dialog>
  )
}

// ---------- contatos ----------
function ListaContatos({ termo, eu, pessoas, contatos, nomes, sel, escolher }: { termo: string; eu: string; pessoas: PessoaEquipe[]; contatos: Contato[]; nomes: Map<string, string>; sel: Sel; escolher: (s: Sel) => void }) {
  const digitos = termo.replace(/\D/g, '')
  const equipe = pessoas.filter((p) => p.email !== eu && (!termo || (nomes.get(p.email) ?? p.nome).toLowerCase().includes(termo)))
  const externos = contatos.filter((c) => c.tipo === 'externo' && (!termo || c.nome.toLowerCase().includes(termo) || (!!digitos && (c.telefone ?? '').includes(digitos))))
  return (
    <>
      <li className="cv-sep">Equipe do escritório</li>
      {equipe.map((p) => (
        <li key={p.email}>
          <button type="button" className="cv-item" aria-current={(sel?.tipo === 'pessoa' && sel.id === p.email) || undefined} onClick={() => escolher({ tipo: 'pessoa', id: p.email })}>
            <Avatar nome={nomes.get(p.email) ?? p.nome} online={estaOnline(p.vistoEm)} />
            <span className="cv-item-meio"><span className="cv-item-nome">{nomes.get(p.email) ?? p.nome}</span><span className="cv-item-prev">{p.papel === 'master' ? 'Gestor Master' : p.papel === 'code' ? 'Coder' : 'Colaborador'} · {vistoTela(p.vistoEm)}</span></span>
          </button>
        </li>
      ))}
      {!equipe.length && <li className="cv-vazio">{termo ? 'Ninguém da equipe com esse nome.' : 'Só você na equipe por enquanto.'}</li>}
      <li className="cv-sep">Números externos</li>
      {externos.map((c) => (
        <li key={c.id}>
          <button type="button" className="cv-item" aria-current={(sel?.tipo === 'contato' && sel.id === c.id) || undefined} onClick={() => escolher({ tipo: 'contato', id: c.id })}>
            <span className="cv-av" data-tipo="externo" style={{ width: 44, height: 44 }} aria-hidden="true"><Ic d={I.telefone} t={19} /></span>
            <span className="cv-item-meio"><span className="cv-item-nome">{c.nome}</span><span className="cv-item-prev">{telefoneTela(c.telefone ?? '')}</span></span>
          </button>
        </li>
      ))}
      {!externos.length && <li className="cv-vazio">{termo ? 'Nenhum número com esse nome.' : 'Nenhum número externo ainda. Toque em + para cadastrar.'}</li>}
    </>
  )
}

function PainelContato({ sel, eu, pessoas, contatos, nomes, voltar, abrirConversa, aoSalvar }: {
  sel: Exclude<Sel, null>; eu: string; pessoas: PessoaEquipe[]; contatos: Contato[]; nomes: Map<string, string>
  voltar: () => void; abrirConversa: (id: string) => void; aoSalvar: (id: string) => void
}) {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const pessoa = sel.tipo === 'pessoa' ? pessoas.find((p) => p.email === sel.id) : undefined
  const contato = sel.tipo === 'contato' ? contatos.find((c) => c.id === sel.id) : undefined
  const apelido = pessoa ? contatos.find((c) => c.tipo === 'equipe' && c.email === pessoa.email) : undefined
  const novo = sel.tipo === 'novo-contato'
  const [editando, setEditando] = useState(novo)
  const [nome, setNome] = useState(pessoa ? (nomes.get(pessoa.email) ?? pessoa.nome) : contato?.nome ?? '')
  const [tel, setTel] = useState(contato?.telefone ? telefoneTela(contato.telefone) : '')
  const [obs, setObs] = useState((pessoa ? apelido?.obs : contato?.obs) ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState(false)
  const salvar = useMutation({
    mutationFn: () => api.contatoSalvar(pessoa ? { tipo: 'equipe', email: pessoa.email, nome: nome.trim(), obs } : { id: contato?.id, tipo: 'externo', telefone: tel, nome: nome.trim(), obs }),
    onSuccess: (id) => { toast('Contato salvo.'); qc.invalidateQueries({ queryKey: ['contatos'] }); setEditando(false); if (!pessoa) aoSalvar(id) },
    onError: (e) => setErro((e as Error).message),
  })
  const apagar = useMutation({
    mutationFn: () => api.contatoApagar(contato!.id),
    onSuccess: () => { toast('Contato removido.'); qc.invalidateQueries({ queryKey: ['contatos'] }); voltar() },
    onError: (e) => toast((e as Error).message, 'danger'),
  })
  const direta = useMutation({ mutationFn: () => api.chatDireta(pessoa!.email), onSuccess: (id) => { qc.invalidateQueries({ queryKey: ['chat-lista'] }); abrirConversa(id) }, onError: (e) => toast((e as Error).message, 'danger') })
  if (!pessoa && !contato && !novo) return null
  const titulo = novo ? 'Novo contato' : pessoa ? (nomes.get(pessoa.email) ?? pessoa.nome) : contato!.nome
  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return setErro('Dê um nome ao contato.')
    if (!pessoa && !normalizarTelefone(tel)) return setErro('Confira o número: DDD e telefone, como (49) 99999-0000.')
    setErro(null); salvar.mutate()
  }
  return (
    <div className="cv-contato">
      <header className="cv-fio-cabeca">
        <button type="button" className="cv-icone-bt cv-so-cel" aria-label="Voltar para a lista" onClick={voltar}><Ic d={I.voltar} /></button>
        <div className="cv-fio-tit"><h2>{titulo}</h2><p>{pessoa ? `Equipe · ${pessoa.email}` : novo ? 'Número de fora do escritório' : telefoneTela(contato!.telefone ?? '')}</p></div>
        {!editando && <div className="cv-fio-acoes"><button type="button" className="cv-icone-bt" aria-label="Editar contato" title="Editar" onClick={() => setEditando(true)}><Ic d={I.lapis} /></button></div>}
      </header>
      <div className="cv-contato-corpo">
        {pessoa ? <Avatar nome={titulo} tam={88} /> : <span className="cv-av" data-tipo="externo" style={{ width: 88, height: 88 }} aria-hidden="true"><Ic d={I.telefone} t={36} /></span>}
        {editando ? (
          <form className="cv-contato-form" onSubmit={enviar}>
            <label className="hv-field"><span>{pessoa ? 'Nome que a equipe vê' : 'Nome'}</span><input className="hv-input" autoFocus maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} placeholder={pessoa ? pessoa.nome : 'Ex.: Perito Dr. Fulano'} /></label>
            {!pessoa && <label className="hv-field"><span>Número</span><input className="hv-input" inputMode="tel" autoComplete="off" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="(49) 99999-0000" /></label>}
            <label className="hv-field"><span>Observação (opcional)</span><input className="hv-input" maxLength={200} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: atende só à tarde" /></label>
            {pessoa && <p className="cv-mod-dica">O nome vale para toda a equipe do escritório. O cadastro original ({pessoa.nome}) continua igual.</p>}
            {erro && <p className="hv-error" role="alert">{erro}</p>}
            <div className="cv-contato-bts">
              {!novo && <Button type="button" variant="secondary" onClick={() => setEditando(false)}>Cancelar</Button>}
              <Button type="submit" loading={salvar.isPending}>Salvar</Button>
            </div>
          </form>
        ) : (
          <>
            {(pessoa ? apelido?.obs : contato?.obs) && <p className="cv-contato-obs">{pessoa ? apelido?.obs : contato?.obs}</p>}
            <div className="cv-contato-acoes">
              {pessoa && pessoa.email !== eu && <button type="button" onClick={() => direta.mutate()} disabled={direta.isPending}><Ic d={I.balao} /><span>Mensagem</span></button>}
              {contato?.telefone && <a href={`tel:${contato.telefone}`}><Ic d={I.telefone} /><span>Ligar</span></a>}
              {contato?.telefone && <a href={linkWhatsApp(contato.telefone)} target="_blank" rel="noopener noreferrer"><Ic d={I.balao} /><span>WhatsApp</span></a>}
            </div>
            {contato && (confirmar
              ? <span className="cv-contato-conf" role="group" aria-label="Confirmar remoção"><span>Remover {contato.nome}?</span><Button size="sm" variant="secondary" onClick={() => setConfirmar(false)}>Não</Button><Button size="sm" loading={apagar.isPending} onClick={() => apagar.mutate()}>Remover</Button></span>
              : <button type="button" className="cv-link cv-perigo" onClick={() => setConfirmar(true)}>Remover contato</button>)}
            {(pessoa ? apelido : contato) && <small className="cv-contato-quem">Editado por {primeiroNome(nomes.get((pessoa ? apelido : contato)!.editadoPor ?? '') ?? (pessoa ? apelido : contato)!.editadoPor ?? '')} em {new Date((pessoa ? apelido : contato)!.editadoEm).toLocaleDateString('pt-BR')}</small>}
          </>
        )}
      </div>
    </div>
  )
}

// ---------- moderação (Coder) ----------
const VAZIA: ComunidadeForm = { nome: '', descricao: '', areas: [], soMasters: true, quemPosta: 'todos', anexos: true, audios: true, ativa: true, intervaloSeg: 30, links: false, aprovacao: false }

function Moderacao({ c, aoFechar }: { c: Comunidade | null; aoFechar: () => void }) {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const [f, setF] = useState<ComunidadeForm>(c ? { id: c.id, nome: c.nome, descricao: c.descricao ?? '', areas: c.areas ?? [], soMasters: c.soMasters, quemPosta: c.quemPosta, anexos: c.anexos, audios: c.audios, ativa: c.ativa, intervaloSeg: c.intervaloSeg, links: c.links, aprovacao: c.aprovacao } : VAZIA)
  const [erro, setErro] = useState<string | null>(null)
  const pessoas = useQuery({ queryKey: ['com-pessoas', c?.id], queryFn: () => api.comPessoas(c!.id), enabled: !!c })
  const pedidos = useQuery({ queryKey: ['com-pedidos', c?.id], queryFn: () => api.comPedidos(c!.id), enabled: !!c && f.aprovacao })
  const decidir = useMutation({
    mutationFn: (x: { esc: string; ok: boolean }) => api.comDecidirEntrada(c!.id, x.esc, x.ok),
    onSuccess: (_r, x) => { toast(x.ok ? 'Escritório aprovado.' : 'Pedido recusado.'); qc.invalidateQueries({ queryKey: ['com-pedidos', c?.id] }); qc.invalidateQueries({ queryKey: ['com-lista'] }) },
    onError: (e) => toast((e as Error).message, 'danger'),
  })
  const salvar = useMutation({
    mutationFn: () => api.comSalvar(f),
    onSuccess: () => { toast(c ? 'Comunidade atualizada.' : 'Comunidade criada.'); qc.invalidateQueries({ queryKey: ['com-lista'] }); aoFechar() },
    onError: (e) => setErro((e as Error).message),
  })
  const silenciar = useMutation({
    mutationFn: (x: { email: string; horas: number | null }) => api.comSilenciar(c!.id, x.email, x.horas),
    onSuccess: (_r, x) => { toast(x.horas === 0 ? 'Envio liberado.' : 'Envio pausado.'); qc.invalidateQueries({ queryKey: ['com-pessoas', c?.id] }) },
    onError: (e) => toast((e as Error).message, 'danger'),
  })
  const chave = (k: keyof ComunidadeForm, v: boolean) => setF({ ...f, [k]: v })
  return (
    <Dialog open onOpenChange={(v) => { if (!v) aoFechar() }} title={c ? `Moderar: ${c.nome}` : 'Nova comunidade'} variant="painel">
      <form className="hv-dialog-body cv-mod" onSubmit={(e) => { e.preventDefault(); const v = validarComunidade(f); if (v) return setErro(v); setErro(null); salvar.mutate() }}>
        <label className="hv-field"><span>Nome</span><input className="hv-input" maxLength={60} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex.: Masters Trabalhistas HiAdv" /></label>
        <label className="hv-field"><span>Descrição</span><input className="hv-input" maxLength={200} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder="Para quem é e sobre o que se fala aqui" /></label>
        <fieldset className="cv-mod-grupo">
          <legend>Quem participa</legend>
          <div className="cv-seg">
            <button type="button" aria-pressed={f.soMasters} onClick={() => chave('soMasters', true)}>Só Gestores Master</button>
            <button type="button" aria-pressed={!f.soMasters} onClick={() => chave('soMasters', false)}>Toda a equipe</button>
          </div>
          <p className="cv-mod-dica">Áreas (sem nenhuma marcada, vale para todas):</p>
          <div className="rg-chips">
            {Object.entries(NOMES_AREAS).map(([k, n]) => (
              <label key={k} className="rg-chip"><input type="checkbox" checked={f.areas.includes(k)} onChange={(e) => setF({ ...f, areas: e.target.checked ? [...f.areas, k] : f.areas.filter((x) => x !== k) })} /><span>{n}</span></label>
            ))}
          </div>
        </fieldset>
        <fieldset className="cv-mod-grupo">
          <legend>O que pode ser enviado</legend>
          <div className="cv-seg">
            <button type="button" aria-pressed={f.quemPosta === 'todos'} onClick={() => setF({ ...f, quemPosta: 'todos' })}>Todos publicam</button>
            <button type="button" aria-pressed={f.quemPosta === 'moderadores'} onClick={() => setF({ ...f, quemPosta: 'moderadores' })}>Só a moderação</button>
          </div>
          <label className="cv-chave"><span>Arquivos e fotos</span><input type="checkbox" role="switch" checked={f.anexos} onChange={(e) => chave('anexos', e.target.checked)} /></label>
          <label className="cv-chave"><span>Áudios</span><input type="checkbox" role="switch" checked={f.audios} onChange={(e) => chave('audios', e.target.checked)} /></label>
          <label className="cv-chave"><span>Links externos<small>Desligado evita propaganda e captação entre escritórios</small></span><input type="checkbox" role="switch" checked={f.links} onChange={(e) => chave('links', e.target.checked)} /></label>
          <p className="cv-mod-dica">Intervalo entre mensagens da mesma pessoa:</p>
          <div className="cv-seg">
            {INTERVALOS.map((i) => <button key={i.seg} type="button" aria-pressed={f.intervaloSeg === i.seg} onClick={() => setF({ ...f, intervaloSeg: i.seg })}>{i.rotulo}</button>)}
          </div>
        </fieldset>
        <fieldset className="cv-mod-grupo">
          <legend>Entrada</legend>
          <label className="cv-chave"><span>Aprovar quem entra<small>Cada escritório pede entrada e a moderação aprova</small></span><input type="checkbox" role="switch" checked={f.aprovacao} onChange={(e) => chave('aprovacao', e.target.checked)} /></label>
          <label className="cv-chave"><span>Comunidade ativa</span><input type="checkbox" role="switch" checked={f.ativa} onChange={(e) => chave('ativa', e.target.checked)} /></label>
        </fieldset>
        {erro && <p className="hv-error" role="alert">{erro}</p>}
        {c && f.aprovacao && !!pedidos.data?.length && (
          <fieldset className="cv-mod-grupo">
            <legend>Pedidos de entrada</legend>
            <ul className="cv-mod-pessoas" role="list">
              {pedidos.data.map((x) => (
                <li key={x.escritorioId}>
                  <Avatar nome={x.escritorio} tam={32} />
                  <span className="cv-mod-nome">{x.escritorio}<small>{x.status === 'pendente' ? `pediu em ${new Date(x.pedidoEm).toLocaleDateString('pt-BR')}` : x.status === 'aprovado' ? 'participa' : 'recusado'}</small></span>
                  <span className="cv-mod-bts" role="group" aria-label={`Decidir entrada de ${x.escritorio}`}>
                    {x.status !== 'aprovado' && <button type="button" onClick={() => decidir.mutate({ esc: x.escritorioId, ok: true })}>Aprovar</button>}
                    {x.status !== 'recusado' && <button type="button" onClick={() => decidir.mutate({ esc: x.escritorioId, ok: false })}>{x.status === 'aprovado' ? 'Remover' : 'Recusar'}</button>}
                  </span>
                </li>
              ))}
            </ul>
          </fieldset>
        )}
        <Button type="submit" loading={salvar.isPending}>{c ? 'Salvar alterações' : 'Criar comunidade'}</Button>
        {c && (
          <fieldset className="cv-mod-grupo">
            <legend>Participantes ({pessoas.data?.length ?? '…'})</legend>
            <ul className="cv-mod-pessoas" role="list">
              {pessoas.data?.map((x) => (
                <li key={x.email}>
                  <Avatar nome={x.nome} tam={32} />
                  <span className="cv-mod-nome">{x.nome}<small>{x.escritorio ?? '—'}{x.silenciadoAte && ` · envio pausado ${x.silenciadoAte === 'sempre' ? 'até liberar' : `até ${new Date(x.silenciadoAte).toLocaleDateString('pt-BR')}`}`}</small></span>
                  {x.silenciadoAte
                    ? <Button size="sm" variant="secondary" onClick={() => silenciar.mutate({ email: x.email, horas: 0 })}>Liberar</Button>
                    : <span className="cv-mod-bts" role="group" aria-label={`Pausar envio de ${x.nome}`}>
                        <button type="button" onClick={() => silenciar.mutate({ email: x.email, horas: 24 })}>24 h</button>
                        <button type="button" onClick={() => silenciar.mutate({ email: x.email, horas: 168 })}>7 dias</button>
                        <button type="button" onClick={() => silenciar.mutate({ email: x.email, horas: null })}>Pausar</button>
                      </span>}
                </li>
              ))}
            </ul>
          </fieldset>
        )}
      </form>
    </Dialog>
  )
}
