import { useEffect, useRef, useState } from 'react'
import { useSessao } from '../lib/contexto'
import { aparelhoDeToque, ativar, ativoPara, desbloquear, desligar, dispensado, dispensar, suportado } from '../lib/desbloqueio'
import { Button } from '../design/components/Button'
import { useToast } from '../design/components/Toast'
import { Marca } from './Marca'

/** Tela mostrada ao abrir o app com o desbloqueio ligado: o aparelho confirma o dono antes de mostrar os dados. */
export function Travado({ aoLiberar }: { aoLiberar: () => void }) {
  const sessao = useSessao()
  const [erro, setErro] = useState<string | null>(null)
  const [pedindo, setPedindo] = useState(false)
  const tentou = useRef(false)

  async function pedir() {
    setErro(null); setPedindo(true)
    const ok = await desbloquear()
    setPedindo(false)
    if (ok) aoLiberar()
    else setErro('Não foi confirmado. Tente de novo ou entre com e-mail e senha.')
  }
  useEffect(() => { if (!tentou.current) { tentou.current = true; void pedir() } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="login travado">
      <div className="login-caixa">
        <Marca />
        <h1>Olá{sessao.perfil?.nome ? `, ${sessao.perfil.nome.split(' ')[0]}` : ''}</h1>
        <p className="muted">Use a digital, o rosto ou a senha de tela do celular para abrir o HiAdv.</p>
        <Button loading={pedindo} onClick={pedir}>Desbloquear</Button>
        {erro && <p className="hv-error" role="alert">{erro}</p>}
        <button type="button" className="login-link" onClick={() => { desligar(); void sessao.sair() }}>Entrar com e-mail e senha</button>
      </div>
    </div>
  )
}

/** Oferta, depois do primeiro login no celular, de abrir das próximas vezes com a trava do aparelho. */
export function OfertaDesbloqueio() {
  const { perfil } = useSessao()
  const toast = useToast()
  const [mostrar, setMostrar] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => {
    let vivo = true
    if (!perfil || ativoPara(perfil.email) || dispensado() || !aparelhoDeToque()) return
    suportado().then((s) => { if (vivo) setMostrar(s) })
    return () => { vivo = false }
  }, [perfil])
  if (!mostrar || !perfil) return null

  async function ligar() {
    setOcupado(true)
    try { await ativar(perfil!.email, perfil!.nome); setMostrar(false); toast('Pronto. Nas próximas vezes, abra o HiAdv com a senha do celular.') }
    catch { toast('O celular não confirmou. Você pode ligar depois em Configurações.') }
    finally { setOcupado(false) }
  }
  return (
    <aside className="oferta-desbloqueio" aria-label="Entrar com a senha do celular">
      <p><strong>Entrar mais rápido?</strong> Nas próximas vezes, abra o HiAdv com a digital, o rosto ou a senha de tela do celular, sem digitar a senha.</p>
      <div className="catalogo-linha">
        <Button size="sm" loading={ocupado} onClick={ligar}>Usar a senha do celular</Button>
        <Button size="sm" variant="ghost" onClick={() => { dispensar(); setMostrar(false) }}>Agora não</Button>
      </div>
    </aside>
  )
}

/** Liga e desliga o desbloqueio neste aparelho (Configurações). */
export function DesbloqueioNesteAparelho() {
  const { perfil } = useSessao()
  const toast = useToast()
  const [pode, setPode] = useState<boolean | null>(null)
  const [ativo, setAtivo] = useState(() => ativoPara(perfil?.email))
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => { suportado().then(setPode) }, [])
  if (!perfil) return null

  async function ligar() {
    setOcupado(true)
    try { await ativar(perfil!.email, perfil!.nome); setAtivo(true); toast('Desbloqueio pelo celular ligado neste aparelho.') }
    catch { toast('O aparelho não confirmou.') }
    finally { setOcupado(false) }
  }
  return (
    <div className="hv-panel-body">
      <p className="muted">Abra o HiAdv com a digital, o rosto ou a senha de tela deste aparelho, sem digitar a senha. Vale só para este aparelho; se a sessão terminar, o HiAdv pede e-mail e senha de novo.</p>
      {pode === false && !ativo && <p className="hv-hint">Este aparelho ou navegador não oferece desbloqueio por digital, rosto ou senha de tela.</p>}
      <div className="catalogo-linha">
        {ativo
          ? <><span className="muted">Ligado neste aparelho.</span><Button size="sm" variant="ghost" onClick={() => { desligar(); setAtivo(false); toast('Desbloqueio pelo celular desligado neste aparelho.') }}>Desligar</Button></>
          : pode && <Button size="sm" variant="secondary" loading={ocupado} onClick={ligar}>Ligar neste aparelho</Button>}
      </div>
    </div>
  )
}
