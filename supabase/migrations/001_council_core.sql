-- Council core schema. Apply to council-production through Supabase migrations.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null default 'New Council',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.council_turns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  mode text not null check (mode in ('ask','challenge-gpt','challenge-claude','challenge-both','final')),
  prompt text not null,
  gpt_response text,
  claude_response text,
  status text not null default 'deliberating' check (status in ('deliberating','final')),
  created_at timestamptz not null default now()
);
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  scope text not null check (scope in ('personal','project','conversation')),
  content text not null,
  source text not null check (source in ('user','document','conversation','media')),
  created_at timestamptz not null default now()
);
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  kind text not null check (kind in ('image','document','audio','video')),
  storage_path text not null,
  mime_type text,
  transcript text,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  decision text not null,
  rationale text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.council_turns enable row level security;
alter table public.memories enable row level security;
alter table public.assets enable row level security;
alter table public.decisions enable row level security;

do $$ declare t text;
begin
  foreach t in array array['profiles','projects','conversations','messages','council_turns','memories','assets','decisions']
  loop
    execute format('drop policy if exists "owner_all" on public.%I', t);
    execute format('create policy "owner_all" on public.%I for all using (auth.uid() = %I) with check (auth.uid() = %I)', t, case when t='profiles' then 'id' else 'user_id' end, case when t='profiles' then 'id' else 'user_id' end);
  end loop;
end $$;

insert into storage.buckets (id,name,public) values ('council-private','council-private',false)
on conflict (id) do update set public=false;
drop policy if exists "private_assets_owner" on storage.objects;
create policy "private_assets_owner" on storage.objects for all
using (bucket_id='council-private' and auth.uid()::text=(storage.foldername(name))[1])
with check (bucket_id='council-private' and auth.uid()::text=(storage.foldername(name))[1]);
