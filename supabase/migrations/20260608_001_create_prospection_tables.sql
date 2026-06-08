create table if not exists public.prospection_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'draft' check (status in ('draft','running','paused','completed','cancelled')),
  instance_name text not null default 'centralplay-leads',
  rate_limit_count integer not null default 15,
  rate_limit_window_minutes integer not null default 50,
  min_delay_seconds integer not null default 160,
  max_delay_seconds integer not null default 270,
  allowed_start_time text not null default '09:00',
  allowed_end_time text not null default '20:00',
  next_send_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prospection_leads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.prospection_campaigns(id) on delete cascade,
  name text,
  phone_raw text,
  phone_e164 text,
  email text,
  city text,
  uf text,
  source_file_name text,
  status text not null default 'imported' check (status in ('imported','queued','scheduled','sending','sent','responded','responded_positive','opt_out','invalid_phone','duplicate','error')),
  template_id integer,
  message_preview text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  responded_at timestamptz,
  last_response_text text,
  send_attempts integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prospection_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.prospection_campaigns(id) on delete set null,
  lead_id uuid references public.prospection_leads(id) on delete set null,
  direction text not null check (direction in ('outbound','inbound')),
  type text not null check (type in ('initial','welcome','install','manual','system')),
  template_id integer,
  body text not null,
  status text not null,
  evolution_message_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.prospection_optouts (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null unique,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.prospection_templates (
  id integer primary key,
  name text not null,
  body text not null,
  active boolean not null default true,
  weight integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prospection_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.prospection_campaigns(id) on delete set null,
  lead_id uuid references public.prospection_leads(id) on delete set null,
  event_type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists prospection_optouts_phone_idx on public.prospection_optouts(phone_e164);
create index if not exists prospection_leads_campaign_status_idx on public.prospection_leads(campaign_id, status, scheduled_at);
create index if not exists prospection_leads_phone_idx on public.prospection_leads(phone_e164);
create index if not exists prospection_messages_window_idx on public.prospection_messages(campaign_id, direction, type, created_at);
create index if not exists prospection_events_campaign_idx on public.prospection_events(campaign_id, created_at desc);

alter table public.prospection_campaigns enable row level security;
alter table public.prospection_leads enable row level security;
alter table public.prospection_messages enable row level security;
alter table public.prospection_optouts enable row level security;
alter table public.prospection_templates enable row level security;
alter table public.prospection_events enable row level security;
