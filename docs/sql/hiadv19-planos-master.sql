-- HiAdv 19 (26/11/2026): nova grade de planos.
-- Júnior: 2 acessos (2 gestores, ou 1 gestor e 1 colaborador). Pleno: 3 gestores e 6 colaboradores.
-- Sênior: 5 gestores e 8 colaboradores, com a IA própria do escritório, liberado para adesão.
-- Master (id 'supremo'): Sara Integrada, a partir de 5 gestores e 8 colaboradores, acessos extras sob medida; segue "em breve".
-- O papel "master" no banco continua com esse nome técnico; na tela ele passa a ser "Gestor".
alter table public.planos add column if not exists acessos int;
update public.planos set nome = 'Júnior',  masters = 2, colaboradores = 1, acessos = 2  where id = 'pro';
update public.planos set nome = 'Pleno',   masters = 3, colaboradores = 6, acessos = 9  where id = 'premium';
update public.planos set nome = 'Sênior',  masters = 5, colaboradores = 8, acessos = 13 where id = 'senior';
update public.planos set nome = 'Master',  masters = 5, colaboradores = 8, acessos = 13 where id = 'supremo';
-- o Sênior passa a poder ser ativado; só o Master segue bloqueado
do $$
declare d text;
begin
  d := pg_get_functiondef('public.hiadv_adesao_atualizar'::regproc);
  d := replace(d, $q$a.plano in ('senior', 'supremo') then raise exception 'O Sênior ainda não está liberado$q$, $q$a.plano = 'supremo' then raise exception 'O plano Master ainda não está liberado$q$);
  execute d;
end $$;
