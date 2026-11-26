-- HiAdv 16 (26/11/2026): grupos no padrão do WhatsApp — administradores, descrição, quem pode enviar e editar,
-- adicionar/remover pessoas, promover/rebaixar admin, sair do grupo e avisos de sistema na conversa.
-- O gestor master do escritório continua podendo administrar qualquer grupo (regra do escritório).

alter table public.chat_membros add column if not exists admin boolean not null default false;
alter table public.chat_membros add column if not exists entrou_em timestamptz not null default now();
alter table public.chat_conversas add column if not exists descricao text;
alter table public.chat_conversas add column if not exists so_admins_enviam boolean not null default false;
alter table public.chat_conversas add column if not exists so_admins_editam boolean not null default true;

-- quem criou o grupo vira admin; grupo sem admin ganha o membro mais antigo
update public.chat_membros m set admin = true from public.chat_conversas c
 where c.id = m.conversa_id and c.tipo = 'grupo' and m.email = c.criado_por;
update public.chat_membros m set admin = true where m.conversa_id in (
  select c.id from public.chat_conversas c where c.tipo = 'grupo' and not exists (select 1 from public.chat_membros x where x.conversa_id = c.id and x.admin))
  and m.email = (select min(email) from public.chat_membros y where y.conversa_id = m.conversa_id);

create or replace function public.chat_admin_grupo(p_conversa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.chat_conversas c where c.id = p_conversa and c.tipo = 'grupo' and c.escritorio_id = public.meu_escritorio())
     and (public.sou_admin() or exists (select 1 from public.chat_membros m where m.conversa_id = p_conversa and m.email = lower(auth.jwt() ->> 'email') and m.admin));
$$;

-- aviso de sistema dentro da conversa ("Ana adicionou Bruno")
create or replace function public.chat_aviso(p_conversa uuid, p_texto text)
returns void language sql security definer set search_path = public as $$
  insert into public.chat_mensagens (conversa_id, autor, texto, escritorio_id)
  select p_conversa, 'sistema', left(p_texto, 300), c.escritorio_id from public.chat_conversas c where c.id = p_conversa;
  update public.chat_conversas set ultima_em = now() where id = p_conversa;
$$;
revoke all on function public.chat_aviso(uuid, text) from anon, authenticated, public;

create or replace function public.chat_nome(p_email text)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select nullif(e.nome, '') from public.equipe e where e.email = p_email and e.escritorio_id = public.meu_escritorio() limit 1), split_part(p_email, '@', 1));
$$;

-- "Só admins enviam": vale para qualquer forma de enviar
create or replace function public.chat_trava_envio()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.autor <> 'sistema' and exists (select 1 from public.chat_conversas c where c.id = new.conversa_id and c.tipo = 'grupo' and c.so_admins_enviam)
     and not exists (select 1 from public.chat_membros m where m.conversa_id = new.conversa_id and m.email = new.autor and m.admin)
     and not public.sou_admin() then
    raise exception 'Só administradores podem enviar mensagens neste grupo.';
  end if;
  return new;
end $$;
drop trigger if exists chat_trava_envio on public.chat_mensagens;
create trigger chat_trava_envio before insert on public.chat_mensagens for each row execute function public.chat_trava_envio();

-- criação continua por chat_grupo_salvar; agora quem cria é admin e a edição respeita as regras do grupo
create or replace function public.chat_grupo_salvar(p_conversa uuid, p_titulo text, p_emails text[])
returns json language plpgsql security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); tit text := btrim(coalesce(p_titulo, '')); cid uuid := p_conversa;
        lista text[]; esc uuid := public.meu_escritorio();
begin
  if not public.is_equipe() then return json_build_object('ok', false, 'erro', 'Somente a equipe.'); end if;
  if length(tit) < 2 or length(tit) > 80 then return json_build_object('ok', false, 'erro', 'O nome do grupo precisa ter entre 2 e 80 caracteres.'); end if;
  select coalesce(array_agg(distinct lower(btrim(x))), '{}') into lista from unnest(coalesce(p_emails, '{}') || array[eu]) x where btrim(x) <> '';
  if exists (select 1 from unnest(lista) x where not exists (select 1 from public.equipe e where e.email = x and e.escritorio_id = esc)) then
    return json_build_object('ok', false, 'erro', 'Alguém da lista não está na equipe do seu escritório.');
  end if;
  if cid is null then
    if array_length(lista, 1) < 2 then return json_build_object('ok', false, 'erro', 'Escolha pelo menos mais uma pessoa.'); end if;
    insert into public.chat_conversas (tipo, titulo, criado_por, escritorio_id) values ('grupo', tit, eu, esc) returning id into cid;
    insert into public.chat_membros (conversa_id, email, admin) select cid, x, x = eu from unnest(lista) x on conflict do nothing;
    perform public.chat_aviso(cid, public.chat_nome(eu) || ' criou o grupo "' || tit || '"');
    perform public.auditar('equipe', 'grupo criado: ' || tit, array_to_string(lista, ', '));
    return json_build_object('ok', true, 'id', cid);
  end if;
  -- edição antiga (nome + lista inteira): só admin
  if not public.chat_admin_grupo(cid) then return json_build_object('ok', false, 'erro', 'Só administradores do grupo podem fazer isso.'); end if;
  update public.chat_conversas set titulo = tit where id = cid;
  delete from public.chat_membros where conversa_id = cid and email <> all (lista);
  insert into public.chat_membros (conversa_id, email) select cid, x from unnest(lista) x on conflict do nothing;
  perform public.auditar('equipe', 'grupo editado: ' || tit, array_to_string(lista, ', '));
  return json_build_object('ok', true, 'id', cid);
end $$;

create or replace function public.chat_grupo_info(p_conversa uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); r json;
begin
  if not public.chat_participo(p_conversa) then raise exception 'Conversa não encontrada.'; end if;
  select json_build_object('id', c.id, 'titulo', c.titulo, 'descricao', c.descricao, 'criadoPor', c.criado_por, 'criadoEm', c.criado_em,
    'soAdminsEnviam', c.so_admins_enviam, 'soAdminsEditam', c.so_admins_editam, 'euAdmin', public.chat_admin_grupo(c.id),
    'membros', coalesce((select json_agg(json_build_object('email', m.email, 'admin', m.admin, 'entrouEm', m.entrou_em) order by m.admin desc, m.entrou_em) from public.chat_membros m where m.conversa_id = c.id), '[]'))
    into r from public.chat_conversas c where c.id = p_conversa and c.tipo = 'grupo';
  if r is null then raise exception 'Grupo não encontrado.'; end if;
  return r;
end $$;

create or replace function public.chat_grupo_editar(p_conversa uuid, p_titulo text, p_descricao text)
returns json language plpgsql security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); c public.chat_conversas; tit text := btrim(coalesce(p_titulo, '')); des text := nullif(btrim(coalesce(p_descricao, '')), '');
begin
  select * into c from public.chat_conversas where id = p_conversa and tipo = 'grupo' and escritorio_id = public.meu_escritorio();
  if c.id is null or not public.chat_participo(p_conversa) then return json_build_object('ok', false, 'erro', 'Grupo não encontrado.'); end if;
  if c.so_admins_editam and not public.chat_admin_grupo(p_conversa) then return json_build_object('ok', false, 'erro', 'Só administradores podem editar os dados do grupo.'); end if;
  if length(tit) < 2 or length(tit) > 80 then return json_build_object('ok', false, 'erro', 'O nome do grupo precisa ter entre 2 e 80 caracteres.'); end if;
  if length(coalesce(des, '')) > 500 then return json_build_object('ok', false, 'erro', 'A descrição pode ter até 500 caracteres.'); end if;
  update public.chat_conversas set titulo = tit, descricao = des where id = p_conversa;
  if tit is distinct from c.titulo then perform public.chat_aviso(p_conversa, public.chat_nome(eu) || ' mudou o nome do grupo para "' || tit || '"'); end if;
  if des is distinct from c.descricao then perform public.chat_aviso(p_conversa, public.chat_nome(eu) || ' mudou a descrição do grupo'); end if;
  return json_build_object('ok', true);
end $$;

create or replace function public.chat_grupo_regras(p_conversa uuid, p_so_admins_enviam boolean, p_so_admins_editam boolean)
returns json language plpgsql security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); c public.chat_conversas;
begin
  if not public.chat_admin_grupo(p_conversa) then return json_build_object('ok', false, 'erro', 'Só administradores mudam as regras do grupo.'); end if;
  select * into c from public.chat_conversas where id = p_conversa;
  update public.chat_conversas set so_admins_enviam = coalesce(p_so_admins_enviam, so_admins_enviam), so_admins_editam = coalesce(p_so_admins_editam, so_admins_editam) where id = p_conversa;
  if p_so_admins_enviam is not null and p_so_admins_enviam is distinct from c.so_admins_enviam then
    perform public.chat_aviso(p_conversa, public.chat_nome(eu) || case when p_so_admins_enviam then ' definiu que só administradores enviam mensagens' else ' liberou o envio de mensagens para todos' end);
  end if;
  if p_so_admins_editam is not null and p_so_admins_editam is distinct from c.so_admins_editam then
    perform public.chat_aviso(p_conversa, public.chat_nome(eu) || case when p_so_admins_editam then ' definiu que só administradores editam os dados do grupo' else ' liberou a edição dos dados do grupo para todos' end);
  end if;
  return json_build_object('ok', true);
end $$;

create or replace function public.chat_grupo_adicionar(p_conversa uuid, p_emails text[])
returns json language plpgsql security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); esc uuid := public.meu_escritorio(); x text; n int := 0;
begin
  if not public.chat_admin_grupo(p_conversa) then return json_build_object('ok', false, 'erro', 'Só administradores adicionam pessoas.'); end if;
  if coalesce(array_length(p_emails, 1), 0) = 0 then return json_build_object('ok', false, 'erro', 'Escolha quem adicionar.'); end if;
  foreach x in array p_emails loop
    x := lower(btrim(x));
    if not exists (select 1 from public.equipe e where e.email = x and e.escritorio_id = esc) then return json_build_object('ok', false, 'erro', 'Alguém da lista não está na equipe do seu escritório.'); end if;
    if not exists (select 1 from public.chat_membros where conversa_id = p_conversa and email = x) then
      insert into public.chat_membros (conversa_id, email) values (p_conversa, x);
      perform public.chat_aviso(p_conversa, public.chat_nome(eu) || ' adicionou ' || public.chat_nome(x)); n := n + 1;
    end if;
  end loop;
  return json_build_object('ok', true, 'adicionados', n);
end $$;

create or replace function public.chat_grupo_remover(p_conversa uuid, p_email text)
returns json language plpgsql security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); alvo text := lower(btrim(p_email));
begin
  if not public.chat_admin_grupo(p_conversa) then return json_build_object('ok', false, 'erro', 'Só administradores removem pessoas.'); end if;
  if alvo = eu then return json_build_object('ok', false, 'erro', 'Para sair, use "Sair do grupo".'); end if;
  delete from public.chat_membros where conversa_id = p_conversa and email = alvo;
  if not found then return json_build_object('ok', false, 'erro', 'Essa pessoa não está no grupo.'); end if;
  perform public.chat_aviso(p_conversa, public.chat_nome(eu) || ' removeu ' || public.chat_nome(alvo));
  return json_build_object('ok', true);
end $$;

create or replace function public.chat_grupo_admin(p_conversa uuid, p_email text, p_admin boolean)
returns json language plpgsql security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); alvo text := lower(btrim(p_email));
begin
  if not public.chat_admin_grupo(p_conversa) then return json_build_object('ok', false, 'erro', 'Só administradores mudam administradores.'); end if;
  if not exists (select 1 from public.chat_membros where conversa_id = p_conversa and email = alvo) then return json_build_object('ok', false, 'erro', 'Essa pessoa não está no grupo.'); end if;
  if not p_admin and not exists (select 1 from public.chat_membros where conversa_id = p_conversa and admin and email <> alvo) then
    return json_build_object('ok', false, 'erro', 'O grupo precisa de pelo menos um administrador.'); end if;
  update public.chat_membros set admin = p_admin where conversa_id = p_conversa and email = alvo;
  perform public.chat_aviso(p_conversa, case when p_admin then public.chat_nome(alvo) || ' agora é administrador' else public.chat_nome(alvo) || ' não é mais administrador' end);
  return json_build_object('ok', true);
end $$;

create or replace function public.chat_grupo_sair(p_conversa uuid)
returns json language plpgsql security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); prox text;
begin
  if not exists (select 1 from public.chat_conversas c join public.chat_membros m on m.conversa_id = c.id where c.id = p_conversa and c.tipo = 'grupo' and m.email = eu) then
    return json_build_object('ok', false, 'erro', 'Você não está neste grupo.'); end if;
  delete from public.chat_membros where conversa_id = p_conversa and email = eu;
  perform public.chat_aviso(p_conversa, public.chat_nome(eu) || ' saiu');
  -- como no WhatsApp: se não sobrou admin, quem está há mais tempo vira admin
  if not exists (select 1 from public.chat_membros where conversa_id = p_conversa and admin) then
    select email into prox from public.chat_membros where conversa_id = p_conversa order by entrou_em, email limit 1;
    if prox is not null then
      update public.chat_membros set admin = true where conversa_id = p_conversa and email = prox;
      perform public.chat_aviso(p_conversa, public.chat_nome(prox) || ' agora é administrador');
    end if;
  end if;
  return json_build_object('ok', true);
end $$;

revoke all on function public.chat_grupo_info(uuid), public.chat_grupo_editar(uuid, text, text), public.chat_grupo_regras(uuid, boolean, boolean),
  public.chat_grupo_adicionar(uuid, text[]), public.chat_grupo_remover(uuid, text), public.chat_grupo_admin(uuid, text, boolean), public.chat_grupo_sair(uuid),
  public.chat_admin_grupo(uuid), public.chat_nome(text) from anon, public;
grant execute on function public.chat_grupo_info(uuid), public.chat_grupo_editar(uuid, text, text), public.chat_grupo_regras(uuid, boolean, boolean),
  public.chat_grupo_adicionar(uuid, text[]), public.chat_grupo_remover(uuid, text), public.chat_grupo_admin(uuid, text, boolean), public.chat_grupo_sair(uuid),
  public.chat_admin_grupo(uuid), public.chat_nome(text) to authenticated;
