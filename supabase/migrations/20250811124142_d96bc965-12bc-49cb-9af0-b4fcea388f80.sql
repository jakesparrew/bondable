-- Harden update_updated_at_column to set a safe search_path
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;