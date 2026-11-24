/* ==========================================================================
   Mori: Sandbox — STAGING configuration (automated tests only)
   --------------------------------------------------------------------------
   No page links to this file. tests/serve.mjs serves it instead of
   config.js when started with MORI_ENV=staging, filling in the staging
   project's URL and public anon key from STAGING_SUPABASE_URL and
   STAGING_ANON_KEY (.env or CI secrets). It refuses to fill in the
   production project. The live site never loads it.
   ========================================================================== */
window.MORI_CONFIG = {
  supabaseUrl: "__STAGING_SUPABASE_URL__",
  supabaseKey: "__STAGING_ANON_KEY__",
  contactEmail: "", // the placeholder shows; tests never send mail
  environment: "staging",
};
