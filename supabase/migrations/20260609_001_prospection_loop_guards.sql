alter table public.prospection_leads add column if not exists responded_positive_at timestamptz;
alter table public.prospection_leads add column if not exists welcome_triggered_at timestamptz;
alter table public.prospection_leads add column if not exists welcome_status text;
alter table public.prospection_leads add column if not exists active_flow_type text;
alter table public.prospection_leads add column if not exists last_inbound_message_id text;
alter table public.prospection_leads add column if not exists last_inbound_at timestamptz;
alter table public.prospection_leads add column if not exists install_sent_at timestamptz;
alter table public.prospection_leads add column if not exists install_device text;
alter table public.prospection_leads add column if not exists install_status text;

alter table public.prospection_messages add column if not exists idempotency_key text;
alter table public.prospection_events add column if not exists idempotency_key text;

create unique index if not exists prospection_messages_idempotency_key_idx
  on public.prospection_messages(idempotency_key)
  where idempotency_key is not null;

create unique index if not exists prospection_events_idempotency_key_idx
  on public.prospection_events(idempotency_key)
  where idempotency_key is not null;

create index if not exists prospection_events_phone_window_idx
  on public.prospection_events((metadata->>'targetPhone'), event_type, created_at desc);
