import type { ItemDia } from './seuDia'
import type { Quadro } from './quadro'

export type Papel = 'code' | 'master' | 'colaborador' | 'parceiro'
export type Perfil = { email: string; nome: string; papel: Papel | null; escritorioId: string | null; escritorioNome: string }
export type Area = { area: string; nome: string; ordem: number }
export type Escritorio = { id: string; nome: string; atual: boolean }
export type Achado = { tipo: string; titulo: string; trecho: string; clienteId: string | null; processoId: string | null }

export class SessaoExpirada extends Error {
  constructor() { super('Sua sessão terminou. Entre de novo.') }
}
export class CredencialInvalida extends Error {
  constructor() { super('E-mail ou senha incorretos.') }
}

/** Tudo o que as telas precisam do servidor. Duas implementações: Supabase e demonstração. */
export interface Api {
  temSessao(): Promise<boolean>
  entrar(email: string, senha: string): Promise<void>
  sair(): Promise<void>
  aoMudarSessao(fn: (logado: boolean) => void): () => void
  perfil(): Promise<Perfil>
  escritorios(): Promise<Escritorio[]>
  trocarEscritorio(id: string): Promise<void>
  areas(): Promise<Area[]>
  busca(q: string): Promise<Achado[]>
  itensDoDia(email: string): Promise<ItemDia[]>
  quadro(area: string): Promise<Quadro>
  /** Muda o caso de etapa. Fica no histórico do caso (registro do servidor). */
  moverCaso(id: string, status: string, motivo?: string): Promise<void>
}
