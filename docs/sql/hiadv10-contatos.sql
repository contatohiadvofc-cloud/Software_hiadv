-- HiAdv 10: contatos do escritório (25/11/2026)
-- Masters, Coders e colaboradores dão nomes aos contatos (como numa agenda compartilhada) e cadastram números externos.
-- Cada escritório só vê os próprios contatos. Números são dado pessoal: ficam só no escritório, com auditoria.

create table if not exists public.chat_contatos (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null,
  tipo          text not null check (tipo in ('equipe', 'externo')),
  email         text,                 -- tipo equipe: e-mail da pessoa da equipe
  telefone      text,                 -- tipo externo: +55DDDNUMERO
  nome          text not null check (length(btrim(nome)) between 1 and 60),
  obs           text check (obs is null or length(obs) <= 200),
  criado_por    text, criado_em timestamptz not null default now(),
  editado_por   text, editado_em timestamptz,
  check ((tipo = 'equipe' and email is not null and telefone is null) or (tipo = 'externo' and telefone ~ '^\+[1-9][0-9]{9,14}$'))
);
create unique index if not exists chat_contatos_equipe_un on public.chat_contatos (escritorio_id, email) where tipo = 'equipe';
create unique index if not exists chat_contatos_externo_un on public.chat_contatos (escritorio_id, telefone) where tipo = 'externo';
alter table public.chat_contatos enable row level security;
revoke all on public.chat_contatos from anon, authenticated;

create or replace function public.contato_lista()
returns json language sql stable security definer set search_path = public as $$
  select case when public.is_equipe() then coalesce((select json_agg(json_build_object('id', c.id, 'tipo', c.tipo, 'email', c.email, 'telefone', c.telefone,
    'nome', c.nome, 'obs', c.obs, 'editado_por', coalesce(c.editado_por, c.criado_por), 'editado_em', coalesce(c.editado_em, c.criado_em)) order by c.tipo, lower(c.nome))
    from public.chat_contatos c where c.escritorio_id = public.meu_escritorio()), '[]'::json) else '[]'::json end;
$$;

create or replace function public.contato_salvar(p jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); esc uuid := public.meu_escritorio(); cid uuid := nullif(p ->> 'id', '')::uuid;
        v_tipo text := coalesce(p ->> 'tipo', 'externo'); v_nome text := btrim(coalesce(p ->> 'nome', ''));
        v_email text := nullif(lower(btrim(p ->> 'email')), ''); v_tel text := nullif(regexp_replace(coalesce(p ->> 'telefone', ''), '[^0-9+]', '', 'g'), '');
begin
  if not public.is_equipe() or esc is null then return json_build_object('ok', false, 'erro', 'Sem acesso aos contatos.'); end if;
  if length(v_nome) < 1 or length(v_nome) > 60 then return json_build_object('ok', false, 'erro', 'O nome precisa ter de 1 a 60 caracteres.'); end if;
  if v_tipo = 'equipe' then
    if not exists (select 1 from public.equipe e where e.email = v_email and e.escritorio_id = esc) then return json_build_object('ok', false, 'erro', 'Essa pessoa não é da equipe do escritório.'); end if;
    insert into public.chat_contatos (escritorio_id, tipo, email, nome, obs, criado_por) values (esc, 'equipe', v_email, v_nome, nullif(btrim(p ->> 'obs'), ''), eu)
    on conflict (escritorio_id, email) where tipo = 'equipe' do update set nome = excluded.nome, obs = excluded.obs, editado_por = eu, editado_em = now()
    returning id into cid;
  else
    if v_tel is not null and left(v_tel, 1) <> '+' then v_tel := '+55' || ltrim(v_tel, '0'); end if;
    if v_tel is null or v_tel !~ '^\+[1-9][0-9]{9,14}$' then return json_build_object('ok', false, 'erro', 'Confira o número: DDD e telefone, como (49) 99999-0000.'); end if;
    if cid is null then
      insert into public.chat_contatos (escritorio_id, tipo, telefone, nome, obs, criado_por) values (esc, 'externo', v_tel, v_nome, nullif(btrim(p ->> 'obs'), ''), eu)
      on conflict (escritorio_id, telefone) where tipo = 'externo' do update set nome = excluded.nome, obs = excluded.obs, editado_por = eu, editado_em = now()
      returning id into cid;
    else
      update public.chat_contatos set telefone = v_tel, nome = btrim(p ->> 'nome'), obs = nullif(btrim(p ->> 'obs'), ''), editado_por = eu, editado_em = now()
       where id = cid and escritorio_id = esc and tipo = 'externo';
      if not found then return json_build_object('ok', false, 'erro', 'Contato não encontrado.'); end if;
    end if;
  end if;
  perform public.auditar('contato', 'contato salvo: ' || v_nome, cid::text);
  return json_build_object('ok', true, 'id', cid);
exception when unique_violation then return json_build_object('ok', false, 'erro', 'Esse número já está nos contatos.');
end $$;

create or replace function public.contato_apagar(p_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare c public.chat_contatos;
begin
  delete from public.chat_contatos where id = p_id and escritorio_id = public.meu_escritorio() and public.is_equipe() returning * into c;
  if c.id is null then return json_build_object('ok', false, 'erro', 'Contato não encontrado.'); end if;
  perform public.auditar('contato', 'contato removido: ' || c.nome, p_id::text);
  return json_build_object('ok', true);
end $$;

revoke all on function public.contato_lista(), public.contato_salvar(jsonb), public.contato_apagar(uuid) from public, anon;
grant execute on function public.contato_lista(), public.contato_salvar(jsonb), public.contato_apagar(uuid) to authenticated;
