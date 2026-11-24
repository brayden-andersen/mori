#!/usr/bin/env node
/* ==========================================================================
   Staging seed (A-01): the twelve test members
   --------------------------------------------------------------------------
   Creates owner@ and collab1@ … collab11@ on the test domain, each with a
   confirmed email, the shared TEST_USER_PASSWORD, an 18+ date of birth, a
   finished profile and a role, and connects them:

     owner ↔ collab1 … collab10   accepted connections
     collab11                     connected to nobody (the outsider in RLS
                                  and visibility checks)

   Idempotent: running it again changes nothing that's already right.
   Refuses to run against production (tools/lib/env.mjs).

     node tools/staging-seed.mjs        (settings from .env or CI secrets)

   Staging must allow test accounts first (see supabase/migrations/
   20261124120000_staging_test_accounts.sql and docs/staging.md).
   ========================================================================== */
import { createClient } from "@supabase/supabase-js";
import { staging, TEST_USERS } from "./lib/env.mjs";

const env = staging({ needs: ["serviceKey", "password"] });
if (!env) { console.error("STAGING_SUPABASE_URL isn't set. See docs/staging.md."); process.exit(2); }
const admin = createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const PEOPLE = {
  owner: { first: "Owner", last: "Test", type: "Founder", specialty: null, headline: "E2E owner" },
  ...Object.fromEntries(TEST_USERS.slice(1).map((n, i) => [n, {
    first: "Collab", last: String(i + 1), type: i % 2 ? "Specialist" : "Founder", specialty: i % 2 ? "Full-stack developer" : null, headline: `E2E ${n}`,
  }])),
};

async function allUsers() {
  const out = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    out.push(...data.users);
    if (data.users.length < 200) return out;
  }
}

async function main() {
  const existing = new Map((await allUsers()).map((u) => [String(u.email).toLowerCase(), u]));
  const ids = {};
  for (const name of TEST_USERS) {
    const email = env.email(name);
    let user = existing.get(email);
    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({ email, password: env.password, email_confirm: true, user_metadata: { full_name: `${PEOPLE[name].first} ${PEOPLE[name].last}` } });
      if (error) throw new Error(`${email}: ${error.message} (does staging allow test accounts? see docs/staging.md)`);
      user = data.user;
      console.log(`created ${email}`);
    } else {
      // Keep the shared password in step, in case the secret changed.
      const { error } = await admin.auth.admin.updateUserById(user.id, { password: env.password });
      if (error) throw error;
    }
    ids[name] = user.id;

    const p = PEOPLE[name];
    const profile = {
      id: user.id, first_name: p.first, last_name: p.last, birthday: "1998-05-12", birth_date: "1998-05-12", age: 28,
      region: "DKI Jakarta", profile_type: p.type, specialty: p.specialty, headline: p.headline,
      expertise_level: "3-5 years", employment_status: "Student", business_sector: ["FinTech"], languages: [{ name: "English", level: "Fluent" }],
      links: [], onboarding_completed: true, profile_visibility: "everyone", invisible: false,
    };
    const { error: perr } = await admin.from("profiles").upsert(profile, { onConflict: "id" });
    if (perr) throw new Error(`profile ${email}: ${perr.message}`);
  }

  // owner ↔ collab1 … collab10, accepted
  const { data: links, error: lerr } = await admin.from("connections").select("requester_id, addressee_id, status");
  if (lerr) throw lerr;
  const pair = (a, b) => [a, b].sort().join(":");
  const have = new Map(links.map((l) => [pair(l.requester_id, l.addressee_id), l]));
  for (const name of TEST_USERS.slice(1, 11)) {
    const key = pair(ids.owner, ids[name]);
    const l = have.get(key);
    if (!l) {
      const { error } = await admin.from("connections").insert({ requester_id: ids.owner, addressee_id: ids[name], status: "accepted", note: null });
      if (error) throw new Error(`connect owner ↔ ${name}: ${error.message}`);
      console.log(`connected owner ↔ ${name}`);
    } else if (l.status !== "accepted") {
      const { error } = await admin.from("connections").update({ status: "accepted" }).eq("requester_id", l.requester_id).eq("addressee_id", l.addressee_id);
      if (error) throw error;
    }
  }
  // collab11 stays unconnected: remove anything that links it
  const strays = links.filter((l) => l.requester_id === ids.collab11 || l.addressee_id === ids.collab11);
  for (const l of strays) await admin.from("connections").delete().eq("requester_id", l.requester_id).eq("addressee_id", l.addressee_id);

  console.log(`Seeded ${TEST_USERS.length} test members on ${env.domain}.`);
}

main().catch((err) => { console.error(err.message || err); process.exit(1); });
