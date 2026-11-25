# Decisões de 25/11/2026 — Central, automações e preços

## Planos
- Júnior R$ 119,90 e Pleno R$ 197,90 continuam como estão (sem IA).
- Sênior passa a ser o plano completo: **R$ 524,90** (a aplicar), com Sara (IA), automações, Drive com identificador, controladoria e implantação assistida.
- Indicação: 50% de uma mensalidade no Júnior e no Pleno; **20% de uma mensalidade no Sênior** (a aplicar).
- A Sara roda pela API do Claude (paga por uso, chave só no servidor), com cota mensal por escritório e aviso aos 80%. O plano Max é só para construir o sistema.

## Central (papel code)
- Base: combinação dos layouts 2, 3 e 5 — receita do mês do dia 1 ao último dia, métricas, quadro por situação com barra de saúde de uso, visões Quadro/Cartões/Tabela.
- Ficha abre em janela, com abas: Resumo, Pessoas, Assinatura, Controle, Automações, Histórico.
- Controle: estado clicável por recurso (Incluso, Liberado até, Bloqueado, Fora do plano), motivo obrigatório e registro.

## Automações
- Edição principal: **regra como frase** com partes clicáveis (imagem 1). Alternativa: **fluxo de arrastar** (imagem 2).
- Gestor Master do Sênior também cria e edita automações do próprio escritório.
- Deividy edita as de qualquer escritório e **cria comandos novos do zero** quando não existir nas predefinidas; ao salvar, passam a funcionar (sempre como regra declarativa validada — a IA não gera código).
- Todo campo de data tem as barras fixas: digita-se só os números (dd/mm/aaaa); horário é opcional.
- Toda regra passa por simulação com os casos reais antes de valer; mensagens ao cliente sempre com aprovação humana.

## Catálogo inicial (para simular e liberar)

### Quando (gatilhos)
1. Caso criado
2. Caso mudou de etapa
3. Caso mudou de área
4. Caso parado há X dias na mesma etapa
5. Caso arquivado / reaberto
6. Publicação/intimação recebida (por tipo: audiência, perícia, sentença, despacho, decisão, citação, exigência)
7. Prazo criado
8. Prazo vence em X dias
9. Prazo venceu sem tarefa concluída
10. Audiência marcada / remarcada / cancelada
11. Perícia marcada / remarcada
12. Documento enviado pelo cliente
13. Documento identificado pelo leitor (por tipo: RG, CPF, procuração, contrato, laudo, CNIS, CAT, extrato bancário, comprovante de residência)
14. Documento com CPF diferente do cliente
15. Documento duplicado
16. Documento vencendo validade
17. Checklist "Para avançar" completo
18. Tarefa criada / concluída / atrasada
19. Tarefa reatribuída
20. Atendimento (lead) criado
21. Atendimento sem resposta há X horas
22. Atendimento qualificado / desqualificado
23. Contrato assinado (ZapSign, Clicksign, D4Sign)
24. Contrato enviado e não assinado em X dias
25. Honorário/parcela criada
26. Parcela vence em X dias
27. Parcela atrasada
28. Pagamento confirmado (Asaas)
29. RPV/precatório expedido
30. Alvará expedido
31. Benefício implantado
32. Exigência do INSS recebida
33. Prescrição/decadência próxima (X dias)
34. Cliente acessou o acompanhamento
35. Cliente enviou mensagem
36. Pessoa da equipe entrou / saiu de férias
37. Data fixa (todo dia X, toda segunda etc.)
38. Integração com falha (Escavador, JUDIT, Drive, Asaas)

### Se (condições)
1. Área é X
2. Tipo de caso é X
3. Etapa é X / não é X
4. Benefício é X (previdenciário)
5. Tribunal / vara / comarca é X
6. Rito (JEF, comum, estadual delegada)
7. Responsável é X / não tem responsável
8. Cliente é idoso / analfabeto / tem curador
9. Cliente tem WhatsApp autorizado
10. Prazo é em dias úteis / corridos
11. Prazo é da Fazenda (em dobro)
12. Valor da causa acima/abaixo de X
13. Honorário é fixo / êxito / misto
14. Parcela atrasada há mais de X dias
15. Documento X está faltando
16. Documento X está vencido
17. Checklist da etapa incompleto
18. Caso tem segredo de justiça
19. Caso tem prioridade (idoso, doença grave)
20. Há audiência nos próximos X dias
21. Há perícia nos próximos X dias
22. Publicação contém o termo X
23. Origem do atendimento é X (site, WhatsApp, indicação, anúncio)
24. Plano do escritório inclui o recurso
25. Horário comercial / fora do expediente
26. Dia útil no calendário do tribunal do caso
27. Pessoa responsável está de férias
28. Tarefa semelhante já existe (evita duplicar)
29. Regra já rodou neste caso (limite de execuções)
30. Cota da Sara disponível

### Então (ações)
1. Mover para a etapa X
2. Mover para a área X
3. Atribuir responsável (pessoa fixa ou rodízio por carga)
4. Criar tarefa (para quem, com antecedência, prioridade)
5. Criar prazo com contagem correta
6. Agendar evento na agenda (com Google Agenda)
7. Pedir documento ao cliente (mensagem pronta, com aprovação)
8. Avisar pessoa da equipe
9. Avisar o Gestor Master
10. Avisar o cliente pelo link de acompanhamento (com aprovação)
11. Preparar mensagem de WhatsApp (fica pronta numa tarefa)
12. Enviar contrato para assinatura
13. Criar honorário / parcela
14. Gerar cobrança (Asaas)
15. Marcar item do "Para avançar"
16. Arquivar documento na pasta certa do Drive
17. Renomear documento no padrão aaaa_mm_dd
18. Bloquear documento com CPF divergente
19. Adicionar etiqueta ao caso
20. Registrar andamento interno
21. Esperar X dias e continuar
22. Pausar a regra neste caso
23. Abrir caso relacionado (ex.: cumprimento de sentença)
24. Calcular (prazo, atrasados, RMI) e anexar ao caso
25. Sara: ler o processo e resumir (Sênior)
26. Sara: auditar o caso e listar pendências (Sênior)
27. Sara: buscar jurisprudência com fonte (Sênior)
28. Sara: encontrar casos parecidos no acervo (Sênior)
29. Sara: gerar rascunho de peça para revisão (Sênior)
30. Sara: classificar publicação e sugerir prazo (Sênior)
31. Registrar no histórico com motivo
32. Pedir aprovação humana antes de continuar
