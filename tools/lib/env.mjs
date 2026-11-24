/* ==========================================================================
   Staging environment for scripts and tests, with the production guard
   --------------------------------------------------------------------------
   Every script and test that talks to Supabase gets its settings here. They
   come from the environment (CI secrets) or from a local .env file, which is
   in .gitignore:

     STAGING_SUPABASE_URL      https://<staging-ref>.supabase.co
     STAGING_ANON_KEY          the staging project's public anon key
     STAGING_SERVICE_ROLE_KEY  seed and clean scripts only (never in the site)
     TEST_USER_PASSWORD        the password every seeded test account shares
     TEST_EMAIL_DOMAIN         defaults to test.morisandbox.com

   The guard: anything whose Supabase URL contains the production project ref
   refuses to run. There is no switch to turn it off. A read-only production
   check must be its own script, run only when Brayden asks for it.
   ========================================================================== */
import { existsSync, readFileSync } from "node:fs";

export const PRODUCTION_REF = "ovchugvbujrqkowjalfx";
export const TEST_USERS = ["owner", ...Array.from({ length: 11 }, (_, i) => `collab${i + 1}`)];

/** Read KEY=value lines from .env into process.env (values already set win). */
function loadDotEnv() {
  const file = new URL("../../.env", import.meta.url);
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trim().startsWith("#")) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, "$2");
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
loadDotEnv();

export class ProductionRefused extends Error {}

/** Throws if a URL (or any text) points at the production project. */
export function refuseProduction(url, what = "This script") {
  if (String(url || "").toLowerCase().includes(PRODUCTION_REF)) {
    throw new ProductionRefused(`${what} refuses to run against production (${PRODUCTION_REF}). Use the staging project.`);
  }
}

/**
 * The staging settings, or null when they aren't set (tests then skip).
 * `needs` lists keys that must be present, e.g. ["serviceKey"] for the seed.
 */
export function staging({ needs = [] } = {}) {
  const env = {
    url: (process.env.STAGING_SUPABASE_URL || "").replace(/\/+$/, ""),
    anonKey: process.env.STAGING_ANON_KEY || "",
    serviceKey: process.env.STAGING_SERVICE_ROLE_KEY || "",
    password: process.env.TEST_USER_PASSWORD || "",
    domain: (process.env.TEST_EMAIL_DOMAIN || "test.morisandbox.com").toLowerCase(),
  };
  if (!env.url) return null;
  refuseProduction(env.url, "Staging configuration");
  for (const key of ["anonKey", ...needs]) if (!env[key]) throw new Error(`Missing ${key} for staging (see tools/lib/env.mjs).`);
  env.ref = (/^https:\/\/([a-z0-9]+)\.supabase\.co$/.exec(env.url) || [])[1] || "";
  env.storageKey = env.ref ? `sb-${env.ref}-auth-token` : "";
  env.email = (name) => `${name}@${env.domain}`;
  return env;
}
