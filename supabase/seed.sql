-- Seed de demostración de §10.
--
-- §10 ancla la pertenencia del costalero en `costaleros.profile_id`, que apunta
-- a la cuenta (`profiles.id` = `auth.users.id`). Por eso el id de la FILA del
-- costalero (1...) es distinto del id de su cuenta (c...): el capataz puede dar
-- de alta a un costalero antes de que esa persona tenga cuenta, y esa fila queda
-- con `profile_id` nulo hasta que se registre.

-- Las cuentas del seed son usuarios REALES de Supabase Auth: sin instance_id,
-- aud y role, GoTrue no las ve (la API de administración devuelve una lista
-- vacia) y no se puede iniciar sesion con ellas. El instance_id de Supabase es
-- el UUID estandar de todos ceros. La contrasena NO va en el seed (el
-- repositorio es publico): se fija despues por la API de administracion.
insert into auth.users (
  id,
  email,
  raw_user_meta_data,
  raw_app_meta_data,
  instance_id,
  aud,
  role,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  phone_change_token,
  phone_change,
  reauthentication_token,
  email_change_token_current,
  email_change_confirm_status,
  created_at,
  updated_at
)
values
  ('a0000000-0000-4000-8000-000000000001', 'capataz@relevos.example', '{}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), '', '', '', '', '', '', '', '', 0, now(), now()),
  ('c0000000-0000-4000-8000-000000000001', 'costalero-01@relevos.example', '{}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), '', '', '', '', '', '', '', '', 0, now(), now()),
  ('c0000000-0000-4000-8000-000000000002', 'costalero-02@relevos.example', '{}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), '', '', '', '', '', '', '', '', 0, now(), now()),
  ('c0000000-0000-4000-8000-000000000003', 'costalero-03@relevos.example', '{}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), '', '', '', '', '', '', '', '', 0, now(), now()),
  ('c0000000-0000-4000-8000-000000000004', 'costalero-04@relevos.example', '{}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), '', '', '', '', '', '', '', '', 0, now(), now()),
  ('c0000000-0000-4000-8000-000000000005', 'costalero-05@relevos.example', '{}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), '', '', '', '', '', '', '', '', 0, now(), now()),
  ('c0000000-0000-4000-8000-000000000006', 'costalero-06@relevos.example', '{}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), '', '', '', '', '', '', '', '', 0, now(), now()),
  ('c0000000-0000-4000-8000-000000000007', 'costalero-07@relevos.example', '{}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), '', '', '', '', '', '', '', '', 0, now(), now()),
  ('c0000000-0000-4000-8000-000000000008', 'costalero-08@relevos.example', '{}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), '', '', '', '', '', '', '', '', 0, now(), now()),
  ('c0000000-0000-4000-8000-000000000009', 'costalero-09@relevos.example', '{}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), '', '', '', '', '', '', '', '', 0, now(), now()),
  ('c0000000-0000-4000-8000-000000000010', 'costalero-10@relevos.example', '{}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), '', '', '', '', '', '', '', '', 0, now(), now()),
  ('c0000000-0000-4000-8000-000000000011', 'costalero-11@relevos.example', '{}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), '', '', '', '', '', '', '', '', 0, now(), now())
on conflict (id) do update
set email = excluded.email,
    raw_user_meta_data = excluded.raw_user_meta_data,
    raw_app_meta_data = excluded.raw_app_meta_data,
    instance_id = excluded.instance_id,
    aud = excluded.aud,
    role = excluded.role,
    email_confirmed_at = excluded.email_confirmed_at,
    confirmation_token = excluded.confirmation_token,
    recovery_token = excluded.recovery_token,
    email_change_token_new = excluded.email_change_token_new,
    email_change = excluded.email_change,
    phone_change_token = excluded.phone_change_token,
    phone_change = excluded.phone_change,
    reauthentication_token = excluded.reauthentication_token,
    email_change_token_current = excluded.email_change_token_current,
    email_change_confirm_status = excluded.email_change_confirm_status,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at;

-- GoTrue espera una identidad por cuenta: sin fila en auth.identities la
-- cuenta existe pero no se puede autenticar (error 500 "Database error
-- querying schema" al iniciar sesion).
insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  u.id,
  u.id,
  u.id,
  jsonb_build_object(
    'sub', u.id,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now(),
  now()
from auth.users u
where u.email like '%@relevos.example'
on conflict (provider_id, provider) do update
set identity_data = excluded.identity_data,
    updated_at = now();

insert into profiles (id, full_name, role)
values
  ('a0000000-0000-4000-8000-000000000001', 'Capataz de demostración', 'capataz'),
  ('c0000000-0000-4000-8000-000000000001', 'Costalero 01', 'costalero'),
  ('c0000000-0000-4000-8000-000000000002', 'Costalero 02', 'costalero'),
  ('c0000000-0000-4000-8000-000000000003', 'Costalero 03', 'costalero'),
  ('c0000000-0000-4000-8000-000000000004', 'Costalero 04', 'costalero'),
  ('c0000000-0000-4000-8000-000000000005', 'Costalero 05', 'costalero'),
  ('c0000000-0000-4000-8000-000000000006', 'Costalero 06', 'costalero'),
  ('c0000000-0000-4000-8000-000000000007', 'Costalero 07', 'costalero'),
  ('c0000000-0000-4000-8000-000000000008', 'Costalero 08', 'costalero'),
  ('c0000000-0000-4000-8000-000000000009', 'Costalero 09', 'costalero'),
  ('c0000000-0000-4000-8000-000000000010', 'Costalero 10', 'costalero'),
  ('c0000000-0000-4000-8000-000000000011', 'Costalero 11', 'costalero')
on conflict (id) do update
set full_name = excluded.full_name,
    role = excluded.role;

insert into cuadrillas (id, name, season, owner_id, notes)
values (
  'b0000000-0000-4000-8000-000000000001',
  'Cuadrilla de demostración',
  2025,
  'a0000000-0000-4000-8000-000000000001',
  'Datos sintéticos para desarrollo y pruebas locales.'
)
on conflict (id) do update
set name = excluded.name,
    season = excluded.season,
    owner_id = excluded.owner_id,
    notes = excluded.notes,
    updated_at = now();

insert into costaleros (id, profile_id, cuadrilla_id, full_name, nickname, phone, notes, active)
values
  ('10000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Costalero 01', 'Uno', null, null, true),
  ('10000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Costalero 02', 'Dos', null, null, true),
  ('10000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'Costalero 03', 'Tres', null, null, true),
  ('10000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'Costalero 04', 'Cuatro', null, null, true),
  ('10000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001', 'Costalero 05', 'Cinco', null, null, true),
  ('10000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000001', 'Costalero 06', 'Seis', null, null, true),
  ('10000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000001', 'Costalero 07', 'Siete', null, null, true),
  ('10000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000001', 'Costalero 08', 'Ocho', null, null, true),
  ('10000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000001', 'Costalero 09', 'Nueve', null, null, true),
  ('10000000-0000-4000-8000-000000000010', 'c0000000-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-000000000001', 'Costalero 10', 'Diez', null, null, true),
  ('10000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000001', 'Costalero 11', 'Once', null, null, true),
  ('10000000-0000-4000-8000-000000000012', null, 'b0000000-0000-4000-8000-000000000001', 'Costalero 12', 'Doce', null, null, true)
on conflict (id) do update
set profile_id = excluded.profile_id,
    cuadrilla_id = excluded.cuadrilla_id,
    full_name = excluded.full_name,
    nickname = excluded.nickname,
    phone = excluded.phone,
    notes = excluded.notes,
    active = excluded.active,
    updated_at = now();

insert into pasos (id, cuadrilla_id, name, season, num_trabajaderas)
values (
  'd0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  'Paso de demostración',
  2025,
  3
)
on conflict (id) do update
set cuadrilla_id = excluded.cuadrilla_id,
    name = excluded.name,
    season = excluded.season,
    num_trabajaderas = excluded.num_trabajaderas,
    updated_at = now();

-- Con T=4, pool=4 y carga=2 se cumple F-1..F-6:
-- r=2, T*r=2*pool y pool*ceil(T/2)=T*r.
insert into trabajaderas (id, paso_id, position, carga)
values
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 1, 2),
  ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 2, 2),
  ('e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 3, 2)
on conflict (id) do update
set paso_id = excluded.paso_id,
    position = excluded.position,
    carga = excluded.carga;

insert into asignaciones (trabajadera_id, costalero_id, is_boquilla)
values
  ('e0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', true),
  ('e0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', false),
  ('e0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', false),
  ('e0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', false),
  ('e0000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000005', true),
  ('e0000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000006', false),
  ('e0000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000007', false),
  ('e0000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000008', false),
  ('e0000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000009', false),
  ('e0000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000010', false),
  ('e0000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000011', false),
  ('e0000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000012', false)
on conflict (trabajadera_id, costalero_id) do update
set is_boquilla = excluded.is_boquilla;

insert into tramos (id, paso_id, name, ordinal, kind)
values
  ('f0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Salida', 1, 'salida'),
  ('f0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Primer tramo', 2, 'normal'),
  ('f0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'Segundo tramo', 3, 'normal'),
  ('f0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 'Entrada', 4, 'entrada')
on conflict (id) do update
set paso_id = excluded.paso_id,
    name = excluded.name,
    ordinal = excluded.ordinal,
    kind = excluded.kind;
