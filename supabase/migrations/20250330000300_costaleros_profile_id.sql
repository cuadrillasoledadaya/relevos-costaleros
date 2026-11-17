-- Ancla de pertenencia del costalero (§10).
--
-- §10 define `costaleros.profile_id` como referencia a `profiles(id)` y lo declara
-- el ancla de pertenencia: `costaleros.profile_id = auth.uid()`. La migración
-- inicial no lo traía, así que las políticas del costalero quedaron atadas a
-- `costaleros.id`. Con esa atadura el capataz NO podía dar de alta a un costalero
-- antes de que esa persona tuviera cuenta (el id de la fila se genera al azar y
-- nunca puede coincidir con el uid de la cuenta).
--
-- Las migraciones no se editan una vez aplicadas: esta las corrige.

alter table costaleros
  add column profile_id uuid references profiles(id) on delete set null;

-- El costalero se identifica por su cuenta, no por el id de la fila.
drop policy if exists costaleros_costalero_select_own on costaleros;
create policy costaleros_costalero_select_own
on costaleros for select to authenticated
using (
  profile_id = auth.uid()
  and exists (
    select 1
    from profiles p
    where p.id = auth.uid()
      and p.role = 'costalero'
  )
);

drop policy if exists pasos_costalero_select_own_context on pasos;
create policy pasos_costalero_select_own_context
on pasos for select to authenticated
using (
  exists (
    select 1
    from costaleros c
    where c.profile_id = auth.uid()
      and c.cuadrilla_id = pasos.cuadrilla_id
  )
);

drop policy if exists planes_costalero_select_published on planes;
create policy planes_costalero_select_published
on planes for select to authenticated
using (
  status = 'publicado'
  and exists (
    select 1
    from pasos p
    join costaleros c on c.cuadrilla_id = p.cuadrilla_id
    where p.id = planes.paso_id
      and c.profile_id = auth.uid()
  )
);
