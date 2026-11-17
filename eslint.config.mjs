import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import boundaries from "eslint-plugin-boundaries";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
      // Service worker generado por @serwist/next en el build: no es código fuente.
      "public/sw.js",
      "public/sw.js.map",
    ],
  },
  {
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
      },
      "boundaries/elements": [
        {
          type: "domain",
          pattern: "src/domain/**",
          partialMatch: false,
        },
        {
          type: "lib",
          pattern: "src/lib/**",
          partialMatch: false,
        },
        {
          type: "ui",
          pattern: "src/components/ui/**",
          partialMatch: false,
        },
        {
          type: "server",
          pattern: "src/server/**",
          partialMatch: false,
        },
        {
          type: "app",
          pattern: ["src/app/**", "src/components/features/**"],
          partialMatch: false,
        },
      ],
      "boundaries/elements-single-match": true,
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "allow",
          checkUnknownLocals: true,
          policies: [
            {
              from: { element: { type: "domain" } },
              disallow: {
                to: {
                  element: {
                    types: ["domain", "lib", "ui", "server", "app"],
                  },
                },
              },
              message:
                "La capa domain no puede importar desde otras capas del proyecto.",
            },
            {
              from: { element: { type: "ui" } },
              disallow: {
                to: { element: { types: ["domain", "server"] } },
              },
              message: "La capa ui no puede importar domain ni server.",
            },
            {
              from: { element: { type: "server" } },
              disallow: {
                to: { element: { types: ["ui", "app"] } },
              },
              message: "La capa server solo puede importar domain y lib.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react/*",
                "next",
                "next/*",
                "@supabase/*",
                "node:*",
                "fs",
                "fs/*",
                "path",
                "path/*",
                "crypto",
                "crypto/*",
              ],
              message:
                "La capa domain no puede importar React, Next.js, Supabase ni APIs de Node.js.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
