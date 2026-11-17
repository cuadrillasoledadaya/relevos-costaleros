/**
 * Tipos de `import.meta.glob` (API de Vite) para el entorno de tests.
 *
 * El repositorio no incluye los tipos de `vite/client` en su `tsconfig.json` (el paquete
 * `vite` no es una dependencia directa), así que aquí se declara únicamente el método
 * que usa `src/domain/__tests__/dominio-puro.test.ts` para leer los ficheros del dominio
 * como texto sin usar `fs`, `node:*` ni ningún otro módulo externo.
 *
 * Si en el futuro se añaden los tipos de `vite/client` al `tsconfig.json`, esta
 * declaración debe eliminarse para no duplicar `ImportMeta.glob`.
 */
interface ImportMeta {
  glob: (
    pattern: string,
    options?: { eager?: boolean; query?: string; import?: string },
  ) => Record<string, string>;
}
