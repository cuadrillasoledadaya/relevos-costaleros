-- Unicidad de la cuenta del costalero.
--
-- §10 declara `costaleros.profile_id` como el ancla de pertenencia, pero no fijaba
-- que una cuenta sólo pueda estar en UNA cuadrilla: la app lo comprobaba antes de
-- insertar y dos altas simultáneas se colaban. Este índice parcial convierte la
-- regla en una garantía de la base sin afectar a los costaleros que todavía no
-- tienen cuenta (`profile_id` nulo).
--
-- Autorizado por el usuario el 2026-11-17 (§10 es un contrato cerrado: esto es una
-- desviación suya, explícita y documentada).

create unique index costaleros_profile_id_unico
  on costaleros (profile_id)
  where profile_id is not null;
