-- HiAdv 5 (25/11/2026): acesso de Coder separado do papel.
-- Felipe Schena Lanhi continua Gestor Master da Lanhi e ganha também a área do Coder (como o Deividy).
alter table public.equipe add column if not exists acesso_code boolean not null default false;

create or replace function public.hiadv_sou_code() returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.equipe where email = lower(auth.jwt() ->> 'email') and (papel = 'code' or acesso_code))
$$;

-- só quem já é Coder (ou o servidor) liga ou desliga o acesso de Coder de alguém
create or replace function public.hiadv_proteger_acesso_code() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if new.acesso_code is distinct from coalesce(old.acesso_code, false) and not public.hiadv_servidor() and not public.hiadv_sou_code() then
    raise exception 'Só a administração do HiAdv muda o acesso de Coder.';
  end if;
  return new;
end $$;
drop trigger if exists equipe_proteger_acesso_code on public.equipe;
create trigger equipe_proteger_acesso_code before insert or update of acesso_code on public.equipe
  for each row execute function public.hiadv_proteger_acesso_code();

do $$
declare f text; d text;
begin
  foreach f in array array['hiadv_carimbar_escritorio','hiadv_criar_escritorio','hiadv_escritorios_disponiveis','hiadv_trocar_escritorio'] loop
    d := pg_get_functiondef(('public.' || f)::regproc);
    d := replace(d, $q$exists (select 1 from public.equipe where email = lower(auth.jwt() ->> 'email') and papel = 'code')$q$, 'public.hiadv_sou_code()');
    d := replace(d, $q$exists (select 1 from public.equipe where email = v_email and papel = 'code')$q$, 'public.hiadv_sou_code()');
    if d ~ $r$papel = 'code'$r$ then raise exception 'Função % ainda tem papel = code', f; end if;
    execute d;
  end loop;
end $$;

create or replace function public.minha_conta() returns json
language sql stable security definer set search_path to 'public' as $function$
  select json_build_object('email', e.email, 'nome', e.nome, 'gestor', e.admin, 'areas', e.areas, 'cargo', e.cargo, 'papel', e.papel,
    'acesso_code', e.papel = 'code' or e.acesso_code,
    'escritorio', e.escritorio_id, 'escritorio_nome', (select x.nome from public.escritorios x where x.id = e.escritorio_id),
    'tem_senha', e.senha_hash is not null,
    'mestra_gestor_definida', exists (select 1 from public.senhas_mestras_equipe m where m.tipo = 'gestor' and m.escritorio_id = e.escritorio_id))
  from public.equipe e where e.email = lower(auth.jwt() ->> 'email');
$function$;
