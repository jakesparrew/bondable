-- Create extension for UUIDs if not present
create extension if not exists pgcrypto;

-- Helper function for updated_at timestamp (idempotent)
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Table to store device push tokens for users
create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  platform text not null check (platform in ('ios','android')),
  push_provider text not null default 'fcm',
  token text not null,
  device_info jsonb,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_user_devices_user foreign key (user_id) references auth.users(id) on delete cascade,
  constraint uq_user_token unique (user_id, token)
);

-- Indexes for performance
create index if not exists idx_user_devices_user on public.user_devices(user_id);
create index if not exists idx_user_devices_token on public.user_devices(token);

-- RLS
alter table public.user_devices enable row level security;

-- Policies (users manage only their own devices)
create policy "Users can view their own devices"
  on public.user_devices for select
  using (auth.uid() = user_id);

create policy "Users can register their own device"
  on public.user_devices for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own device"
  on public.user_devices for update
  using (auth.uid() = user_id);

create policy "Users can delete their own device"
  on public.user_devices for delete
  using (auth.uid() = user_id);

-- Trigger to auto-update updated_at
create trigger trg_user_devices_updated_at
before update on public.user_devices
for each row execute function public.update_updated_at_column();