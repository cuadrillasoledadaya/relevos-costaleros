-- Alta y baja de tramos del recorrido (§8.3), en una sola transacción.
--
-- Un tramo se añade al final del recorrido y se borra del medio. En los dos
-- casos hay que rehacer los ordinales (1..N, sin huecos ni repetidos) y los
-- tipos canónicos (el primero es la salida y el último la entrada). Con
-- PostgREST no hay transacciones de varias sentencias, así que cada operación
-- va en su propia función: o se aplica entera, o no se aplica nada.
--
-- Como `reordenar_tramos`, estas funciones son SECURITY INVOKER: mandan las
-- políticas de RLS de §10.

-- Añade un tramo al final del recorrido con su nombre.
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

  -- Se bloquean los tramos del paso: el alta no se pisa con otra escritura.
  perform t.id
    from public.tramos t
   where t.paso_id = p_paso_id
     for update;

  select count(*)::integer, coalesce(max(t.ordinal), 0) + 1
    into v_total, v_ordinal
    from public.tramos t
   where t.paso_id = p_paso_id;

  -- El tramo anterior deja de ser la entrada: el nuevo es el final del
  -- recorrido. Se hace antes del alta para que no haya dos entradas.
  if v_total >= 2 then
    update public.tramos t
       set kind = 'normal'
     where t.paso_id = p_paso_id
       and t.ordinal < v_ordinal
       and t.kind = 'entrada';
  end if;

  insert into public.tramos (paso_id, name, ordinal, kind)
  values (
    p_paso_id,
    btrim(p_nombre),
    v_ordinal,
    case when v_total = 0 then 'salida' else 'entrada' end
  );

  return query
    select t.*
      from public.tramos t
     where t.paso_id = p_paso_id
     order by t.ordinal;
end;
$$;

-- Borra un tramo del recorrido y renumera los que quedan.
create or replace function public.borrar_tramo(p_tramo_id uuid)
returns setof public.tramos
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_paso_id uuid;
  v_total integer;
  v_desplazamiento integer;
begin
  select t.paso_id
    into v_paso_id
    from public.tramos t
   where t.id = p_tramo_id;

  if v_paso_id is null then
    raise exception 'El tramo no existe.'
      using errcode = 'P0001';
  end if;

  perform t.id
    from public.tramos t
   where t.paso_id = v_paso_id
     for update;

  delete from public.tramos t where t.id = p_tramo_id;

  select count(*)::integer, coalesce(max(t.ordinal), 0) + 1
    into v_total, v_desplazamiento
    from public.tramos t
   where t.paso_id = v_paso_id;

  if v_total > 0 then
    -- Se apartan los ordinales y se reescriben 1..N, sin huecos ni repetidos.
    update public.tramos t
       set ordinal = t.ordinal + v_desplazamiento
     where t.paso_id = v_paso_id;

    update public.tramos t
       set ordinal = sub.n
      from (
        select t2.id, row_number() over (order by t2.ordinal) as n
          from public.tramos t2
         where t2.paso_id = v_paso_id
      ) as sub
     where t.id = sub.id
       and t.paso_id = v_paso_id;

    update public.tramos t
       set kind = case
                    when t.ordinal = 1 then 'salida'
                    when t.ordinal = v_total then 'entrada'
                    else 'normal'
                  end
     where t.paso_id = v_paso_id;
  end if;

  return query
    select t.*
      from public.tramos t
     where t.paso_id = v_paso_id
     order by t.ordinal;
end;
$$;

grant execute on function public.anexar_tramo(uuid, text)
  to authenticated, service_role;

grant execute on function public.borrar_tramo(uuid)
  to authenticated, service_role;
