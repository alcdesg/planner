-- ==============================================================================
-- ORGANIZADOR SEMANAL - SUPABASE POSTGRESQL SCHEMA, RBAC & RLS POLICIES
-- Cole este script no SQL Editor do seu painel do Supabase e clique em RUN.
-- Projeto: https://txumkevqlgjdyqqlmxlh.supabase.co
-- ==============================================================================

-- 1. TABELA DE PERFIS DE USUÁRIOS COM RBAC (ADMIN / MEMBER)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  theme text default 'system',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Garantir colunas caso a tabela já tenha sido criada anteriormente
alter table public.user_profiles add column if not exists role text not null default 'member' check (role in ('admin', 'member'));
alter table public.user_profiles add column if not exists is_active boolean default true;
alter table public.user_profiles add column if not exists created_at timestamptz default now();

-- Ativar Row Level Security
alter table public.user_profiles enable row level security;

-- Função auxiliar de segurança para verificar se o requisitante é Admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Políticas de RLS para user_profiles
drop policy if exists "Usuários podem visualizar seus próprios perfis ou admins visualizam todos" on public.user_profiles;
create policy "Usuários podem visualizar seus próprios perfis ou admins visualizam todos"
  on public.user_profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "Usuários atualizam seus perfis ou admins atualizam qualquer perfil" on public.user_profiles;
create policy "Usuários atualizam seus perfis ou admins atualizam qualquer perfil"
  on public.user_profiles for update
  using (auth.uid() = id or public.is_admin());

drop policy if exists "Admins ou Auth Hook podem inserir perfis" on public.user_profiles;
create policy "Admins ou Auth Hook podem inserir perfis"
  on public.user_profiles for insert
  with check (auth.uid() = id or public.is_admin() or auth.uid() is null);


-- Trigger automático: ao cadastrar um usuário no Supabase Auth, cria o perfil correspondente
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, name, role, theme)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'member'),
    'system'
  )
  on conflict (id) do update
  set email = excluded.email,
      name = coalesce(excluded.name, user_profiles.name),
      role = coalesce(excluded.role, user_profiles.role);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. TABELA DE ATIVIDADES & COMPROMISSOS (RLS Estrito por Usuário)
create table if not exists public.activities (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  date text not null,
  time text,
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

drop policy if exists "Usuários gerenciam apenas suas próprias atividades" on public.activities;
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

drop policy if exists "Usuários gerenciam apenas seus próprios hábitos" on public.habits;
create policy "Usuários gerenciam apenas seus próprios hábitos"
  on public.habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_habits_user on public.habits (user_id);


-- 4. TABELA DE PLANO ALIMENTAR (Meal Planner - RLS Estrito)
create table if not exists public.meal_plans (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date_key text not null,
  breakfast jsonb default '{"text": "", "completed": false}'::jsonb,
  lunch jsonb default '{"text": "", "completed": false}'::jsonb,
  snack jsonb default '{"text": "", "completed": false}'::jsonb,
  dinner jsonb default '{"text": "", "completed": false}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.meal_plans enable row level security;

drop policy if exists "Usuários gerenciam apenas seu próprio plano alimentar" on public.meal_plans;
create policy "Usuários gerenciam apenas seu próprio plano alimentar"
  on public.meal_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_meal_plans_user_date on public.meal_plans (user_id, date_key);


-- 5. GRANTS DE SEGURANÇA E ACESSO AO SCHEMA PUBLIC
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- 6. PROMOÇÃO DIRETA DO ADMINISTRADOR CASO O USUÁRIO JÁ EXISTA
update public.user_profiles set role = 'admin' where email ilike 'alcides%';

-- Recarregar cache de schema do PostgREST
notify pgrst, 'reload schema';
