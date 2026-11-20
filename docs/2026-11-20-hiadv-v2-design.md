# HiAdv 2 · Documento de projeto (reconstrução completa)

**Data:** 20/11/2026 · **Status:** aguardando aprovação dos gestores
**Autoria do software:** compartilhada entre Deividy e Felipe Lanhi (decisão de 20/11/2026)
**Substitui:** a ADR 0001 ("evoluir em vez de reescrever"), por decisão do Felipe em 20/11/2026

## 1. Por que reconstruir

O HiAdv atual funciona, mas passa a sensação de algo artificial e montado às pressas. As queixas dos gestores, em 20/11/2026, foram estas:

- **Identidade:** a fonte, o visual do nome e a abertura não agradam.
- **Organização:** o layout e a divisão interna das telas cresceram conforme o sistema foi sendo feito, e não conforme o trabalho do advogado.
- **Áreas iguais para todos:** todo escritório vê todas as áreas. A Dra. Tamiris atua só no trabalhista e precisa procurar a área dela no meio das outras. Os cards têm campos genéricos, pensados para benefício do INSS.
- **Sara:** erra demais. Dos 20 pedidos de 19 e 20/11, 12 falharam. A causa quase sempre foram os limites e as recusas dos motores gratuitos (Groq 429, Gemini 403 e 404). Além disso, ela faz pouco e não tem agentes especializados.
- **Peças:** petições e minutas não são produzidas a partir de um modelo ou de uma referência anexada.

As referências mostradas pelos gestores foram DocAdv, EasyJur, um vídeo da W3B, dois vídeos sobre design system e site animado com Claude Code, e o site da Fore Legal. O que elas têm em comum é credibilidade pela estrutura: cada coisa tem lugar fixo, a hierarquia é clara, o padrão visual se repete em todas as telas e o tom é sóbrio.

O HiAdv passa a ser um **produto próprio** (domínio hiadv.com.br, repositório próprio), oferecido a vários escritórios. A Lanhi Advogados é um escritório cliente.

## 2. Objetivos

1. **Aparência de produto sério:** um design system próprio aplicado igual em todas as telas, no computador e no celular.
2. **Organização por trabalho:** barra lateral só com as áreas do escritório, busca global, tela inicial "Seu dia", e ficha do caso com os campos da área.
3. **Áreas por escritório:** o Gestor Master escolhe as áreas de atuação. Cada área traz etapas, campos, checklists e modelos próprios. A primeira área completa além da previdenciária é a **trabalhista**.
4. **Sara estável e em equipe:** uma orquestradora mais agentes especializados, usando o motor pago com a chave de cada escritório.
5. **Produção de peças:** um rascunho em Word, no timbrado do escritório, a partir de modelo ou referência anexada e dos documentos do caso, sempre para revisão do advogado.
6. **Multi-escritório desde o primeiro dia:** dados separados, entrada de novos escritórios e advogados sob pedido do Deividy.
7. **Celular:** instalável como aplicativo (PWA) a partir do hiadv.com.br.

## 3. O que não é objetivo agora

- Publicar nas lojas de aplicativos (exige conta paga). O PWA atende por enquanto.
- Trocar o banco de dados. O Supabase atual, com o isolamento por escritório pronto, continua sendo o servidor.
- O site da Lanhi Advogados. Ele continua como está, só aponta para o HiAdv.

## 4. O que seria fracasso mesmo funcionando

- **Visual genérico.** Uma interface que pareça modelo pronto ("cara de template"): cards todos iguais, sombras e gradientes por enfeite.
- **Escritório parado.** A equipe da Lanhi ficar sem sistema durante a reconstrução.
- **Vazamento entre escritórios.** Qualquer dado de um escritório aparecer para outro.
- **IA decidindo sozinha.** A IA protocolar, enviar mensagem ao cliente ou decidir algo jurídico sem o advogado (ética OAB, regras 3 e 5 do CLAUDE.md).
- **Custo de IA fora de controle.** Cada escritório paga a própria chave, e o sistema mostra e limita o consumo.

## 5. Restrições

- **Proteção de dados:**
  - LGPD: RBAC, log de auditoria, criptografia, dados fictícios em desenvolvimento.
  - Segredos só no painel do Supabase, cadastrados pelos gestores. Nunca a chave service_role.
- **A IA nunca gera código executável:** regras só em formato declarativo, validadas por schema (regra 4).
- **Orçamento de R$ 40, já usado no domínio:**
  - Hospedagem gratuita no GitHub Pages.
  - Supabase no plano gratuito até o fim dos testes.
  - IA paga pela chave de cada escritório.
- **Interface:** em português do Brasil, com código e nomes técnicos em inglês.
- **Publicação:** pelo repositório novo do HiAdv. Nunca apagar CNAME.

## 6. Caminhos considerados (escolha feita)

1. **Design system novo por cima do sistema atual, tela por tela.** Menor risco, mas o código antigo sem framework limita o acabamento e a consistência.
2. **Reconstrução completa num framework moderno. ESCOLHIDO pelo Felipe em 20/11/2026.** É o maior salto de qualidade e a base certa para um produto com vários escritórios. Se a reconstrução quebrar o sistema atual, o HiAdv 2 passa a ser a estrutura definitiva.
3. **Trocar primeiro só a "casca".** É o mais rápido, mas mantém a inconsistência por dentro.

## 7. Como será construído

### 7.1 Tecnologia (decisão técnica minha, explicada em linguagem simples)

| Parte | Escolha | Por quê |
|---|---|---|
| Aplicativo | React + TypeScript, montado com Vite | É o padrão do mercado. O TypeScript aponta erros antes de chegarem à tela, e o resultado é um site estático que roda no GitHub Pages sem custo. |
| Navegação e dados | TanStack Router e TanStack Query | Endereços próprios para cada tela; dados guardados em memória e atualizados sozinhos. |
| Componentes | Radix UI (só a parte invisível: teclado, foco, acessibilidade) + estilo 100% nosso | Garante acessibilidade sem herdar a cara de modelo pronto. |
| Estilo | Tokens próprios em variáveis CSS (cores, tipos, espaços, raios, sombras) | Uma mudança de cor ou fonte vale para o sistema inteiro. |
| Celular | PWA instalável (vite-plugin-pwa) | Instala pelo navegador, sem loja. |
| Servidor | Supabase atual (banco, segurança por linha, funções) | Já tem o isolamento por escritório testado em produção. |
| Testes | Vitest (lógica) e Playwright (telas, no celular e no computador) | Nada é concluído sem teste (CLAUDE.md). |

### 7.2 Design system

O design system será criado antes de qualquer tela, numa página própria chamada "catálogo". Ela mostra todas as peças do sistema (tipografia, cores, botões, campos, tabelas, cards de caso, avisos, estados vazios e de erro, modo claro e escuro), para os gestores aprovarem.

A direção visual sai de **mockups mostrados aos gestores antes de codar**: duas ou três opções lado a lado, uma escolhida.

Princípios já definidos pelas referências:

- **Sobriedade:** uma família tipográfica de leitura excelente em tela (no máximo duas), cor de destaque usada só para ação e estado, e muito espaço.
- **Hierarquia fixa em toda tela:** título, ação principal, filtros e conteúdo, sempre no mesmo lugar.
- **Densidade de ferramenta de trabalho:** tabelas e quadros que mostram muito sem apertar.
- **Abertura discreta:** entrar no sistema leva direto ao "Seu dia", com uma marca HiAdv nova e simples, sem animação teatral.
- **Movimento só com propósito:** confirma o que mudou (arrastar um card, salvar), nunca como enfeite.
- **Acessibilidade:** contraste AA, foco visível, alvos de toque de 44 px e respeito a "reduzir movimento".

### 7.3 Estrutura de navegação

```
┌──────────────┬───────────────────────────────────────────┐
│ HiAdv        │  [Buscar clientes, casos, processos  ⌘K]  │
│ Escritório ▾ ├───────────────────────────────────────────┤
│              │                                           │
│ Seu dia      │   Título da tela          [Ação principal]│
│ Caixa        │   Filtros / visões (lista·quadro·agenda)  │
│──────────────│                                           │
│ ÁREAS        │   Conteúdo                                │
│  Trabalhista │                                           │
│  (só as do   │                                           │
│  escritório) │                                           │
│──────────────│                                           │
│ Clientes     │                                           │
│ Agenda       │                                           │
│ Documentos   │                                           │
│ Sara         │                                           │
│──────────────│                                           │
│ Gestão ▸     │  (painel, automações, equipe, ajustes:    │
│              │   só gestores)                            │
└──────────────┴───────────────────────────────────────────┘
No celular: barra inferior (Seu dia · Áreas · Buscar · Sara · Mais).
```

- **Seu dia:** prazos e tarefas que vencem, atrasados, publicações urgentes, perícias e audiências próximas e casos parados, do jeito de cada pessoa.
- **Caixa:** o que chegou para a pessoa ou para a área dela (passagens de bastão, pedidos da Sara, publicações).
- **Área:** quadro por etapas (arrastar e soltar), lista e agenda. O card mostra os campos que importam naquela área.
- **Ficha do caso:** resumo, linha do tempo, documentos, prazos, tarefas, peças e conversa com a Sara sobre o caso.

### 7.4 Áreas por escritório (mudança de dados)

Hoje as etapas (`fluxo_status`) são globais e iguais para todos os escritórios. No HiAdv 2:

- **Modelos de área no núcleo:** previdenciário administrativo, previdenciário judicial, perícia, trabalhista, cível, bancário, família e outras. Cada modelo traz etapas, campos, checklist de entrada e saída, prazos e tarefas-modelo.
- **Área ligada ao escritório:** o escritório ativa as áreas que usa. Pode renomear etapas e acrescentar campos sem programar. O núcleo continua igual para todos.
- **Migração:** a Lanhi recebe as áreas que já usa, com as mesmas etapas. O escritório da Dra. Tamiris recebe só a trabalhista.
- **Primeiros campos do trabalhista** (para a Dra. Tamiris validar):
  - reclamada(s);
  - período e função;
  - salário;
  - motivo da saída;
  - verbas pedidas;
  - valor da causa;
  - vara/TRT;
  - audiências (inicial, instrução);
  - fase (conhecimento, recurso, execução).

### 7.5 Sara em equipe

**Orquestradora (Sara):** entende o pedido, divide o trabalho, chama os agentes, junta as respostas e apresenta um plano.

**Agentes especializados:**
- **Leitora:** extrai fatos de PDF e imagem (laudos, CNIS, CTPS, contratos, sentenças).
- **Redatora:** escreve peças a partir de modelo ou referência e dos fatos do caso.
- **Prazos e publicações:** classifica intimações, sugere prazo e providência, e cria a tarefa.
- **Mensagens:** prepara explicação em linguagem simples para o cliente, que nunca é enviada sozinha.
- **Agenda:** perícias, audiências e reuniões.
- **Conferente:** revisa o trabalho dos outros contra os documentos e as regras do escritório antes de mostrar.

**Motores:**
- Claude Haiku 5.5 para a orquestração e a maioria dos agentes (barato e rápido).
- Claude Sonnet 5.5 só para a Redatora, na versão final da peça.
- Gemini gratuito como reserva.
- A chave é de cada escritório e fica no servidor. O consumo aparece por escritório, com limite mensal configurável.

**Regras mantidas:** modo automático para ações simples, com registro em sara_planos e sara_log. Ações finais, destrutivas ou acima do limite pedem "Confirmar". Mensagem ao cliente nunca sai sozinha. A IA não gera código.

### 7.6 Produção de peças

1. O advogado escolhe o tipo de peça e o caso. Depois anexa um modelo do escritório ou uma peça de referência, ou usa um modelo salvo.
2. A Leitora extrai os fatos dos documentos do caso. A Redatora monta o rascunho seguindo a estrutura do modelo. A Conferente marca o que precisa de atenção, como dado faltando, data divergente ou citação a verificar.
3. O resultado é um .docx no timbrado do escritório, com as regras de formatação configuradas por escritório (para a Lanhi: Cambria 12, espaçamento 1,15, endereçamento "MERITÍSSIMO JUÍZO..." e ementas em bloco com recuo de 4 cm).
4. A peça fica no caso como "rascunho para revisão". Nada é protocolado pelo sistema.

### 7.7 Módulos a recriar (paridade com o sistema atual)

Tudo o que existe hoje precisa existir no HiAdv 2 antes da troca. A lista vem das tabelas atuais no Supabase:

- **Pessoas e acesso:** clientes, contatos, equipe, acessos e papéis.
- **Casos e processos:** casos e histórico, processos e movimentações (DJEN e DataJud), perícias, audiências, prazos, tarefas e recorrência, pendências, documentos, notas.
- **Sara e automações:** Sara (planos, log, modelos, minutas, conhecimento, padrões); automações (regras, versões, log, laboratório).
- **Gestão e comunicação:** financeiro (lançamentos), reuniões, chat interno, indicações, parceiros, importação de clientes, auditoria.
- **Portal do cliente:** passa a ser de cada escritório, com a marca de cada um. Entra numa fase posterior; até lá, o app do cliente atual da Lanhi continua no ar.

## 8. Ordem de entrega

| Fase | Conteúdo | Resultado visível |
|---|---|---|
| 0 | Repositório novo, base técnica, design system e catálogo aprovados, login, escolha de escritório, barra lateral com áreas por escritório, busca, "Seu dia" | Sistema novo abre e navega com dados de teste |
| 1 | Áreas e casos (quadro, lista, ficha), clientes, tarefas, prazos, agenda, documentos e checklist, publicações virando tarefa; área trabalhista completa | Dra. Tamiris pode trabalhar no novo |
| 2 | Sara em equipe com motor pago, painel de consumo | Sara estável |
| 3 | Produção de peças | Rascunho de petição em Word |
| 4 | Automações e laboratório, painel e relatórios, financeiro, reuniões, chat, indicações, parceiros | Paridade com o sistema atual |
| 5 | Portal do cliente por escritório e troca definitiva (hiadv.com.br) | Sistema antigo desligado |

**Troca:** o sistema atual continua no ar (lanhiadvogados.com.br/hiadv/ e /equipe/) até a Fase 4. Cada fase é publicada primeiro no projeto de teste do Supabase, com dados fictícios. Se algo do sistema atual quebrar no caminho, o HiAdv 2 vira a estrutura definitiva a partir daí, por decisão do Felipe.

## 9. Decisões que ficaram comigo

Os gestores podem corrigir qualquer uma destas:

- **Tecnologia:** a pilha da seção 7.1.
- **Backend:** mantido o Supabase atual, mudando só o necessário (áreas por escritório, consumo de IA).
- **Ordem das fases:** a Dra. Tamiris primeiro, porque é o caso de uso mais limpo para provar áreas por escritório.
- **Portal do cliente na Fase 5:** o app do cliente atual continua atendendo a Lanhi até lá.
- **Visual:** a direção visual não está fechada neste documento. Sai de mockups na Fase 0, com aprovação dos gestores.

## 10. Pendências para começar

- **Repositório novo:** os gestores aceitam os convites, informam o nome do repositório e liberam acesso por aqui.
- **Campos do trabalhista:** a Dra. Tamiris confirma a lista da seção 7.4.
- **Motor pago:** a Lanhi cadastra a chave da Claude no painel do Supabase quando quiser ligar a Sara paga.
- **Domínio:** o hiadv.com.br passa a apontar para o GitHub Pages do repositório novo (configuração no Registro.br, feita pelo titular).
