# Plano HiAdv — integrações, publicações e áreas de atuação (24/11/2026)

Decisões do Felipe (24/11):
- Só integrações que o próprio escritório ou advogado conecta sozinho (entrar com a conta ou colar a própria chave), sem pedir parceria a empresas.
- DataJud desligado (função v13 pronta em `docs/funcoes/`, publicação pendente).
- O HiAdv organiza; quem capta é a ferramenta conectada.

## Etapa 1 — Escavador funcionando (cada advogado vincula o seu)
1. Integração por pessoa, além da do escritório: cada advogado cola o próprio token do painel da API do Escavador (Integrações → Escavador → "Conectar minha conta").
2. "Testar conexão" mostra o saldo/nome da conta antes de salvar.
3. Ao conectar: busca dos processos pela OAB do advogado, tela de revisão ("estes são os seus processos; marque os que o HiAdv deve acompanhar"), e criação do monitoramento no Escavador com aviso (webhook) para uma função do HiAdv.
4. Cada novidade vira item em Publicações com selo da fonte (Escavador / DJEN), ligada ao processo e ao cliente, com "Calcular prazo e criar tarefa".
5. Painel de saúde da fonte: última novidade recebida, falhas, créditos baixos.
6. Testes com conta de teste e dados fictícios; produção só com OK.

## Etapa 2 — Integrações "entrar com a conta"
- Google (Agenda, Drive, Gmail) e Microsoft (Outlook, OneDrive) em um clique (OAuth).
- Ícones reais por cartão no lugar da letra; estado "Conectado por fulano em …".
- Asaas, Clicksign, D4Sign, JUDIT: leitura e envio de verdade, um por vez.

## Etapa 3 — Diferenciais
1. Leitor de documentos do cliente (Claude do escritório): extrai datas, partes, valores, CID/DIB/DCB e sugere etapa e tarefas. Sempre rascunho para o advogado revisar.
2. Perícia/audiência → checklist do cliente, lembrete pronto no WhatsApp e quesitos a partir da Biblioteca.
3. Acompanhamento do cliente em linha do tempo ("rastreio").
4. Resumo de fim do dia por pessoa.
5. Importação do ClickUp e de planilhas.

## Etapa 4 — Áreas de atuação (modelos prontos por área)
Para cada área: etapas do quadro, campos próprios, checklists de documentos, prazos típicos, modelos na Biblioteca e calculadoras.

| Área | Etapas/campos e ferramentas específicas |
|---|---|
| Criminal | Situação prisional (preso/solto, data da prisão, unidade), alerta de prazos curtos e contagem penal (dias corridos), audiência de custódia, inquérito → denúncia → instrução → sentença → recursos → execução; calculadora de pena, progressão de regime e prescrição; habeas corpus como peça rápida. |
| Cível | Fases do procedimento comum, tutela de urgência, cumprimento de sentença; calculadora de atualização monetária e juros; valor da causa; custas. |
| Família | Pensão (valor, vencimento, atrasos), guarda e convivência (agenda de visitas), divórcio/inventário; calculadora de pensão e de atraso para execução (rito da prisão x penhora); partilha. |
| Consumidor | Reclamação prévia (Consumidor.gov), danos, prazos de vício; modelos de inicial no JEC. |
| Trabalhista | (já existe) verbas rescisórias, audiência una, cálculos. |
| Previdenciário | (já existe) CNIS, DIB/DCB, perícias, exigências do INSS. |
| Tributário/empresarial | Prazos de impugnação, execução fiscal, certidões; agenda de obrigações. |

Ordem sugerida: Etapa 1 → leitor de documentos → Família e Cível → Criminal → demais.

## Decisões de 24/11 (noite)
- Layout do caso: B (abas no topo: Resumo, Documentos/Contratos, Cálculos, Prazos, Histórico), com os números em destaque do D na aba Resumo; modo claro e escuro.
- Subpastas só quando necessário (ex.: um por contrato no Bancário quando houver mais de um), nunca como regra.
- Bancário vira área própria (grupo beneficiário do INSS + grupo bancário geral); Tributário separado do Empresarial.
- Calculadoras por área, aparecendo dentro do caso conforme o tipo; tela geral é só índice.
- Drive: identificador e leitor de documentos com confirmação humana antes de alterar o caso.
- Documento de desmontagem das áreas: https://claude.ai/artifact/3pPABa5rsALpUn5ShdxqHr
