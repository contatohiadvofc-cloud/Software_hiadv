// Catálogo do que o HiAdv faz, em três grupos: ligado de fábrica, para ativar (com passo a passo) e em preparação.
// Texto curto e prático: o passo a passo é o mesmo de docs/RECURSOS.md.

export type Grupo = 'ligado' | 'ativar' | 'preparo'
export type Recurso = {
  id: string
  nome: string
  resumo: string
  grupo: Grupo
  /** Onde fica no HiAdv (rota + âncora opcional). */
  onde?: { rotulo: string; to: string; hash?: string }
  /** Só para "ativar" e "preparo". */
  passos?: string[]
  custo?: string
  soGestor?: boolean
}

export const RECURSOS: Recurso[] = [
  // ---------- Ligado de fábrica, sem custo ----------
  { id: 'casos', grupo: 'ligado', nome: 'Casos por área, em etapas', resumo: 'Quadro e lista por área, checklist de documentos, histórico e mudança de via.', onde: { rotulo: 'Áreas', to: '/areas' } },
  { id: 'atendimentos', grupo: 'ligado', nome: 'Atendimentos', resumo: 'Do primeiro contato até virar cliente, com próximo contato e motivo de quem não fechou.', onde: { rotulo: 'Atendimentos', to: '/atendimentos' } },
  { id: 'clientes', grupo: 'ligado', nome: 'Clientes', resumo: 'Cadastro, importação por planilha, dados de qualificação, horas e link de acompanhamento.', onde: { rotulo: 'Clientes', to: '/clientes' } },
  { id: 'prazos', grupo: 'ligado', nome: 'Tarefas e prazos', resumo: 'Prazo em dias úteis ou corridos, com feriados e suspensões dos tribunais.', onde: { rotulo: 'Tarefas', to: '/tarefas' } },
  { id: 'publicacoes', grupo: 'ligado', nome: 'Publicações e andamentos', resumo: 'Diário (DJEN) pela OAB e andamentos (DataJud), a cada 30 minutos, já viram tarefa.', onde: { rotulo: 'Publicações', to: '/publicacoes' } },
  { id: 'agenda', grupo: 'ligado', nome: 'Agenda e Google Agenda', resumo: 'Perícias, audiências e prazos; cada pessoa liga o seu link no Google.', onde: { rotulo: 'Agenda no Google', to: '/configuracoes', hash: 'agenda-google' } },
  { id: 'acompanhamento', grupo: 'ligado', nome: 'Acompanhamento pelo cliente', resumo: 'Link pessoal, sem senha, com a fase do caso em palavras simples.', onde: { rotulo: 'Contato do escritório', to: '/configuracoes', hash: 'contato' } },
  { id: 'documentos', grupo: 'ligado', nome: 'Documentos a partir de modelos', resumo: 'Procuração, contrato e declarações em Word, preenchidos com os dados do cliente.', onde: { rotulo: 'Biblioteca', to: '/biblioteca' } },
  { id: 'financeiro', grupo: 'ligado', nome: 'Financeiro e honorários', resumo: 'Fixo, êxito ou misto, parcelas, atrasos e cobrança pronta no WhatsApp.', onde: { rotulo: 'Financeiro', to: '/financeiro' }, soGestor: true },
  { id: 'relatorios', grupo: 'ligado', nome: 'Relatórios', resumo: 'Gargalos por etapa, produtividade da equipe, atendimentos e dinheiro.', onde: { rotulo: 'Relatórios', to: '/relatorios' }, soGestor: true },
  { id: 'atencao', grupo: 'ligado', nome: 'Avisos e agentes sem custo', resumo: 'Prazo fatal chegando, caso parado, preparo de perícia e rodízio de responsáveis.', onde: { rotulo: 'Regras de atenção', to: '/configuracoes', hash: 'regras' } },
  { id: 'celular', grupo: 'ligado', nome: 'App no celular', resumo: 'Instala pelo navegador e abre com a digital ou a senha do celular.', onde: { rotulo: 'Este aparelho', to: '/configuracoes', hash: 'aparelho' } },

  // ---------- Em preparação: já dá para deixar a chave guardada ----------
  {
    id: 'ia', grupo: 'ativar', nome: 'Assistente de IA (plano Sênior)', soGestor: true,
    resumo: 'Quesitos, minutas e resumos de intimações e documentos, como rascunho para o advogado revisar. Fica na página do cliente e em Publicações.',
    custo: 'Pago por uso na conta Anthropic do escritório. Dá para definir um limite por mês.',
    onde: { rotulo: 'Integrações', to: '/configuracoes', hash: 'integracoes' },
    passos: [
      'Crie a conta do escritório em console.anthropic.com e cadastre um cartão em Billing.',
      'Em API Keys, crie uma chave com o nome "HiAdv".',
      'Aqui em Integrações, em Claude, clique em "Cadastrar chave" e cole. A chave vai direto para o cofre: depois de salva, ninguém vê de novo.',
      'Defina o limite por mês (opcional) e clique em "Ativar".',
      'Pronto: o botão "Assistente de IA" aparece na página do cliente e "Resumir com IA" em cada publicação.',
    ],
  },
  {
    id: 'zapsign', grupo: 'preparo', nome: 'Assinatura digital (ZapSign)', soGestor: true,
    resumo: 'Envia o kit do cliente (contrato, procuração, declaração) para assinar pelo celular, com validade jurídica.',
    custo: 'Plano da ZapSign contratado pelo escritório (há plano gratuito com poucos envios por mês).',
    onde: { rotulo: 'Integrações', to: '/configuracoes', hash: 'integracoes' },
    passos: [
      'Crie a conta do escritório em zapsign.com.br e escolha o plano.',
      'Em Configurações, Integração, API, copie o token de produção.',
      'Aqui em Integrações, em ZapSign, cadastre o token e escolha como enviar: com um clique (mostra a prévia) ou automático.',
      'Deixe os modelos do kit (contrato, procuração, declaração) na Biblioteca. O envio para assinatura é liberado na próxima atualização; até lá, gere os documentos em Word pela página do cliente.',
    ],
  },

  // ---------- Em preparação ----------
  {
    id: 'whatsapp', grupo: 'preparo', nome: 'WhatsApp oficial com robô de triagem',
    resumo: 'Número oficial do escritório respondendo e qualificando contatos, que entram sozinhos em Atendimentos.',
    custo: 'Cobrança da Meta por conversa, na conta do escritório.',
    passos: [
      'Hoje: as mensagens saem prontas pelo botão do WhatsApp e quem envia é sempre o advogado.',
      'Para ligar quando for liberado: conta no Gerenciador de Negócios da Meta verificada, um número exclusivo (que não esteja no WhatsApp comum) e a aprovação dos modelos de mensagem.',
      'Mensagem ao cliente continua sem envio automático; o robô só qualifica e organiza.',
    ],
  },
  {
    id: 'drive', grupo: 'ativar', nome: 'Google Drive do escritório', soGestor: true,
    resumo: 'No Assistente de IA, escolha arquivos do Drive para a IA ler (PDF, Word, Google Docs, fotos) e salve o rascunho de volta na pasta do cliente. Os arquivos não são copiados para o HiAdv.',
    custo: 'Sem custo.',
    onde: { rotulo: 'Integrações', to: '/configuracoes', hash: 'integracoes' },
    passos: [
      'Aqui em Integrações, ligue o Google Drive.',
      'No Assistente de IA, toque em "Escolher arquivos do Drive" e entre com a conta Google do escritório.',
      'O HiAdv só enxerga os arquivos e pastas que você escolher na janela do Google.',
    ],
  },
  {
    id: 'api', grupo: 'preparo', nome: 'Conexão com outros sistemas (API)', soGestor: true,
    resumo: 'Receber contatos do site ou de formulários e avisar outros sistemas quando um caso muda de etapa.',
    custo: 'Sem custo no HiAdv.',
    passos: ['Quando ligar: o Gestor gera uma chave de acesso aqui, com permissões limitadas, e pode desligá-la a qualquer momento.'],
  },
]

export const NOMES_GRUPO: Record<Grupo, string> = { ligado: 'Ligado', ativar: 'Para ativar', preparo: 'Em preparação' }

/** O que cada pessoa vê: recursos só do gestor somem para o colaborador. */
export function recursosVisiveis(gestor: boolean, lista: Recurso[] = RECURSOS): Record<Grupo, Recurso[]> {
  const r: Record<Grupo, Recurso[]> = { ligado: [], ativar: [], preparo: [] }
  for (const x of lista) if (gestor || !x.soGestor) r[x.grupo].push(x)
  return r
}
