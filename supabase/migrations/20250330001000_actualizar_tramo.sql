create or replace function public.actualizar_tramo(
  p_tramo_id uuid,
  p_nombre text,
  p_tipo text
)
returns setof public.tramos
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_paso_id uuid;
begin
  select t.paso_id
    into v_paso_id
    from public.tramos t
   where t.id = p_tramo_id;

  if v_paso_id is null then
    raise exception 'El tramo no existe.'
      using errcode = 'P0001';
  end if;

  if p_nombre is not null and btrim(p_nombre) = '' then
    raise exception 'El nombre del tramo no puede estar vacío.'
      using errcode = 'P0001';
  end if;

  if p_tipo is not null
     and p_tipo not in ('salida', 'normal', 'entrada') then
    raise exception 'El tipo del tramo tiene que ser salida, normal o entrada.'
      using errcode = 'P0001';
  end if;

  perform t.id
    from public.tramos t
   where t.paso_id = v_paso_id
     for update;

  update public.tramos t
     set name = case when p_nombre is null then t.name else btrim(p_nombre) end,
         kind = coalesce(p_tipo, t.kind)
   where t.id = p_tramo_id;

  return query
    select t.*
      from public.tramos t
     where t.paso_id = v_paso_id
     order by t.ordinal;
end;
$$;

revoke execute on function public.actualizar_tramo(uuid, text, text) from public;
revoke execute on function public.actualizar_tramo(uuid, text, text) from anon;
grant execute on function public.actualizar_tramo(uuid, text, text)
  to authenticated, service_role;
