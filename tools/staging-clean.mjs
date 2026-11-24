#!/usr/bin/env node
/* ==========================================================================
   Staging clean-up (A-01): leftover test projects
   --------------------------------------------------------------------------
   Each e2e test names its projects e2e-<runId>-<test> and deletes them when
   it's done. A run that crashed leaves some behind: this deletes e2e-
   projects older than 24 hours (their documents and team rows go with them,
   on delete cascade). Refuses to run against production.

     node tools/staging-clean.mjs            older than 24 h
     node tools/staging-clean.mjs --all      every e2e- project (no run in progress!)
   ========================================================================== */
import { createClient } from "@supabase/supabase-js";
import { staging } from "./lib/env.mjs";

const env = staging({ needs: ["serviceKey"] });
if (!env) { console.error("STAGING_SUPABASE_URL isn't set. See docs/staging.md."); process.exit(2); }
const admin = createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const all = process.argv.includes("--all");
const before = new Date(Date.now() - (all ? 0 : 24 * 3600 * 1000)).toISOString();
const { data, error } = await admin.from("projects").select("id, name, created_at").like("name", "e2e-%").lt("created_at", before);
if (error) { console.error(error.message); process.exit(1); }
if (!data.length) { console.log("Nothing to clean."); process.exit(0); }
const { error: derr } = await admin.from("projects").delete().in("id", data.map((p) => p.id));
if (derr) { console.error(derr.message); process.exit(1); }
console.log(`Deleted ${data.length} leftover e2e project(s).`);
