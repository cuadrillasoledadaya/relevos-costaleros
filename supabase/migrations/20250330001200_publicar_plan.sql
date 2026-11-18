-- Publica un plan de relevos y despublica los demás del mismo paso.
--
-- Un paso tiene un solo plan publicado: es el que ve el costalero (§10) y el
-- que la pantalla P5 muestra como "el publicado" (§9). Con PostgREST no hay
-- transacciones de varias sentencias, así que el cambio de estado vive en
-- esta función: o se publica el plan y se despublican los demás, o no se
-- cambia nada.

create or replace function public.publicar_plan(
  p_plan_id uuid
)
returns setof public.planes
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_paso_id uuid;
begin
  -- Se bloquea el plan: dos publicaciones simultáneas no pueden dejar dos
  -- planes publicados del mismo paso.
  select pl.paso_id
    into v_paso_id
    from public.planes pl
   where pl.id = p_plan_id
     for update;

  if v_paso_id is null then
    raise exception 'El plan no existe.'
      using errcode = 'P0001';
  end if;

  update public.planes
     set status = 'borrador'
   where paso_id = v_paso_id
     and status = 'publicado'
     and id <> p_plan_id;

  update public.planes
     set status = 'publicado'
   where id = p_plan_id;

  return query
    select pl.*
      from public.planes pl
     where pl.id = p_plan_id;
end;
$$;

revoke execute on function public.publicar_plan(uuid) from public;
revoke execute on function public.publicar_plan(uuid) from anon;
grant execute on function public.publicar_plan(uuid)
  to authenticated, service_role;
