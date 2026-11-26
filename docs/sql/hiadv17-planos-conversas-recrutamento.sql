-- HiAdv 17 (26/11/2026): Conversas da equipe em todos os planos; Recrutamento a partir do Pleno.
insert into public.plano_recursos (plano, recurso)
select p, 'conversas' from unnest(array['pro','premium','senior','supremo']) p
union all
select p, 'recrutamento' from unnest(array['premium','senior','supremo']) p
on conflict do nothing;
