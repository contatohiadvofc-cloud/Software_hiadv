# Auditoria simulada do desenho do HiAdv — 24/11/2026

Simulação de mesa: 20 casos fictícios × 20 variáveis, rodados contra as regras do desenho aprovado (tipos de caso, identificador, "Para avançar", prazos, subpastas, calculadoras). Não é teste do sistema em funcionamento: as telas ainda não existem.

| # | Tipo | Variável testada | Resultado | Faltava no caso |
|---|---|---|---|---|
| 1 | consignado_nao_contratado | 3 contratos em 2 bancos | OK | — |
| 2 | consignado_nao_contratado | extrato fotografado ilegível; cliente analfabeto | LACUNA | extrato_emprestimos, procuracao, contrato_honorarios |
| 3 | revisional_veiculo | busca e apreensão já ajuizada (prazo de 5 dias para purgar a mora) | LACUNA | — |
| 4 | superendividamento | 7 credores; comprovante com nome igual ao de outro cliente | OK | comprovante_renda, doc_pessoal, procuracao |
| 5 | execucao_alimentos | 14 parcelas atrasadas; rito da prisão só nas 3 últimas | OK | — |
| 6 | divorcio_consensual | via cartório; filho menor exige via judicial | OK | procuracao |
| 7 | flagrante | preso numa sexta 23h; custódia em 24 h no fim de semana | LACUNA | procuracao |
| 8 | auxilio_acidente | também tem consignado irregular (caso duplo) | OK | — |
| 9 | bpc | laudo de familiar com mesmo sobrenome | OK | laudo, doc_pessoal, procuracao |
| 10 | despejo | feriado municipal no meio do prazo | LACUNA | — |
| 11 | execucao_fiscal | embargos em 30 dias da garantia; Fazenda com prazo em dobro | LACUNA | — |
| 12 | servidor_ms | 120 dias do MS contados da ciência (decadencial, corridos) | LACUNA | — |
| 13 | verbas_rescisorias | saída há 1 ano e 11 meses (prescrição bienal) | LACUNA | — |
| 14 | consignado_nao_contratado | mesmo extrato enviado 2 vezes (WhatsApp e portal) | OK | — |
| 15 | consignado_nao_contratado | equipe encaminhou extrato de outro cliente para este caso | FALHA | doc_pessoal, procuracao, contrato_honorarios |
| 16 | auxilio_acidente | processo em segredo de justiça (Escavador não traz) | LACUNA | doc_pessoal, procuracao |
| 17 | revisional_veiculo | taxa média do BC do mês ainda não publicada | OK | doc_pessoal, procuracao |
| 18 | execucao_alimentos | pensão em % do salário mínimo; mínimo muda em janeiro | OK | certidao_nascimento, doc_pessoal, procuracao |
| 19 | flagrante | intimação chega pelo DJEN e pelo Escavador (duplicada) | OK | doc_pessoal, procuracao |
| 20 | consignado_nao_contratado | Drive desconectado no meio do caso; Escavador sem créditos | OK | doc_pessoal, procuracao, contrato_honorarios |

## Achados por caso

**1. consignado_nao_contratado** (OK)
- subpastas por contrato: 3 (regra aplicada)

**2. consignado_nao_contratado** (LACUNA)
- 1 documento(s) foram para 'A classificar' (correto: não arquivou errado)
- lacuna: falta campo "cliente analfabeto/não alfabetizado" que muda os requisitos (procuração pública ou a rogo) e vira tese

**3. revisional_veiculo** (LACUNA)
- prazo 'purga' em dias corridos dentro de área com regra de dias úteis: a regra tem de ser por tipo de prazo, não por área

**4. superendividamento** (OK)
- 1 documento(s) foram para 'A classificar' (correto: não arquivou errado)
- subpastas por contrato: 7 (regra aplicada)

**5. execucao_alimentos** (OK)
- débito alimentar: 14 parcelas; separar 3 últimas (prisão) e demais (penhora) — calculadora já prevista
- sigilo reforçado aplicado (família/criminal)

**6. divorcio_consensual** (OK)
- regra de bloqueio: com filho menor/incapaz o sistema deve trocar a via de cartório para judicial (Lei 11.441, salvo exceções locais) — campo obrigatório

**7. flagrante** (LACUNA)
- custódia em 24 h cai no fim de semana: alerta precisa ser em horas e por push, não em dias úteis
- sigilo reforçado aplicado (família/criminal)

**8. auxilio_acidente** (OK)
- cliente com caso previdenciário e bancário: ficha única com os dois casos (previsto)

**9. bpc** (OK)
- 1 documento(s) foram para 'A classificar' (correto: não arquivou errado)

**10. despejo** (LACUNA)
- prazo calculado 2026-12-22 vs correto 2026-12-23: sem cadastro de feriado municipal o sistema adianta 1 dia (seguro), mas precisa de calendário por comarca

**11. execucao_fiscal** (LACUNA)
- regra de prazo precisa distinguir: prazo em dobro é da Fazenda, não do contribuinte; 30 dias dos embargos contados da garantia (evento, não intimação)

**12. servidor_ms** (LACUNA)
- prazo 'ms' em dias corridos dentro de área com regra de dias úteis: a regra tem de ser por tipo de prazo, não por área

**13. verbas_rescisorias** (LACUNA)
- alerta de prescrição bienal em 30 dias: precisa existir alerta de prescrição já na triagem (antes do caso)

**14. consignado_nao_contratado** (OK)
- duplicado: precisa de detecção por conteúdo (hash) para não criar 2 cartões

**15. consignado_nao_contratado** (FALHA)
- RISCO: CPF do extrato ≠ CPF do cliente do caso; o identificador precisa bloquear e avisar, não só sugerir

**16. auxilio_acidente** (LACUNA)
- segredo de justiça: nenhuma fonte traz; caso precisa marcar "acompanhar manualmente" e lembrete semanal

**17. revisional_veiculo** (OK)
- taxa média do BC indisponível: calculadora deve usar o último mês publicado e avisar, nunca estimar

**18. execucao_alimentos** (OK)
- débito alimentar: 5 parcelas; separar 3 últimas (prisão) e demais (penhora) — calculadora já prevista
- pensão em % do salário mínimo: calculadora precisa da tabela histórica do mínimo e recalcular em janeiro

**19. flagrante** (OK)
- mesma intimação de 2 fontes: deduplicar por processo+data+teor e manter as duas fontes no selo

**20. consignado_nao_contratado** (OK)
- subpastas por contrato: 2 (regra aplicada)
- fonte fora: painel de saúde + aviso ao gestor; documentos ficam no HiAdv até o Drive voltar
