-- ---------------------------------------------------------------------------
-- Direct messages between connected members. Not end-to-end encrypted:
-- stored in the database and protected by the policies below.
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint messages_not_self check (sender_id <> recipient_id)
);
create index messages_sender_idx on public.messages (sender_id, created_at desc);
create index messages_recipient_idx on public.messages (recipient_id, created_at desc);

alter table public.messages enable row level security;

-- Members write the recipient and text; sender and time are set by the database.
-- Afterwards only read_at can change.
revoke all on table public.messages from anon, authenticated;
grant select on table public.messages to authenticated;
grant insert (recipient_id, body) on table public.messages to authenticated;
grant update (read_at) on table public.messages to authenticated;

create policy "Members read their own conversations" on public.messages
  for select to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));
create policy "Members message their connections" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1
      from public.connections c
      where c.status = 'accepted'
        and (
          (c.requester_id = (select auth.uid()) and c.addressee_id = recipient_id)
          or (c.addressee_id = (select auth.uid()) and c.requester_id = recipient_id)
        )
    )
  );
create policy "Recipients mark messages as read" on public.messages
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Live updates in the app. Supabase Realtime only delivers changes a member
-- is allowed to read under the policies above.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.connections, public.messages;
