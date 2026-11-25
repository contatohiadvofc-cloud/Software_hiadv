-- HiAdv 6 (25/11/2026): Sênior sem IA (senior, R$ 397,50) e Sênior + Sara (supremo, R$ 524,50).
-- Também acerta os preços antigos que estavam no banco (o painel de receita da Central usa estes valores).
alter table public.planos drop constraint if exists planos_id_check;
alter table public.planos add constraint planos_id_check check (id in ('pro', 'premium', 'senior', 'supremo'));
alter table public.adesoes drop constraint if exists adesoes_plano_check;
alter table public.adesoes add constraint adesoes_plano_check check (plano in ('pro', 'premium', 'senior', 'supremo'));
alter table public.adesoes drop constraint if exists adesoes_recomendado_check;
alter table public.adesoes add constraint adesoes_recomendado_check check (recomendado is null or recomendado in ('pro', 'premium', 'senior', 'supremo'));

insert into public.planos (id, nome, preco, preco_fundador, masters, colaboradores, oabs, ia_mensal, ordem) values
  ('pro', 'Júnior', 119.90, 119.90, 1, 1, 1, 0, 1),
  ('premium', 'Pleno', 197.90, 197.90, 3, 8, 3, 0, 2),
  ('senior', 'Sênior', 397.50, 397.50, 5, 20, 10, 0, 3),
  ('supremo', 'Sênior + Sara', 524.50, 524.50, 5, 20, 10, 300, 4)
on conflict (id) do update set nome = excluded.nome, preco = excluded.preco, preco_fundador = excluded.preco_fundador,
  masters = excluded.masters, colaboradores = excluded.colaboradores, oabs = excluded.oabs, ia_mensal = excluded.ia_mensal, ordem = excluded.ordem;

-- Sênior sem IA: tudo do Sênior + Sara, menos IA e Sara
delete from public.plano_recursos where plano = 'senior';
insert into public.plano_recursos (plano, recurso)
  select 'senior', recurso from public.plano_recursos where plano = 'supremo' and recurso not in ('ia', 'sara');

-- funções que conferem o plano passam a aceitar o 'senior'; os dois Sênior seguem "em breve" para ativar adesão
do $$
declare f text; d text;
begin
  foreach f in array array['hiadv_adesao_plano','hiadv_adesao_enviar','hiadv_central_assinatura','hiadv_central_novo','hiadv_adesao_atualizar'] loop
    d := pg_get_functiondef(('public.' || f)::regproc);
    d := replace(d, $q$('pro', 'premium', 'supremo')$q$, $q$('pro', 'premium', 'senior', 'supremo')$q$);
    d := replace(d, $q$a.plano = 'supremo' then raise exception 'O Supremo ainda não está liberado$q$, $q$a.plano in ('senior', 'supremo') then raise exception 'O Sênior ainda não está liberado$q$);
    execute d;
  end loop;
end $$;
