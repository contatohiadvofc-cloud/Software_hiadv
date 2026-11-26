-- HiAdv 13 (25/11/2026): online/offline da equipe e registro de chamada recusada.

create table if not exists public.chat_presenca (
  email text primary key,
  escritorio_id uuid not null,
  visto_em timestamptz not null default now()
);
alter table public.chat_presenca enable row level security;
revoke all on public.chat_presenca from anon, authenticated;

-- o app avisa a cada minuto que a pessoa está com o HiAdv aberto
create or replace function public.presenca_ping()
returns void language plpgsql security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); esc uuid := public.meu_escritorio();
begin
  if not public.is_equipe() or esc is null then return; end if;
  insert into public.chat_presenca (email, escritorio_id, visto_em) values (eu, esc, now())
  on conflict (email) do update set visto_em = now(), escritorio_id = esc;
end $$;

-- pessoas da equipe com o último sinal de vida (online = visto nos últimos 2 minutos)
create or replace function public.chat_pessoas()
returns json language sql stable security definer set search_path = public as $$
  select case when public.is_equipe() then coalesce((
    select json_agg(json_build_object('email', e.email, 'nome', coalesce(nullif(e.nome, ''), e.email), 'papel', e.papel,
                                      'visto_em', (select p.visto_em from public.chat_presenca p where p.email = e.email)) order by e.nome)
      from public.equipe e where e.escritorio_id = public.meu_escritorio()), '[]'::json) else '[]'::json end;
$$;

alter table public.reunioes add column if not exists recusados text[] not null default '{}';

create or replace function public.reuniao_recusar(p_reuniao uuid)
returns json language plpgsql security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email');
begin
  if not exists (select 1 from public.reunioes r where r.id = p_reuniao and public.chat_participo(r.conversa_id)) then return json_build_object('ok', false, 'erro', 'Chamada não encontrada.'); end if;
  update public.reunioes set recusados = array(select distinct unnest(recusados || array[eu])) where id = p_reuniao;
  return json_build_object('ok', true);
end $$;

create or replace function public.reuniao_historico(p_conversa uuid)
returns json language sql stable security definer set search_path = public as $$
  select case when public.chat_participo(p_conversa) then coalesce((select json_agg(x order by x.inicio desc) from (
    select r.id, r.video, r.iniciada_por, r.inicio, r.fim, r.participantes, r.recusados,
           (select count(*) from public.reuniao_falas f where f.reuniao_id = r.id) as falas
      from public.reunioes r where r.conversa_id = p_conversa order by r.inicio desc limit 30) x), '[]'::json) else '[]'::json end;
$$;

revoke all on function public.presenca_ping(), public.reuniao_recusar(uuid) from public, anon;
grant execute on function public.presenca_ping(), public.reuniao_recusar(uuid) to authenticated;
