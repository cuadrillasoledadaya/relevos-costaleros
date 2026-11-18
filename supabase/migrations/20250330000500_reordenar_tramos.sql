-- Reordenación transaccional de los tramos del recorrido (§8.3).
--
-- El orden del recorrido se cambia moviendo tramos de sitio. Con PostgREST no
-- hay transacciones de varias sentencias, así que la reordenación se hace
-- dentro de esta función: o se aplica entera, o no se aplica nada. Nunca puede
-- quedar un `ordinal` repetido ni un hueco, porque el índice único
-- `(paso_id, ordinal)` lo impide dentro de la misma transacción y el recorrido
-- se lee por `ordinal`.
--
-- La función es SECURITY INVOKER: mandan las políticas de RLS de §10, así que
-- sólo el capataz dueño de la cuadrilla puede reordenar los tramos de su paso.
--
-- No cambia el modelo de datos de §10: sólo añade una función.

create or replace function public.reordenar_tramos(
  p_paso_id uuid,
  p_orden uuid[]
)
returns setof public.tramos
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_total integer;
  v_desplazamiento integer;
begin
  -- Se bloquean los tramos del paso: dos reordenamientos simultáneos no se
  -- pisan y el recálculo de ordinales y tipos se hace sobre el estado real.
  perform t.id
    from public.tramos t
   where t.paso_id = p_paso_id
     for update;

  select count(*)::integer
    into v_total
    from public.tramos t
   where t.paso_id = p_paso_id;

  -- La lista tiene que ser exactamente la de los tramos guardados del paso:
  -- ni de más, ni de menos, ni repetida.
  if coalesce(array_length(p_orden, 1), 0) <> v_total then
    raise exception
      'La lista de tramos no coincide con los tramos guardados del paso.'
      using errcode = 'P0001';
  end if;

  if (select count(distinct x) from unnest(p_orden) as x) <> v_total then
    raise exception
      'La lista de tramos no coincide con los tramos guardados del paso.'
      using errcode = 'P0001';
  end if;

  if exists (
    select 1
      from public.tramos t
     where t.paso_id = p_paso_id
       and not (t.id = any (p_orden))
  ) then
    raise exception
      'La lista de tramos no coincide con los tramos guardados del paso.'
      using errcode = 'P0001';
  end if;

  select coalesce(max(t.ordinal), 0) + 1
    into v_desplazamiento
    from public.tramos t
   where t.paso_id = p_paso_id;

  -- Fase 1: los ordinales se apartan a un rango libre para que el índice
  -- único `(paso_id, ordinal)` no choque al escribir el orden nuevo.
  update public.tramos t
     set ordinal = t.ordinal + v_desplazamiento
   where t.paso_id = p_paso_id;

  -- Fase 2: ordinal final según el orden pedido (1..N, sin huecos ni repetidos).
  update public.tramos t
     set ordinal = sub.n
    from unnest(p_orden) with ordinality as sub(id, n)
   where t.id = sub.id
     and t.paso_id = p_paso_id;

  -- Fase 3: tipos canónicos del recorrido: el primero es la salida y el
  -- último la entrada (§8.3). Un tipo puesto a mano se recalcula aquí y
  -- vuelve a su valor canónico en el siguiente cambio de estructura.
  update public.tramos t
     set kind = case
                  when t.ordinal = 1 then 'salida'
                  when t.ordinal = v_total then 'entrada'
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

grant execute on function public.reordenar_tramos(uuid, uuid[])
  to authenticated, service_role;
