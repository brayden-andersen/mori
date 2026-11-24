// ESLint: npm run lint
// The site's scripts are classic browser scripts (each one an IIFE on window.Mori);
// tools/ and tests/ are Node modules. The vendored Supabase library is left alone.
import js from "@eslint/js";
import globals from "globals";

export default [
  // assets/i18n/ holds the dictionaries tools/i18n/build.py writes: data, not code to check.
  { ignores: ["assets/vendor/**", "assets/i18n/**", "node_modules/**", "test-results/**", "playwright-report/**"] },
  js.configs.recommended,
  {
    files: ["assets/js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "script",
      globals: { ...globals.browser },
    },
    rules: {
      // Catch slips that matter in a site without a build step
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
      "no-implicit-globals": "error",
      "no-var": "error",
      "prefer-const": ["error", { destructuring: "all" }],
      eqeqeq: ["error", "smart"],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
    },
  },
  {
    files: ["tools/**/*.mjs", "tests/**/*.{js,mjs}", "*.config.{js,mjs}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node },
    },
  },
  {
    // Playwright tests (and the phrase crawler) also hold code that runs in the page (page.evaluate)
    files: ["tests/**/*.spec.mjs", "tools/i18n/extract.mjs"],
    languageOptions: { globals: { ...globals.browser, Mori: "readonly" } },
  },
];
