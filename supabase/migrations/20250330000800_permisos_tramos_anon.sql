-- Permisos de las funciones de tramos: también fuera de `anon`.
--
-- La migración anterior quitó el `EXECUTE` que Postgres concede a `PUBLIC` por
-- defecto, pero en Supabase las funciones nuevas reciben además un permiso
-- explícito para `anon` por los `default privileges` del proyecto
-- (`alter default privileges ... grant execute on functions to anon`). Por eso
-- `anon` todavía podía invocar las funciones de tramos.
--
-- La app llama siempre con la sesión del capataz (`authenticated`) y el
-- servicio con `service_role`: `anon` no necesita poder invocarlas.

revoke execute on function public.reordenar_tramos(uuid, uuid[]) from anon;
revoke execute on function public.anexar_tramo(uuid, text) from anon;
revoke execute on function public.borrar_tramo(uuid) from anon;
