-- Security notes the Supabase advisor asks about (no behaviour changes for members).
--
-- 1. member_directory() and find_member(text) are SECURITY DEFINER on purpose.
--    The advisor flags them ("security definer function executable by
--    authenticated"). They run as their owner so they can read profiles,
--    whose row-level security lets a member read only their own row, and
--    return a safe view of other members. Checked on 16 Nov 2026:
--      - each sets a fixed, empty search_path, so a caller can't swap in
--        their own objects;
--      - only the authenticated role can execute them (not anon);
--      - they return only the documented columns: never birth_date or
--        email; the full profile (bio, skills, links, region, age when the
--        member shows it) only to accepted connections or when the member
--        shares it with everyone ("limited" otherwise); the CV only to
--        accepted connections; an invisible member only as name and join
--        date unless you're connected or they asked to connect, and from
--        find_member only for an exact full name.
--    tools/rls-check.mjs checks this from the outside with two accounts.
comment on function public.member_directory() is
  'SECURITY DEFINER by design: returns the member-chosen public fields of other members (never birth_date or email; full profile only to accepted connections or when shared with everyone; CV only to accepted connections; invisible members only as name and join date unless connected). Fixed empty search_path; executable by authenticated only.';
comment on function public.find_member(text) is
  'SECURITY DEFINER by design: finds invisible members by exact full name and returns only their name and join date. Fixed empty search_path; executable by authenticated only.';

-- 2. invites: nobody reads or writes it through the API. The sign-up trigger
--    reads it through private.require_invite(), a security definer function,
--    and Brayden edits it in the dashboard; neither is affected by this
--    policy, which applies only to the anon and authenticated roles.
--    Row-level security with no policy already denies everything; this policy
--    says so explicitly and answers the advisor's "RLS enabled, no policy".
drop policy if exists "No API access to invites" on public.invites;
create policy "No API access to invites" on public.invites
  as restrictive for all to anon, authenticated
  using (false) with check (false);

-- 3. "Leaked password protection" doesn't apply: sign-in is Google only.
