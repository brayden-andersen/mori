/* ==========================================================================
   Mori: Sandbox — site configuration
   --------------------------------------------------------------------------
   Google sign-in
     1. In Google Cloud Console create an OAuth 2.0 Client ID ("Web application").
     2. Under "Authorized JavaScript origins" add every origin that serves this
        site, e.g. http://localhost:4173 and https://<you>.github.io
     3. Paste the Client ID below (it ends in .apps.googleusercontent.com).

   While googleClientId is empty the site runs in DEMO MODE: "Continue with
   Google" opens a demo sign-in sheet instead, so the whole flow can still be
   clicked through. Nothing leaves the browser in demo mode.
   ========================================================================== */
window.MORI_CONFIG = {
  googleClientId: "907241396206-t0tdcp3kqc4481o7ppnei380oflqjq8j.apps.googleusercontent.com",
};
