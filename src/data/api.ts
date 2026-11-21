import type { ItemDia } from './seuDia'
import type { Quadro } from './quadro'
import type { Ficha } from './ficha'
import type { NovaTarefa, Pessoa, Tarefa } from './tarefas'
import type { ClienteFicha, ClienteResumo } from './clientes'
import type { Compromisso } from './agenda'

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
  /** Ficha completa do caso: campos da área, checklist e histórico. */
  ficha(id: string): Promise<Ficha>
  /** Grava os campos da área (o servidor confere tipo e opções). Devolve quantos mudaram. */
  salvarCampos(id: string, campos: Record<string, string>): Promise<number>
  /** Dados do benefício (NB, DIB…) nas áreas previdenciárias. Devolve quantos mudaram. */
  salvarBeneficio(id: string, dados: Record<string, string>): Promise<number>
  /** Marca (com a data do documento) ou desmarca (data null) um item do checklist. */
  marcarChecklist(id: string, item: string, data: string | null): Promise<void>
  /** Pessoas da equipe do escritório em uso. */
  equipe(): Promise<Pessoa[]>
  /** Tarefas abertas; pessoa = e-mail para filtrar, null para todas que o usuário pode ver. */
  tarefas(pessoa: string | null): Promise<Tarefa[]>
  criarTarefa(n: NovaTarefa): Promise<void>
  /** 'feita' conclui; 'aberta' desfaz a conclusão. */
  mudarTarefa(id: string, status: 'feita' | 'aberta'): Promise<void>
  /** Até 100 clientes, em ordem alfabética; termo filtra pelo nome. */
  clientes(termo: string): Promise<ClienteResumo[]>
  cliente(id: string): Promise<ClienteFicha>
  /** Perícias e audiências não canceladas nem realizadas. */
  agenda(): Promise<Compromisso[]>
}
