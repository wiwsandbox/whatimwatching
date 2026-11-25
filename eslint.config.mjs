import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Leftover Claude worktree copies of the app (not part of the build).
    ".claude/**",
    // Supabase Edge Functions run on Deno, not Next.js.
    "supabase/functions/**",
  ]),
  {
    // New strict React Compiler rules. The flagged patterns work today;
    // keep them visible as warnings and fix them one at a time.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
]);

export default eslintConfig;
