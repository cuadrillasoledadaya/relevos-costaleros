create or replace function public.anexar_tramo(
  p_paso_id uuid,
  p_nombre text
)
returns setof public.tramos
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_total integer;
  v_ordinal integer;
begin
  if p_nombre is null or btrim(p_nombre) = '' then
    raise exception 'El nombre del tramo no puede estar vacío.'
      using errcode = 'P0001';
  end if;

  perform t.id
    from public.tramos t
   where t.paso_id = p_paso_id
     for update;

  select count(*)::integer, coalesce(max(t.ordinal), 0) + 1
    into v_total, v_ordinal
    from public.tramos t
   where t.paso_id = p_paso_id;

  insert into public.tramos (paso_id, name, ordinal, kind)
  values (
    p_paso_id,
    btrim(p_nombre),
    v_ordinal,
    case when v_total = 0 then 'salida' else 'entrada' end
  );

  -- Tipos canónicos del recorrido (§8.3): el primero es la salida y el
  -- último la entrada. Un tipo puesto a mano se recalcula aquí.
  update public.tramos t
     set kind = case
                  when t.ordinal = 1 then 'salida'
                  when t.ordinal = v_total + 1 then 'entrada'
                  else 'normal'
                end
   where t.paso_id = p_paso_id;

  return query
    select t.*
      from public.tramos t
     where t.paso_id = p_paso_id
     order by t.ordinal;
end;
$$;

revoke execute on function public.anexar_tramo(uuid, text) from public;
revoke execute on function public.anexar_tramo(uuid, text) from anon;
grant execute on function public.anexar_tramo(uuid, text)
  to authenticated, service_role;
