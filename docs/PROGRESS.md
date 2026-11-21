# HiAdv 2 · Progresso

Autoria: Deividy e Felipe Lanhi. Documento de projeto: `docs/2026-11-20-hiadv-v2-design.md`. Plano da Fase 0: `docs/2026-11-20-hiadv2-fase0.md`.

## Fase 0 (20/11/2026, noite)

- [x] Task 1 · Base: Vite + React + TypeScript (strict), validação de ambiente (recusa chave secreta), workflow do GitHub Pages, CNAME `hiadv.com.br`.
- [x] Task 2 · Design system (direção A · Registro, escolhida por mim na ausência dos gestores; trocar = editar `src/design/tokens.css`), componentes e catálogo em `/catalogo` (temas claro e escuro, sem violação séria de acessibilidade).
- [x] Task 3 · Login por e-mail e senha, sessão, sessão expirada volta ao login e retorna à tela.
- [~] Task 4 · Áreas por escritório: SQL pronto (`lanhi-sistema/supabase/hiadv2-areas-por-escritorio.sql`). **Aplicação pendente**: o Supabase pediu confirmação e não havia ninguém para responder. Até lá o app mostra "Seu escritório ainda não tem áreas ativas…".
- [x] Task 5 · Casca: barra lateral só com as áreas do escritório, troca de escritório (papel Code), barra inferior e tela de Áreas no celular.
- [x] Task 6 · Busca global (Ctrl+K e "/"), mínimo de 2 letras, 250 ms, setas e Enter.
- [x] Task 7 · Seu dia: atrasados, hoje, próximos 7 dias e sem data, no fuso de Brasília; erro com "Tentar de novo".
- [x] Task 8 · PWA (manifesto, ícones novos, service worker sem guardar dados do escritório). **Publicação pendente**: falta acesso ao repositório `contatohiadvofc-cloud/Software_hiadv`.
- [x] Modo demonstração (`?demo`, senha `demo`) e prévia publicada como artifact com dados fictícios.

Testes: 12 de lógica (Vitest) e 25 de tela no computador e no celular (Playwright), todos passando.

## Fase 1 (começo, 20/11/2026)

- [x] Quadro de casos por área com as etapas do banco (`fluxo_status` + `casos_quadro`): arrastar e soltar no computador, "Mover para…" em todo cartão (teclado e celular), etapas de encerramento escondidas por padrão, alerta de caso parado há 15 dias ou mais, checklist no cartão, visão em lista.
- [x] Mudança de etapa pelo `caso_status` (fica no histórico do caso); etapa de encerramento pede confirmação e, quando a etapa exige, motivo obrigatório; se o servidor recusar, o cartão volta e o motivo aparece.
- [x] Ficha do caso (painel lateral): campos próprios da área editáveis, checklist e histórico. Campos trabalhistas aplicados no teste e no oficial (21/11).
- [x] Campos marcados "no cartão" aparecem no quadro (lidos de casos.campos à parte).
- [x] Visual: toques de verde-escuro; quadro no celular com abas de etapa (uma por vez).
- [x] Tarefas: minhas / equipe / por pessoa, nova tarefa, concluir com desfazer (tarefa_criar, tarefa_atualizar).
- [x] Clientes: lista com filtro e página do cliente (casos, processos, tarefas); busca abre o cliente.
- [x] Agenda: perícias e audiências dos próximos 30 dias por dia, com filtro.
- [x] Ficha: dados do benefício nas áreas previdenciárias (caso_beneficio_salvar) e checklist marcável com data (caso_gate).
- [ ] caso_beneficio_salvar: aplicado no TESTE; falta aplicar no OFICIAL (aguarda OK do Felipe).
- [ ] Documentos, publicações virando tarefa, novo cliente/novo caso.

Testes: 18 de lógica e 33 de tela, todos passando.

## Para os gestores aprovarem / fazerem

1. Aceitar o convite do repositório com a conta do GitHub ligada ao Claude (comerciallanhiadv-ship-it), ou instalar o app do Claude no GitHub da conta contatohiadvofc-cloud.
2. Aprovar a migração de áreas por escritório (teste e depois oficial).
3. Depois do primeiro push: em Settings › Pages, origem "GitHub Actions" (faço por aqui se a permissão permitir).
4. No Registro.br, para hiadv.com.br: registros A 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 e CNAME `www` → `contatohiadvofc-cloud.github.io`.
5. Confirmar ou trocar a direção visual (A, B ou C).

## Próximo: Fase 1

Quadro, lista e ficha do caso por área; área trabalhista completa; clientes; tarefas, prazos e agenda; documentos e checklist; publicações virando tarefa.
