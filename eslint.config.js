import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/.wrangler/**", "**/node_modules/**", "**/coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // `const { interno, ...publico } = obj` é o jeito idiomático de omitir campos
      "@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true, argsIgnorePattern: "^_" }],
      "max-lines-per-function": ["warn", { max: 40, skipBlankLines: true, skipComments: true }],
      complexity: ["warn", 10],
    },
  },
  {
    // Guarda da regra de dependência (constitution I.1): o domínio não importa camadas externas.
    files: ["apps/api/src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["**/application/**", "**/infrastructure/**", "**/interface/**"], message: "domain não depende de camadas externas" },
            { group: ["hono", "hono/*", "zod", "@comandai/contracts"], message: "domain é puro TypeScript" },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/api/src/application/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["**/infrastructure/**", "**/interface/**"], message: "application não conhece adapters" },
            { group: ["hono", "hono/*"], message: "application não conhece o framework HTTP" },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/api/src/interface/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["**/infrastructure/**"], message: "interface recebe adapters pelo composition root (main.ts)" }] },
      ],
    },
  },

  // ---- Exceções (ficam no fim: no flat config, o último bloco que casa vence) ----
  {
    // Componentes React: JSX declarativo infla a contagem de linhas/ramos sem ser lógica.
    // Lógica de verdade vai para hooks e shared/lib (.ts), onde as regras continuam valendo.
    files: ["apps/web/src/**/*.tsx"],
    rules: { "max-lines-per-function": "off", complexity: "off" },
  },
  {
    // Testes: blocos describe são longos por natureza; "!" deixa as asserções diretas.
    files: ["**/test/**/*.ts", "**/*.test.ts"],
    rules: { "max-lines-per-function": "off", "@typescript-eslint/no-non-null-assertion": "off" },
  },
  {
    // Scripts de automação rodam no Node, fora do Worker e do navegador.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: { console: "readonly", fetch: "readonly", process: "readonly", URL: "readonly" },
    },
    rules: { "max-lines-per-function": "off", complexity: "off" },
  },
);
