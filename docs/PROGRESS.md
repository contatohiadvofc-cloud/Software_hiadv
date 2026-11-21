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
- [x] caso_beneficio_salvar aplicado no oficial (OK do Felipe em 21/11).
- [x] Relato do cliente na ficha; Biblioteca (modelos, jurisprudência, referências, teses, com arquivo); Configurações do escritório (Integrações Claude/ZapSign/Drive com chave no cofre; Agentes com etapas e modelo).
- [x] hiadv2-biblioteca-integracoes-agentes.sql e hiadv2-agentes-internos.sql aplicados no OFICIAL (OK do Felipe em 21/11).
- [x] Núcleo · Andamento na ficha: registrar protocolo (número e data; no judicial, CNJ que liga o processo), registrar exigência (tarefa com prazo interno e fatal, folga em dias úteis descontando feriados) e mudar de via (caso novo ligado ao de origem, com dados e relato). SQL `hiadv2-nucleo-marcos-exigencia-via.sql` aplicado no TESTE e no OFICIAL (OK do Felipe em 21/11).
- [x] Desempenho (PageSpeed, celular): Preact no lugar do React no navegador, páginas carregadas sob demanda, login já pintado no HTML, CSS embutido, só a fonte latina, Supabase baixado só quando a pessoa interage ou já tem sessão, modo offline registrado depois da abertura. Lighthouse local (celular, simulado): 99 desempenho, 100 acessibilidade, 100 boas práticas, 100 SEO.
- [x] Núcleo · "Precisa de atenção" no Seu dia (sem custo, calculado na hora): prazo fatal chegando ou interno vencido (A14), escalonamento ao gestor, que vê os da equipe (A15), caso parado na mesma etapa (A17) e perícia ou audiência chegando sem preparação, com tarefa de roteiro em um clique (A19–A22). Regras por escritório em Configurações. SQL `hiadv2-nucleo-atencao.sql` aplicado no TESTE e no OFICIAL (OK do Felipe em 21/11).
- [x] Núcleo · possíveis duplicados em Clientes, só para o gestor (mesmo CPF, telefone ou nome; nada é juntado sozinho) (A04); distribuição por carga em Configurações, com rodízio por área para casos novos sem responsável (A29); fila de falhas das automações com "Resolvida" (A30). SQL `hiadv2-nucleo-duplicidade-rodizio-falhas.sql` aplicado no TESTE e no OFICIAL (OK do Felipe em 21/11).
- [x] Login da equipe igual ao app antigo: confere a senha pessoal no servidor da equipe (função Consutar_processos), cria a conta de acesso quando falta, e oferece "Primeiro acesso ou esqueci a senha" (e-mail + senha mestra + senha pessoal, com regras). Sem isso, quem nunca entrou no app antigo não conseguia entrar.
- [x] Identidade vinho (escolha do Felipe em 21/11): claro = Vinho #7a1f33, Papel #f8f5f2, Grafite #221b1e; escuro = Noite #170b10, Vinho claro #d4677b, Linho #f2e8e5. Vinho só para marca, botões e item escolhido; alertas em vermelho-alaranjado (#b43a0a / #ff8a50) e avisos em âmbar, para não confundir. Ícone "Hi" (perna direita do H vira um i com ponto rosé). Fontes: Inter Tight no texto e Source Serif 4 só no nome HiAdv e nos títulos de página. Frase: "Seus processos, prazos e peças sob controle." Ícones e prévia do link gerados por `node scripts/marca.mjs`.
- [x] Biblioteca: "Roteiros prontos do HiAdv" (pacote Previdenciário com 14 roteiros e Trabalhista com 8), só para o gestor; adicionar copia para o escritório, sem repetir. Texto próprio e genérico, gerado por `supabase/pacotes/roteiros.py`. Aplicado no TESTE e no OFICIAL (OK do Felipe em 21/11).
- [x] Limpeza dos apps antigos no site da Lanhi (21/11): /equipe/, colaborador.html e /hiadv/ antigo levam para hiadv.com.br; os service workers antigos limpam o aparelho e se desligam; botões do site e de app.html apontam para o HiAdv. Pastas js/css antigas mantidas por enquanto (sem links), por decisão do Felipe.
- [x] Cadastro (21/11): novo cliente (CPF conferido; CPF já cadastrado abre o existente), novo caso pelo cliente ou pelo quadro (cliente novo na hora, benefício nas áreas previdenciárias, responsável, relato) e importação de clientes por planilha colada ou CSV, sempre conferida antes de gravar (só gestor). SQL `hiadv2-cadastro.sql` aplicado no TESTE e no OFICIAL (OK do Felipe em 21/11).
- [x] Login no oficial (21/11): a senha era aceita, mas o banco recusava a leitura do papel e do escritório (e do telefone dos clientes), e o app voltava à entrada. Liberada só a leitura dessas colunas (`hiadv2-colunas-leitura.sql`, TESTE e OFICIAL com OK do Felipe).
- [x] Senha visível enquanto digita ("Mostrar"/"Ocultar") em todos os campos de senha.
- [x] Desbloqueio pelo celular (21/11): depois do primeiro login no celular, o HiAdv oferece abrir das próximas vezes com a digital, o rosto ou a senha de tela do aparelho (trava local por WebAuthn; nada de biometria sai do aparelho). Liga e desliga em Configurações › Este aparelho, que agora aparece para todos.
- [ ] Vitrine em hiadv.com.br (decisão do Felipe em 21/11): quem não está logado vê a apresentação; quem está logado vai direto ao sistema; botões "Quero o HiAdv para o meu escritório" e "Quero o HiAdv como advogado autônomo" abrem o WhatsApp comercial 49 99973-0572 com mensagem pronta; e-mail hiadvofc@gmail.com; sem preços por enquanto; vídeos curtos de demonstração com dados fictícios (um por área) na vitrine e numa área "Aprenda a usar" no sistema. Fazer depois de terminar o sistema e limpar os restos dos apps antigos.
- [ ] Próximos: agentes com IA (chave do escritório); ZapSign em um clique; Drive.
- [ ] Execução dos agentes (função no servidor chamando a Claude com a chave do escritório) — depende de chave cadastrada.
- [ ] ZapSign: envio do kit com um clique (função no servidor + webhook de assinatura).
- [ ] Google Drive: pasta compartilhada, mapa de nomes, relacionar pasta ao cliente com aprovação, importar só ativos com aprovação.
- [ ] Documentos, publicações virando tarefa, novo cliente/novo caso.

Testes: 73 de lógica e 130 de tela, todos passando.

## Para os gestores aprovarem / fazerem

1. Aceitar o convite do repositório com a conta do GitHub ligada ao Claude (comerciallanhiadv-ship-it), ou instalar o app do Claude no GitHub da conta contatohiadvofc-cloud.
2. Aprovar a migração de áreas por escritório (teste e depois oficial).
3. Depois do primeiro push: em Settings › Pages, origem "GitHub Actions" (faço por aqui se a permissão permitir).
4. No Registro.br, para hiadv.com.br: registros A 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 e CNAME `www` → `contatohiadvofc-cloud.github.io`.
5. Confirmar ou trocar a direção visual (A, B ou C).

## Próximo: Fase 1

Quadro, lista e ficha do caso por área; área trabalhista completa; clientes; tarefas, prazos e agenda; documentos e checklist; publicações virando tarefa.
