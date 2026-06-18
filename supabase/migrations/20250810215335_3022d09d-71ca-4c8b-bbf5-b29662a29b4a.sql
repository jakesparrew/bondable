-- Create table to store external (SMS/WhatsApp) messages tied to existing conversations
create table if not exists public.external_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  channel text not null check (channel in ('sms','whatsapp')),
  direction text not null check (direction in ('outbound','inbound')) default 'outbound',
  to_number text,
  from_number text,
  content text not null,
  provider_sid text,
  status text not null default 'sent',
  error jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for efficient reads
create index if not exists idx_external_messages_conversation on public.external_messages(conversation_id, created_at);
create index if not exists idx_external_messages_channel on public.external_messages(channel);

-- Enable RLS
alter table public.external_messages enable row level security;

-- Policy: Users can view external messages in their conversations
create policy if not exists "Users can view external messages in their conversations"
  on public.external_messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = external_messages.conversation_id
        and (auth.uid() = c.therapist_id or auth.uid() = c.client_id)
    )
  );

-- Optional: allow authenticated users to insert into their conversations (for future use)
create policy if not exists "Users can insert external messages in their conversations"
  on public.external_messages for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = external_messages.conversation_id
        and auth.uid() = c.therapist_id
    )
  );

-- Update updated_at automatically
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = '';

create trigger update_external_messages_updated_at
before update on public.external_messages
for each row execute function public.update_updated_at_column();