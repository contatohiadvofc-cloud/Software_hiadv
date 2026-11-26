# Meu Processo HiAdv, mesa do Suporte e agente comercial — design

Decidido com o Felipe em 26/11/2026.

## Por quê
O app do cliente da Lanhi ficou desorganizado. O HiAdv passa a ter um app próprio do cliente ("Meu Processo"), igual para todos os escritórios, com a marca de cada um. As novidades do processo chegam ao cliente organizadas pelo HiAdv e só depois que um humano do Suporte confere. O comercial ganha um agente que conversa com o lead até o contrato.

## Objetivos
1. **Meu Processo:** app leve, instalável, separado do app da equipe. Mostra a fase de cada caso, as atualizações publicadas, os compromissos, as pendências de documentos e uma conversa com o escritório.
2. **Mesa do Suporte:** o HiAdv gera rascunhos de atualização a partir dos eventos (andamento do processo, mudança de fase, perícia ou audiência marcada, documento pedido). O Suporte revisa, edita, descarta ou aprova. Um clique publica: cada atualização vai só para o app do cliente dono.
3. **Agente comercial (etapa 2):** conversa com o lead no chat do Meu Processo (depois também no WhatsApp oficial), com respostas automáticas nas mensagens-padrão (triagem, pedido de documentos, agendamento). Trabalha com um mapa de situações (sinais positivos e negativos, objeções, insatisfação, desconfiança, casos controversos), revisado pelos gestores e editável no Laboratório. Registra o motivo de perda em cada conversa.
4. **Importação do ClickUp (etapa 3):** leitura única do pipeline, cadência e nutrição; o HiAdv substitui o ClickUp no comercial.

## Não-objetivos
- Nada é alterado no ClickUp (somente leitura).
- O agente não dá parecer, não promete resultado e não aborda quem não procurou o escritório.
- O agente nunca pede nem guarda senha do gov.br.

## Restrições
- Atualização do processo ao cliente só sai com aprovação humana (Suporte).
- Mensagens-padrão do agente comercial saem automaticamente; aceitar o caso e enviar o contrato exigem aprovação de um advogado.
- A IA não gera código; regras e mapa de situações são dados validados.
- LGPD: cada escritório só vê os próprios dados; registro de quem aprovou e publicou cada atualização.

## Abordagens consideradas
1. Meu Processo como área do app da equipe: rápido, mas o cliente instalaria o "HiAdv", pesado e confuso.
2. **Escolhida:** app próprio (entrada separada no mesmo código), leve, com manifesto próprio; agente no servidor; mapa de situações como dados.
3. Terceirizar chat e agente (ConversApp): mais rápido, mas a conversa fica fora do HiAdv, contra a substituição e o controle dos dados.

## Decisões de construção (minhas, para conferência)
- **Acesso na etapa 1:** pelo link pessoal que o escritório já gera (token de 64 caracteres, 90 dias). O app guarda o link no aparelho, então o cliente abre pelo ícone. O login por CPF da Área do Cliente da Lanhi entra numa etapa seguinte.
- **Entrada:** `/mp/<token>` abre `meu-processo.html`, com manifesto "Meu Processo"; chamadas diretas às funções do banco, sem o pacote do app da equipe.
- **Geração dos rascunhos:** regras fixas no banco (tradução de andamentos para linguagem simples); a IA pode reescrever depois, sempre como rascunho.
- **Envio de arquivos pelo cliente:** fica para a etapa 1b (exige regra de armazenamento por link).
