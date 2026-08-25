-- ==============================================================================
-- ORGANIZADOR SEMANAL - SUPABASE POSTGRESQL SCHEMA & ROW LEVEL SECURITY (RLS)
-- Cole este script no SQL Editor do seu painel do Supabase e clique em RUN.
-- ==============================================================================

-- 1. TABELA DE PERFIS DE USUÁRIOS
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  theme text default 'system',
  updated_at timestamptz default now()
);

-- Ativar RLS em user_profiles
alter table public.user_profiles enable row level security;

create policy "Usuários podem visualizar apenas seu próprio perfil"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Usuários podem atualizar apenas seu próprio perfil"
  on public.user_profiles for update
  using (auth.uid() = id);

create policy "Usuários podem inserir seu próprio perfil"
  on public.user_profiles for insert
  with check (auth.uid() = id);

-- Trigger para criar perfil automaticamente no cadastro (Auth Hook)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, name, theme)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'system'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. TABELA DE ATIVIDADES & COMPROMISSOS (Com RLS Estrito)
create table if not exists public.activities (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  date text not null, -- YYYY-MM-DD
  time text,          -- HH:mm ou vazio
  category text default 'outros',
  status text default 'pending',
  recurrence text default 'none',
  recurrence_days jsonb default '[]'::jsonb,
  recurrence_end_date text default '',
  completed_dates jsonb default '[]'::jsonb,
  overrides jsonb default '{}'::jsonb,
  deleted_dates jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.activities enable row level security;

create policy "Usuários gerenciam apenas suas próprias atividades"
  on public.activities for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_activities_user_date on public.activities (user_id, date);


-- 3. TABELA DE HÁBITOS (Habit Tracker - RLS Estrito)
create table if not exists public.habits (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  icon text default '🎯',
  target_days int default 7,
  completed_dates jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table public.habits enable row level security;

create policy "Usuários gerenciam apenas seus próprios hábitos"
  on public.habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_habits_user on public.habits (user_id);


-- 4. TABELA DE PLANO ALIMENTAR (Meal Planner - RLS Estrito)
create table if not exists public.meal_plans (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date_key text not null, -- YYYY-MM-DD
  breakfast jsonb default '{"text": "", "completed": false}'::jsonb,
  lunch jsonb default '{"text": "", "completed": false}'::jsonb,
  snack jsonb default '{"text": "", "completed": false}'::jsonb,
  dinner jsonb default '{"text": "", "completed": false}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.meal_plans enable row level security;

create policy "Usuários gerenciam apenas seu próprio plano alimentar"
  on public.meal_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_meal_plans_user_date on public.meal_plans (user_id, date_key);
