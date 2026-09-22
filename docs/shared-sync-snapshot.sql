-- Shared-sync bridge for Relationship OS.
-- The browser never receives the Supabase service-role key.
-- All reads/writes go through app/api/workspace/route.ts.

create table if not exists public.relationship_workspace_snapshots (
  workspace_key text primary key,
  payload jsonb not null default '{"version":1,"contacts":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.relationship_workspace_snapshots enable row level security;

-- No anon/authenticated policies are created intentionally.
-- The app server uses SUPABASE_SERVICE_ROLE_KEY and bypasses RLS.
-- Keep the service-role key only in server-side deployment environment variables.

comment on table public.relationship_workspace_snapshots is
  'Interim whole-workspace sync bridge for Relationship OS. Normalized tables in shared-backend-schema.sql remain the long-term model.';
