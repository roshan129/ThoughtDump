-- Run this in your Supabase SQL editor
create extension if not exists "pgcrypto";

create table if not exists public.thoughts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  tone text not null,
  format text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.generated_content (
  id uuid primary key default gen_random_uuid(),
  thought_id uuid not null references public.thoughts(id) on delete cascade,
  content text not null,
  type text not null check (type in ('tweet', 'thread')),
  position int not null,
  created_at timestamptz not null default now()
);

alter table public.thoughts enable row level security;
alter table public.generated_content enable row level security;

drop policy if exists "read own thoughts" on public.thoughts;
create policy "read own thoughts"
  on public.thoughts for select
  using (auth.uid() = user_id);

drop policy if exists "insert own thoughts" on public.thoughts;
create policy "insert own thoughts"
  on public.thoughts for insert
  with check (auth.uid() = user_id);

drop policy if exists "read own generated content" on public.generated_content;
create policy "read own generated content"
  on public.generated_content for select
  using (
    exists (
      select 1
      from public.thoughts t
      where t.id = generated_content.thought_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists "insert own generated content" on public.generated_content;
create policy "insert own generated content"
  on public.generated_content for insert
  with check (
    exists (
      select 1
      from public.thoughts t
      where t.id = generated_content.thought_id
        and t.user_id = auth.uid()
    )
  );
