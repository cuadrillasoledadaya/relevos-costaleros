-- Permisos de las funciones de tramos (§8.3): sólo quien puede managear el
-- recorrido puede llamarlas.
--
-- En Postgres una función nace con `EXECUTE` para `PUBLIC`, así que con el
-- `grant` a `authenticated` y `service_role` de las migraciones anteriores
-- cualquier rol (incluido `anon`) podía invocarlas. El RLS ya impedía que
-- tocaran datos ajenos, pero lo correcto es quitarles el permiso por
-- defecto y dejarlo sólo a quien lo necesita.
--
-- La app llama siempre con la sesión del capataz (`authenticated`), y el
-- servicio con `service_role`.

revoke execute on function public.reordenar_tramos(uuid, uuid[]) from public;
revoke execute on function public.anexar_tramo(uuid, text) from public;
revoke execute on function public.borrar_tramo(uuid) from public;

grant execute on function public.reordenar_tramos(uuid, uuid[])
  to authenticated, service_role;

grant execute on function public.anexar_tramo(uuid, text)
  to authenticated, service_role;

grant execute on function public.borrar_tramo(uuid)
  to authenticated, service_role;
