create table if not exists public.kis_tokens (
  provider text primary key,
  access_token text,
  issued_at timestamptz,
  expires_at timestamptz,
  lock_until timestamptz not null default '1970-01-01T00:00:00.000Z',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_kis_tokens_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_set_kis_tokens_updated_at on public.kis_tokens;
create trigger tr_set_kis_tokens_updated_at
before update on public.kis_tokens
for each row
execute function public.set_kis_tokens_updated_at();
