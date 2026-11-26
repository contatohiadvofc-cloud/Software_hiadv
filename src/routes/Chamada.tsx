import { useEffect, useReducer, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from '@tanstack/react-router'
import { gravarChamada, nomeGravacao, type Gravacao } from '../lib/gravador'
import { limiteChamada, plano as dadosPlano } from '../data/adesao'
import { useApi } from '../lib/contexto'
import { useToast } from '../design/components/Toast'
import { ChamadaMotor, type Participante } from '../lib/chamadaMotor'
import { iniciarTranscritor } from '../lib/transcritorReuniao'
import { AltoFalante, temFone } from '../lib/somChamada'
import { FALANDO, cronometro, nivelVoz } from '../data/chamada'
import { iniciais } from '../data/conversas'
import { Ic } from './Conversas'

const D = {
  minimizar: 'M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7',
  ampliar: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7',
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3',
  micOff: 'M1 1l22 22M9 9v3a3 3 0 0 0 5.1 2.1M15 9.3V5a3 3 0 0 0-5.9-.6M17 16.9A7 7 0 0 1 5 12v-2m14 0v2c0 .8-.1 1.5-.4 2.2M12 19v3',
  cam: 'M23 7l-7 5 7 5zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z',
  camOff: 'M1 1l22 22M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.7 0H14a2 2 0 0 1 2 2v3.3l1 1L23 7v10',
  tela: 'M2 4h20v12H2zM8 20h8M12 16v4',
  gravar: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  alto: 'M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14',
  virar: 'M20 7h-3.2l-1.8-2H9L7.2 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM9 13.5a3 3 0 0 1 5.2-2M15 12.5a3 3 0 0 1-5.2 2M14 9.5v2h-2M10 16.5v-2h2',
  sair: 'M10.7 13.3a16 16 0 0 0 3.4 2.4l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8M23 1 1 23',
}

/** Acende a borda de quem está falando (analisa o som localmente, nada sai do aparelho). */
function useFalando(stream: MediaStream | null, ligado: boolean) {
  const [falando, setFalando] = useState(false)
  useEffect(() => {
    const faixa = stream?.getAudioTracks()[0]
    if (!faixa || !ligado || typeof AudioContext === 'undefined') { setFalando(false); return }
    const ctx = new AudioContext()
    const an = ctx.createAnalyser(); an.fftSize = 512
    ctx.createMediaStreamSource(new MediaStream([faixa])).connect(an)
    const buf = new Uint8Array(an.fftSize)
    let ultimo = 0
    const t = setInterval(() => {
      an.getByteTimeDomainData(buf)
      const agora = nivelVoz(buf) > FALANDO
      if (agora) ultimo = Date.now()
      setFalando(Date.now() - ultimo < 400)
    }, 120)
    return () => { clearInterval(t); void ctx.close().catch(() => {}) }
  }, [stream, ligado])
  return falando
}

function Tile({ nome, stream, eu, instavel, mudo, semCamera, somPorFora }: { nome: string; stream: MediaStream | null; eu?: boolean; instavel?: boolean; mudo?: boolean; semCamera?: boolean; somPorFora?: boolean }) {
  const v = useRef<HTMLVideoElement>(null)
  const temVideo = !semCamera && !!stream?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live' && !t.muted)
  const falando = useFalando(stream, !mudo)
  useEffect(() => {
    const el = v.current; if (!el) return
    if (el.srcObject !== stream) el.srcObject = stream
    // alguns navegadores (iPhone) só tocam o vídeo e o som de quem chega com play() explícito
    if (stream) void el.play().catch(() => {})
  }, [stream, temVideo])
  return (
    <div className="ch-cel"><div className="ch-tile" data-instavel={instavel || undefined} data-video={temVideo || undefined} data-falando={falando || undefined} data-eu={eu || undefined}>
      <video ref={v} autoPlay playsInline muted={eu || somPorFora} />
      {!temVideo && <span className="ch-av" aria-hidden="true">{iniciais(nome)}</span>}
      <span className="ch-nome">
        {mudo && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-label="microfone desligado" role="img"><path d={D.micOff} /></svg>}
        {eu ? 'Você' : nome}{instavel && ' · reconectando'}
      </span>
    </div></div>
  )
}

/** Tela da chamada: grade de pessoas, controles embaixo e cronômetro. Áudio e vídeo vão direto entre os aparelhos. */
export function Chamada({ id, video, titulo, eu, aoSair }: { id: string; video: boolean; titulo: string; eu: { email: string; nome: string }; aoSair: () => void }) {
  const api = useApi()
  const toast = useToast()
  const [, atualizar] = useReducer((x: number) => x + 1, 0)
  const motor = useRef<ChamadaMotor | null>(null)
  const sairRef = useRef<() => Promise<void>>(async () => {})
  const [pronta, setPronta] = useState(false)
  const [inicio] = useState(Date.now())
  const [agora, setAgora] = useState(Date.now())

  useEffect(() => {
    const canal = api.reuniaoCanal(id)
    if (!canal) { toast('Na prévia não há chamada de verdade.', 'danger'); aoSair(); return }
    // nos testes de chamada entre abas, cada aba pode se apresentar com outro nome
    const quem = { ...eu, nome: (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('hiadv-demo-nome')) || eu.nome }
    const m = new ChamadaMotor(canal, quem, atualizar)
    motor.current = m
    let trava: { release: () => Promise<void> } | null = null
    let pararTranscricao: (() => void) | null = null
    let voltar: (() => Promise<void>) | null = null
    api.reuniaoIce().then((ice) => { if (ice.length) m.iceServers = ice }).catch(() => {}).then(() => m.iniciar(video)).then(async () => {
      setPronta(true)
      const transcrever = () => {
        pararTranscricao?.()
        const voz = m.local?.getAudioTracks()[0]
        pararTranscricao = voz ? iniciarTranscritor(voz, (b) => api.reuniaoFalaEnviar(id, b)) : null
      }
      transcrever()
      // controles da chamada na tela de bloqueio / central de notificações (onde o celular oferece)
      try {
        const ms = navigator.mediaSession as MediaSession & { setMicrophoneActive?: (a: boolean) => void; setCameraActive?: (a: boolean) => void }
        ms.metadata = new MediaMetadata({ title: `Chamada · ${titulo}`, artist: 'HiAdv', artwork: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] })
        const acao = (a: string, fn: () => void) => { try { ms.setActionHandler(a as MediaSessionAction, fn) } catch { /* ação não suportada */ } }
        acao('hangup', () => void sairRef.current())
        acao('togglemicrophone', () => { m.alternarMic(); ms.setMicrophoneActive?.(m.micLigado()) })
        acao('togglecamera', () => { m.alternarCam(); ms.setCameraActive?.(m.camLigada()) })
      } catch { /* sem Media Session */ }
      // voltou da tela bloqueada ou de outro app: religa o microfone e reconecta
      voltar = async () => {
        if (document.visibilityState !== 'visible') return
        try { trava ??= await (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null } catch { /* sem suporte */ }
        if (await m.retomar()) { transcrever(); toast('Microfone religado. A chamada continua.') }
      }
      document.addEventListener('visibilitychange', voltar)
      m.local?.getTracks().forEach((t) => t.addEventListener('ended', () => void voltar?.()))
      try { trava = await (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null } catch { /* sem suporte */ }
    }).catch((e: Error) => {
      toast(/Permission|NotAllowed|denied/i.test(e.name + e.message) ? `Sem acesso ao ${video ? 'microfone ou à câmera' : 'microfone'}. Libere a permissão do navegador e tente de novo.` : e.message, 'danger')
      m.sair(); aoSair()
    })
    const t = setInterval(() => setAgora(Date.now()), 1000)
    const fechar = () => m.sair()
    addEventListener('pagehide', fechar)
    return () => { clearInterval(t); removeEventListener('pagehide', fechar); if (voltar) document.removeEventListener('visibilitychange', voltar); try { navigator.mediaSession.metadata = null } catch { /* nada */ } pararTranscricao?.(); m.sair(); void trava?.release().catch(() => {}) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // capacidade da chamada = total de acessos do plano (Júnior 2, Pleno 9, Sênior 13; Master conforme o contrato)
  const meus = useQuery({ queryKey: ['meus-recursos'], queryFn: () => api.meusRecursos(), staleTime: 300_000 })
  const limite = limiteChamada(meus.data?.plano ?? null)
  const conferiuLotacao = useRef(false)
  const m = motor.current
  const pessoas: Participante[] = m?.participantes() ?? []
  useEffect(() => {
    if (!pronta || conferiuLotacao.current || !meus.isSuccess) return
    const t = setTimeout(() => {
      conferiuLotacao.current = true
      const n = (motor.current?.participantes().length ?? 0) + 1
      if (n > limite) {
        const nome = meus.data?.plano ? dadosPlano(meus.data.plano).nome : ''
        toast(`A chamada está cheia: ${nome ? `o plano ${nome}` : 'o plano'} permite até ${limite} pessoas por chamada.`, 'danger')
        void sairRef.current()
      }
    }, 2500)
    return () => clearTimeout(t)
  }, [pronta, meus.isSuccess, limite]) // eslint-disable-line react-hooks/exhaustive-deps
  const chaveSom = pessoas.map((p) => p.id + (p.stream ? p.stream.id : '')).join('|')
  const [alto, setAlto] = useState(false)
  const [mini, setMini] = useState(false)
  // mudou de tela no HiAdv: a chamada continua, reduzida no canto
  const caminho = useLocation({ select: (l) => l.pathname })
  const primeiroCaminho = useRef(caminho)
  useEffect(() => { if (caminho !== primeiroCaminho.current) setMini(true) }, [caminho])
  const gravacao = useRef<Gravacao | null>(null)
  const [gravando, setGravando] = useState(false)
  async function alternarGravacao() {
    if (gravacao.current) { await terminarGravacao(); return }
    if (!confirm('Gravar a chamada? Todos na chamada verão o aviso "gravando". O arquivo fica só no seu computador. Na próxima janela, escolha esta aba (ou a tela inteira) e marque "Compartilhar áudio".')) return
    try {
      const vozes = [m?.local, ...pessoas.map((p) => p.stream)].filter((x): x is MediaStream => !!x)
      const g = await gravarChamada(vozes)
      gravacao.current = g; setGravando(true); m?.marcarGravacao(true)
      g.aoTerminar(() => { if (gravacao.current === g) void terminarGravacao() })
      toast('Gravando. Clique em "Parar" para salvar o arquivo.')
    } catch (e) { if (!/NotAllowed|Abort/i.test((e as Error).name)) toast('Não foi possível gravar neste navegador. Use o Chrome ou o Edge no computador.', 'danger') }
  }
  async function terminarGravacao() {
    const g = gravacao.current; if (!g) return
    gravacao.current = null; setGravando(false); motor.current?.marcarGravacao(false)
    const blob = await g.parar()
    if (!blob.size) return
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = nomeGravacao(new Date(), blob.type); document.body.append(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    toast('Gravação salva na pasta de downloads.')
  }
  useEffect(() => () => { void gravacao.current?.parar() }, [])
  const [fone, setFone] = useState(false)
  const falante = useRef<AltoFalante | null>(null)
  useEffect(() => {
    const ver = () => void temFone().then(setFone)
    ver()
    navigator.mediaDevices?.addEventListener?.('devicechange', ver)
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', ver)
  }, [pronta])
  useEffect(() => {
    if (!alto) { falante.current?.desligar(); falante.current = null; return }
    if (!falante.current) { const f = new AltoFalante(); if (!f.ligar()) { setAlto(false); return } falante.current = f }
    falante.current.atualizar(pessoas.map((p) => p.stream).filter((x): x is MediaStream => !!x))
  }, [alto, chaveSom]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => falante.current?.desligar(), [])
  const celular = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
  async function sair() {
    if (gravacao.current) await terminarGravacao()
    m?.sair()
    if (pessoas.length === 0) { try { await api.reuniaoEncerrar(id) } catch { /* encerra sozinha depois */ } }
    aoSair()
  }
  sairRef.current = sair

  return (
    <div className="ch" data-mini={mini || undefined} role="dialog" aria-modal={!mini} aria-label={`Chamada: ${titulo}`}>
      <header className="ch-topo">
        <div><b>{titulo}</b><span>{pronta ? `${pessoas.length + 1} na chamada · ${cronometro(agora - inicio)}` : 'Conectando…'}</span></div>
        <button type="button" className="ch-mini-botao" aria-label={mini ? 'Ampliar a chamada' : 'Reduzir a chamada'} title={mini ? 'Ampliar' : 'Reduzir e continuar usando o HiAdv'} onClick={() => setMini(!mini)}><Ic d={mini ? D.ampliar : D.minimizar} /></button>
        <span className="ch-fone" data-fone={fone || undefined} title={fone ? 'Fone conectado: só a sua voz é captada, sem eco.' : 'Sem fone: o eco e o ruído ao redor são reduzidos. Para captar só a sua voz, use fone com microfone.'}>{fone ? 'Fone conectado' : 'Sem fone · use fone para isolar sua voz'}</span>
        {(gravando || pessoas.some((p) => p.gravando))
          ? <span className="ch-gravando" role="status"><i aria-hidden="true" />{gravando ? 'Você está gravando' : `${pessoas.filter((p) => p.gravando).map((p) => p.nome.split(' ')[0]).join(', ')} está gravando`}</span>
          : <span className="ch-seguro" title="Áudio e vídeo vão direto entre os aparelhos. Só grava quem clicar em Gravar, e todos veem o aviso. O que cada um fala vira texto no histórico da conversa.">Transcrição ligada · só o texto é guardado</span>}
      </header>
      <div className="ch-grade" data-dupla={(pessoas.length === 1 && !m?.tela && !pessoas[0]?.tela) || undefined} data-n={Math.min(pessoas.length + 1 + (m?.tela ? 1 : 0) + pessoas.filter((p) => p.tela).length, 9)}>
        <Tile nome={eu.nome} stream={m?.local ?? null} eu mudo={!m?.micLigado()} semCamera={!m?.camLigada()} />
        {m?.tela && <Tile nome="Sua tela" stream={m.tela} eu />}
        {pessoas.map((p) => <Tile key={p.id} nome={p.nome} stream={p.stream} instavel={p.instavel} mudo={!p.mic} semCamera={!p.cam} somPorFora={alto} />)}
        {pessoas.filter((p) => p.tela).map((p) => <Tile key={`${p.id}-tela`} nome={`Tela de ${p.nome.split(' ')[0]}`} stream={p.tela} eu />)}
        {pronta && pessoas.length === 0 && <p className="ch-espera">Esperando alguém entrar. Quem está na conversa vê o aviso para entrar.</p>}
      </div>
      <footer className="ch-controles">
        <button type="button" aria-pressed={!m?.micLigado()} aria-label={m?.micLigado() ? 'Desligar microfone' : 'Ligar microfone'} onClick={() => m?.alternarMic()}><Ic d={m?.micLigado() ? D.mic : D.micOff} /><small>{m?.micLigado() ? 'Mudo' : 'Falar'}</small></button>
        {m?.temCamera() && <button type="button" aria-pressed={!m.camLigada()} aria-label={m.camLigada() ? 'Desligar câmera' : 'Ligar câmera'} onClick={() => m.alternarCam()}><Ic d={m.camLigada() ? D.cam : D.camOff} /><small>Câmera</small></button>}
        {m?.temCamera() && celular && <button type="button" aria-label="Virar câmera" onClick={() => void m.virarCamera()}><Ic d={D.virar} /><small>Virar</small></button>}
        {'getDisplayMedia' in (navigator.mediaDevices ?? {}) && !celular && <button type="button" aria-pressed={!!m?.tela} aria-label="Compartilhar tela" onClick={() => void m?.compartilharTela()}><Ic d={D.tela} /><small>Tela</small></button>}
        {'getDisplayMedia' in (navigator.mediaDevices ?? {}) && typeof MediaRecorder !== 'undefined' && !celular && <button type="button" className={gravando ? 'ch-rec' : undefined} aria-pressed={gravando} aria-label={gravando ? 'Parar a gravação e salvar' : 'Gravar a chamada'} onClick={() => void alternarGravacao()}><Ic d={D.gravar} /><small>{gravando ? 'Parar' : 'Gravar'}</small></button>}
        <button type="button" aria-pressed={alto} aria-label={alto ? 'Voltar ao som normal' : 'Alto-falante: som mais alto'} onClick={() => setAlto(!alto)}><Ic d={D.alto} /><small>{alto ? 'Alto ✓' : 'Alto-falante'}</small></button>
        <button type="button" className="ch-sair" aria-label="Sair da chamada" onClick={() => void sair()}><Ic d={D.sair} /><small>Sair</small></button>
      </footer>
    </div>
  )
}
