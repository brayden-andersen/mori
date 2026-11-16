-- Settings, pinned projects and the theme follow a member across browsers and devices.
-- Readable and writable only by the member (the existing "own profile" policies);
-- never part of the member directory.
alter table public.profiles add column if not exists prefs jsonb not null default '{}'::jsonb;
alter table public.profiles drop constraint if exists profiles_prefs_check;
alter table public.profiles add constraint profiles_prefs_check
  check (jsonb_typeof(prefs) = 'object' and pg_column_size(prefs) <= 32768);
comment on column public.profiles.prefs is
  'Per-member preferences synced across devices: { settings, pins, theme, t: { key: updated-at ms } }.';
