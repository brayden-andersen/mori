#!/usr/bin/env node
/* ==========================================================================
   Two-account security check (row-level security)
   --------------------------------------------------------------------------
   Signs in as nobody: it uses two members' access tokens and calls the
   Supabase REST API directly, the way a curious member could. Account B must
   not be able to read or change account A's private profile fields, CV,
   messages, projects, documents, connections or sprint spots, and an
   anonymous caller must get nothing.

   Use two invited test accounts that have finished sign-up and are NOT
   connected to each other. Before running, give account A some private data:
   a date of birth, a CV, a project with a document, and a message with a
   third member.

   Get each access token: sign in on the site as that account, open the
   browser console and run

     JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /^sb-.*-auth-token$/.test(k)))).access_token

   Then, from the repository folder (Node 18 or newer):

     A_TOKEN=… B_TOKEN=… node tools/rls-check.mjs

   Tokens last about an hour. The Supabase URL and public key are read from
   assets/js/config.js. Writes are attempted only against account A's data
   from account B, so a failure here means real data was changed: use test
   accounts. Exit code 0 means every check passed.
   ========================================================================== */
import { readFileSync } from "node:fs";

const cfg = readFileSync(new URL("../assets/js/config.js", import.meta.url), "utf8");
const URL_ = process.env.SUPABASE_URL || (cfg.match(/supabaseUrl:\s*"([^"]+)"/) || [])[1]; // SUPABASE_URL overrides it (for testing the script)
const KEY = (cfg.match(/supabaseKey:\s*"([^"]+)"/) || [])[1];
const A_TOKEN = process.env.A_TOKEN;
const B_TOKEN = process.env.B_TOKEN;
if (!URL_ || !KEY) { console.error("Couldn't read supabaseUrl and supabaseKey from assets/js/config.js"); process.exit(2); }
if (!A_TOKEN || !B_TOKEN) { console.error("Set A_TOKEN and B_TOKEN (see the top of this file)."); process.exit(2); }

const results = [];
const check = (label, ok, detail = "") => { results.push({ label, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`); };
const headers = (token, extra = {}) => Object.assign({ apikey: KEY, "Content-Type": "application/json" }, token ? { Authorization: `Bearer ${token}` } : {}, extra);
async function call(method, path, token, body, extra) {
  const res = await fetch(URL_ + path, { method, headers: headers(token, extra), body: body === undefined ? undefined : JSON.stringify(body) });
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, ok: res.ok, data };
}
const rows = (r) => (r.ok && Array.isArray(r.data) ? r.data : []);
const denied = (r) => !r.ok || (Array.isArray(r.data) && r.data.length === 0);

async function main() {
const me = async (token) => { const r = await call("GET", "/auth/v1/user", token); if (!r.ok) throw new Error("A token was refused: sign in again and copy a fresh one."); return r.data.id; };

const A = await me(A_TOKEN);
const B = await me(B_TOKEN);
console.log(`Account A ${A}\nAccount B ${B}\n`);
if (A === B) { console.error("A_TOKEN and B_TOKEN belong to the same account."); process.exit(2); }

/* ---------- What A has (read as A) ---------- */
const aProfile = rows(await call("GET", `/rest/v1/profiles?select=id,birth_date,cv_path&id=eq.${A}`, A_TOKEN))[0] || {};
const aProjects = rows(await call("GET", `/rest/v1/projects?select=id&owner_id=eq.${A}`, A_TOKEN)).map((p) => p.id);
const aMessages = rows(await call("GET", `/rest/v1/messages?select=id,sender_id,recipient_id&or=(sender_id.eq.${A},recipient_id.eq.${A})`, A_TOKEN));
const linked = rows(await call("GET", `/rest/v1/connections?select=requester_id,addressee_id&or=(and(requester_id.eq.${A},addressee_id.eq.${B}),and(requester_id.eq.${B},addressee_id.eq.${A}))`, A_TOKEN))
  .filter((l) => (l.requester_id === A && l.addressee_id === B) || (l.requester_id === B && l.addressee_id === A));
if (linked.length) console.log("Note: A and B have a connection or request between them, so B may see more of A's profile. Use two unconnected accounts.\n");
if (!aProfile.id) console.log("Note: A has no profile row yet. Finish sign-up as A first.\n");

/* ---------- Reads, as B ---------- */
check("B can't read A's profile row (private fields such as date of birth)", denied(await call("GET", `/rest/v1/profiles?select=id,birth_date,cv_path&id=eq.${A}`, B_TOKEN)));
const dir = await call("POST", "/rest/v1/rpc/member_directory", B_TOKEN, {});
const aInDir = rows(dir).find((m) => m.id === A);
check("The member directory never returns a date of birth", !rows(dir).some((m) => "birth_date" in m));
check("Unconnected, the directory hides A's CV", !aInDir || !aInDir.cv_path, aInDir ? `cv_path: ${aInDir.cv_path ? "shown" : "hidden"}` : "A isn't listed to B");
const bMsgs = rows(await call("GET", `/rest/v1/messages?select=id,sender_id,recipient_id`, B_TOKEN));
check("B sees only conversations B is part of", bMsgs.every((m) => m.sender_id === B || m.recipient_id === B), `${bMsgs.length} visible`);
check("B can't read A's messages with others", denied(await call("GET", `/rest/v1/messages?select=id&or=(sender_id.eq.${A},recipient_id.eq.${A})&sender_id=neq.${B}&recipient_id=neq.${B}`, B_TOKEN)), `A has ${aMessages.length}`);
check("B can't read A's projects", denied(await call("GET", `/rest/v1/projects?select=id&owner_id=eq.${A}`, B_TOKEN)), `A has ${aProjects.length}`);
check("B can't read the documents in A's projects", !aProjects.length || denied(await call("GET", `/rest/v1/project_docs?select=id&project_id=in.(${aProjects.join(",")})`, B_TOKEN)));
check("B can't see A's project teams", !aProjects.length || denied(await call("GET", `/rest/v1/project_members?select=member_id&project_id=in.(${aProjects.join(",")})`, B_TOKEN)));
const bLinks = rows(await call("GET", `/rest/v1/connections?select=requester_id,addressee_id`, B_TOKEN));
check("B sees only connection requests B is part of", bLinks.every((l) => l.requester_id === B || l.addressee_id === B), `${bLinks.length} visible`);
check("Nobody signed in can read the invite list", !(await call("GET", `/rest/v1/invites?select=email`, B_TOKEN)).ok);
const spots = await call("GET", `/rest/v1/sprint_spots?select=sprint_id&member_id=eq.${A}`, B_TOKEN);
if (spots.status === 404) console.log("SKIP  sprint_spots doesn't exist yet (apply supabase/migrations/20261116090000_sprint_spots.sql)");
else check("B can't read A's sprint spots", denied(spots));
if (aProfile.cv_path) {
  const sign = await call("POST", `/storage/v1/object/sign/cvs/${aProfile.cv_path}`, B_TOKEN, { expiresIn: 60 });
  check("B can't get a link to A's CV", !sign.ok, `status ${sign.status}`);
} else console.log("SKIP  A has no CV uploaded");

/* ---------- Writes, as B against A's data ---------- */
const ret = { Prefer: "return=representation" };
check("B can't change A's profile", denied(await call("PATCH", `/rest/v1/profiles?id=eq.${A}`, B_TOKEN, { headline: "rls-check" }, ret)));
check("B can't send a message as A", !(await call("POST", "/rest/v1/messages", B_TOKEN, { sender_id: A, recipient_id: B, body: "rls-check" }, ret)).ok);
check("B can't create a project owned by A", !(await call("POST", "/rest/v1/projects", B_TOKEN, { owner_id: A, name: "rls-check" }, ret)).ok);
check("B can't change A's projects", !aProjects.length || denied(await call("PATCH", `/rest/v1/projects?id=in.(${aProjects.join(",")})`, B_TOKEN, { name: "rls-check" }, ret)));
if (spots.status !== 404) check("B can't save a sprint spot for A", !(await call("POST", "/rest/v1/sprint_spots", B_TOKEN, { member_id: A, sprint_id: "rls-check" }, ret)).ok);

/* ---------- Anonymous ---------- */
check("Anonymous callers can't read profiles", denied(await call("GET", `/rest/v1/profiles?select=id`, null)));
check("Anonymous callers can't use the member directory", !(await call("POST", "/rest/v1/rpc/member_directory", null, {})).ok);
check("Anonymous callers can't read messages", denied(await call("GET", `/rest/v1/messages?select=id`, null)));

const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `\n${failed.length} of ${results.length} checks FAILED` : `\nAll ${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  const why = (err && err.cause && err.cause.message) || (err && err.message) || String(err);
  console.error(`Stopped: ${why}`);
  process.exit(2);
});
