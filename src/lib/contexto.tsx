import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Api, Perfil } from '../data/api'
import { marcarLiberado } from './desbloqueio'

const ApiCtx = createContext<Api | null>(null)

export function ApiProvider({ api, children }: { api: Api; children: ReactNode }) {
  return <ApiCtx.Provider value={api}>{children}</ApiCtx.Provider>
}

export function useApi(): Api {
  const a = useContext(ApiCtx)
  if (!a) throw new Error('ApiProvider ausente')
  return a
}

type Estado = 'carregando' | 'fora' | 'dentro'
type Sessao = {
  estado: Estado
  perfil: Perfil | null
  aviso: string | null
  entrar(email: string, senha: string): Promise<void>
  criarSenha(email: string, mestra: string, nova: string): Promise<void>
  sair(aviso?: string): Promise<void>
  trocarEscritorio(id: string): Promise<void>
}

const SessaoCtx = createContext<Sessao | null>(null)

export function SessaoProvider({ children }: { children: ReactNode }) {
  const api = useApi()
  const qc = useQueryClient()
  const [estado, setEstado] = useState<Estado>('carregando')
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const carregarPerfil = useCallback(async () => {
    const p = await api.perfil()
    setPerfil(p)
    setEstado('dentro')
  }, [api])

  useEffect(() => {
    let vivo = true
    api.temSessao().then((ok) => {
      if (!vivo) return
      if (ok) carregarPerfil().catch(() => vivo && setEstado('fora'))
      else setEstado('fora')
    })
    const parar = api.aoMudarSessao((logado) => {
      if (!logado) { setPerfil(null); setEstado('fora'); qc.clear() }
    })
    return () => { vivo = false; parar() }
  }, [api, carregarPerfil, qc])

  const valor: Sessao = {
    estado, perfil, aviso,
    async entrar(email, senha) {
      setAviso(null)
      await api.entrar(email, senha)
      marcarLiberado() // acabou de digitar a senha: não pede o desbloqueio de novo nesta abertura
      await carregarPerfil()
    },
    async criarSenha(email, mestra, nova) {
      setAviso(null)
      await api.criarSenhaPessoal(email, mestra, nova)
      marcarLiberado()
      await carregarPerfil()
    },
    async sair(msg) {
      await api.sair()
      qc.clear()
      setPerfil(null)
      setEstado('fora')
      setAviso(msg ?? null)
    },
    async trocarEscritorio(id) {
      await api.trocarEscritorio(id)
      // Nada do escritório anterior pode sobrar na memória.
      qc.clear()
      await carregarPerfil()
    },
  }
  return <SessaoCtx.Provider value={valor}>{children}</SessaoCtx.Provider>
}

export function useSessao(): Sessao {
  const s = useContext(SessaoCtx)
  if (!s) throw new Error('SessaoProvider ausente')
  return s
}
