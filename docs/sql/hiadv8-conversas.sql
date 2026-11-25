-- HiAdv 8 (25/11/2026): Conversas da equipe por escritório e Comunidades HiAdv.
-- 1) O chat da equipe passa a ser isolado por escritório (antes a conversa "equipe" e as diretas não olhavam o escritório).
-- 2) Comunidades entre escritórios (ex.: "Masters Trabalhistas HiAdv"), moderadas por quem tem acesso Coder.
--    Ficam em tabelas próprias, sem escritório, e só são lidas pelas funções abaixo (nada de leitura direta da tabela).
-- Pode rodar mais de uma vez. Rodar primeiro no projeto de teste.

-- ===== 1) Chat da equipe: isolado por escritório =====
create or replace function public.chat_participo(p_conversa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_equipe() and exists (
    select 1 from public.chat_conversas c
     where c.id = p_conversa and c.escritorio_id = public.meu_escritorio()
       and (c.tipo = 'equipe' or exists (select 1 from public.chat_membros m where m.conversa_id = c.id and m.email = lower(auth.jwt() ->> 'email'))));
$$;

create or replace function public.chat_lista()
returns json language plpgsql security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); esc uuid := public.meu_escritorio(); r json; nome_esc text;
begin
  if not public.is_equipe() or esc is null then raise exception 'Acesso negado.'; end if;
  -- cada escritório tem uma conversa da equipe toda
  if not exists (select 1 from public.chat_conversas where tipo = 'equipe' and escritorio_id = esc) then
    select nome into nome_esc from public.escritorios where id = esc;
    insert into public.chat_conversas (tipo, titulo, chave, escritorio_id) values ('equipe', 'Equipe ' || coalesce(nome_esc, ''), 'equipe:' || esc, esc)
    on conflict (chave) do nothing;
  end if;
  select coalesce(json_agg(x order by x.ultima_em desc), '[]'::json) into r from (
    select c.id, c.tipo, c.titulo, c.ultima_em,
      (select json_agg(m.email) from public.chat_membros m where m.conversa_id = c.id) as membros,
      (select json_build_object('autor', u.autor, 'texto', u.texto, 'anexo', u.anexo, 'criado_em', u.criado_em)
         from public.chat_mensagens u where u.conversa_id = c.id and u.apagado_em is null order by u.criado_em desc limit 1) as ultima,
      (select count(*) from public.chat_mensagens u where u.conversa_id = c.id and u.autor <> eu and u.apagado_em is null
         and u.criado_em > coalesce((select lido_em from public.chat_membros m where m.conversa_id = c.id and m.email = eu), '-infinity'::timestamptz)) as nao_lidas
    from public.chat_conversas c
    where c.escritorio_id = esc
      and (c.tipo = 'equipe' or exists (select 1 from public.chat_membros m where m.conversa_id = c.id and m.email = eu))
  ) x;
  return r;
end $$;

create or replace function public.chat_direta(p_email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); outro text := lower(btrim(p_email)); k text; cid uuid; esc uuid := public.meu_escritorio();
begin
  if not public.is_equipe() then raise exception 'Acesso negado.'; end if;
  if outro = eu then raise exception 'Escolha outra pessoa.'; end if;
  if not exists (select 1 from public.equipe where email = outro and escritorio_id = esc) then raise exception 'Essa pessoa não é da equipe do seu escritório.'; end if;
  k := least(eu, outro) || '|' || greatest(eu, outro);
  select id into cid from public.chat_conversas where chave = k and escritorio_id = esc;
  if cid is null then
    insert into public.chat_conversas (tipo, chave, criado_por, escritorio_id) values ('direta', k, eu, esc) returning id into cid;
    insert into public.chat_membros (conversa_id, email) values (cid, eu), (cid, outro) on conflict do nothing;
  end if;
  return cid;
end $$;

create or replace function public.chat_grupo_salvar(p_conversa uuid, p_titulo text, p_emails text[])
returns json language plpgsql security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); tit text := btrim(coalesce(p_titulo, '')); cid uuid := p_conversa;
        lista text[]; dono text; tipo_c text; esc uuid := public.meu_escritorio(); esc_c uuid;
begin
  if not public.is_equipe() then return json_build_object('ok', false, 'erro', 'Somente a equipe.'); end if;
  if length(tit) < 2 or length(tit) > 80 then return json_build_object('ok', false, 'erro', 'O nome do grupo precisa ter entre 2 e 80 caracteres.'); end if;
  select coalesce(array_agg(distinct lower(btrim(x))), '{}') into lista from unnest(coalesce(p_emails, '{}') || array[eu]) x where btrim(x) <> '';
  if exists (select 1 from unnest(lista) x where not exists (select 1 from public.equipe e where e.email = x and e.escritorio_id = esc)) then
    return json_build_object('ok', false, 'erro', 'Alguém da lista não está na equipe do seu escritório.');
  end if;
  if array_length(lista, 1) < 2 then return json_build_object('ok', false, 'erro', 'Escolha pelo menos mais uma pessoa.'); end if;
  if cid is null then
    insert into public.chat_conversas (tipo, titulo, criado_por, escritorio_id) values ('grupo', tit, eu, esc) returning id into cid;
    insert into public.chat_membros (conversa_id, email) select cid, x from unnest(lista) x on conflict do nothing;
    perform public.auditar('equipe', 'grupo criado: ' || tit, array_to_string(lista, ', '));
  else
    select criado_por, tipo, escritorio_id into dono, tipo_c, esc_c from public.chat_conversas where id = cid;
    if tipo_c is distinct from 'grupo' or esc_c is distinct from esc then return json_build_object('ok', false, 'erro', 'Só grupos do seu escritório podem ser editados.'); end if;
    if dono is distinct from eu and not public.sou_admin() then return json_build_object('ok', false, 'erro', 'Só quem criou o grupo ou um gestor pode editá-lo.'); end if;
    update public.chat_conversas set titulo = tit where id = cid;
    delete from public.chat_membros where conversa_id = cid and email <> all (lista);
    insert into public.chat_membros (conversa_id, email) select cid, x from unnest(lista) x on conflict do nothing;
    perform public.auditar('equipe', 'grupo editado: ' || tit, array_to_string(lista, ', '));
  end if;
  return json_build_object('ok', true, 'id', cid);
end $$;

-- quem está na equipe do meu escritório (para começar conversa e mostrar nomes)
create or replace function public.chat_pessoas()
returns json language sql stable security definer set search_path = public as $$
  select case when public.is_equipe() then coalesce((
    select json_agg(json_build_object('email', e.email, 'nome', coalesce(nullif(e.nome, ''), e.email), 'papel', e.papel) order by e.nome)
      from public.equipe e where e.escritorio_id = public.meu_escritorio()), '[]'::json) else '[]'::json end;
$$;

-- ===== 2) Comunidades HiAdv (entre escritórios) =====
create table if not exists public.comunidades (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null check (length(nome) between 2 and 60),
  descricao   text check (descricao is null or length(descricao) <= 200),
  areas       text[],                                   -- null = todas as áreas
  so_masters  boolean not null default true,            -- só Gestores Master (e Coders)
  quem_posta  text not null default 'todos' check (quem_posta in ('todos', 'moderadores')),
  anexos      boolean not null default true,
  audios      boolean not null default true,
  ativa       boolean not null default true,
  ordem       int not null default 0,
  criado_por  text,
  criado_em   timestamptz not null default now(),
  ultima_em   timestamptz not null default now()
);
create table if not exists public.comunidade_mensagens (
  id            uuid primary key default gen_random_uuid(),
  comunidade_id uuid not null references public.comunidades(id) on delete cascade,
  autor         text not null,
  autor_nome    text,
  autor_esc     text,
  texto         text check (texto is null or length(texto) <= 4000),
  anexo         jsonb,
  resposta_a    uuid,
  reacoes       jsonb not null default '{}'::jsonb,
  criado_em     timestamptz not null default now(),
  editado_em    timestamptz,
  apagado_em    timestamptz,
  apagado_por   text,
  check (texto is not null or anexo is not null)
);
create index if not exists comunidade_msg_idx on public.comunidade_mensagens (comunidade_id, criado_em desc);
create table if not exists public.comunidade_leituras (
  comunidade_id uuid not null references public.comunidades(id) on delete cascade,
  email text not null, lido_em timestamptz not null default now(), primary key (comunidade_id, email));
create table if not exists public.comunidade_silenciados (
  comunidade_id uuid not null references public.comunidades(id) on delete cascade,
  email text not null, ate timestamptz, motivo text, por text, em timestamptz not null default now(),
  primary key (comunidade_id, email));

alter table public.comunidades enable row level security;
alter table public.comunidade_mensagens enable row level security;
alter table public.comunidade_leituras enable row level security;
alter table public.comunidade_silenciados enable row level security;
revoke all on public.comunidades, public.comunidade_mensagens, public.comunidade_leituras, public.comunidade_silenciados from anon, authenticated;

-- posso ver esta comunidade?
create or replace function public.comunidade_participo(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.hiadv_sou_code() or exists (
    select 1 from public.comunidades c, public.equipe e
     where c.id = p_id and c.ativa and public.is_equipe()
       and e.email = lower(auth.jwt() ->> 'email')
       and (not c.so_masters or e.papel in ('master', 'code'))
       and (c.areas is null or exists (select 1 from public.escritorio_areas a
             where a.escritorio_id = e.escritorio_id and a.ativa and a.area = any (c.areas))));
$$;

create or replace function public.comunidade_lista()
returns json language plpgsql stable security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); mod boolean := public.hiadv_sou_code(); r json;
begin
  if not public.is_equipe() then return '[]'::json; end if;
  select coalesce(json_agg(x order by x.ordem, x.nome), '[]'::json) into r from (
    select c.id, c.nome, c.descricao, c.areas, c.so_masters, c.quem_posta, c.anexos, c.audios, c.ativa, c.ordem, c.ultima_em,
      (select json_build_object('autor_nome', u.autor_nome, 'texto', u.texto, 'anexo', u.anexo, 'criado_em', u.criado_em)
         from public.comunidade_mensagens u where u.comunidade_id = c.id and u.apagado_em is null order by u.criado_em desc limit 1) as ultima,
      (select count(*) from public.comunidade_mensagens u where u.comunidade_id = c.id and u.autor <> eu and u.apagado_em is null
         and u.criado_em > coalesce((select lido_em from public.comunidade_leituras l where l.comunidade_id = c.id and l.email = eu), now() - interval '7 days')) as nao_lidas,
      (mod or c.quem_posta = 'todos') and not exists (select 1 from public.comunidade_silenciados s where s.comunidade_id = c.id and s.email = eu and (s.ate is null or s.ate > now())) as pode_postar,
      mod as moderador
    from public.comunidades c
    where (c.ativa or mod) and public.comunidade_participo(c.id)
  ) x;
  return r;
end $$;

create or replace function public.comunidade_mensagens_de(p_id uuid, p_antes timestamptz default null)
returns json language sql stable security definer set search_path = public as $$
  select case when public.comunidade_participo(p_id) then coalesce((select json_agg(t order by t.criado_em) from (
    select id, autor, autor_nome, autor_esc, texto, anexo, resposta_a, reacoes, criado_em, editado_em
      from public.comunidade_mensagens
     where comunidade_id = p_id and apagado_em is null and (p_antes is null or criado_em < p_antes)
     order by criado_em desc limit 80) t), '[]'::json) else '[]'::json end;
$$;

create or replace function public.comunidade_enviar(p_id uuid, p_texto text, p_anexo jsonb default null, p_resposta uuid default null)
returns json language plpgsql security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); c public.comunidades; e public.equipe; esc text; m public.comunidade_mensagens;
        audio boolean := coalesce(p_anexo ->> 'tipo', '') like 'audio/%';
begin
  select * into c from public.comunidades where id = p_id;
  if c.id is null or not public.comunidade_participo(p_id) then return json_build_object('ok', false, 'erro', 'Comunidade não encontrada.'); end if;
  if not c.ativa and not public.hiadv_sou_code() then return json_build_object('ok', false, 'erro', 'Esta comunidade está pausada.'); end if;
  if c.quem_posta = 'moderadores' and not public.hiadv_sou_code() then return json_build_object('ok', false, 'erro', 'Nesta comunidade só a moderação publica.'); end if;
  if exists (select 1 from public.comunidade_silenciados s where s.comunidade_id = p_id and s.email = eu and (s.ate is null or s.ate > now())) then
    return json_build_object('ok', false, 'erro', 'Seu envio nesta comunidade está pausado pela moderação.'); end if;
  if coalesce(btrim(p_texto), '') = '' and p_anexo is null then return json_build_object('ok', false, 'erro', 'Mensagem vazia.'); end if;
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

create or replace function public.comunidade_lido(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.comunidade_participo(p_id) then return; end if;
  insert into public.comunidade_leituras (comunidade_id, email, lido_em) values (p_id, lower(auth.jwt() ->> 'email'), now())
  on conflict (comunidade_id, email) do update set lido_em = now();
end $$;

create or replace function public.comunidade_reagir(p_msg uuid, p_emoji text)
returns json language plpgsql security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); m public.comunidade_mensagens;
begin
  if p_emoji is null or p_emoji not in ('❤️', '😂', '😮', '😢', '👍', '🙏', '🔥', '✅') then return json_build_object('ok', false, 'erro', 'Reação inválida.'); end if;
  select * into m from public.comunidade_mensagens where id = p_msg for update;
  if m.id is null or m.apagado_em is not null or not public.comunidade_participo(m.comunidade_id) then return json_build_object('ok', false, 'erro', 'Mensagem não encontrada.'); end if;
  update public.comunidade_mensagens set reacoes = case when reacoes ->> eu = p_emoji then reacoes - eu else reacoes || jsonb_build_object(eu, p_emoji) end where id = p_msg;
  return json_build_object('ok', true);
end $$;

-- apagar: o autor apaga a própria; a moderação apaga qualquer uma (fica registrado)
create or replace function public.comunidade_apagar(p_msg uuid)
returns json language plpgsql security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); m public.comunidade_mensagens;
begin
  select * into m from public.comunidade_mensagens where id = p_msg;
  if m.id is null or not public.comunidade_participo(m.comunidade_id) then return json_build_object('ok', false, 'erro', 'Mensagem não encontrada.'); end if;
  if m.autor <> eu and not public.hiadv_sou_code() then return json_build_object('ok', false, 'erro', 'Só quem escreveu ou a moderação pode apagar.'); end if;
  update public.comunidade_mensagens set apagado_em = now(), apagado_por = eu where id = p_msg;
  if m.autor <> eu then perform public.auditar('comunidade', 'mensagem removida pela moderação', m.autor); end if;
  return json_build_object('ok', true);
end $$;

-- ===== moderação (só Coder: Felipe e Deividy) =====
create or replace function public.comunidade_salvar(p jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare cid uuid := nullif(p ->> 'id', '')::uuid; nome text := btrim(coalesce(p ->> 'nome', ''));
        v_areas text[] := case when jsonb_typeof(p -> 'areas') = 'array' and jsonb_array_length(p -> 'areas') > 0 then array(select jsonb_array_elements_text(p -> 'areas')) end;
begin
  if not public.hiadv_sou_code() then return json_build_object('ok', false, 'erro', 'Só a moderação do HiAdv cria e ajusta comunidades.'); end if;
  if length(nome) < 2 or length(nome) > 60 then return json_build_object('ok', false, 'erro', 'O nome precisa ter entre 2 e 60 caracteres.'); end if;
  if coalesce(p ->> 'quem_posta', 'todos') not in ('todos', 'moderadores') then return json_build_object('ok', false, 'erro', 'Escolha quem pode publicar.'); end if;
  if cid is null then
    insert into public.comunidades (nome, descricao, areas, so_masters, quem_posta, anexos, audios, ativa, ordem, criado_por)
    values (nome, nullif(btrim(p ->> 'descricao'), ''), v_areas, coalesce((p ->> 'so_masters')::boolean, true), coalesce(p ->> 'quem_posta', 'todos'),
            coalesce((p ->> 'anexos')::boolean, true), coalesce((p ->> 'audios')::boolean, true), coalesce((p ->> 'ativa')::boolean, true),
            coalesce((p ->> 'ordem')::int, 0), lower(auth.jwt() ->> 'email')) returning id into cid;
  else
    update public.comunidades set nome = btrim(p ->> 'nome'), descricao = nullif(btrim(p ->> 'descricao'), ''), areas = v_areas,
      so_masters = coalesce((p ->> 'so_masters')::boolean, so_masters), quem_posta = coalesce(p ->> 'quem_posta', quem_posta),
      anexos = coalesce((p ->> 'anexos')::boolean, anexos), audios = coalesce((p ->> 'audios')::boolean, audios),
      ativa = coalesce((p ->> 'ativa')::boolean, ativa), ordem = coalesce((p ->> 'ordem')::int, ordem) where id = cid;
  end if;
  perform public.auditar('comunidade', 'comunidade salva: ' || nome, cid::text);
  return json_build_object('ok', true, 'id', cid);
end $$;

-- pessoas que enxergam a comunidade (para a moderação) e quem está pausado
create or replace function public.comunidade_pessoas(p_id uuid)
returns json language sql stable security definer set search_path = public as $$
  select case when public.hiadv_sou_code() then coalesce((
    select json_agg(json_build_object('email', e.email, 'nome', coalesce(nullif(e.nome, ''), e.email), 'escritorio', s.nome,
             'silenciado_ate', (select coalesce(z.ate::text, 'sempre') from public.comunidade_silenciados z where z.comunidade_id = c.id and z.email = e.email and (z.ate is null or z.ate > now())))
             order by s.nome, e.nome)
      from public.comunidades c, public.equipe e left join public.escritorios s on s.id = e.escritorio_id
     where c.id = p_id and (not c.so_masters or e.papel in ('master', 'code'))
       and (c.areas is null or e.papel = 'code' or exists (select 1 from public.escritorio_areas a where a.escritorio_id = e.escritorio_id and a.ativa and a.area = any (c.areas)))), '[]'::json)
  else '[]'::json end;
$$;

create or replace function public.comunidade_silenciar(p_id uuid, p_email text, p_horas int default null)
returns json language plpgsql security definer set search_path = public as $$
declare alvo text := lower(btrim(p_email));
begin
  if not public.hiadv_sou_code() then return json_build_object('ok', false, 'erro', 'Só a moderação do HiAdv.'); end if;
  if p_horas = 0 then
    delete from public.comunidade_silenciados where comunidade_id = p_id and email = alvo;
    perform public.auditar('comunidade', 'envio liberado', alvo);
  else
    insert into public.comunidade_silenciados (comunidade_id, email, ate, por)
    values (p_id, alvo, case when p_horas is null then null else now() + make_interval(hours => p_horas) end, lower(auth.jwt() ->> 'email'))
    on conflict (comunidade_id, email) do update set ate = excluded.ate, por = excluded.por, em = now();
    perform public.auditar('comunidade', 'envio pausado', alvo);
  end if;
  return json_build_object('ok', true);
end $$;

revoke all on function public.comunidade_participo(uuid), public.comunidade_lista(), public.comunidade_mensagens_de(uuid, timestamptz),
  public.comunidade_enviar(uuid, text, jsonb, uuid), public.comunidade_lido(uuid), public.comunidade_reagir(uuid, text), public.comunidade_apagar(uuid),
  public.comunidade_salvar(jsonb), public.comunidade_pessoas(uuid), public.comunidade_silenciar(uuid, text, int), public.chat_pessoas() from anon, public;
grant execute on function public.comunidade_participo(uuid), public.comunidade_lista(), public.comunidade_mensagens_de(uuid, timestamptz),
  public.comunidade_enviar(uuid, text, jsonb, uuid), public.comunidade_lido(uuid), public.comunidade_reagir(uuid, text), public.comunidade_apagar(uuid),
  public.comunidade_salvar(jsonb), public.comunidade_pessoas(uuid), public.comunidade_silenciar(uuid, text, int), public.chat_pessoas() to authenticated;

-- arquivos e áudios das comunidades: arquivo privado, pasta = id da comunidade, até 25 MB
insert into storage.buckets (id, name, public, file_size_limit) values ('comunidade', 'comunidade', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = 26214400;
drop policy if exists comunidade_arq_ler on storage.objects;
drop policy if exists comunidade_arq_enviar on storage.objects;
create policy comunidade_arq_ler on storage.objects for select to authenticated
  using (bucket_id = 'comunidade' and public.comunidade_participo(((storage.foldername(name))[1])::uuid));
create policy comunidade_arq_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'comunidade' and public.comunidade_participo(((storage.foldername(name))[1])::uuid));

-- comunidades iniciais
insert into public.comunidades (nome, descricao, areas, so_masters, quem_posta, ordem)
select * from (values
  ('Avisos do HiAdv', 'Novidades do sistema, manutenções e dicas. Só a moderação publica.', null::text[], false, 'moderadores', 0),
  ('Masters HiAdv', 'Gestores Master de todos os escritórios: gestão, equipe e rotina.', null::text[], true, 'todos', 1),
  ('Masters Previdenciários HiAdv', 'Para quem atua no previdenciário administrativo e judicial.', array['administrativo', 'judicial'], true, 'todos', 2),
  ('Masters Trabalhistas HiAdv', 'Para quem atua no trabalhista.', array['trabalhista'], true, 'todos', 3),
  ('Masters Cíveis HiAdv', 'Cível e família.', array['civel'], true, 'todos', 4),
  ('Masters Bancários HiAdv', 'Revisionais, consignados e contratos bancários.', array['bancario'], true, 'todos', 5),
  ('Masters Penal HiAdv', 'Para quem atua no penal.', array['penal'], true, 'todos', 6),
  ('Masters Extrajudicial HiAdv', 'Cartório, acordos e inventários extrajudiciais.', array['extrajudicial'], true, 'todos', 7)
) v(nome, descricao, areas, so_masters, quem_posta, ordem)
where not exists (select 1 from public.comunidades c where c.nome = v.nome);
