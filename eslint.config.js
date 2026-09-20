import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "node_modules/"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.browser },
    rules: {
      "max-lines": ["error", { max: 200, skipBlankLines: false, skipComments: false }],
      "no-console": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["src/data/**/*.ts"],
    rules: { "max-lines": "off" },
  },
);