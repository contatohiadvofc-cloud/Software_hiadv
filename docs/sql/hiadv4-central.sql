-- Central (papel code), 25/11/2026: pagamentos, receita do mês, saúde de uso e motivo nos ajustes.

create table if not exists public.escritorio_pagamentos (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  competencia date not null,
  valor numeric(10,2) not null check (valor >= 0 and valor <= 100000),
  pago_em date not null,
  forma text not null check (forma in ('pix','boleto','cartao','transferencia','outro')),
  registrado_por text not null,
  criado_em timestamptz not null default now()
);
alter table public.escritorio_pagamentos enable row level security;
-- sem políticas: só as funções abaixo (security definer, papel code) leem e gravam.
create index if not exists escritorio_pagamentos_pago_em on public.escritorio_pagamentos (pago_em);

create or replace function public.hiadv_central_saude(p_id uuid) returns int
language sql stable security definer set search_path to 'public' as $$
  with a as (
    select count(*) filter (where em >= now() - interval '7 days') ev7,
           count(distinct quem) filter (where em >= now() - interval '14 days') pessoas14
    from public.auditoria where escritorio_id = p_id),
  q as (select greatest(count(*), 1) n from public.equipe where escritorio_id = p_id and coalesce(papel, '') <> 'code'),
  c as (select count(*) filter (where atualizado_em >= now() - interval '30 days') mov, greatest(count(*), 1) tot from public.casos where escritorio_id = p_id)
  select least(100, round(
      40 * least(1, a.ev7 / 15.0)
    + 30 * least(1, a.pessoas14::numeric / q.n)
    + 30 * least(1, c.mov / greatest(1, c.tot * 0.3))))::int
  from a, q, c
$$;

create or replace function public.hiadv_central_painel(p_mes date default current_date) returns json
language plpgsql stable security definer set search_path to 'public' as $$
declare v_ini date := date_trunc('month', p_mes)::date; v_fim date := (date_trunc('month', p_mes) + interval '1 month - 1 day')::date;
begin
  if not public.hiadv_sou_code() then raise exception 'Só o papel Code abre a Central.' using errcode = 'P0403'; end if;
  return json_build_object(
    'inicio', v_ini, 'fim', v_fim,
    'dias', coalesce((select json_agg(json_build_object('dia', extract(day from d)::int,
        'recebido', coalesce((select sum(valor) from public.escritorio_pagamentos where pago_em = d::date), 0),
        'previsto', coalesce((select sum(p.preco) from public.escritorio_assinatura a join public.planos p on p.id = a.plano
                              where a.situacao = 'ativo' and a.pago_ate is not null and extract(day from a.pago_ate) = extract(day from d) and d::date > current_date), 0)) order by d)
      from generate_series(v_ini, v_fim, interval '1 day') d), '[]'::json),
    'recebido', coalesce((select sum(valor) from public.escritorio_pagamentos where pago_em between v_ini and v_fim), 0),
    'previsto', coalesce((select sum(p.preco) from public.escritorio_assinatura a join public.planos p on p.id = a.plano where a.situacao in ('ativo', 'atraso')), 0),
    'em_atraso', coalesce((select sum(p.preco) from public.escritorio_assinatura a join public.planos p on p.id = a.plano
                           where a.situacao = 'atraso' or (a.situacao = 'ativo' and a.pago_ate < current_date - 2)), 0));
end $$;

create or replace function public.hiadv_central_pagamento(p_id uuid, p_valor numeric, p_pago_em date, p_forma text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare v_email text := lower(auth.jwt() ->> 'email'); v_venc date;
begin
  if not public.hiadv_sou_code() then raise exception 'Somente a administração do HiAdv.'; end if;
  if p_valor is null or p_valor <= 0 or p_valor > 100000 then raise exception 'Valor inválido.'; end if;
  if p_pago_em is null or p_pago_em > current_date + 1 then raise exception 'Data de pagamento inválida.'; end if;
  select coalesce(pago_ate, p_pago_em) into v_venc from public.escritorio_assinatura where escritorio_id = p_id;
  if not found then raise exception 'Escritório sem assinatura.'; end if;
  insert into public.escritorio_pagamentos (escritorio_id, competencia, valor, pago_em, forma, registrado_por)
  values (p_id, v_venc, p_valor, p_pago_em, p_forma, v_email);
  update public.escritorio_assinatura set pago_ate = (v_venc + interval '1 month')::date,
    situacao = case when situacao in ('atraso', 'teste') then 'ativo' else situacao end, atualizado_em = now(), atualizado_por = v_email
  where escritorio_id = p_id;
  insert into public.auditoria (quem, tipo, acao, alvo, escritorio_id)
  values (v_email, 'central', 'registrou pagamento de R$ ' || to_char(p_valor, 'FM999G990D00') || ' (' || p_forma || ')', p_id::text, p_id);
  return json_build_object('ok', true, 'proximo_vencimento', (v_venc + interval '1 month')::date);
end $$;

create or replace function public.hiadv_central_pagamentos(p_id uuid) returns json
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not public.hiadv_sou_code() then raise exception 'Só o papel Code abre a Central.' using errcode = 'P0403'; end if;
  return coalesce((select json_agg(json_build_object('competencia', competencia, 'valor', valor, 'pago_em', pago_em, 'forma', forma) order by pago_em desc)
    from (select * from public.escritorio_pagamentos where escritorio_id = p_id order by pago_em desc limit 24) x), '[]'::json);
end $$;

-- Motivo obrigatório nos ajustes de recurso (fica no histórico)
create or replace function public.hiadv_central_motivo(p_id uuid, p_texto text) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.hiadv_sou_code() then raise exception 'Somente a administração do HiAdv.'; end if;
  if length(btrim(coalesce(p_texto, ''))) < 3 then raise exception 'Informe o motivo.'; end if;
  insert into public.auditoria (quem, tipo, acao, alvo, escritorio_id)
  values (lower(auth.jwt() ->> 'email'), 'central', 'motivo: ' || left(btrim(p_texto), 300), p_id::text, p_id);
end $$;

grant execute on function public.hiadv_central_painel(date), public.hiadv_central_pagamento(uuid, numeric, date, text),
  public.hiadv_central_pagamentos(uuid), public.hiadv_central_motivo(uuid, text) to authenticated;
revoke execute on function public.hiadv_central_saude(uuid) from public, anon, authenticated;

create or replace function public.hiadv_central_escritorios() returns json
language plpgsql stable security definer set search_path to 'public' as $function$
begin
  if not public.hiadv_sou_code() then raise exception 'Só o papel Code abre a Central.' using errcode = 'P0403'; end if;
  return coalesce((select json_agg(json_build_object(
      'id', e.id, 'nome', e.nome, 'cidade', e.cidade, 'ativo', e.ativo, 'oabs_master', e.oabs_master,
      'plano', a.plano, 'situacao', a.situacao, 'fundador', coalesce(a.fundador, false), 'teste_ate', a.teste_ate, 'pago_ate', a.pago_ate, 'obs', a.obs,
      'preco', p.preco, 'saude', public.hiadv_central_saude(e.id),
      'ultimo_acesso', (select max(em) from public.auditoria u where u.escritorio_id = e.id),
      'master_nome', (select q.nome from public.equipe q where q.escritorio_id = e.id and q.papel = 'master' order by q.criado_em limit 1),
      'casos', (select count(*) from public.casos c where c.escritorio_id = e.id),
      'limites', json_build_object('masters', coalesce(a.masters, p.masters), 'colaboradores', coalesce(a.colaboradores, p.colaboradores), 'oabs', coalesce(a.oabs, p.oabs), 'ia_mensal', coalesce(a.ia_mensal, p.ia_mensal)),
      'uso', json_build_object(
        'masters', (select count(*) from public.equipe q where q.escritorio_id = e.id and q.papel = 'master'),
        'colaboradores', (select count(*) from public.equipe q where q.escritorio_id = e.id and coalesce(q.papel, 'colaborador') not in ('master', 'code')),
        'oabs', coalesce(array_length(e.oabs_master, 1), 0),
        'ia_mes', (select count(*) from public.ia_uso u where u.escritorio_id = e.id and u.criado_em >= date_trunc('month', now()))),
      'ajustes', (select count(*) from public.escritorio_ajustes j where j.escritorio_id = e.id)
    ) order by e.nome) from public.escritorios e
      left join public.escritorio_assinatura a on a.escritorio_id = e.id
      left join public.planos p on p.id = a.plano), '[]'::json);
end $function$;
