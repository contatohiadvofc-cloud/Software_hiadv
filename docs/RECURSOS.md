# Recursos do HiAdv

O que já vem ligado, o que o escritório ativa (e como) e o que está em preparação. Este arquivo é gerado a partir de `src/data/recursos.ts` (`npm run recursos`); o mesmo conteúdo aparece em Configurações, "Recursos do HiAdv".

## Ligado

### Casos por área, em etapas

Quadro e lista por área, checklist de documentos, histórico e mudança de via.

Onde fica: Áreas.

### Atendimentos

Do primeiro contato até virar cliente, com próximo contato e motivo de quem não fechou.

Onde fica: Atendimentos.

### Clientes

Cadastro, importação por planilha, dados de qualificação, horas e link de acompanhamento.

Onde fica: Clientes.

### Tarefas e prazos

Prazo em dias úteis ou corridos, com feriados e suspensões dos tribunais.

Onde fica: Tarefas.

### Publicações e andamentos

Diário (DJEN) pela OAB e andamentos (DataJud), a cada 30 minutos, já viram tarefa.

Onde fica: Publicações.

### Agenda e Google Agenda

Perícias, audiências e prazos; cada pessoa liga o seu link no Google.

Onde fica: Agenda no Google.

### Acompanhamento pelo cliente

Link pessoal, sem senha, com a fase do caso em palavras simples.

Onde fica: Contato do escritório.

### Documentos a partir de modelos

Procuração, contrato e declarações em Word, preenchidos com os dados do cliente.

Onde fica: Biblioteca.

### Financeiro e honorários (Gestor Master)

Fixo, êxito ou misto, parcelas, atrasos e cobrança pronta no WhatsApp.

Onde fica: Financeiro.

### Relatórios (Gestor Master)

Gargalos por etapa, produtividade da equipe, atendimentos e dinheiro.

Onde fica: Relatórios.

### Avisos e agentes sem custo

Prazo fatal chegando, caso parado, preparo de perícia e rodízio de responsáveis.

Onde fica: Regras de atenção.

### App no celular

Instala pelo navegador e abre com a digital ou a senha do celular.

Onde fica: Este aparelho.

## Para ativar

### Assistente de IA (plano Sênior) (Gestor Master)

Quesitos, minutas e resumos de intimações e documentos, como rascunho para o advogado revisar. Fica na página do cliente e em Publicações.

Onde fica: Integrações.

1. Crie a conta do escritório em console.anthropic.com e cadastre um cartão em Billing.
2. Em API Keys, crie uma chave com o nome "HiAdv".
3. Aqui em Integrações, em Claude, clique em "Cadastrar chave" e cole. A chave vai direto para o cofre: depois de salva, ninguém vê de novo.
4. Defina o limite por mês (opcional) e clique em "Ativar".
5. Pronto: o botão "Assistente de IA" aparece na página do cliente e "Resumir com IA" em cada publicação.

Custo: Pago por uso na conta Anthropic do escritório. Dá para definir um limite por mês.

### Google Drive do escritório (Gestor Master)

No Assistente de IA, escolha arquivos do Drive para a IA ler (PDF, Word, Google Docs, fotos) e salve o rascunho de volta na pasta do cliente. Os arquivos não são copiados para o HiAdv.

Onde fica: Integrações.

1. Aqui em Integrações, ligue o Google Drive.
2. No Assistente de IA, toque em "Escolher arquivos do Drive" e entre com a conta Google do escritório.
3. O HiAdv só enxerga os arquivos e pastas que você escolher na janela do Google.

Custo: Sem custo.

## Em preparação

### Assinatura digital (ZapSign) (Gestor Master)

Envia o kit do cliente (contrato, procuração, declaração) para assinar pelo celular, com validade jurídica.

Onde fica: Integrações.

- Crie a conta do escritório em zapsign.com.br e escolha o plano.
- Em Configurações, Integração, API, copie o token de produção.
- Aqui em Integrações, em ZapSign, cadastre o token e escolha como enviar: com um clique (mostra a prévia) ou automático.
- Deixe os modelos do kit (contrato, procuração, declaração) na Biblioteca. O envio para assinatura é liberado na próxima atualização; até lá, gere os documentos em Word pela página do cliente.

Custo: Plano da ZapSign contratado pelo escritório (há plano gratuito com poucos envios por mês).

### WhatsApp oficial com robô de triagem

Número oficial do escritório respondendo e qualificando contatos, que entram sozinhos em Atendimentos.

- Hoje: as mensagens saem prontas pelo botão do WhatsApp e quem envia é sempre o advogado.
- Para ligar quando for liberado: conta no Gerenciador de Negócios da Meta verificada, um número exclusivo (que não esteja no WhatsApp comum) e a aprovação dos modelos de mensagem.
- Mensagem ao cliente continua sem envio automático; o robô só qualifica e organiza.

Custo: Cobrança da Meta por conversa, na conta do escritório.

### Conexão com outros sistemas (API) (Gestor Master)

Receber contatos do site ou de formulários e avisar outros sistemas quando um caso muda de etapa.

- Quando ligar: o Gestor Master gera uma chave de acesso aqui, com permissões limitadas, e pode desligá-la a qualquer momento.

Custo: Sem custo no HiAdv.
