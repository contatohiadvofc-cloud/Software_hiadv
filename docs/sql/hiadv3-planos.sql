-- Planos de 24/11/2026: Júnior R$ 119,90 · Pleno R$ 197,90 · Sênior R$ 397,50.
-- Mesma lista de src/data/planos.ts. Assinatura digital passa do Sênior para o Pleno.
begin;
delete from public.plano_recursos;
insert into public.plano_recursos (plano, recurso)
select 'pro', unnest(array['casos','atendimentos','clientes','prazos','publicacoes','agenda','acompanhamento','documentos','celular','intimacoes_conectadas','calc_prazos'])
union all
select 'premium', unnest(array['casos','atendimentos','clientes','prazos','publicacoes','agenda','acompanhamento','documentos','celular','intimacoes_conectadas','calc_prazos','financeiro','relatorios','horas','atencao','calculadoras','assinatura','cobranca'])
union all
select 'supremo', unnest(array['casos','atendimentos','clientes','prazos','publicacoes','agenda','acompanhamento','documentos','celular','intimacoes_conectadas','calc_prazos','financeiro','relatorios','horas','atencao','calculadoras','assinatura','cobranca','drive','identificador','ia','sara','whatsapp','api']);
-- o antigo 'zapsign' vira 'assinatura' nos ajustes manuais da Central
update public.escritorio_ajustes set recurso = 'assinatura' where recurso = 'zapsign';
update public.pessoa_ajustes set recurso = 'assinatura' where recurso = 'zapsign';
commit;
