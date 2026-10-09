import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist", "data"]),

  // App code: type-aware rules (unhandled promises, unsafe `any`) plus the
  // React hooks rules, including the React Compiler checks.
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },

  // Build config, Node scripts and the service worker.
  {
    files: ["vite.config.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["scripts/**/*.mjs", "eslint.config.js"],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["scripts/**/*.cjs"],
    extends: [js.configs.recommended],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
  },
  {
    files: ["public/sw.js"],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.serviceworker },
  },
]);
