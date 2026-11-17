-- RLS de §10. Toda decisión de autorización se evalúa con auth.uid().
-- service_role conserva el acceso administrativo de Supabase mediante BYPASSRLS.

alter table profiles enable row level security;
alter table cuadrillas enable row level security;
alter table costaleros enable row level security;
alter table pasos enable row level security;
alter table trabajaderas enable row level security;
alter table asignaciones enable row level security;
alter table tramos enable row level security;
alter table planes enable row level security;
alter table relevos enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on
  profiles,
  cuadrillas,
  costaleros,
  pasos,
  trabajaderas,
  asignaciones,
  tramos,
  planes,
  relevos
to authenticated, service_role;

-- El capataz administra su propio perfil sin poder cambiar su rol.
create policy profiles_select_own
on profiles for select to authenticated
using (id = auth.uid());

create policy profiles_update_capataz_own
on profiles for update to authenticated
using (id = auth.uid() and role = 'capataz')
with check (id = auth.uid() and role = 'capataz');

-- Control total del capataz sobre la cuadrilla que posee.
create policy cuadrillas_capataz_owner_all
on cuadrillas for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy costaleros_capataz_owner_all
on costaleros for all to authenticated
using (
  exists (
    select 1
    from cuadrillas q
    where q.id = costaleros.cuadrilla_id
      and q.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from cuadrillas q
    where q.id = costaleros.cuadrilla_id
      and q.owner_id = auth.uid()
  )
);

create policy pasos_capataz_owner_all
on pasos for all to authenticated
using (
  exists (
    select 1
    from cuadrillas q
    where q.id = pasos.cuadrilla_id
      and q.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from cuadrillas q
    where q.id = pasos.cuadrilla_id
      and q.owner_id = auth.uid()
  )
);

create policy trabajaderas_capataz_owner_all
on trabajaderas for all to authenticated
using (
  exists (
    select 1
    from pasos p
    join cuadrillas q on q.id = p.cuadrilla_id
    where p.id = trabajaderas.paso_id
      and q.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from pasos p
    join cuadrillas q on q.id = p.cuadrilla_id
    where p.id = trabajaderas.paso_id
      and q.owner_id = auth.uid()
  )
);

create policy asignaciones_capataz_owner_all
on asignaciones for all to authenticated
using (
  exists (
    select 1
    from trabajaderas t
    join pasos p on p.id = t.paso_id
    join cuadrillas q on q.id = p.cuadrilla_id
    where t.id = asignaciones.trabajadera_id
      and q.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from trabajaderas t
    join pasos p on p.id = t.paso_id
    join cuadrillas q on q.id = p.cuadrilla_id
    where t.id = asignaciones.trabajadera_id
      and q.owner_id = auth.uid()
  )
);

create policy tramos_capataz_owner_all
on tramos for all to authenticated
using (
  exists (
    select 1
    from pasos p
    join cuadrillas q on q.id = p.cuadrilla_id
    where p.id = tramos.paso_id
      and q.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from pasos p
    join cuadrillas q on q.id = p.cuadrilla_id
    where p.id = tramos.paso_id
      and q.owner_id = auth.uid()
  )
);

create policy planes_capataz_owner_all
on planes for all to authenticated
using (
  exists (
    select 1
    from pasos p
    join cuadrillas q on q.id = p.cuadrilla_id
    where p.id = planes.paso_id
      and q.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from pasos p
    join cuadrillas q on q.id = p.cuadrilla_id
    where p.id = planes.paso_id
      and q.owner_id = auth.uid()
  )
);

create policy relevos_capataz_owner_all
on relevos for all to authenticated
using (
  exists (
    select 1
    from planes pl
    join pasos p on p.id = pl.paso_id
    join cuadrillas q on q.id = p.cuadrilla_id
    where pl.id = relevos.plan_id
      and q.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from planes pl
    join pasos p on p.id = pl.paso_id
    join cuadrillas q on q.id = p.cuadrilla_id
    where pl.id = relevos.plan_id
      and q.owner_id = auth.uid()
  )
);

-- El costalero solo puede usar su propia identidad como ancla de pertenencia.
-- La fila de otro costalero de la misma cuadrilla nunca es visible.
create policy costaleros_costalero_select_own
on costaleros for select to authenticated
using (
  id = auth.uid()
  and exists (
    select 1
    from profiles p
    where p.id = auth.uid()
      and p.role = 'costalero'
  )
);

-- Passthrough mínimo para resolver la cuadrilla del plan publicado sin
-- exponer costaleros, asignaciones, tramos ni relevos al costalero.
create policy pasos_costalero_select_own_context
on pasos for select to authenticated
using (
  exists (
    select 1
    from costaleros c
    where c.id = auth.uid()
      and c.cuadrilla_id = pasos.cuadrilla_id
  )
);

create policy planes_costalero_select_published
on planes for select to authenticated
using (
  status = 'publicado'
  and exists (
    select 1
    from pasos p
    join costaleros c on c.cuadrilla_id = p.cuadrilla_id
    where p.id = planes.paso_id
      and c.id = auth.uid()
  )
);
