-- HiAdv 9: regras de conversas e comunidades (decididas em 25/11/2026)
-- 1) Apagar: quem enviou apaga a qualquer tempo (fica o aviso); Gestor Master apaga na conversa geral e nos grupos do próprio escritório (diretas seguem privadas).
-- 2) Comunidades: ritmo de envio, bloqueio de links externos e aprovação de entrada por escritório.

create or replace function public.chat_cancelar_envio(p_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare m public.chat_mensagens; c public.chat_conversas; eu text := lower(auth.jwt() ->> 'email'); gestor boolean;
begin
  select * into m from public.chat_mensagens where id = p_id for update;
  if m.id is null or m.apagado_em is not null or not public.chat_participo(m.conversa_id) then raise exception 'Mensagem não encontrada.'; end if;
  select * into c from public.chat_conversas where id = m.conversa_id;
  gestor := c.tipo <> 'direta' and c.escritorio_id = public.meu_escritorio()
            and exists (select 1 from public.equipe where email = eu and papel in ('master', 'code'));
  if m.autor <> eu and not gestor then raise exception 'Só quem enviou (ou o Gestor Master, na conversa geral e nos grupos) pode apagar.'; end if;
  update public.chat_mensagens set texto = null, anexo = null, reacoes = '{}'::jsonb, apagado_em = now() where id = p_id;
  if m.autor <> eu then perform public.auditar('chat', 'mensagem apagada pelo gestor (autor: ' || m.autor || ')', p_id::text); end if;
  return json_build_object('ok', true, 'id', p_id, 'conversa_id', m.conversa_id);
end $$;

alter table public.comunidades add column if not exists intervalo_seg int not null default 0 check (intervalo_seg between 0 and 3600);
alter table public.comunidades add column if not exists links boolean not null default true;
alter table public.comunidades add column if not exists aprovacao boolean not null default false;

create table if not exists public.comunidade_entradas (
  comunidade_id uuid not null references public.comunidades(id) on delete cascade,
  escritorio_id uuid not null,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  pedido_por text, pedido_em timestamptz not null default now(),
  decidido_por text, decidido_em timestamptz,
  primary key (comunidade_id, escritorio_id)
);
alter table public.comunidade_entradas enable row level security;
revoke all on public.comunidade_entradas from anon, authenticated;

-- elegível = pode ver a comunidade pelos critérios de papel e área; participa = elegível e (sem aprovação ou escritório aprovado)
create or replace function public.comunidade_elegivel(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.hiadv_sou_code() or exists (
    select 1 from public.comunidades c, public.equipe e
     where c.id = p_id and c.ativa and public.is_equipe()
       and e.email = lower(auth.jwt() ->> 'email')
       and (not c.so_masters or e.papel in ('master', 'code'))
       and (c.areas is null or exists (select 1 from public.escritorio_areas a
             where a.escritorio_id = e.escritorio_id and a.ativa and a.area = any (c.areas))));
$$;

create or replace function public.comunidade_participo(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.hiadv_sou_code() or (public.comunidade_elegivel(p_id) and exists (
    select 1 from public.comunidades c where c.id = p_id and (not c.aprovacao or exists (
      select 1 from public.comunidade_entradas x where x.comunidade_id = c.id and x.escritorio_id = public.meu_escritorio() and x.status = 'aprovado'))));
$$;

create or replace function public.comunidade_lista()
returns json language plpgsql stable security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); mod boolean := public.hiadv_sou_code(); r json;
begin
  if not public.is_equipe() then return '[]'::json; end if;
  select coalesce(json_agg(x order by x.ordem, x.nome), '[]'::json) into r from (
    select c.id, c.nome, c.descricao, c.areas, c.so_masters, c.quem_posta, c.anexos, c.audios, c.ativa, c.ordem, c.ultima_em,
      c.intervalo_seg, c.links, c.aprovacao,
      public.comunidade_participo(c.id) as participo,
      (select x.status from public.comunidade_entradas x where x.comunidade_id = c.id and x.escritorio_id = public.meu_escritorio()) as entrada,
      (select count(*) from public.comunidade_entradas x where x.comunidade_id = c.id and x.status = 'pendente' and mod) as pedidos,
      case when public.comunidade_participo(c.id) then (select json_build_object('autor_nome', u.autor_nome, 'texto', u.texto, 'anexo', u.anexo, 'criado_em', u.criado_em)
         from public.comunidade_mensagens u where u.comunidade_id = c.id and u.apagado_em is null order by u.criado_em desc limit 1) end as ultima,
      case when public.comunidade_participo(c.id) then (select count(*) from public.comunidade_mensagens u where u.comunidade_id = c.id and u.autor <> eu and u.apagado_em is null
         and u.criado_em > coalesce((select lido_em from public.comunidade_leituras l where l.comunidade_id = c.id and l.email = eu), now() - interval '7 days')) else 0 end as nao_lidas,
      public.comunidade_participo(c.id) and (mod or c.quem_posta = 'todos') and not exists (select 1 from public.comunidade_silenciados s where s.comunidade_id = c.id and s.email = eu and (s.ate is null or s.ate > now())) as pode_postar,
      mod as moderador
    from public.comunidades c
    where (c.ativa or mod) and public.comunidade_elegivel(c.id)
  ) x;
  return r;
end $$;

create or replace function public.comunidade_enviar(p_id uuid, p_texto text, p_anexo jsonb default null, p_resposta uuid default null)
returns json language plpgsql security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); c public.comunidades; e public.equipe; esc text; m public.comunidade_mensagens;
        audio boolean := coalesce(p_anexo ->> 'tipo', '') like 'audio/%'; mod boolean := public.hiadv_sou_code(); ultimo timestamptz;
begin
  select * into c from public.comunidades where id = p_id;
  if c.id is null or not public.comunidade_participo(p_id) then return json_build_object('ok', false, 'erro', 'Comunidade não encontrada.'); end if;
  if not c.ativa and not mod then return json_build_object('ok', false, 'erro', 'Esta comunidade está pausada.'); end if;
  if c.quem_posta = 'moderadores' and not mod then return json_build_object('ok', false, 'erro', 'Nesta comunidade só a moderação publica.'); end if;
  if exists (select 1 from public.comunidade_silenciados s where s.comunidade_id = p_id and s.email = eu and (s.ate is null or s.ate > now())) then
    return json_build_object('ok', false, 'erro', 'Seu envio nesta comunidade está pausado pela moderação.'); end if;
  if coalesce(btrim(p_texto), '') = '' and p_anexo is null then return json_build_object('ok', false, 'erro', 'Mensagem vazia.'); end if;
  if not mod and not c.links and p_texto ~* '(https?://|www\.|[a-z0-9-]+\.(com|br|net|org|io|me|app|site|link|ly)(/|\s|$))' then
    return json_build_object('ok', false, 'erro', 'Esta comunidade não aceita links externos.'); end if;
  if not mod and c.intervalo_seg > 0 then
    select max(criado_em) into ultimo from public.comunidade_mensagens where comunidade_id = p_id and autor = eu;
    if ultimo is not null and ultimo > now() - make_interval(secs => c.intervalo_seg) then
      return json_build_object('ok', false, 'erro', 'Aguarde ' || ceil(extract(epoch from (ultimo + make_interval(secs => c.intervalo_seg) - now())))::int || ' s para enviar de novo nesta comunidade.'); end if;
  end if;
  if p_anexo is not null then
    if coalesce(p_anexo ->> 'path', '') not like p_id::text || '/%' then return json_build_object('ok', false, 'erro', 'Anexo inválido.'); end if;
    if audio and not c.audios then return json_build_object('ok', false, 'erro', 'Esta comunidade não aceita áudios.'); end if;
    if not audio and not c.anexos then return json_build_object('ok', false, 'erro', 'Esta comunidade não aceita arquivos.'); end if;
  end if;
  select * into e from public.equipe where email = eu;
  select nome into esc from public.escritorios where id = e.escritorio_id;
  insert into public.comunidade_mensagens (comunidade_id, autor, autor_nome, autor_esc, texto, anexo, resposta_a)
  values (p_id, eu, coalesce(nullif(e.nome, ''), eu), esc, nullif(btrim(p_texto), ''), p_anexo, p_resposta) returning * into m;
  update public.comunidades set ultima_em = m.criado_em where id = p_id;
  insert into public.comunidade_leituras (comunidade_id, email, lido_em) values (p_id, eu, now())
  on conflict (comunidade_id, email) do update set lido_em = now();
  return json_build_object('ok', true, 'id', m.id);
end $$;

create or replace function public.comunidade_salvar(p jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare cid uuid := nullif(p ->> 'id', '')::uuid; nome text := btrim(coalesce(p ->> 'nome', ''));
        v_areas text[] := case when jsonb_typeof(p -> 'areas') = 'array' and jsonb_array_length(p -> 'areas') > 0 then array(select jsonb_array_elements_text(p -> 'areas')) end;
begin
  if not public.hiadv_sou_code() then return json_build_object('ok', false, 'erro', 'Só a moderação do HiAdv cria e ajusta comunidades.'); end if;
  if length(nome) < 2 or length(nome) > 60 then return json_build_object('ok', false, 'erro', 'O nome precisa ter entre 2 e 60 caracteres.'); end if;
  if coalesce(p ->> 'quem_posta', 'todos') not in ('todos', 'moderadores') then return json_build_object('ok', false, 'erro', 'Escolha quem pode publicar.'); end if;
  if coalesce((p ->> 'intervalo_seg')::int, 0) not between 0 and 3600 then return json_build_object('ok', false, 'erro', 'O intervalo entre mensagens vai de 0 a 3600 segundos.'); end if;
  if cid is null then
    insert into public.comunidades (nome, descricao, areas, so_masters, quem_posta, anexos, audios, ativa, ordem, criado_por, intervalo_seg, links, aprovacao)
    values (nome, nullif(btrim(p ->> 'descricao'), ''), v_areas, coalesce((p ->> 'so_masters')::boolean, true), coalesce(p ->> 'quem_posta', 'todos'),
            coalesce((p ->> 'anexos')::boolean, true), coalesce((p ->> 'audios')::boolean, true), coalesce((p ->> 'ativa')::boolean, true),
            coalesce((p ->> 'ordem')::int, 0), lower(auth.jwt() ->> 'email'),
            coalesce((p ->> 'intervalo_seg')::int, 0), coalesce((p ->> 'links')::boolean, true), coalesce((p ->> 'aprovacao')::boolean, false)) returning id into cid;
  else
    update public.comunidades set nome = btrim(p ->> 'nome'), descricao = nullif(btrim(p ->> 'descricao'), ''), areas = v_areas,
      so_masters = coalesce((p ->> 'so_masters')::boolean, so_masters), quem_posta = coalesce(p ->> 'quem_posta', quem_posta),
      anexos = coalesce((p ->> 'anexos')::boolean, anexos), audios = coalesce((p ->> 'audios')::boolean, audios),
      ativa = coalesce((p ->> 'ativa')::boolean, ativa), ordem = coalesce((p ->> 'ordem')::int, ordem),
      intervalo_seg = coalesce((p ->> 'intervalo_seg')::int, intervalo_seg), links = coalesce((p ->> 'links')::boolean, links),
      aprovacao = coalesce((p ->> 'aprovacao')::boolean, aprovacao) where id = cid;
  end if;
  perform public.auditar('comunidade', 'comunidade salva: ' || nome, cid::text);
  return json_build_object('ok', true, 'id', cid);
end $$;

-- Pedido de entrada: feito por Gestor Master em nome do escritório
create or replace function public.comunidade_pedir_entrada(p_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); esc uuid := public.meu_escritorio();
begin
  if not public.comunidade_elegivel(p_id) then return json_build_object('ok', false, 'erro', 'Comunidade não encontrada.'); end if;
  if not exists (select 1 from public.equipe where email = eu and papel in ('master', 'code')) then
    return json_build_object('ok', false, 'erro', 'O pedido de entrada é feito por um Gestor Master do escritório.'); end if;
  insert into public.comunidade_entradas (comunidade_id, escritorio_id, status, pedido_por) values (p_id, esc, 'pendente', eu)
  on conflict (comunidade_id, escritorio_id) do update set status = case when comunidade_entradas.status = 'aprovado' then 'aprovado' else 'pendente' end, pedido_por = eu, pedido_em = now();
  return json_build_object('ok', true);
end $$;

create or replace function public.comunidade_pedidos(p_id uuid)
returns json language sql stable security definer set search_path = public as $$
  select case when public.hiadv_sou_code() then coalesce((select json_agg(json_build_object('escritorio_id', x.escritorio_id, 'escritorio', s.nome,
    'status', x.status, 'pedido_por', x.pedido_por, 'pedido_em', x.pedido_em) order by x.status <> 'pendente', x.pedido_em desc)
    from public.comunidade_entradas x left join public.escritorios s on s.id = x.escritorio_id where x.comunidade_id = p_id), '[]'::json) else '[]'::json end;
$$;

create or replace function public.comunidade_decidir_entrada(p_id uuid, p_escritorio uuid, p_aprovar boolean)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.hiadv_sou_code() then return json_build_object('ok', false, 'erro', 'Só a moderação do HiAdv decide entradas.'); end if;
  insert into public.comunidade_entradas (comunidade_id, escritorio_id, status, decidido_por, decidido_em)
  values (p_id, p_escritorio, case when p_aprovar then 'aprovado' else 'recusado' end, lower(auth.jwt() ->> 'email'), now())
  on conflict (comunidade_id, escritorio_id) do update set status = excluded.status, decidido_por = excluded.decidido_por, decidido_em = now();
  perform public.auditar('comunidade', case when p_aprovar then 'entrada aprovada' else 'entrada recusada' end, p_id::text || ':' || p_escritorio::text);
  return json_build_object('ok', true);
end $$;

revoke all on function public.comunidade_elegivel(uuid), public.comunidade_pedir_entrada(uuid), public.comunidade_pedidos(uuid), public.comunidade_decidir_entrada(uuid, uuid, boolean) from public, anon;
grant execute on function public.comunidade_elegivel(uuid), public.comunidade_pedir_entrada(uuid), public.comunidade_pedidos(uuid), public.comunidade_decidir_entrada(uuid, uuid, boolean) to authenticated;

-- Avisos e comunidades amplas: ritmo de 30 s e sem links por padrão (a moderação ajusta depois)
update public.comunidades set intervalo_seg = 30, links = false where intervalo_seg = 0 and links = true;
