import type { Servico } from './escritorio'

/**
 * Catálogo de integrações do HiAdv.
 * O HiAdv organiza e concentra; quem capta intimações, publicações e andamentos é a ferramenta
 * contratada pelo escritório, que responde pela captura. Por isso cada conector diz de onde vem o dado.
 */
export type Categoria = 'intimacoes' | 'ia' | 'documentos' | 'comunicacao' | 'financeiro' | 'comercial'
export const CATEGORIAS: Array<{ id: Categoria; nome: string }> = [
  { id: 'intimacoes', nome: 'Intimações, prazos e processos' },
  { id: 'ia', nome: 'Inteligência artificial' },
  { id: 'documentos', nome: 'Documentos e assinatura' },
  { id: 'comunicacao', nome: 'Comunicação com o cliente' },
  { id: 'financeiro', nome: 'Financeiro' },
  { id: 'comercial', nome: 'Comercial' },
]

export type Estado = 'disponivel' | 'em_breve' | 'incluso' | 'sob_contrato'

export type Conector = {
  id: string
  nome: string
  categoria: Categoria
  resumo: string
  /** O que passa a funcionar dentro do HiAdv com a conexão feita. */
  servicos: string[]
  /** Passo a passo para conectar (o que o escritório faz fora e dentro do HiAdv). */
  comoConectar: string[]
  /** Quem responde pelo dado que chega. */
  responsavel: string
  estado: Estado
  /** Conector que já usa o cofre de chaves do servidor. */
  servico?: Servico
  /** A chave já pode ser guardada, mas o HiAdv ainda não lê nem envia nada por esta ferramenta. */
  leituraPendente?: boolean
  site?: string
}

export const CONECTORES: Conector[] = [
  {
    id: 'cnj', nome: 'DJEN (CNJ)', categoria: 'intimacoes', estado: 'incluso',
    resumo: 'Publicações do Diário de Justiça Eletrônico Nacional, já ligadas para todos. Serve de apoio, não de controle oficial de prazos.',
    servicos: ['Publicações do DJEN pelas OABs cadastradas', 'Aviso quando a fonte do CNJ fica fora do ar'],
    comoConectar: ['Cadastre as OABs em Configurações → OABs acompanhadas.', 'Nada mais: a consulta roda sozinha várias vezes ao dia.'],
    responsavel: 'Fonte pública do CNJ, sem garantia de disponibilidade. Não substitui o painel de intimações do tribunal nem uma ferramenta de captura contratada.',
  },



  {
    id: 'escavador', nome: 'Escavador', categoria: 'intimacoes', estado: 'disponivel', servico: 'escavador', leituraPendente: true, site: 'https://api.escavador.com',
    resumo: 'Monitoramento de processos e publicações com a conta do próprio escritório no Escavador.',
    servicos: ['Andamentos dos processos do escritório', 'Publicações pela OAB e pelo nome', 'Prazo e tarefa em um clique'],
    comoConectar: ['Crie a conta no Escavador e compre créditos de API.', 'No painel do Escavador, gere o token da API.', 'Cadastre o token aqui e ligue a integração.'],
    responsavel: 'A captura é do Escavador, conforme o contrato do escritório com ele.',
  },
  {
    id: 'judit', nome: 'JUDIT', categoria: 'intimacoes', estado: 'disponivel', servico: 'judit', leituraPendente: true, site: 'https://judit.io',
    resumo: 'Consulta e monitoramento processual por número, OAB e CPF, com aviso de movimentação.',
    servicos: ['Andamentos dos processos do escritório', 'Busca de processos novos pela OAB e pelo CPF do cliente', 'Aviso quando o processo se move'],
    comoConectar: ['Crie a conta na JUDIT e escolha o plano de API.', 'Copie a api-key no painel da JUDIT.', 'Cadastre a chave aqui e ligue a integração.'],
    responsavel: 'A captura é da JUDIT, conforme o contrato do escritório com ela.',
  },
  {
    id: 'claude', nome: 'Claude', categoria: 'ia', estado: 'disponivel', servico: 'claude', site: 'https://console.anthropic.com',
    resumo: 'IA dos agentes, com a chave e o limite de gasto do próprio escritório.',
    servicos: ['Minutas, quesitos e resumo de documentos e intimações', 'Agentes nas etapas dos casos', 'Limite de gasto mensal'],
    comoConectar: ['Crie a conta no console da Anthropic e gere uma chave de API.', 'Cadastre a chave aqui e defina um limite por mês, se quiser.', 'Ligue a integração.'],
    responsavel: 'Tudo o que a IA produz é rascunho para revisão do advogado.',
  },
  {
    id: 'zapsign', nome: 'ZapSign', categoria: 'documentos', estado: 'disponivel', servico: 'zapsign', site: 'https://zapsign.com.br',
    resumo: 'Assinatura do kit do cliente (contrato, procuração e declaração) pelo WhatsApp.',
    servicos: ['Envio do kit preenchido para assinatura', 'Documento assinado salvo na ficha do cliente', 'Envio com um clique ou automático na etapa'],
    comoConectar: ['Na ZapSign, gere o token da API do escritório.', 'Cadastre o token aqui.', 'Escolha o modo de envio e ligue a integração.'],
    responsavel: 'Cada envio é cobrado na conta ZapSign do escritório.',
  },
  {
    id: 'clicksign', nome: 'Clicksign', categoria: 'documentos', estado: 'disponivel', servico: 'clicksign', leituraPendente: true, site: 'https://www.clicksign.com',
    resumo: 'Alternativa à ZapSign para assinar o kit do cliente.',
    servicos: ['Envio do kit preenchido para assinatura', 'Documento assinado salvo na ficha do cliente'],
    comoConectar: ['Na Clicksign, gere o access token da API.', 'Cadastre o token aqui e ligue a integração.'],
    responsavel: 'Cada envio é cobrado na conta Clicksign do escritório.',
  },
  {
    id: 'd4sign', nome: 'D4Sign', categoria: 'documentos', estado: 'disponivel', servico: 'd4sign', leituraPendente: true, site: 'https://d4sign.com.br',
    resumo: 'Alternativa à ZapSign para assinar o kit do cliente.',
    servicos: ['Envio do kit preenchido para assinatura', 'Documento assinado salvo na ficha do cliente'],
    comoConectar: ['Na D4Sign, gere o token da API e a cryptKey.', 'Cadastre os dois aqui, no formato token:cryptKey, e ligue a integração.'],
    responsavel: 'Cada envio é cobrado na conta D4Sign do escritório.',
  },
  {
    id: 'google_drive', nome: 'Google Drive', categoria: 'documentos', estado: 'disponivel', servico: 'google_drive', site: 'https://drive.google.com',
    resumo: 'A pasta de cada cliente ligada à ficha e os rascunhos salvos nela.',
    servicos: ['Abrir arquivos do cliente no Assistente de IA', 'Salvar rascunhos na pasta do cliente'],
    comoConectar: ['Um gestor faz o projeto no Google Cloud (passo a passo enviado pela equipe HiAdv).', 'Ligue aqui e escolha a pasta de clientes.'],
    responsavel: 'O HiAdv só vê os arquivos que o usuário escolhe abrir.',
  },
  {
    id: 'google_agenda', nome: 'Google Agenda', categoria: 'documentos', estado: 'disponivel', site: 'https://calendar.google.com',
    resumo: 'Perícias, audiências e prazos aparecendo na agenda de cada advogado.',
    servicos: ['Compromissos do HiAdv na agenda do Google', 'Atualização automática quando a data muda'],
    comoConectar: ['Cada pessoa liga a própria agenda em Configurações → Agenda no Google.'],
    responsavel: 'É uma cópia: a data que vale é a do HiAdv e a do processo.',
  },
  {
    id: 'whatsapp', nome: 'WhatsApp oficial', categoria: 'comunicacao', estado: 'em_breve', site: 'https://business.whatsapp.com',
    resumo: 'Mensagens prontas e avisos de fase pelo número oficial do escritório.',
    servicos: ['Mensagens prontas aos clientes', 'Aviso de mudança de fase e de perícia', 'Envio sempre confirmado pelo advogado'],
    comoConectar: ['Tenha o número do escritório na API oficial do WhatsApp (Meta).', 'Cole aqui o identificador do número e o token.'],
    responsavel: 'Nenhuma mensagem sai sem o clique de uma pessoa do escritório.',
  },
  {
    id: 'gmail', nome: 'Gmail', categoria: 'comunicacao', estado: 'em_breve', site: 'https://mail.google.com',
    resumo: 'E-mails e anexos do cliente levados para a ficha, com aprovação.',
    servicos: ['Importar e-mail e anexos para a ficha do cliente', 'Responder a partir do HiAdv'],
    comoConectar: ['Entre com a conta Google do escritório e autorize só a leitura escolhida.'],
    responsavel: 'Só entra na ficha o que alguém do escritório aprovar.',
  },
  {
    id: 'asaas', nome: 'Asaas', categoria: 'financeiro', estado: 'disponivel', servico: 'asaas', leituraPendente: true, site: 'https://www.asaas.com',
    resumo: 'Boleto e Pix das parcelas de honorários, com baixa automática.',
    servicos: ['Cobrança das parcelas por boleto ou Pix', 'Baixa automática no Financeiro', 'Nota fiscal de serviço em nome do cliente'],
    comoConectar: ['Abra a conta no Asaas e gere a chave de API.', 'Cadastre a chave aqui e ligue a integração.'],
    responsavel: 'Os valores circulam na conta do escritório no Asaas.',
  },
  {
    id: 'meta_ads', nome: 'Meta Ads', categoria: 'comercial', estado: 'em_breve', site: 'https://business.facebook.com',
    resumo: 'Contatos das campanhas entrando direto em Atendimentos, com a origem registrada.',
    servicos: ['Novo contato em Atendimentos a cada formulário', 'Origem da campanha no cadastro', 'Relatório de quantos viraram clientes'],
    comoConectar: ['Entre com a conta do Gerenciador de Negócios e autorize os formulários.'],
    responsavel: 'Respeita as regras de publicidade da OAB: o HiAdv só recebe quem procurou o escritório.',
  },
]

export const ESTADO_ROTULO: Record<Estado, string> = { disponivel: 'Disponível', em_breve: 'Em breve', incluso: 'Incluso', sob_contrato: 'Sob contrato' }

/** Filtra por texto (nome, resumo e serviços) e categoria. */
export function filtrarConectores(lista: Conector[], busca: string, categoria: Categoria | 'todas'): Conector[] {
  const n = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  const q = n(busca.trim())
  return lista.filter((c) => (categoria === 'todas' || c.categoria === categoria)
    && (!q || n([c.nome, c.resumo, ...c.servicos].join(' ')).includes(q)))
}
