-- HiAdv 18 (26/11/2026): Meu Processo (app do cliente) e mesa do Suporte.
-- O HiAdv gera rascunhos de atualização a partir dos eventos; o Suporte revisa e publica com um clique.
-- O cliente vê só o que foi publicado para ele, pelo link pessoal (portal_links). Nada vai ao cliente sem aprovação.

create table if not exists public.cliente_atualizacoes (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  caso_id uuid,
  processo_id uuid,
  origem text not null check (origem in ('andamento', 'fase', 'pericia', 'audiencia', 'pendencia', 'manual')),
  origem_ref text,
  titulo text not null check (length(titulo) between 2 and 120),
  texto text not null check (length(texto) between 2 and 1500),
  interno text,
  status text not null default 'rascunho' check (status in ('rascunho', 'publicada', 'descartada')),
  criado_em timestamptz not null default now(),
  editado_por text, editado_em timestamptz,
  publicado_por text, publicado_em timestamptz,
  lida_em timestamptz
);
create unique index if not exists cliente_atualizacoes_origem on public.cliente_atualizacoes (escritorio_id, origem, origem_ref) where origem_ref is not null;
create index if not exists cliente_atualizacoes_fila on public.cliente_atualizacoes (escritorio_id, status, criado_em desc);
create index if not exists cliente_atualizacoes_cliente on public.cliente_atualizacoes (cliente_id, status, publicado_em desc);
alter table public.cliente_atualizacoes enable row level security;

create table if not exists public.mp_mensagens (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  autor text not null check (autor in ('cliente', 'equipe', 'sara')),
  autor_email text,
  texto text not null check (length(texto) between 1 and 2000),
  criado_em timestamptz not null default now(),
  lida_cliente_em timestamptz,
  lida_equipe_em timestamptz
);
create index if not exists mp_mensagens_cliente on public.mp_mensagens (cliente_id, criado_em);
alter table public.mp_mensagens enable row level security;
-- sem políticas: tudo passa pelas funções abaixo

-- link pessoal → (escritório, cliente). Mesmas regras do hiadv_portal.
create or replace function public.mp_cliente(p_token text)
returns public.portal_links language plpgsql security definer set search_path = public as $$
declare l public.portal_links;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return null; end if;
  select * into l from public.portal_links where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if l.id is null or l.revogado_em is not null or l.expira_em < now() then return null; end if;
  return l;
end $$;
revoke all on function public.mp_cliente(text) from anon, authenticated, public;

-- andamento do tribunal → texto simples para o cliente (null = não vale avisar)
create or replace function public.mp_traduzir(p_nome text)
returns table (titulo text, texto text) language sql immutable set search_path = public as $$
  select t.titulo, t.texto from (
    select case
      when p_nome ~* 'senten' then 'Saiu a sentença do seu processo'
      when p_nome ~* 'ac[óo]rd[ãa]o|turma recursal|julgamento do recurso' then 'Saiu a decisão do recurso'
      when p_nome ~* 'designad[ao] per[ií]cia|remessa ao perito' then 'A perícia do seu processo foi encaminhada'
      when p_nome ~* 'laudo' then 'O laudo da perícia chegou'
      when p_nome ~* 'audi[êe]ncia' then 'Novidade sobre a audiência'
      when p_nome ~* 'cita[çc][ãa]o' then 'O INSS foi chamado a responder'
      when p_nome ~* 'distribu' then 'Seu processo foi aberto na Justiça'
      when p_nome ~* 'conclus' then 'Seu processo está com o juiz'
      when p_nome ~* 'requisi[çc][ãa]o de pequeno valor|rpv|precat|alvar' then 'Novidade sobre o pagamento'
      when p_nome ~* 'acordo|concilia' then 'Proposta de acordo no seu processo'
      when p_nome ~* 'implanta' then 'Seu benefício está sendo implantado'
      when p_nome ~* 'arquiv|baixa definitiva' then 'Seu processo foi encerrado'
    end,
    case
      when p_nome ~* 'senten' then 'O juiz deu a decisão do seu processo. A equipe está analisando o resultado e vai explicar para você o que muda e quais são os próximos passos.'
      when p_nome ~* 'ac[óo]rd[ãa]o|turma recursal|julgamento do recurso' then 'O recurso do seu processo foi julgado. A equipe está analisando a decisão e vai explicar para você o que ela significa.'
      when p_nome ~* 'designad[ao] per[ií]cia|remessa ao perito' then 'O processo foi enviado ao perito, o médico que vai avaliar o seu caso. Assim que a data for marcada, avisamos aqui com o dia, a hora e o local.'
      when p_nome ~* 'laudo' then 'O perito entregou o laudo da sua avaliação. A equipe está lendo com atenção e, se precisar, vai se manifestar no processo.'
      when p_nome ~* 'audi[êe]ncia' then 'Houve uma movimentação sobre a audiência do seu processo. Se você precisar participar, a equipe vai avisar com antecedência e explicar como vai ser.'
      when p_nome ~* 'cita[çc][ãa]o' then 'O processo foi enviado ao INSS para ele se manifestar. É uma etapa normal e não depende de nada da sua parte agora.'
      when p_nome ~* 'distribu' then 'O seu pedido foi registrado na Justiça e já tem número de processo. A partir de agora, as novidades aparecem aqui.'
      when p_nome ~* 'conclus' then 'O processo foi enviado ao juiz para análise e decisão. Não depende de nada da sua parte agora; avisamos assim que houver novidade.'
      when p_nome ~* 'requisi[çc][ãa]o de pequeno valor|rpv|precat|alvar' then 'Houve um andamento na etapa de pagamento do seu processo. A equipe acompanha e avisa quando o valor estiver disponível.'
      when p_nome ~* 'acordo|concilia' then 'Há uma movimentação sobre acordo no seu processo. Nenhuma decisão é tomada sem conversar com você antes.'
      when p_nome ~* 'implanta' then 'O seu benefício está na fase de implantação pelo INSS. Avisamos assim que o primeiro pagamento estiver previsto.'
      when p_nome ~* 'arquiv|baixa definitiva' then 'O processo foi encerrado e arquivado. Se tiver qualquer dúvida, fale com a equipe por aqui.'
    end
  ) t(titulo, texto) where t.titulo is not null;
$$;

-- gera os rascunhos do escritório (idempotente: não repete o mesmo evento)
create or replace function public.suporte_gerar()
returns json language plpgsql security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio(); n int := 0; k int;
begin
  if not public.is_equipe() or esc is null then return json_build_object('ok', false, 'erro', 'Somente a equipe.'); end if;
  -- andamentos dos processos (últimos 30 dias)
  insert into public.cliente_atualizacoes (escritorio_id, cliente_id, processo_id, origem, origem_ref, titulo, texto, interno)
  select esc, p.cliente_id, p.id, 'andamento', m.id::text, t.titulo, t.texto,
         left(m.nome || coalesce(' — ' || m.complemento, '') || ' (' || to_char(m.data_hora at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') || ')', 500)
    from public.movimentacoes m join public.processos p on p.id = m.processo_id
    cross join lateral public.mp_traduzir(m.nome) t
   where p.escritorio_id = esc and p.cliente_id is not null and m.data_hora > now() - interval '30 days'
  on conflict do nothing;
  get diagnostics k = row_count; n := n + k;
  -- mudança de fase do caso
  insert into public.cliente_atualizacoes (escritorio_id, cliente_id, caso_id, origem, origem_ref, titulo, texto, interno)
  select esc, c.cliente_id, c.id, 'fase', h.id::text, 'Seu caso avançou de etapa',
         'Agora o seu caso está na etapa: ' || public.hiadv_fase_cliente(h.para, coalesce(f.final, false)) || '.', 'Status: ' || coalesce(h.de, '—') || ' → ' || h.para
    from public.casos_historico h join public.casos c on c.id = h.caso_id
    left join public.fluxo_status f on f.area = c.via and f.status = h.para
   where c.escritorio_id = esc and h.evento = 'status' and h.para is not null and h.em > now() - interval '30 days'
     and public.hiadv_fase_cliente(h.para, coalesce(f.final, false)) is distinct from public.hiadv_fase_cliente(coalesce(h.de, ''), false)
  on conflict do nothing;
  get diagnostics k = row_count; n := n + k;
  -- perícia e audiência marcadas (a referência inclui a data: remarcação gera um aviso novo)
  insert into public.cliente_atualizacoes (escritorio_id, cliente_id, caso_id, processo_id, origem, origem_ref, titulo, texto)
  select esc, x.cliente_id, x.caso_id, x.processo_id, 'pericia', x.id::text || '@' || extract(epoch from x.data_hora)::bigint, 'Sua perícia foi marcada',
         'A perícia é no dia ' || to_char(x.data_hora at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') || ', às ' || to_char(x.data_hora at time zone 'America/Sao_Paulo', 'HH24:MI')
         || coalesce(', em ' || nullif(x.local, ''), '') || '. Leve documento com foto e todos os exames e atestados que tiver. A equipe vai orientar você antes.'
    from public.pericias x where x.escritorio_id = esc and x.data_hora > now() and x.cliente_id is not null and x.criado_em > now() - interval '30 days'
  on conflict do nothing;
  get diagnostics k = row_count; n := n + k;
  insert into public.cliente_atualizacoes (escritorio_id, cliente_id, caso_id, processo_id, origem, origem_ref, titulo, texto)
  select esc, x.cliente_id, x.caso_id, x.processo_id, 'audiencia', x.id::text || '@' || extract(epoch from x.data_hora)::bigint, 'Sua audiência foi marcada',
         'A audiência é no dia ' || to_char(x.data_hora at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') || ', às ' || to_char(x.data_hora at time zone 'America/Sao_Paulo', 'HH24:MI')
         || coalesce(', ' || nullif(x.local, ''), '') || '. A equipe vai explicar como vai ser e o que levar.'
    from public.audiencias x where x.escritorio_id = esc and x.data_hora > now() and x.cliente_id is not null and x.criado_em > now() - interval '30 days'
  on conflict do nothing;
  get diagnostics k = row_count; n := n + k;
  -- documento pedido ao cliente
  insert into public.cliente_atualizacoes (escritorio_id, cliente_id, processo_id, origem, origem_ref, titulo, texto)
  select esc, d.cliente_id, d.processo_id, 'pendencia', d.id::text, 'Precisamos de um documento',
         'Para seguir com o seu caso, precisamos de: ' || d.titulo || coalesce('. ' || nullif(d.detalhe, ''), '') || '.'
    from public.pendencias d where d.escritorio_id = esc and d.status = 'aberta' and d.criado_em > now() - interval '30 days'
  on conflict do nothing;
  get diagnostics k = row_count; n := n + k;
  return json_build_object('ok', true, 'novas', n);
end $$;

-- fila da mesa do Suporte, agrupada por cliente
create or replace function public.suporte_fila(p_status text default 'rascunho')
returns json language plpgsql stable security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio();
begin
  if not public.is_equipe() or esc is null then raise exception 'Somente a equipe.'; end if;
  if p_status not in ('rascunho', 'publicada', 'descartada') then raise exception 'Situação inválida.'; end if;
  return coalesce((select json_agg(g order by g->>'ultima' desc) from (
    select json_build_object('clienteId', c.id, 'cliente', c.nome,
      'temAcesso', exists (select 1 from public.portal_links l where l.cliente_id = c.id and l.revogado_em is null and l.expira_em > now()),
      'ultima', max(a.criado_em),
      'itens', json_agg(json_build_object('id', a.id, 'origem', a.origem, 'titulo', a.titulo, 'texto', a.texto, 'interno', a.interno, 'status', a.status,
                 'criadoEm', a.criado_em, 'editadoPor', a.editado_por, 'publicadoEm', a.publicado_em, 'publicadoPor', a.publicado_por, 'lidaEm', a.lida_em)
                 order by a.criado_em desc)) g
      from public.cliente_atualizacoes a join public.clientes c on c.id = a.cliente_id
     where a.escritorio_id = esc and a.status = p_status
       and (p_status = 'rascunho' or a.criado_em > now() - interval '60 days')
     group by c.id, c.nome) x(g)), '[]'::json);
end $$;

create or replace function public.suporte_salvar(p_id uuid, p_titulo text, p_texto text)
returns json language plpgsql security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio(); tit text := btrim(coalesce(p_titulo, '')); tex text := btrim(coalesce(p_texto, ''));
begin
  if not public.is_equipe() then return json_build_object('ok', false, 'erro', 'Somente a equipe.'); end if;
  if length(tit) < 2 or length(tit) > 120 then return json_build_object('ok', false, 'erro', 'O título precisa ter entre 2 e 120 caracteres.'); end if;
  if length(tex) < 2 or length(tex) > 1500 then return json_build_object('ok', false, 'erro', 'O texto precisa ter entre 2 e 1.500 caracteres.'); end if;
  update public.cliente_atualizacoes set titulo = tit, texto = tex, editado_por = lower(auth.jwt() ->> 'email'), editado_em = now()
   where id = p_id and escritorio_id = esc and status = 'rascunho';
  if not found then return json_build_object('ok', false, 'erro', 'Rascunho não encontrado ou já publicado.'); end if;
  return json_build_object('ok', true);
end $$;

create or replace function public.suporte_descartar(p_ids uuid[])
returns json language plpgsql security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio(); n int;
begin
  if not public.is_equipe() then return json_build_object('ok', false, 'erro', 'Somente a equipe.'); end if;
  update public.cliente_atualizacoes set status = 'descartada', editado_por = lower(auth.jwt() ->> 'email'), editado_em = now()
   where id = any(p_ids) and escritorio_id = esc and status = 'rascunho';
  get diagnostics n = row_count;
  return json_build_object('ok', true, 'descartadas', n);
end $$;

-- um clique: publica os rascunhos escolhidos, cada um para o seu cliente
create or replace function public.suporte_publicar(p_ids uuid[])
returns json language plpgsql security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio(); eu text := lower(auth.jwt() ->> 'email'); n int; cl int;
begin
  if not public.is_equipe() then return json_build_object('ok', false, 'erro', 'Somente a equipe.'); end if;
  if coalesce(array_length(p_ids, 1), 0) = 0 then return json_build_object('ok', false, 'erro', 'Escolha o que publicar.'); end if;
  with p as (
    update public.cliente_atualizacoes set status = 'publicada', publicado_por = eu, publicado_em = now()
     where id = any(p_ids) and escritorio_id = esc and status = 'rascunho' returning cliente_id)
  select count(*), count(distinct cliente_id) into n, cl from p;
  insert into public.auditoria (quem, tipo, acao, alvo, escritorio_id) values (eu, 'cliente', 'publicou ' || n || ' atualização(ões) no Meu Processo', cl || ' cliente(s)', esc);
  return json_build_object('ok', true, 'publicadas', n, 'clientes', cl);
end $$;

create or replace function public.suporte_nova(p_cliente uuid, p_titulo text, p_texto text)
returns json language plpgsql security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio(); tit text := btrim(coalesce(p_titulo, '')); tex text := btrim(coalesce(p_texto, '')); nid uuid;
begin
  if not public.is_equipe() then return json_build_object('ok', false, 'erro', 'Somente a equipe.'); end if;
  if not exists (select 1 from public.clientes where id = p_cliente and escritorio_id = esc) then return json_build_object('ok', false, 'erro', 'Cliente não encontrado.'); end if;
  if length(tit) < 2 or length(tit) > 120 then return json_build_object('ok', false, 'erro', 'O título precisa ter entre 2 e 120 caracteres.'); end if;
  if length(tex) < 2 or length(tex) > 1500 then return json_build_object('ok', false, 'erro', 'O texto precisa ter entre 2 e 1.500 caracteres.'); end if;
  insert into public.cliente_atualizacoes (escritorio_id, cliente_id, origem, titulo, texto, editado_por, editado_em)
  values (esc, p_cliente, 'manual', tit, tex, lower(auth.jwt() ->> 'email'), now()) returning id into nid;
  return json_build_object('ok', true, 'id', nid);
end $$;

-- conversas dos clientes (lado da equipe)
create or replace function public.suporte_conversas()
returns json language plpgsql stable security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio();
begin
  if not public.is_equipe() or esc is null then raise exception 'Somente a equipe.'; end if;
  return coalesce((select json_agg(x order by x.ultima_em desc) from (
    select c.id cliente_id, c.nome, max(m.criado_em) ultima_em,
           (array_agg(m.texto order by m.criado_em desc))[1] ultima,
           count(*) filter (where m.autor = 'cliente' and m.lida_equipe_em is null) nao_lidas
      from public.mp_mensagens m join public.clientes c on c.id = m.cliente_id
     where m.escritorio_id = esc group by c.id, c.nome) x), '[]'::json);
end $$;

create or replace function public.suporte_mensagens(p_cliente uuid)
returns json language plpgsql security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio();
begin
  if not public.is_equipe() or esc is null then raise exception 'Somente a equipe.'; end if;
  update public.mp_mensagens set lida_equipe_em = now() where cliente_id = p_cliente and escritorio_id = esc and autor = 'cliente' and lida_equipe_em is null;
  return coalesce((select json_agg(json_build_object('id', m.id, 'autor', m.autor, 'autorEmail', m.autor_email, 'texto', m.texto, 'em', m.criado_em, 'lidaCliente', m.lida_cliente_em) order by m.criado_em)
    from public.mp_mensagens m where m.cliente_id = p_cliente and m.escritorio_id = esc), '[]'::json);
end $$;

create or replace function public.suporte_responder(p_cliente uuid, p_texto text)
returns json language plpgsql security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio(); tex text := btrim(coalesce(p_texto, ''));
begin
  if not public.is_equipe() then return json_build_object('ok', false, 'erro', 'Somente a equipe.'); end if;
  if not exists (select 1 from public.clientes where id = p_cliente and escritorio_id = esc) then return json_build_object('ok', false, 'erro', 'Cliente não encontrado.'); end if;
  if length(tex) < 1 or length(tex) > 2000 then return json_build_object('ok', false, 'erro', 'A mensagem precisa ter até 2.000 caracteres.'); end if;
  insert into public.mp_mensagens (escritorio_id, cliente_id, autor, autor_email, texto) values (esc, p_cliente, 'equipe', lower(auth.jwt() ->> 'email'), tex);
  return json_build_object('ok', true);
end $$;

-- lado do cliente: tudo pelo link pessoal
create or replace function public.mp_inicio(p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare l public.portal_links := public.mp_cliente(p_token); c public.clientes; e public.escritorios;
begin
  if l.id is null then
    perform public.limitar('mp_token', 30, interval '1 hour');
    return json_build_object('ok', false);
  end if;
  update public.portal_links set acessos = acessos + 1, ultimo_acesso = now() where id = l.id;
  select * into c from public.clientes where id = l.cliente_id;
  select * into e from public.escritorios where id = l.escritorio_id;
  return json_build_object('ok', true,
    'escritorio', json_build_object('nome', e.nome, 'whatsapp', e.whatsapp, 'cidade', e.cidade),
    'cliente', split_part(c.nome, ' ', 1),
    'casos', coalesce((select json_agg(json_build_object('area', coalesce(a.nome, k.via), 'fase', public.hiadv_fase_cliente(k.status, f.final),
                         'etapa', f.ordem, 'etapas', (select count(*) from public.fluxo_status z where z.area = k.via and not z.final) + 1,
                         'desde', (k.entrada_status_em at time zone 'America/Sao_Paulo')::date, 'concluido', f.final) order by f.final, k.atualizado_em desc)
                        from public.casos k join public.fluxo_status f on f.area = k.via and f.status = k.status
                        left join public.escritorio_areas a on a.escritorio_id = k.escritorio_id and a.area = k.via
                       where k.cliente_id = c.id), '[]'::json),
    'compromissos', coalesce((select json_agg(x order by x.quando) from (
        select 'Perícia' tipo, p.data_hora quando, p.local from public.pericias p where p.cliente_id = c.id and p.data_hora >= now()
        union all
        select 'Audiência', a.data_hora, a.local from public.audiencias a where a.cliente_id = c.id and a.data_hora >= now()) x), '[]'::json),
    'atualizacoes', coalesce((select json_agg(json_build_object('id', u.id, 'titulo', u.titulo, 'texto', u.texto, 'em', u.publicado_em, 'lida', u.lida_em is not null) order by u.publicado_em desc)
                     from (select * from public.cliente_atualizacoes where cliente_id = c.id and status = 'publicada' order by publicado_em desc limit 60) u), '[]'::json),
    'pendencias', coalesce((select json_agg(json_build_object('id', d.id, 'titulo', d.titulo, 'detalhe', d.detalhe, 'status', d.status, 'motivo', d.motivo) order by d.criado_em desc)
                     from public.pendencias d where d.cliente_id = c.id and d.status in ('aberta', 'reenviar', 'enviada')), '[]'::json),
    'naoLidas', (select count(*) from public.mp_mensagens m where m.cliente_id = c.id and m.autor <> 'cliente' and m.lida_cliente_em is null),
    'expiraEm', l.expira_em);
end $$;

create or replace function public.mp_lida(p_token text, p_ids uuid[])
returns json language plpgsql security definer set search_path = public as $$
declare l public.portal_links := public.mp_cliente(p_token);
begin
  if l.id is null then return json_build_object('ok', false); end if;
  update public.cliente_atualizacoes set lida_em = now() where cliente_id = l.cliente_id and id = any(p_ids) and status = 'publicada' and lida_em is null;
  return json_build_object('ok', true);
end $$;

create or replace function public.mp_mensagens_ler(p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare l public.portal_links := public.mp_cliente(p_token);
begin
  if l.id is null then return json_build_object('ok', false); end if;
  update public.mp_mensagens set lida_cliente_em = now() where cliente_id = l.cliente_id and autor <> 'cliente' and lida_cliente_em is null;
  return json_build_object('ok', true, 'mensagens', coalesce((select json_agg(json_build_object('id', m.id, 'autor', m.autor, 'texto', m.texto, 'em', m.criado_em) order by m.criado_em)
    from (select * from public.mp_mensagens where cliente_id = l.cliente_id order by criado_em desc limit 200) m), '[]'::json));
end $$;

create or replace function public.mp_enviar(p_token text, p_texto text)
returns json language plpgsql security definer set search_path = public as $$
declare l public.portal_links := public.mp_cliente(p_token); tex text := btrim(coalesce(p_texto, ''));
begin
  if l.id is null then return json_build_object('ok', false, 'erro', 'Este link não está mais valendo.'); end if;
  if length(tex) < 1 or length(tex) > 2000 then return json_build_object('ok', false, 'erro', 'A mensagem precisa ter até 2.000 caracteres.'); end if;
  if not public.limitar('mp_enviar:' || l.cliente_id, 40, interval '1 hour') then return json_build_object('ok', false, 'erro', 'Muitas mensagens seguidas. Aguarde um pouco.'); end if;
  insert into public.mp_mensagens (escritorio_id, cliente_id, autor, texto) values (l.escritorio_id, l.cliente_id, 'cliente', tex);
  return json_build_object('ok', true);
end $$;

revoke all on function public.mp_traduzir(text) from anon, public;
revoke all on function public.suporte_gerar(), public.suporte_fila(text), public.suporte_salvar(uuid, text, text), public.suporte_descartar(uuid[]),
  public.suporte_publicar(uuid[]), public.suporte_nova(uuid, text, text), public.suporte_conversas(), public.suporte_mensagens(uuid), public.suporte_responder(uuid, text) from anon, public;
grant execute on function public.suporte_gerar(), public.suporte_fila(text), public.suporte_salvar(uuid, text, text), public.suporte_descartar(uuid[]),
  public.suporte_publicar(uuid[]), public.suporte_nova(uuid, text, text), public.suporte_conversas(), public.suporte_mensagens(uuid), public.suporte_responder(uuid, text) to authenticated;
grant execute on function public.mp_inicio(text), public.mp_lida(text, uuid[]), public.mp_mensagens_ler(text), public.mp_enviar(text, text) to anon, authenticated;
