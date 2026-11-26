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
  { id: 'antes', titulo: 'Antes da semana 1', itens: [
    'Confirmar pagamento ou parcela 1 e o plano contratado na Central HiAdv.',
    'Criar o escritório na Central (Novo escritório em 3 passos) e o primeiro acesso Master.',
    'Marcar as 6 reuniões semanais com os gestores e combinar quem participa de cada treino.',
    'Pedir a planilha ou exportação do sistema anterior (clientes, casos, prazos) sem dados de saúde por e-mail.',
  ] },
  { id: 's1', titulo: 'Semana 1 · Diagnóstico e base', itens: [
    'Reunião de diagnóstico: áreas, quem faz o quê, fluxo atual, gargalos e metas dos próximos 3 meses.',
    'Configurar dados do escritório, logo, OABs acompanhadas, cidade e WhatsApp.',
    'Cadastrar a equipe com o papel certo (master, colaborador, parceiro) e conferir os acessos.',
    'Treino 1 (60 min): Seu dia, Modo foco, busca global (Ctrl+K e voz), atalhos (tecla ?), instalar o app no Android e no iPhone.',
    'Entrega da semana: todos entram pelo celular e pelo computador.',
  ] },
  { id: 's2', titulo: 'Semana 2 · Fluxos e áreas', itens: [
    'Montar áreas e etapas (ex.: Comercial → Triagem → Jurídico → Suporte) e os responsáveis de cada uma.',
    'Modelos de caso por tipo de benefício ou ação; campos personalizados e checklists de entrada e saída.',
    'Carga por pessoa só se houver mais de uma pessoa na mesma função.',
    'Treino 2: criar caso, tarefas, passagem de bastão com resumo, prazos com feriados.',
  ] },
  { id: 's3', titulo: 'Semana 3 · Migração dos dados', itens: [
    'Importar clientes, casos e prazos; conferir por amostragem com a equipe (mínimo 20 casos).',
    'Ligar publicações pela OAB e conferir as intimações da semana com o que o escritório já tinha.',
    'Treino 3: clientes, documentos, agenda e link de acompanhamento do cliente.',
  ] },
  { id: 's4', titulo: 'Semana 4 · Integrações', itens: [
    'Ativar as conexões do plano: cobrança (Asaas), assinatura digital, Google Drive, consulta processual (Escavador ou JUDIT).',
    'Os próprios gestores colam as chaves em Integrações; o Coder só orienta.',
    'Configurar financeiro e honorários com as regras do escritório.',
    'Treino 4: financeiro, relatórios, conversas, áudios e chamadas da equipe.',
  ] },
  { id: 's5', titulo: 'Semana 5 · Automações e Sara', itens: [
    'Montar as automações do escritório, simular cada uma antes de ligar e registrar quem aprovou.',
    'Configurar a Sara com os limites definidos pelos gestores (padrão 5 ações por pedido).',
    'Abrir a primeira vaga no Recrutamento se o escritório estiver contratando.',
    'Treino 5: automações, Sara, recrutamento e atendimentos do contato ao cliente.',
  ] },
  { id: 's6', titulo: 'Semana 6 · Rodagem assistida e entrega', itens: [
    'Uma semana de uso real com acompanhamento diário curto (15 min) e ajustes finos.',
    'Revisar acessos, quem é master, cópias de segurança e o histórico de auditoria.',
    'Treino 6: dúvidas finais e treino do gestor que vai cuidar do sistema no dia a dia.',
    'Entregar o roteiro do escritório (como eles usam) e registrar a implantação como concluída na Central.',
  ] },
  { id: 'cobranca', titulo: 'Valor e pagamento', itens: [
    'Implantação assistida: R$ 8.000,00, uma vez. A mensalidade do plano é à parte.',
    'Formas: dinheiro, cartão de débito, Pix, até 10x no cartão de crédito ou 3x no boleto.',
    'Quem preferir implanta sozinho pelo Manual em Configurações, sem custo extra.',
  ] },
]
