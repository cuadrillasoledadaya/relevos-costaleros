-- Modelo de datos cerrado de §10. Esta migración no contiene políticas de acceso.

create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null,
  role        text not null default 'costalero' check (role in ('capataz','costalero')),
  created_at  timestamptz not null default now()
);

create table cuadrillas (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  season      int  not null,
  owner_id    uuid not null references profiles(id),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table costaleros (
  id          uuid primary key default gen_random_uuid(),
  cuadrilla_id uuid not null references cuadrillas(id) on delete cascade,
  full_name   text not null,
  nickname    text,
  phone       text,
  notes       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table pasos (
  id                uuid primary key default gen_random_uuid(),
  cuadrilla_id      uuid not null references cuadrillas(id) on delete cascade,
  name              text not null,
  season            int  not null,
  num_trabajaderas  int  not null check (num_trabajaderas between 1 and 12),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table trabajaderas (
  id        uuid primary key default gen_random_uuid(),
  paso_id   uuid not null references pasos(id) on delete cascade,
  position  int  not null check (position >= 1),
  carga     int  not null default 5 check (carga between 1 and 5),
  unique (paso_id, position)
);

-- pool de una trabajadera. is_boquilla marca a las 2 boquillas del paso.
create table asignaciones (
  trabajadera_id uuid not null references trabajaderas(id) on delete cascade,
  costalero_id   uuid not null references costaleros(id)    on delete cascade,
  is_boquilla    boolean not null default false,
  primary key (trabajadera_id, costalero_id)
);

create table tramos (
  id       uuid primary key default gen_random_uuid(),
  paso_id  uuid not null references pasos(id) on delete cascade,
  name     text not null,
  ordinal  int  not null check (ordinal >= 1),
  kind     text not null default 'normal' check (kind in ('salida','normal','entrada')),
  unique (paso_id, ordinal)
);

create table planes (
  id             uuid primary key default gen_random_uuid(),
  paso_id        uuid not null references pasos(id) on delete cascade,
  version        int  not null,
  status         text not null default 'borrador' check (status in ('borrador','publicado')),
  seed           bigint not null,
  solver_version text not null,
  stats          jsonb,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  unique (paso_id, version)
);

create table relevos (
  plan_id      uuid not null references planes(id) on delete cascade,
  tramo_id     uuid not null references tramos(id)    on delete cascade,
  costalero_id uuid not null references costaleros(id) on delete cascade,
  estado       text not null check (estado in ('en_paso','descanso')),
  primary key (plan_id, tramo_id, costalero_id)
);

create index costaleros_cuadrilla_id_idx on costaleros(cuadrilla_id);
create index trabajaderas_paso_id_idx on trabajaderas(paso_id);
create index asignaciones_costalero_id_idx on asignaciones(costalero_id);
create index tramos_paso_id_ordinal_idx on tramos(paso_id, ordinal);
create index relevos_plan_id_tramo_id_idx on relevos(plan_id, tramo_id);
