-- ==============================================================================
-- ORGANIZADOR SEMANAL - SUPABASE POSTGRESQL HARDENED SCHEMA & SECURITY STANDARDS
-- Projeto: https://txumkevqlgjdyqqlmxlh.supabase.co
-- Cole este script no SQL Editor do seu painel do Supabase e clique em RUN.
-- ==============================================================================

-- 1. EXTENSÕES & SETUP
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- 2. TABELA DE PERFIS DE USUÁRIOS (RBAC RÍGIDO)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null check (length(email) <= 255),
  name text not null check (length(trim(name)) > 0 and length(name) <= 150),
  role text not null default 'member' check (role in ('admin', 'member')),
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ativar RLS
alter table public.user_profiles enable row level security;

-- 3. FUNÇÃO AUXILIAR DE SEGURANÇA IS_ADMIN (SECURITY DEFINER SEGURO)
create or replace function public.is_admin()
returns boolean as $$
declare
  current_role text;
begin
  if auth.uid() is null then
    return false;
  end if;

  select role into current_role
  from public.user_profiles
  where id = auth.uid() and is_active = true;

  return current_role = 'admin';
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- Revogar execução pública da função de verificação e restringir a autenticados
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 4. POLÍTICAS RLS PARA USER_PROFILES (SEPARADAS POR OPERAÇÃO)
drop policy if exists "user_profiles_select" on public.user_profiles;
create policy "user_profiles_select"
  on public.user_profiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

drop policy if exists "user_profiles_insert" on public.user_profiles;
create policy "user_profiles_insert"
  on public.user_profiles for insert
  to authenticated
  with check (auth.uid() = id or public.is_admin());

drop policy if exists "user_profiles_update" on public.user_profiles;
create policy "user_profiles_update"
  on public.user_profiles for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (
    public.is_admin() or (
      auth.uid() = id
      and role = (select p.role from public.user_profiles p where p.id = auth.uid())
      and is_active = (select p.is_active from public.user_profiles p where p.id = auth.uid())
    )
  );

drop policy if exists "user_profiles_delete" on public.user_profiles;
create policy "user_profiles_delete"
  on public.user_profiles for delete
  to authenticated
  using (public.is_admin());

-- 5. TRIGGER DE BLINDAGEM DE CAMPOS CRÍTICOS (DEFESA EM PROFUNDIDADE)
create or replace function public.protect_user_profile_security_fields()
returns trigger as $$
begin
  -- Se o papel ou o status de ativação foi alterado
  if (NEW.role <> OLD.role or NEW.is_active <> OLD.is_active) then
    -- Somente um admin autenticado pode alterar esses campos
    if not public.is_admin() then
      raise exception 'Acesso Negado: Apenas administradores podem modificar o papel ou o status de uma conta.';
    end if;
  end if;

  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_protect_user_profiles on public.user_profiles;
create trigger trg_protect_user_profiles
  before update on public.user_profiles
  for each row execute function public.protect_user_profile_security_fields();


-- 6. TABELA DE ATIVIDADES (ACTIVITIES)
create table if not exists public.activities (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null check (length(trim(title)) > 0 and length(title) <= 255),
  date text not null check (date ~ '^\d{4}-\d{2}-\d{2}$'),
  time text check (time is null or time = '' or time ~ '^\d{2}:\d{2}$'),
  category text not null default 'outros',
  status text not null default 'pending' check (status in ('pending', 'completed')),
  recurrence text not null default 'none' check (recurrence in ('none', 'daily', 'weekdays', 'custom_days')),
  recurrence_days jsonb default '[]'::jsonb,
  recurrence_end_date text check (recurrence_end_date is null or recurrence_end_date = '' or recurrence_end_date ~ '^\d{4}-\d{2}-\d{2}$'),
  completed_dates jsonb default '[]'::jsonb,
  overrides jsonb default '{}'::jsonb,
  deleted_dates jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Garantir que restrições fixas legadas de categorias sejam removidas para suportar categorias customizadas
alter table public.activities drop constraint if exists activities_category_check;

alter table public.activities enable row level security;

drop policy if exists "activities_select" on public.activities;
create policy "activities_select" on public.activities for select to authenticated using (auth.uid() = user_id);

drop policy if exists "activities_insert" on public.activities;
create policy "activities_insert" on public.activities for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "activities_update" on public.activities;
create policy "activities_update" on public.activities for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "activities_delete" on public.activities;
create policy "activities_delete" on public.activities for delete to authenticated using (auth.uid() = user_id);


-- 7. TABELA DE CATEGORIAS CUSTOMIZADAS (CUSTOM_CATEGORIES) - Multi-tenant RLS
create table if not exists public.custom_categories (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (length(trim(name)) > 0 and length(name) <= 100),
  icon text not null default '📌' check (length(icon) <= 20),
  created_at timestamptz not null default now()
);

alter table public.custom_categories enable row level security;

drop policy if exists "custom_categories_select" on public.custom_categories;
create policy "custom_categories_select" on public.custom_categories for select to authenticated using (auth.uid() = user_id);

drop policy if exists "custom_categories_insert" on public.custom_categories;
create policy "custom_categories_insert" on public.custom_categories for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "custom_categories_update" on public.custom_categories;
create policy "custom_categories_update" on public.custom_categories for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "custom_categories_delete" on public.custom_categories;
create policy "custom_categories_delete" on public.custom_categories for delete to authenticated using (auth.uid() = user_id);


-- 8. TABELA DE HÁBITOS (HABITS)
create table if not exists public.habits (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (length(trim(name)) > 0 and length(name) <= 150),
  icon text not null default '🎯' check (length(icon) <= 10),
  target_days int not null default 7 check (target_days between 1 and 7),
  completed_dates jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.habits enable row level security;

drop policy if exists "habits_select" on public.habits;
create policy "habits_select" on public.habits for select to authenticated using (auth.uid() = user_id);

drop policy if exists "habits_insert" on public.habits;
create policy "habits_insert" on public.habits for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "habits_update" on public.habits;
create policy "habits_update" on public.habits for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "habits_delete" on public.habits;
create policy "habits_delete" on public.habits for delete to authenticated using (auth.uid() = user_id);


-- 9. TABELA DE PLANO ALIMENTAR (MEAL_PLANS) - UUID PK & UNIQUE (USER_ID, DATE_KEY)
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date_key text not null check (date_key ~ '^\d{4}-\d{2}-\d{2}$'),
  breakfast jsonb not null default '{"text": "", "completed": false}'::jsonb,
  morning_snack jsonb not null default '{"text": "", "completed": false}'::jsonb,
  lunch jsonb not null default '{"text": "", "completed": false}'::jsonb,
  snack jsonb not null default '{"text": "", "completed": false}'::jsonb,
  dinner jsonb not null default '{"text": "", "completed": false}'::jsonb,
  supper jsonb not null default '{"text": "", "completed": false}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint uq_user_meal_date unique (user_id, date_key)
);

-- Garantir adição segura e não-destrutiva de novas colunas em instâncias existentes
alter table public.meal_plans add column if not exists morning_snack jsonb not null default '{"text": "", "completed": false}'::jsonb;
alter table public.meal_plans add column if not exists supper jsonb not null default '{"text": "", "completed": false}'::jsonb;

alter table public.meal_plans enable row level security;

drop policy if exists "meal_plans_select" on public.meal_plans;
create policy "meal_plans_select" on public.meal_plans for select to authenticated using (auth.uid() = user_id);

drop policy if exists "meal_plans_insert" on public.meal_plans;
create policy "meal_plans_insert" on public.meal_plans for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "meal_plans_update" on public.meal_plans;
create policy "meal_plans_update" on public.meal_plans for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "meal_plans_delete" on public.meal_plans;
create policy "meal_plans_delete" on public.meal_plans for delete to authenticated using (auth.uid() = user_id);


-- 10. ÍNDICES DE PERFORMANCE (PERFORMANCE ADVISOR ALIGNMENT)
create index if not exists idx_activities_user_id on public.activities (user_id);
create index if not exists idx_activities_user_date on public.activities (user_id, date);
create index if not exists idx_habits_user_id on public.habits (user_id);
create index if not exists idx_meal_plans_user_id on public.meal_plans (user_id);
create index if not exists idx_meal_plans_user_date on public.meal_plans (user_id, date_key);
create index if not exists idx_user_profiles_role on public.user_profiles (role) where role = 'admin';


-- 10. GRANTS DE MENOR PRIVILÉGIO (SECURITY ADVISOR ALIGNMENT)
-- Revogar tudo de anon por padrão
revoke all on schema public from anon;
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all routines in schema public from anon;

-- Conceder apenas USAGE para anon (necessário para conexão e auth handshake)
grant usage on schema public to anon;

-- Conceder privilégios estritos para authenticated
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;


-- 11. RECARREGAR POSTGREST SCHEMA CACHE
notify pgrst, 'reload schema';
