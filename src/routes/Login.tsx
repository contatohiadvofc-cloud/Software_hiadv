import { useState, type FormEvent } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Button } from '../design/components/Button'
import { Field } from '../design/components/Field'
import { useSessao } from '../lib/contexto'
import { CredencialInvalida, PrimeiroAcesso } from '../data/api'
import { regrasSenha, senhaPronta, TEXTO_REGRAS, type RegrasSenha } from '../data/senha'
import { Marca } from '../shell/Marca'

function modoDemo() {
  if (import.meta.env.VITE_DEMO === '1') return true
  try { return sessionStorage.getItem('hiadv-modo-demo') === '1' } catch { return false }
}

/** Apresentação do HiAdv ao lado do login (no celular, uma faixa curta em cima). */
export const CHAMADA = 'Seus processos, prazos e peças sob controle.'
export const SUBCHAMADA = 'Gestão e fluxo jurídico para quem está construindo o próprio escritório.'
export const PONTOS = [
  'Controladoria: prazos, perícias e audiências no seu dia, com aviso antes do fatal.',
  'Peças a partir dos seus modelos, teses e jurisprudência da sua biblioteca.',
  'Casos andando por etapas, com a equipe no mesmo quadro.',
]

function Apresentacao() {
  return (
    <aside className="login-apresenta" aria-label="Sobre o HiAdv">
      <p className="login-chamada">{CHAMADA}</p>
      <p className="login-sub">{SUBCHAMADA}</p>
      <ul className="login-pontos">{PONTOS.map((t) => <li key={t}>{t}</li>)}</ul>
    </aside>
  )
}

export function Login() {
  const sessao = useSessao()
  const nav = useNavigate()
  const busca = useSearch({ strict: false }) as { volta?: string }
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mestra, setMestra] = useState('')
  const [nova, setNova] = useState('')
  const [nova2, setNova2] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const regras = regrasSenha(nova, nova2, mestra)

  const irDepois = () => {
    const volta = busca.volta && busca.volta.startsWith('/') && !busca.volta.startsWith('//') ? busca.volta : '/seu-dia'
    nav({ to: volta })
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!email.trim() || !senha) { setErro('Informe o e-mail e a senha.'); return }
    setEnviando(true)
    try {
      await sessao.entrar(email, senha)
      irDepois()
    } catch (x) {
      if (x instanceof PrimeiroAcesso) {
        setMestra(senha); setSenha(''); setModo('criar'); setInfo(x.message)
      } else {
        setErro(x instanceof CredencialInvalida ? x.message : (x as Error).message || 'Não foi possível entrar agora.')
      }
    } finally {
      setEnviando(false)
    }
  }

  async function criar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!email.trim()) { setErro('Informe o seu e-mail do escritório.'); return }
    if (!mestra) { setErro('Digite a senha mestra.'); return }
    if (!senhaPronta(regras)) { setErro('A nova senha ainda não cumpre todos os itens da lista.'); return }
    setEnviando(true)
    try {
      await sessao.criarSenha(email, mestra, nova)
      irDepois()
    } catch (x) {
      setErro((x as Error).message || 'Não foi possível salvar agora.')
    } finally {
      setEnviando(false)
    }
  }

  const abrirCriar = () => { setErro(null); setInfo(null); setMestra(''); setModo('criar') }
  const voltar = () => { setErro(null); setInfo(null); setNova(''); setNova2(''); setModo('entrar') }

  return (
    <div className="login">
      <Apresentacao />
      <div className="login-caixa">
        {!modoDemo() && <a className="voltar-site" href="/"><span aria-hidden="true">‹</span> Voltar ao site</a>}
        <Marca />
        <h1>{modo === 'entrar' ? 'Entrar no HiAdv' : 'Criar a sua senha'}</h1>
        {modoDemo() && <p className="login-demo">Prévia com dados fictícios. Use qualquer e-mail e a senha <b>demo</b>.</p>}
        {sessao.aviso && <p className="login-aviso" role="status">{sessao.aviso}</p>}
        {modo === 'entrar' ? (
          <>
            <form onSubmit={enviar} noValidate className="login-form">
              <Field label="E-mail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Field label="Senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)}
                error={erro ?? undefined} />
              <Button type="submit" loading={enviando}>Entrar</Button>
            </form>
            <button type="button" className="login-link" onClick={abrirCriar}>Primeiro acesso ou esqueci a senha</button>
          </>
        ) : (
          <>
            {info && <p className="login-aviso" role="status">{info}</p>}
            <form onSubmit={criar} noValidate className="login-form">
              <Field label="E-mail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Field label="Senha mestra" type="password" autoComplete="off" value={mestra} onChange={(e) => setMestra(e.target.value)}
                hint="Recebida do Gestor Master do escritório." />
              <Field label="Nova senha pessoal" type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} />
              <Field label="Repita a nova senha" type="password" autoComplete="new-password" value={nova2} onChange={(e) => setNova2(e.target.value)}
                error={erro ?? undefined} />
              <ul className="login-regras" aria-label="A nova senha precisa ter">
                {(Object.keys(TEXTO_REGRAS) as Array<keyof RegrasSenha>).map((k) => (
                  <li key={k} data-ok={regras[k] ? 'true' : undefined}>{regras[k] ? '✓ ' : ''}{TEXTO_REGRAS[k]}</li>
                ))}
              </ul>
              <Button type="submit" loading={enviando}>Salvar e entrar</Button>
            </form>
            <button type="button" className="login-link" onClick={voltar}>Voltar para entrar</button>
          </>
        )}
        <p className="muted login-rodape">O acesso é liberado pelo Gestor Master do seu escritório.</p>
      </div>
    </div>
  )
}
