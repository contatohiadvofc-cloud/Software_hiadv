// Manual de funcionamento do HiAdv (Configurações → Manual e site). Cada parte tem a tela de verdade
// (escritório fictício da prévia) com marcadores numerados apontando o que cada coisa faz.
// As imagens e as posições dos marcadores são geradas por scripts/manual-imagens.ts.

export type Marcador = { n: number; alvo: string; texto: string }
export type ParteManual = {
  id: string
  titulo: string
  grupo: 'Começo' | 'Dia a dia' | 'Casos e clientes' | 'Gestão' | 'Assistente e conexões' | 'Administração'
  rota: string
  quem: string
  paraQue: string
  passos: string[]
  marcadores: Marcador[]
  /** Só para quem tem acesso de Coder (Central). */
  coder?: boolean
}

export const MANUAL: ParteManual[] = [
  {
    id: 'navegar', titulo: 'Como o HiAdv está organizado', grupo: 'Começo', rota: '/seu-dia',
    quem: 'Todos',
    paraQue: 'Toda tela segue o mesmo padrão: os números mais importantes no topo, os filtros em pílulas logo abaixo e a lista ou o quadro em seguida. O menu à esquerda (no celular, embaixo) leva a cada área.',
    passos: ['Use o menu para trocar de área.', 'Toque em um número do topo para filtrar a lista por ele; toque de novo para voltar a ver tudo.', 'Use as pílulas para escolher o que mostrar (de quem, de qual período, de que tipo).'],
    marcadores: [
      { n: 1, alvo: '.lateral', texto: 'Menu com todas as áreas do escritório.' },
      { n: 2, alvo: '.hv-kpis', texto: 'Números do topo: tocar filtra a lista.' },
      { n: 3, alvo: '.hv-barra .hv-chips', texto: 'Pílulas de filtro: um toque, sem menu escondido.' },
    ],
  },
  {
    id: 'hoje', titulo: 'Hoje (seu dia)', grupo: 'Dia a dia', rota: '/seu-dia',
    quem: 'Todos',
    paraQue: 'Mostra só o que é seu: prazos, tarefas, perícias e audiências, separados em atrasados, hoje, próximos 7 dias e sem data. O quadro “Precisa de atenção” avisa o que está parado ou perto de vencer.',
    passos: ['Comece o dia pelos atrasados.', 'Use as pílulas para ver só prazos, só perícias ou só audiências.', 'Em “Precisa de atenção”, crie a preparação de uma perícia ou abra o caso parado direto dali.'],
    marcadores: [
      { n: 1, alvo: '.pagina-cabeca h1', texto: 'Saudação e data de hoje.' },
      { n: 2, alvo: '.hv-kpis', texto: 'Atrasados, para hoje, próximos 7 dias e sem data.' },
      { n: 3, alvo: '#h-agenda', texto: 'Sua agenda, já em ordem de urgência.' },
    ],
  },
  {
    id: 'tarefas', titulo: 'Tarefas e prazos', grupo: 'Dia a dia', rota: '/tarefas',
    quem: 'Todos (o Gestor Master vê a equipe inteira)',
    paraQue: 'Cada coisa a fazer tem responsável e prazo. Os prazos processuais são calculados com feriados e suspensões dos tribunais.',
    passos: ['Toque em “Nova tarefa”, escreva o que fazer, escolha o responsável e o prazo.', 'Para prazo processual, use “Calcular prazo”: informe a data de início e os dias; o HiAdv conta os dias úteis.', 'Marque o círculo para concluir; dá para desfazer logo em seguida.'],
    marcadores: [
      { n: 1, alvo: '.pagina-acoes', texto: 'Calcular prazo e criar tarefa.' },
      { n: 2, alvo: '.hv-kpis', texto: 'Quantas estão atrasadas, para hoje e na semana.' },
      { n: 3, alvo: '.hv-barra .hv-chips', texto: 'Ver as suas, as da equipe ou de uma pessoa.' },
      { n: 4, alvo: '.tarefa-check', texto: 'Concluir a tarefa.' },
    ],
  },
  {
    id: 'agenda', titulo: 'Agenda', grupo: 'Dia a dia', rota: '/agenda',
    quem: 'Todos',
    paraQue: 'Perícias, audiências e prazos no calendário, com a opção de levar para o Google Agenda.',
    passos: ['Troque entre semana e mês.', 'Toque em um compromisso para ver o cliente e o caso.', 'Ligue o Google Agenda em Integrações para receber tudo no celular.'],
    marcadores: [
      { n: 1, alvo: '.pagina-cabeca h1', texto: 'Agenda do escritório.' },
      { n: 2, alvo: '.segmentos', texto: 'Forma de ver o calendário.' },
    ],
  },
  {
    id: 'atendimentos', titulo: 'Atendimentos (em contratação)', grupo: 'Casos e clientes', rota: '/atendimentos',
    quem: 'Quem atende os novos contatos',
    paraQue: 'Quem entrou em contato e ainda não é cliente, em etapas até contratar. Serve para ninguém ficar sem resposta e para saber de onde vêm os clientes.',
    passos: ['Inclua cada pessoa que chamar, com a origem do contato.', 'Arraste o cartão para a próxima etapa (ou use “Mover para…”).', 'Ao contratar, o HiAdv cria o cliente e o caso na área certa; se não fechar, registre o motivo.'],
    marcadores: [
      { n: 1, alvo: '.hv-kpis', texto: 'Em andamento, contratados e não fechados.' },
      { n: 2, alvo: '.quadro', texto: 'Quadro por etapa: arraste para avançar.' },
      { n: 3, alvo: '.pagina-acoes', texto: 'Incluir um novo atendimento.' },
    ],
  },
  {
    id: 'clientes', titulo: 'Clientes', grupo: 'Casos e clientes', rota: '/clientes',
    quem: 'Todos',
    paraQue: 'O cadastro de cada cliente reúne os casos, os documentos, os honorários, as horas e o link de acompanhamento.',
    passos: ['Busque pelo nome; veja em lista ou em cartões.', 'Abra o cliente para ver e editar tudo dele.', 'O Gestor Master importa uma planilha de clientes de uma vez e confere possíveis duplicados.'],
    marcadores: [
      { n: 1, alvo: '#cli-busca', texto: 'Busca pelo nome.' },
      { n: 2, alvo: '.hv-barra .hv-chips', texto: 'Lista ou cartões.' },
      { n: 3, alvo: '.pagina-acoes', texto: 'Novo cliente e importar planilha.' },
    ],
  },
  {
    id: 'casos', titulo: 'Casos por área', grupo: 'Casos e clientes', rota: '/area/administrativo',
    quem: 'Todos',
    paraQue: 'Cada área tem o seu quadro com as etapas prontas. O cartão mostra há quantos dias o caso está na etapa e o checklist do que falta para avançar.',
    passos: ['Arraste o cartão para a próxima etapa ou use “Mover para…”.', 'Etapas que encerram o caso pedem confirmação; algumas pedem o motivo.', 'Toque no nome do cliente para abrir a ficha do caso (dados, checklist, histórico e passagem de bastão).'],
    marcadores: [
      { n: 1, alvo: '.hv-kpis', texto: 'Em andamento, parados e prontos para avançar.' },
      { n: 2, alvo: '.quadro', texto: 'Quadro com uma coluna por etapa.' },
      { n: 3, alvo: '.cartao', texto: 'Cartão do caso: dias na etapa e checklist.' },
      { n: 4, alvo: '.cartao-mover', texto: 'Mover para outra etapa.' },
    ],
  },
  {
    id: 'publicacoes', titulo: 'Publicações e intimações', grupo: 'Casos e clientes', rota: '/publicacoes',
    quem: 'Todos',
    paraQue: 'As publicações das OABs do escritório chegam sozinhas uma vez por dia (DJEN e ferramentas conectadas). Cada uma pode virar prazo com um toque.',
    passos: ['Confira as que estão sem tarefa no número do topo.', 'Toque em “Criar prazo”: o HiAdv já sugere os dias que aparecem no texto.', 'No plano com a Sara, peça o resumo da intimação com o próximo passo.'],
    marcadores: [
      { n: 1, alvo: '.hv-kpis', texto: 'Quantas chegaram e quantas estão sem tarefa.' },
      { n: 2, alvo: '.pub-filtros', texto: 'Só publicações ou tudo, e o período.' },
      { n: 3, alvo: '.pub-lista', texto: 'Cada publicação, com o botão de criar prazo.' },
    ],
  },
  {
    id: 'financeiro', titulo: 'Financeiro', grupo: 'Gestão', rota: '/financeiro',
    quem: 'Gestor Master',
    paraQue: 'Contratos de honorários com parcelas, entradas e saídas do mês, atrasos com lembrete cordial pronto para o WhatsApp.',
    passos: ['Lance o contrato de honorários; as parcelas são criadas sozinhas.', 'Dê baixa quando receber; dá para desfazer.', 'Em atraso, toque no lembrete: a mensagem abre pronta e você revisa antes de enviar.'],
    marcadores: [
      { n: 1, alvo: '.fin-mes', texto: 'Mês que você está vendo.' },
      { n: 2, alvo: '.hv-kpis', texto: 'Recebido, a receber, em atraso, despesas e resultado.' },
      { n: 3, alvo: '.pagina-acoes', texto: 'Novo contrato ou nova entrada/saída.' },
    ],
  },
  {
    id: 'relatorios', titulo: 'Relatórios', grupo: 'Gestão', rota: '/relatorios',
    quem: 'Gestor Master',
    paraQue: 'Números do escritório calculados na hora: onde os casos param, carga e pontualidade da equipe, contratos fechados e dinheiro.',
    passos: ['Escolha o período nas pílulas.', 'Use as abas Casos, Equipe, Contratos e Financeiro.', 'Etapas com média acima de 7 dias aparecem em destaque como gargalo.'],
    marcadores: [
      { n: 1, alvo: '.hv-barra-solta', texto: 'Período do relatório.' },
      { n: 2, alvo: '.hv-kpis', texto: 'Números principais do período.' },
      { n: 3, alvo: '.hv-abas', texto: 'Abas: Casos, Equipe, Contratos e Financeiro.' },
    ],
  },
  {
    id: 'biblioteca', titulo: 'Biblioteca de modelos', grupo: 'Gestão', rota: '/biblioteca',
    quem: 'Todos (o Gestor Master cria e edita)',
    paraQue: 'Modelos de procuração, contrato e declarações que viram documento pronto com os dados do cliente.',
    passos: ['Abra o cliente e toque em “Gerar documento”.', 'Escolha o modelo; a prévia já vem preenchida.', 'Baixe ou envie para assinatura digital, se estiver conectada.'],
    marcadores: [{ n: 1, alvo: '.pagina-cabeca h1', texto: 'Modelos do escritório.' }],
  },
  {
    id: 'sara', titulo: 'Sara, a assistente', grupo: 'Assistente e conexões', rota: '/seu-dia',
    quem: 'Equipe do plano Sênior + Sara',
    paraQue: 'Você escreve o pedido do seu jeito e a Sara faz: cria e distribui tarefas, agenda perícias, pede documento ao cliente, muda a etapa do caso e prepara minutas para revisão. Cancelar, descartar e encerrar sempre pedem confirmação.',
    passos: ['Abra a Sara e escreva, por exemplo: “marca a perícia do João dia 12 às 9h no INSS de Joaçaba”.', 'Confira o que ela fez ou o plano que ela montou; ações sensíveis esperam o seu “Confirmar”.', 'Para peças, peça a minuta: ela sai marcada para revisão, com o que falta para completar e só com teses de fonte verificada.'],
    marcadores: [{ n: 1, alvo: '.lateral', texto: 'A Sara fica no menu do app da equipe.' }],
  },
  {
    id: 'integracoes', titulo: 'Integrações', grupo: 'Assistente e conexões', rota: '/integracoes',
    quem: 'Gestor Master',
    paraQue: 'Liga o HiAdv às ferramentas do escritório: Escavador ou JUDIT, Google Agenda e Drive, Asaas, assinatura digital, WhatsApp e a chave da Claude.',
    passos: ['Escolha a ferramenta e toque em conectar.', 'Cole a chave ou o token na própria tela (nunca por mensagem).', 'O selo mostra em qual plano cada conexão está disponível.'],
    marcadores: [{ n: 1, alvo: '.pagina-cabeca h1', texto: 'Conexões do escritório.' }],
  },
  {
    id: 'configuracoes', titulo: 'Configurações', grupo: 'Administração', rota: '/configuracoes',
    quem: 'Gestor Master (cada pessoa ajusta a própria conta)',
    paraQue: 'Equipe e acessos, áreas ativas, OABs acompanhadas, dados do escritório, senha e este manual.',
    passos: ['Convide a equipe e escolha o papel de cada pessoa.', 'Ative as áreas que o escritório atende.', 'Cadastre as OABs para receber as publicações.'],
    marcadores: [{ n: 1, alvo: '.pagina-cabeca h1', texto: 'Configurações do escritório.' }],
  },
  {
    id: 'indicar', titulo: 'Indique o HiAdv', grupo: 'Administração', rota: '/indicar',
    quem: 'Gestor Master',
    paraQue: 'Seu link pessoal de indicação. Cada escritório que aderir por ele e pagar a primeira mensalidade vale 20% de desconto em uma mensalidade sua; os descontos somam.',
    passos: ['Copie o link ou envie pelo WhatsApp.', 'Acompanhe quem aderiu e o desconto de cada indicação.'],
    marcadores: [{ n: 1, alvo: '.pagina-cabeca h1', texto: 'Link e indicações.' }],
  },
  {
    id: 'central', titulo: 'Central do HiAdv (Coder)', grupo: 'Administração', rota: '/central', coder: true,
    quem: 'Administração do HiAdv (acesso de Coder)',
    paraQue: 'Receita do mês, saúde de uso de cada escritório e a ficha completa: plano, pagamento, recursos liberados ou bloqueados (com motivo), pessoas e histórico.',
    passos: ['Veja a receita do dia 1 ao último dia do mês.', 'Abra a ficha do escritório e registre o pagamento na aba Assinatura.', 'Na aba Controle, mude o estado de um recurso; o motivo é obrigatório e fica no histórico.', 'Crie um escritório novo em 3 passos.'],
    marcadores: [
      { n: 1, alvo: '.ct-painel', texto: 'Receita do mês e valores em atraso.' },
      { n: 2, alvo: '.ct-barra', texto: 'Filtros por situação, busca e forma de ver.' },
      { n: 3, alvo: '.ct-cartao', texto: 'Escritório com a barra de saúde; toque para abrir a ficha.' },
    ],
  },
]

export const GRUPOS_MANUAL = ['Começo', 'Dia a dia', 'Casos e clientes', 'Gestão', 'Assistente e conexões', 'Administração'] as const
