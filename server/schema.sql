-- Create Users Table (Unique to this app to avoid conflicts)
create table public.xiangqi_users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  avatar_url text,
  wins int default 0,
  losses int default 0,
  rank int default 1200,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.xiangqi_users enable row level security;

-- Create Policy (Allow all for now for public usage)
create policy "Allow public read-write"
on public.xiangqi_users
for all
using (true)
with check (true);
