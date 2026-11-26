// Roteiros dos vídeos-tutoriais do HiAdv (Instagram/Reels, YouTube Shorts e YouTube).
// Gravados a partir da prévia com escritório fictício: nenhum dado real aparece.
export type Passo = { rota?: string; legenda: string; clique?: string; rolar?: number; espera?: number }
export type Tutorial = { id: string; titulo: string; descricao: string; tags: string[]; passos: Passo[] }

const CTA = 'Teste grátis por 14 dias em hiadv.com.br.'

export const TUTORIAIS: Tutorial[] = [
  { id: '01-instalar', titulo: 'Como instalar o HiAdv no celular e no computador', tags: ['hiadv', 'instalar', 'appjuridico'],
    descricao: 'O HiAdv se instala direto pelo navegador, sem loja: Android, iPhone e computador. Abre em tela cheia e se atualiza sozinho.',
    passos: [{ rota: '/', legenda: 'Abra hiadv.com.br no navegador' }, { legenda: 'Toque em “Instalar o app”', clique: 'Instalar o app' }, { legenda: 'Siga o passo do seu aparelho', espera: 3500 }] },
  { id: '02-seu-dia', titulo: 'Seu dia: tudo o que vence hoje numa tela', tags: ['hiadv', 'prazos', 'gestaojuridica'],
    descricao: 'Atrasados, prazos de hoje, perícias e casos parados em uma só tela para cada pessoa da equipe. Com o Modo foco, só o que importa agora.',
    passos: [{ rota: '/seu-dia', legenda: 'Abra o Seu dia' }, { legenda: 'Atrasados e prazos de hoje primeiro', rolar: 400 }, { legenda: 'Modo foco: só as 5 coisas mais urgentes', clique: 'Modo foco' }] },
  { id: '03-busca', titulo: 'Busca global: ache cliente, caso ou processo em segundos', tags: ['hiadv', 'produtividade', 'advocacia'],
    descricao: 'Use a busca no topo (ou Ctrl+K no computador) para encontrar clientes, casos, processos e CPF de qualquer tela.',
    passos: [{ rota: '/seu-dia', legenda: 'Toque na busca do topo', clique: 'Buscar' }, { legenda: 'Digite parte do nome, CPF ou processo', espera: 3000 }] },
  { id: '04-casos', titulo: 'Casos por área: o quadro de etapas', tags: ['hiadv', 'kanban', 'gestaodeprocessos'],
    descricao: 'Cada área do escritório tem um quadro com as etapas prontas. O caso anda de etapa com responsável e checklist, e você vê há quantos dias está parado.',
    passos: [{ rota: '/areas', legenda: 'Abra as Áreas do escritório' }, { legenda: 'Cada área tem seu quadro de etapas', rolar: 300 }] },
  { id: '05-tarefas', titulo: 'Tarefas e prazos com feriados dos tribunais', tags: ['hiadv', 'prazosprocessuais', 'controladoria'],
    descricao: 'Toda tarefa tem responsável e prazo, contado com os feriados do tribunal. Concluiu? Um toque e ela some do seu dia.',
    passos: [{ rota: '/tarefas', legenda: 'Abra Tarefas' }, { legenda: 'Crie com “Nova tarefa”', clique: 'Nova tarefa' }, { legenda: 'Defina responsável e prazo', espera: 3000 }] },
  { id: '06-agenda', titulo: 'Agenda: perícias, audiências e compromissos', tags: ['hiadv', 'agenda', 'pericia'],
    descricao: 'Perícias, audiências e reuniões numa agenda só, que também aparece no Google Agenda de cada pessoa.',
    passos: [{ rota: '/agenda', legenda: 'Abra a Agenda' }, { legenda: 'Perícias e audiências do escritório', rolar: 300 }] },
  { id: '07-clientes', titulo: 'Clientes e a ficha completa do caso', tags: ['hiadv', 'clientes', 'crmjuridico'],
    descricao: 'Cadastro do cliente com todos os casos, documentos e histórico no mesmo lugar.',
    passos: [{ rota: '/clientes', legenda: 'Abra Clientes' }, { legenda: 'Toque num cliente para ver a ficha', rolar: 200 }] },
  { id: '08-atendimentos', titulo: 'Atendimentos: do primeiro contato ao contrato', tags: ['hiadv', 'comercialjuridico', 'funil'],
    descricao: 'Cada contato fica registrado com a origem e o próximo passo, até virar cliente com o caso aberto na área certa.',
    passos: [{ rota: '/atendimentos', legenda: 'Abra Atendimentos' }, { legenda: 'Cada contato com origem e próximo passo', rolar: 300 }] },
  { id: '09-publicacoes', titulo: 'Publicações pela OAB viram prazo com um toque', tags: ['hiadv', 'intimacoes', 'publicacoes'],
    descricao: 'As publicações chegam pela OAB acompanhada. Calcule o prazo e crie a tarefa direto da intimação.',
    passos: [{ rota: '/publicacoes', legenda: 'Abra Publicações' }, { legenda: 'Calcule o prazo e crie a tarefa', rolar: 300 }] },
  { id: '10-conversas', titulo: 'Conversas da equipe: áudio, chamada e busca', tags: ['hiadv', 'equipe', 'comunicacao'],
    descricao: 'Chat da equipe dentro do sistema: áudios com transcrição, chamadas de voz e vídeo e busca em tudo o que já foi dito.',
    passos: [{ rota: '/conversas', legenda: 'Abra Conversas' }, { legenda: 'Áudio, chamada e busca no histórico', espera: 3000 }] },
  { id: '11-recrutamento', titulo: 'Recrutamento: vaga, inscrições e funil de candidatos', tags: ['hiadv', 'recrutamento', 'vagas'],
    descricao: 'Crie a vaga a partir do modelo da função, divulgue o link e acompanhe os candidatos em cards. Chame para entrevista e faça a proposta com mensagem pronta.',
    passos: [{ rota: '/recrutamento', legenda: 'Abra Recrutamento' }, { legenda: 'Toque na vaga para ver os candidatos', clique: 'Assistente de triagem documental' }, { legenda: 'Candidatos em cards por etapa', rolar: 500 }] },
  { id: '12-financeiro', titulo: 'Financeiro: honorários e o que entra no mês', tags: ['hiadv', 'financeiro', 'honorarios'],
    descricao: 'Honorários, parcelas e recebimentos do escritório em uma tela, com cobrança integrada nos planos Pleno e Sênior.',
    passos: [{ rota: '/financeiro', legenda: 'Abra o Financeiro' }, { legenda: 'Honorários e recebimentos do mês', rolar: 300 }] },
  { id: '13-tema', titulo: 'Modo claro ou escuro com um toque', tags: ['hiadv', 'dicas'],
    descricao: 'Troque entre claro e escuro pelo botão do topo, no celular ou no computador.',
    passos: [{ rota: '/seu-dia', legenda: 'Toque no sol ou na lua do topo', clique: 'tema' }, { legenda: 'Pronto: o tema fica salvo', espera: 2500 }] },
  { id: '14-configuracoes', titulo: 'Configurações: equipe, áreas e integrações', tags: ['hiadv', 'configuracao', 'implantacao'],
    descricao: 'O gestor ajusta a equipe, as áreas do escritório e as integrações. No plano Master, há a opção da implantação assistida de 7 dias.',
    passos: [{ rota: '/configuracoes', legenda: 'Abra Configurações' }, { legenda: 'Equipe, áreas e integrações', rolar: 400 }] },
]

export function legendaPost(t: Tutorial): string {
  return `${t.titulo}\n\n${t.descricao}\n\n${CTA}\n\n${t.tags.map((x) => '#' + x).join(' ')}`
}
