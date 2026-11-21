import type { ItemDia } from './seuDia'
import type { Quadro } from './quadro'
import type { Ficha, NovaExigencia } from './ficha'
import type { CargaPessoa, Falha, ItemAtencao, ParDuplicado, RegrasAtencao } from './atencao'
import type { NovaTarefa, Pessoa, Tarefa } from './tarefas'
import type { ClienteFicha, ClienteResumo } from './clientes'
import type { Compromisso } from './agenda'
import type { Relatorio } from './relatorios'
import type { DadosCliente, DadosDocumento } from './modelos'
import type { Honorario, Lancamento, NovoHonorario, NovoLancamento } from './financeiro'
import type { Oabs, PedidoPrazo, Publicacao, ResultadoPrazo } from './publicacoes'
import type { NovoCaso, NovoCliente, ResultadoImportacao } from './cadastro'
import type { EtapaLead, Lead, NovoLead } from './atendimentos'
import type { NovasHoras, RegistroHoras } from './horas'
import type { Portal, SituacaoPortal } from './portal'
import type { Adesao, Cortesia, FormAdesao, Indicacao, PlanoId, Respostas, StatusAdesao } from './adesao'
import type { Agente, EtapaEscritorio, Integracao, ItemBiblioteca, NovoItemBiblioteca, PacoteBiblioteca, Servico } from './escritorio'

export type Papel = 'code' | 'master' | 'colaborador' | 'parceiro'
export type Perfil = { email: string; nome: string; papel: Papel | null; escritorioId: string | null; escritorioNome: string }
export type Area = { area: string; nome: string; ordem: number }
export type Escritorio = { id: string; nome: string; atual: boolean }
export type Achado = { tipo: string; titulo: string; trecho: string; clienteId: string | null; processoId: string | null }

export class SessaoExpirada extends Error {
  constructor() { super('Sua sessão terminou. Entre de novo.') }
}
export class CredencialInvalida extends Error {
  constructor(mensagem = 'E-mail ou senha incorretos.') { super(mensagem) }
}

/** A pessoa é da equipe mas ainda não criou a senha pessoal (entra com a senha mestra e cria a dela). */
export class PrimeiroAcesso extends Error {
  constructor() { super('Primeiro acesso: crie agora a sua senha pessoal. A senha mestra serve só para criar ou recuperar a senha.') }
}

/** Tudo o que as telas precisam do servidor. Duas implementações: Supabase e demonstração. */
export interface Api {
  temSessao(): Promise<boolean>
  entrar(email: string, senha: string): Promise<void>
  sair(): Promise<void>
  /** Primeiro acesso ou esqueci a senha: e-mail + senha mestra + nova senha pessoal. Já entra em seguida. */
  criarSenhaPessoal(email: string, mestra: string, nova: string): Promise<void>
  aoMudarSessao(fn: (logado: boolean) => void): () => void
  perfil(): Promise<Perfil>
  escritorios(): Promise<Escritorio[]>
  trocarEscritorio(id: string): Promise<void>
  areas(): Promise<Area[]>
  /** Publicações (DJEN) e andamentos (DataJud) dos processos do escritório, com a tarefa gerada. */
  publicacoes(dias: number, soPublicacoes: boolean): Promise<Publicacao[]>
  oabs(): Promise<Oabs>
  /** Só o Gestor Master. Devolve as OABs normalizadas. */
  salvarOabs(oabs: string[]): Promise<string[]>
  calcularPrazo(p: PedidoPrazo): Promise<ResultadoPrazo>
  /** Financeiro (só Gestor Master): lançamentos com vencimento no período e os atrasados de antes. */
  finLista(de: string, ate: string): Promise<Lancamento[]>
  finLancar(l: NovoLancamento): Promise<void>
  /** Marca como pago na data (ou desfaz com null). */
  finBaixar(id: string, pagoEm: string | null): Promise<void>
  honorarioCriar(h: NovoHonorario): Promise<void>
  /** Lança o êxito sobre o valor recebido pelo cliente; devolve o valor do honorário. */
  honorarioExito(id: string, valorRecebido: number): Promise<number>
  honorariosCliente(clienteId: string): Promise<Honorario[]>
  /** Tudo o que um modelo pode usar (cliente, caso, escritório, advogado). */
  documentoDados(clienteId: string, casoId: string | null): Promise<DadosDocumento>
  /** Dados de qualificação do cliente; campo vazio apaga. */
  salvarDadosCliente(clienteId: string, dados: Partial<DadosCliente>): Promise<void>
  /** Só Gestor Master: indicadores dos últimos N dias. */
  relatorio(dias: number): Promise<Relatorio>
  /** Baixa o arquivo de um item da Biblioteca (para preencher um modelo .docx). */
  arquivoBiblioteca(caminho: string): Promise<ArrayBuffer>
  /** Só o Gestor Master. Liga ou desliga uma área do catálogo no escritório; os casos ficam guardados. */
  ativarArea(area: string, ativa: boolean): Promise<void>
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
  /** Registra o protocolo (número e data) e leva o caso para "protocolado". No judicial, o número é o CNJ e liga o processo. */
  protocolar(id: string, numero: string, data: string): Promise<void>
  /** Cria a tarefa da exigência (prazo interno e fatal) e leva o caso para a etapa de exigência da via, se houver. */
  registrarExigencia(id: string, e: NovaExigencia): Promise<{ interno: string; fatal: string; status: string | null }>
  /** Abre o caso em outra via, ligado ao de origem (que fica onde está). Devolve o id do caso novo. */
  mudarVia(id: string, via: string, motivo: string): Promise<string>
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
  /** Relato do cliente no caso (texto livre). */
  salvarRelato(id: string, relato: string): Promise<void>
  biblioteca(): Promise<ItemBiblioteca[]>
  /** Inclui ou edita; com arquivo, envia para a pasta do escritório antes. */
  salvarBiblioteca(id: string | null, item: NovoItemBiblioteca, arquivo?: File | null): Promise<void>
  retirarBiblioteca(id: string): Promise<void>
  /** Link temporário (5 min) para baixar o arquivo do item. */
  linkArquivo(caminho: string): Promise<string>
  integracoes(): Promise<Integracao[]>
  salvarIntegracao(servico: Servico, ativo: boolean, modo?: string | null, limite?: number | null): Promise<void>
  /** A chave vai direto ao cofre do servidor; nunca volta para a tela. */
  salvarChave(servico: Servico, chave: string): Promise<string>
  removerChave(servico: Servico): Promise<void>
  agentes(): Promise<Agente[]>
  configurarAgente(agente: string, ativo: boolean, etapas: string[], modeloId: string | null, parametros?: Record<string, unknown>): Promise<void>
  /** Etapas das áreas ativas, para escolher quando cada agente entra. */
  etapasDoEscritorio(): Promise<EtapaEscritorio[]>
  /** Pacotes de roteiros prontos (previdenciário, trabalhista). */
  pacotes(): Promise<PacoteBiblioteca[]>
  /** Só o gestor: copia os roteiros que ainda faltam; devolve quantos entraram. */
  adicionarPacote(slug: string): Promise<number>
  /** Prazos fatais, casos parados e eventos sem preparação (o gestor vê também os da equipe). */
  atencao(): Promise<ItemAtencao[]>
  /** Cria a tarefa de preparação (com roteiro) de uma perícia ou audiência. Uma vez só por evento. */
  criarPreparo(evento: 'pericia' | 'audiencia', id: string): Promise<{ ja: boolean; prazo: string }>
  regrasAtencao(): Promise<RegrasAtencao>
  /** Só o gestor. */
  salvarRegrasAtencao(r: RegrasAtencao): Promise<RegrasAtencao>
  /** Só o gestor: clientes que parecem repetidos (mesmo CPF, telefone ou nome). */
  duplicados(): Promise<ParDuplicado[]>
  ignorarDuplicado(a: string, b: string): Promise<void>
  /** Tarefas abertas e casos em andamento de cada pessoa da equipe. */
  cargaEquipe(): Promise<CargaPessoa[]>
  /** Só o gestor: automações que não concluíram, nos últimos 60 dias. */
  falhas(): Promise<Falha[]>
  resolverFalha(id: number): Promise<void>
  /** Cria o cliente no escritório; com CPF já cadastrado, devolve o existente (ja = true). */
  criarCliente(c: NovoCliente): Promise<{ id: string; ja: boolean }>
  /** Abre um caso na etapa inicial da área. Devolve o id do caso. */
  criarCaso(c: NovoCaso): Promise<string>
  /** Só o gestor. Com simular = true nada é gravado. */
  importarClientes(itens: NovoCliente[], simular: boolean): Promise<ResultadoImportacao>
  /** Atendimentos (pessoas interessadas que ainda não são clientes): abertos e os fechados nos últimos 60 dias. */
  leads(): Promise<Lead[]>
  /** Inclui (id null) ou edita. Devolve o id. */
  salvarLead(id: string | null, l: NovoLead): Promise<string>
  /** Muda a etapa; "perdido" pede o motivo. Para "contratou", use converterLead. */
  etapaLead(id: string, etapa: Exclude<EtapaLead, 'contratou'>, motivo?: string): Promise<void>
  /** Virou cliente: cria (ou reaproveita) o cliente e abre o caso na área. */
  converterLead(id: string, area: string, produto: string | null): Promise<{ cliente: string; caso: string | null }>
  horasCliente(clienteId: string): Promise<RegistroHoras[]>
  lancarHoras(h: NovasHoras): Promise<void>
  removerHoras(id: string): Promise<void>
  /** Gera um link novo de acompanhamento (o anterior deixa de valer). O token só aparece aqui. */
  portalGerar(clienteId: string): Promise<{ token: string; expiraEm: string }>
  portalSituacao(clienteId: string): Promise<SituacaoPortal>
  portalRevogar(clienteId: string): Promise<void>
  /** Página pública do cliente (sem login); null se o link não vale mais. */
  portal(token: string): Promise<Portal | null>
  contatoEscritorio(): Promise<{ nome: string; cidade: string | null; whatsapp: string | null }>
  /** Só o Gestor Master. */
  salvarContatoEscritorio(cidade: string, whatsapp: string): Promise<void>
  /** Gera (ou troca) o link pessoal da agenda; o anterior deixa de funcionar. Devolve o endereço para o Google Agenda. */
  agendaLinkGerar(): Promise<string>
  agendaLinkExiste(): Promise<boolean>
  /** Público: vagas de fundador que restam (de 20). */
  adesaoVagas(): Promise<number>
  /** Público: pedido de adesão. lista = entrou na lista de interesse (Supremo). */
  adesaoEnviar(p: FormAdesao & { plano: PlanoId; recomendado: PlanoId | null; respostas: Respostas; ref: string | null }): Promise<{ lista: boolean }>
  /** Código pessoal de indicação (cria na primeira vez). */
  indicacaoCodigo(): Promise<string>
  indicacoes(): Promise<Indicacao[]>
  /** Só o papel code (administração do HiAdv). */
  adesoes(): Promise<Adesao[]>
  adesaoAtualizar(id: string, status: StatusAdesao, extra?: { fundador?: boolean; cortesia?: Cortesia; obs?: string }): Promise<void>
  adesaoPlano(id: string, plano: PlanoId): Promise<void>
}
