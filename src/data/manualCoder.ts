// Manuais internos do papel Coder: só aparecem na Central HiAdv. Nada aqui é mostrado ao público.
export type SecaoManual = { id: string; titulo: string; itens: (string | { t: string; sub: string[] })[] }

export const MANUAL_CODER: SecaoManual[] = [
  { id: 'visao', titulo: 'O que é o HiAdv', itens: [
    'Software único para escritórios de advocacia: casos por área, prazos, publicações, atendimentos, clientes, financeiro, conversas e chamadas, recrutamento e a Sara.',
    'Núcleo igual para todos (fluxos, comandos, modelos, automações e treino da Sara); muda só a personalização de cada escritório.',
    'Papéis: code (administração do HiAdv), master (gestores do escritório), colaborador e parceiro.',
  ] },
  { id: 'pecas', titulo: 'Onde fica cada peça', itens: [
    { t: 'Aplicativo (front-end)', sub: ['React + Vite + TanStack Router e Query (Preact por baixo, mais leve).', 'Código em src/: routes (telas), data (regras e chamadas), shell (menu, avisos), design (componentes).', 'Funciona como app instalável (PWA) no Android, iPhone e computador.'] },
    { t: 'Banco e login', sub: ['Supabase. Produção: ntcowwgnazronmfrylcm. Testes: vzjjzgbwaswpgrojqkhv.', 'Toda leitura e escrita passa por funções (RPC) com security definer que conferem escritório e papel.', 'Scripts SQL numerados em docs/sql (hiadv2 até hiadv14), aplicados sempre no teste antes da produção.'] },
    { t: 'Funções no servidor (Edge Functions)', sub: ['chamada-ice: servidores de conexão das chamadas (TURN quando os segredos existirem).', 'transcrever: áudios e reuniões em texto (chave HIADV_TRANSCRICAO_CHAVE).', 'Outras funções seguem em supabase/functions.'] },
    { t: 'Publicação', sub: ['Envio para a branch main do repositório Software_hiadv publica no GitHub Pages pela Action.', 'Conferir com gh run list -L 1. Nunca apagar o CNAME.'] },
  ] },
  { id: 'segredos', titulo: 'Segredos e segurança', itens: [
    'Chave service_role do Supabase nunca é pedida nem colada em lugar nenhum.',
    'Segredos (TURN, transcrição, chaves de IA) são cadastrados pelos gestores no painel do Supabase ou em Integrações.',
    'Dados reais nunca entram em testes: só seeds fictícios.',
    'Laudos, exames e currículos ficam em buckets privados; links temporários de 5 minutos.',
    'Toda mudança importante passa por auditar() e aparece no histórico.',
  ] },
  { id: 'regras', titulo: 'Regras que não mudam', itens: [
    'A IA não gera código: só regras declarativas validadas por schema.',
    'Mensagem ao cliente nunca sai sozinha: fica pronta numa tarefa para alguém enviar.',
    'Ações externas ou irreversíveis exigem confirmação, simulação antes e registro.',
    'Ética OAB: sem promessa de resultado e sem captação ativa.',
    'Recrutamento: a IA sugere e o gestor decide; nada de idade, foto, gênero, raça, religião, estado civil ou endereço; gravação só com aceite.',
  ] },
  { id: 'modulos', titulo: 'Módulos prontos', itens: [
    'Seu dia (com Modo foco), Áreas e casos, Tarefas e prazos, Agenda, Clientes e ficha do caso, Biblioteca.',
    'Publicações pela OAB, Atendimentos (do contato ao cliente), link de acompanhamento do cliente.',
    'Financeiro e Relatórios (Pleno em diante), Integrações, Configurações e Manual do escritório.',
    'Conversas da equipe, comunidades moderadas, contatos, áudio com revisão, transcrição, busca no histórico, chamadas de voz e vídeo até 6 pessoas.',
    'Recrutamento etapa 1: vagas, página pública /vagas/<escritório>/<vaga>, inscrição com currículo e funil em cards.',
    'Central HiAdv, Adesões e Indique o HiAdv (só code).',
  ] },
  { id: 'testes', titulo: 'Como testar antes de publicar', itens: [
    'npx tsc -p . --noEmit (tipos), npx vitest run (regras, pasta tests/unit).',
    'npx playwright test: roda nos perfis computador, celular (Android) e iphone. Faz build antes.',
    'Mudança de banco: aplicar no projeto de teste, conferir, e só então na produção com autorização dos gestores.',
  ] },
  { id: 'proximos', titulo: 'O que ainda dá para construir', itens: [
    'Recrutamento: testes por função com correção automática, leitura de currículo pela IA, entrevista por vídeo gravada com avaliação do que foi dito, proposta e carreira.',
    'Pulso Próprio: coleta do Legal Mail, análise e painel diário, decisão por comentário no card.',
    'Fixar e encaminhar mensagens para o caso, @menção, "visto por", resumo de reunião por IA, Desfazer.',
    'Linha do tempo do caso, calculadora embutida, prazos em dias úteis com feriados de cada tribunal, alerta de perícia, foto para PDF.',
    'Funil por origem, lead sem resposta, motivos de perda, placar semanal, passagem de bastão com aceite.',
    'Portal do cliente com etapas em linguagem simples, previsão de recebimentos e alerta de alvará.',
    'WhatsApp oficial (Meta) com espelho do número do escritório, servidor TURN para chamadas fora da rede.',
  ] },
]

export const MANUAL_IMPLANTACAO: SecaoManual[] = [
  { id: 'antes', titulo: 'Antes do dia 1', itens: [
    'A implantação assistida só existe no plano Master. Confirmar pagamento ou parcela 1 e o plano na Central HiAdv.',
    'Criar o escritório na Central (Novo escritório em 3 passos) e o primeiro acesso de gestor.',
    'Marcar os 7 dias seguidos com os gestores e combinar quem participa de cada treino.',
    'Pedir a planilha ou exportação do sistema anterior (clientes, casos, prazos) sem dados de saúde por e-mail.',
  ] },
  { id: 'd1', titulo: 'Dia 1 · Diagnóstico e planejamento', itens: [
    'Reunião de diagnóstico e planejamento organizacional: áreas, quem faz o quê, fluxo atual, gargalos, metas dos próximos 3 meses e capacidade da equipe.',
    'Configurar dados do escritório, logo, OABs acompanhadas, cidade e WhatsApp.',
    'Cadastrar a equipe com o papel certo (gestor, colaborador, parceiro) e conferir os acessos.',
    'Treino 1 (60 min): Seu dia, Modo foco, busca global (Ctrl+K e voz), atalhos (tecla ?), instalar o app no Android e no iPhone.',
  ] },
  { id: 'd2', titulo: 'Dia 2 · Fluxos e áreas', itens: [
    'Montar áreas e etapas (ex.: Comercial → Triagem → Jurídico → Suporte) e os responsáveis de cada uma.',
    'Modelos de caso por tipo de benefício ou ação; campos personalizados e checklists de entrada e saída.',
    'Treino 2: criar caso, tarefas, passagem de bastão com resumo, prazos com feriados.',
  ] },
  { id: 'd3', titulo: 'Dia 3 · Migração dos dados', itens: [
    'Importar clientes, casos e prazos; conferir por amostragem com a equipe (mínimo 20 casos).',
    'Ligar publicações pela OAB e conferir as intimações da semana com o que o escritório já tinha.',
    'Treino 3: clientes, documentos, agenda e o link do Meu Processo para o cliente.',
  ] },
  { id: 'd4', titulo: 'Dia 4 · Integrações e financeiro', itens: [
    'Ativar as conexões: cobrança (Asaas), assinatura digital, Google Drive, consulta processual (Escavador ou JUDIT).',
    'Os próprios gestores colam as chaves em Integrações; o Coder só orienta.',
    'Configurar financeiro e honorários com as regras do escritório.',
    'Treino 4: financeiro, relatórios, conversas, áudios e chamadas da equipe.',
  ] },
  { id: 'd5', titulo: 'Dia 5 · Estratégia comercial', itens: [
    'Estratégia comercial: funil de atendimentos, origem de cada lead, tempo de resposta e passos do contato ao contrato.',
    'Mesa do Suporte: como revisar e publicar as novidades no Meu Processo de cada cliente.',
    'Treino 5: atendimentos, suporte ao cliente e indicadores comerciais.',
  ] },
  { id: 'd6', titulo: 'Dia 6 · Automações e Sara', itens: [
    'Montar as automações do escritório, simular cada uma antes de ligar e registrar quem aprovou.',
    'Configurar a Sara com os limites definidos pelos gestores (padrão 5 ações por pedido).',
    'Abrir a primeira vaga no Recrutamento se o escritório estiver contratando.',
    'Treino 6: automações, Sara e recrutamento.',
  ] },
  { id: 'd7', titulo: 'Dia 7 · Rodagem assistida e entrega', itens: [
    'Dia de uso real com acompanhamento e ajustes finos.',
    'Revisar acessos, quem é gestor, cópias de segurança e o histórico de auditoria.',
    'Treino 7: dúvidas finais e treino do gestor que vai cuidar do sistema no dia a dia.',
    'Entregar o roteiro do escritório (como eles usam) e registrar a implantação como concluída na Central.',
  ] },
  { id: 'cobranca', titulo: 'Valor e pagamento', itens: [
    'Implantação assistida: opcional e só no plano Master. R$ 800,00, uma vez, com o fundador Deividy acompanhando por 7 dias (configuração e treino de uso, estratégia comercial e planejamento organizacional). A mensalidade do plano é à parte.',
    'Formas: dinheiro, cartão de débito, Pix, até 10x no cartão de crédito ou 3x no boleto.',
    'Nos outros planos, o escritório implanta pelo Manual em Configurações, sem custo extra, e a migração da planilha de clientes é gratuita.',
  ] },
]
