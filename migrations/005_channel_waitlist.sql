create table if not exists public.channel_waitlist (
  id serial primary key,
  channel text not null,
  email text not null,
  ip_address text,
  created_at timestamptz default now()
);

alter table public.channel_waitlist enable row level security;

create policy if not exists "Anyone can insert into channel_waitlist" on public.channel_waitlist
  for insert to anon, authenticated with check (true);
