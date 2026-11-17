-- Guarda un plan de relevos y sus filas en una sola transacción.
--
-- El plan y sus relevos van juntos: si quedara el plan sin filas, el
-- costalero vería un plan que no existe. Con PostgREST no hay transacciones
-- de varias sentencias, así que la escritura entera vive en esta función.

create or replace function public.guardar_plan(
  p_paso_id uuid,
  p_seed bigint,
  p_solver_version text,
  p_stats jsonb,
  p_relevos jsonb
)
returns setof public.planes
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_version integer;
  v_plan_id uuid;
begin
  -- Se bloquea el paso: dos guardados simultáneos no pueden coger la misma
  -- versión (unique (paso_id, version)).
  perform p.id
    from public.pasos p
   where p.id = p_paso_id
     for update;

  select coalesce(max(pl.version), 0) + 1
    into v_version
    from public.planes pl
   where pl.paso_id = p_paso_id;

  insert into public.planes (
    paso_id, version, status, seed, solver_version, stats, created_by
  )
  values (
    p_paso_id, v_version, 'borrador', p_seed, p_solver_version, p_stats, auth.uid()
  )
  returning id into v_plan_id;

  if v_plan_id is null then
    raise exception 'No se ha podido guardar el plan de este paso.'
      using errcode = 'P0001';
  end if;

  -- Cada relevo es {tramo_id, costalero_id, estado}.
  insert into public.relevos (plan_id, tramo_id, costalero_id, estado)
  select v_plan_id,
         (r ->> 'tramo_id')::uuid,
         (r ->> 'costalero_id')::uuid,
         r ->> 'estado'
    from jsonb_array_elements(coalesce(p_relevos, '[]'::jsonb)) as r;

  return query
    select pl.*
      from public.planes pl
     where pl.id = v_plan_id;
end;
$$;

revoke execute on function public.guardar_plan(uuid, bigint, text, jsonb, jsonb) from public;
revoke execute on function public.guardar_plan(uuid, bigint, text, jsonb, jsonb) from anon;
grant execute on function public.guardar_plan(uuid, bigint, text, jsonb, jsonb)
  to authenticated, service_role;
