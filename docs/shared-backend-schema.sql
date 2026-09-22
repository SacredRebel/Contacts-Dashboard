-- Relationship OS proposed shared backend schema
-- Designed for Postgres-compatible hosted backends such as Supabase.
-- Apply only after authentication and storage policy decisions are made.

create table if not exists team_members (
  id text primary key,
  name text not null,
  color text not null,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_type text,
  website text,
  geography text,
  notes text,
  verification_state text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contacts (
  id text primary key,
  company_id uuid references companies(id) on delete set null,
  name text not null,
  organization text,
  title text,
  pipeline text not null check (pipeline in ('capital','architect','contractor')),
  category text,
  email text,
  phone text,
  website text,
  linkedin text,
  location text,
  priority text,
  score numeric,
  stage text not null default 'new',
  next_action text,
  next_action_due timestamptz,
  public_observation text,
  outreach_hook text,
  professional_themes text,
  material_fit text,
  source_url text,
  verification_url text,
  email_confidence text,
  research_depth text,
  warnings text,
  alignment_tags text[] not null default '{}',
  owner_id text references team_members(id) on delete set null,
  notion_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists interactions (
  id text primary key,
  contact_id text not null references contacts(id) on delete cascade,
  user_id text not null references team_members(id),
  interaction_type text not null,
  occurred_at timestamptz not null default now(),
  summary text not null,
  transcript text,
  important boolean not null default false,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id text primary key,
  contact_id text not null references contacts(id) on delete cascade,
  assigned_to text not null references team_members(id),
  created_by text not null references team_members(id),
  title text not null,
  details text,
  due_at timestamptz,
  status text not null default 'todo',
  priority text not null default 'normal',
  related_interaction_id text references interactions(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists contact_documents (
  id text primary key,
  contact_id text not null references contacts(id) on delete cascade,
  created_by text not null references team_members(id),
  title text not null,
  document_type text not null,
  confidentiality text not null default 'internal',
  storage_path text,
  content text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists capital_profiles (
  contact_id text primary key references contacts(id) on delete cascade,
  capital_type text,
  directness text,
  decision_maker_status text,
  entity_status text,
  mandate text,
  size_range text,
  capacity_status text,
  disclosure_level text,
  nda_status text,
  diligence_status text,
  risk_flags text,
  updated_at timestamptz not null default now()
);

create table if not exists connections (
  id text primary key,
  from_contact_id text not null references contacts(id) on delete cascade,
  to_contact_id text not null references contacts(id) on delete cascade,
  relationship_type text not null,
  note text,
  created_by text not null references team_members(id),
  created_at timestamptz not null default now(),
  constraint connection_not_self check (from_contact_id <> to_contact_id)
);

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id text references team_members(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

create index if not exists contacts_pipeline_idx on contacts(pipeline);
create index if not exists contacts_stage_idx on contacts(stage);
create index if not exists contacts_next_action_due_idx on contacts(next_action_due);
create index if not exists interactions_contact_time_idx on interactions(contact_id, occurred_at desc);
create index if not exists tasks_contact_status_idx on tasks(contact_id, status);
create index if not exists tasks_due_idx on tasks(due_at);
create index if not exists documents_contact_idx on contact_documents(contact_id);
create index if not exists connections_from_idx on connections(from_contact_id);
create index if not exists connections_to_idx on connections(to_contact_id);

insert into team_members (id, name, color)
values
  ('paul','Paul','#7c3aed'),
  ('mark','Mark','#0f766e'),
  ('jonathan','Jonathan','#ea580c')
on conflict (id) do update
set name = excluded.name,
    color = excluded.color;
