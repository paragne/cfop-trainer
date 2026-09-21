import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const STORAGE_ONLY = "localStorage is touched only in src/lib/storage.ts.";

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
  {
    files: ["src/**/*.ts"],
    ignores: ["src/lib/storage.ts", "src/lib/storage.test.ts"],
    rules: {
      "no-restricted-globals": ["error", { name: "localStorage", message: STORAGE_ONLY }],
      "no-restricted-properties": [
        "error",
        { object: "window", property: "localStorage", message: STORAGE_ONLY },
        { object: "globalThis", property: "localStorage", message: STORAGE_ONLY },
      ],
    },
  },
);