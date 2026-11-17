begin;

select plan(24);

-- Contrato de tablas e índices de §10.
select has_table('public', 'profiles', 'profiles existe');
select has_table('public', 'cuadrillas', 'cuadrillas existe');
select has_table('public', 'costaleros', 'costaleros existe');
select has_table('public', 'pasos', 'pasos existe');
select has_table('public', 'trabajaderas', 'trabajaderas existe');
select has_table('public', 'asignaciones', 'asignaciones existe');
select has_table('public', 'tramos', 'tramos existe');
select has_table('public', 'planes', 'planes existe');
select has_table('public', 'relevos', 'relevos existe');

select has_index('public', 'costaleros', 'costaleros_cuadrilla_id_idx', 'índice de costaleros');
select has_index('public', 'trabajaderas', 'trabajaderas_paso_id_idx', 'índice de trabajaderas');
select has_index('public', 'asignaciones', 'asignaciones_costalero_id_idx', 'índice de asignaciones');
select has_index('public', 'tramos', 'tramos_paso_id_ordinal_idx', 'índice de tramos');
select has_index('public', 'relevos', 'relevos_plan_id_tramo_id_idx', 'índice de relevos');
select has_index('public', 'costaleros', 'costaleros_profile_id_unico', 'índice único de la cuenta del costalero');

select col_type_is('public', 'profiles', 'role', 'text', 'profiles.role es texto');
select col_type_is('public', 'planes', 'seed', 'bigint', 'planes.seed es bigint');
select col_type_is('public', 'relevos', 'estado', 'text', 'relevos.estado es texto');

-- Fixtures mínimos para comprobar las políticas con el usuario real de Supabase.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000001', 'pg-capataz-a@example.test', '{}'::jsonb),
  ('10000000-0000-4000-8000-000000000002', 'pg-capataz-b@example.test', '{}'::jsonb),
  ('40000000-0000-4000-8000-000000000001', 'pg-costalero-a@example.test', '{}'::jsonb),
  ('40000000-0000-4000-8000-000000000002', 'pg-costalero-b@example.test', '{}'::jsonb)
on conflict (id) do nothing;

insert into profiles (id, full_name, role)
values
  ('10000000-0000-4000-8000-000000000001', 'Capataz A', 'capataz'),
  ('10000000-0000-4000-8000-000000000002', 'Capataz B', 'capataz'),
  ('40000000-0000-4000-8000-000000000001', 'Costalero A', 'costalero'),
  ('40000000-0000-4000-8000-000000000002', 'Costalero B', 'costalero')
on conflict (id) do nothing;

insert into cuadrillas (id, name, season, owner_id)
values
  ('20000000-0000-4000-8000-000000000001', 'Cuadrilla A', 2025, '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', 'Cuadrilla B', 2025, '10000000-0000-4000-8000-000000000002');

-- El id de la fila del costalero es distinto del id de su cuenta: la
-- pertenencia la resuelve costaleros.profile_id (§10). El costalero C no tiene
-- cuenta todavia.
insert into costaleros (id, profile_id, cuadrilla_id, full_name)
values
  ('90000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Costalero A'),
  ('90000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Costalero B'),
  ('90000000-0000-4000-8000-000000000003', null, '20000000-0000-4000-8000-000000000001', 'Costalero C');

insert into pasos (id, cuadrilla_id, name, season, num_trabajaderas)
values (
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'Paso A',
  2025,
  1
);

insert into planes (id, paso_id, version, status, seed, solver_version, created_by)
values
  ('70000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 1, 'borrador', 20250330, '1.0.0', '10000000-0000-4000-8000-000000000001'),
  ('70000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 2, 'publicado', 20250330, '1.0.0', '10000000-0000-4000-8000-000000000001');

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::text from cuadrillas where id = '20000000-0000-4000-8000-000000000001'),
  '1',
  'el capataz lee su cuadrilla'
);
select is(
  (select count(*)::text from cuadrillas where id = '20000000-0000-4000-8000-000000000002'),
  '0',
  'el capataz no lee la cuadrilla ajena'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-4000-8000-000000000001"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::text from planes where status = 'borrador'),
  '0',
  'el costalero no lee borradores'
);
select is(
  (select count(*)::text from planes where status = 'publicado'),
  '1',
  'el costalero lee el plan publicado de su cuadrilla'
);
select is(
  (select count(*)::text from costaleros where id = '90000000-0000-4000-8000-000000000002'),
  '0',
  'el costalero no lee datos de otro costalero'
);

reset role;
-- El costalero C no tiene cuenta: su id de fila no es una identidad.
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000003"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::text from planes where status = 'publicado'),
  '0',
  'un costalero sin cuenta no lee el plan publicado'
);

reset role;
rollback;
