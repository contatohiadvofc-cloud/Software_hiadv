import { useState, type FormEvent } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Button } from '../design/components/Button'
import { Field } from '../design/components/Field'
import { useSessao } from '../lib/contexto'
import { CredencialInvalida } from '../data/api'
import { Marca } from '../shell/Marca'

export function Login() {
  const sessao = useSessao()
  const nav = useNavigate()
  const busca = useSearch({ strict: false }) as { volta?: string }
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!email.trim() || !senha) { setErro('Informe o e-mail e a senha.'); return }
    setEnviando(true)
    try {
      await sessao.entrar(email, senha)
      const volta = busca.volta && busca.volta.startsWith('/') && !busca.volta.startsWith('//') ? busca.volta : '/seu-dia'
      nav({ to: volta })
    } catch (x) {
      setErro(x instanceof CredencialInvalida ? x.message : (x as Error).message || 'Não foi possível entrar agora.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="login">
      <div className="login-caixa">
        <Marca />
        <h1>Entrar no HiAdv</h1>
        {sessao.aviso && <p className="login-aviso" role="status">{sessao.aviso}</p>}
        <form onSubmit={enviar} noValidate className="login-form">
          <Field label="E-mail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)}
            error={erro ?? undefined} />
          <Button type="submit" loading={enviando}>Entrar</Button>
        </form>
        <p className="muted login-rodape">O acesso é liberado pelo Gestor Master do seu escritório.</p>
      </div>
    </div>
  )
}
