import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/.wrangler/**", "**/node_modules/**"] },
  js.configs.recommended,
  {
    // Scripts de automação rodam no Node, fora do Worker e do navegador.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: { console: "readonly", fetch: "readonly", process: "readonly", URL: "readonly" },
    },
    rules: { "max-lines-per-function": "off", complexity: "off" },
  },
  ...tseslint.configs.strict,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "max-lines-per-function": ["warn", { max: 40, skipBlankLines: true, skipComments: true }],
      complexity: ["warn", 8],
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
);
