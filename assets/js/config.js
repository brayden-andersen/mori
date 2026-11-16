/* ==========================================================================
   Mori: Sandbox — site configuration
   --------------------------------------------------------------------------
   Sign-in and profiles run on the Supabase project "Sandbox". Google sign-in
   is configured in Supabase (Authentication → Providers → Google).
   In Supabase → Authentication → URL Configuration, add every address that
   serves this site to "Redirect URLs", e.g. http://localhost:4173/** and
   later https://<you>.github.io/**

   The anon key is meant for browsers: row-level security keeps each
   member's profile and CV private to them.

   Opened straight from disk (file://) or with these values blank, the site
   runs in DEMO MODE: sign-in and onboarding work with data kept in this
   browser only.
   ========================================================================== */
window.MORI_CONFIG = {
  supabaseUrl: "https://ovchugvbujrqkowjalfx.supabase.co",
  supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92Y2h1Z3ZidWpycWtvd2phbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzMwMzgsImV4cCI6MjA5MDU0OTAzOH0.zkzkchE06Jx1VPv-dpwxaJ_p-AQnYbk9sOWj7gDZstc",
};
