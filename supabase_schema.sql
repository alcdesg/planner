-- ==============================================================================
-- ORGANIZADOR SEMANAL - SUPABASE POSTGRESQL SCHEMA, RBAC & PROVISIONING SCRIPT
-- Cole este script no SQL Editor do seu painel do Supabase e clique em RUN.
-- Projeto: https://txumkevqlgjdyqqlmxlh.supabase.co
-- ==============================================================================

-- Habilitar extensão de criptografia para provisionamento de usuários
create extension if not exists pgcrypto;

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

-- Garantir que as colunas existam caso a tabela já tenha sido criada anteriormente
alter table public.user_profiles add column if not exists role text not null default 'member' check (role in ('admin', 'member'));
alter table public.user_profiles add column if not exists is_active boolean default true;
alter table public.user_profiles add column if not exists created_at timestamptz default now();

-- Ativar RLS em user_profiles
alter table public.user_profiles enable row level security;

-- Função auxiliar segura para verificar se o usuário atual é Admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
end;
$$ language plpgsql security definer;

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


-- Trigger para criar perfil automaticamente no cadastro caso ocorra via API
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
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. TABELA DE ATIVIDADES & COMPROMISSOS (RLS Estrito)
create table if not exists public.activities (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  date text not null, -- YYYY-MM-DD
  time text,          -- HH:mm
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
  date_key text not null, -- YYYY-MM-DD
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


-- ==============================================================================
-- 5. PROVISIONAMENTO AUTOMÁTICO E ROBUSTO DOS USUÁRIOS INICIAIS
-- ==============================================================================

do $$
declare
  alcides_id uuid := 'a1c1de50-0000-0000-0000-000000000001'::uuid;
  paula_id   uuid := 'ba111a00-0000-0000-0000-000000000002'::uuid;
begin
  -- 1. Provisionar Admin: alcides@planner.com.br (Senha: Epm@2024)
  if not exists (select 1 from auth.users where email = 'alcides@planner.com.br') then
    insert into auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) values (
      alcides_id,
      '00000000-0000-0000-0000-000000000000',
      'alcides@planner.com.br',
      crypt('Epm@2024', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Alcides","role":"admin"}'::jsonb,
      now(),
      now(),
      'authenticated',
      'authenticated'
    );
  else
    select id into alcides_id from auth.users where email = 'alcides@planner.com.br';
    update auth.users
    set encrypted_password = crypt('Epm@2024', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', '"admin"')
    where id = alcides_id;
  end if;

  -- Criar identidade para Alcides (com id no tipo uuid e provider_id no tipo text)
  if not exists (select 1 from auth.identities where user_id = alcides_id) then
    insert into auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      alcides_id,
      alcides_id::text,
      alcides_id,
      json_build_object('sub', alcides_id::text, 'email', 'alcides@planner.com.br')::jsonb,
      'email',
      now(),
      now(),
      now()
    );
  end if;

  -- Garantir perfil no public.user_profiles
  insert into public.user_profiles (id, email, name, role, theme)
  values (alcides_id, 'alcides@planner.com.br', 'Alcides', 'admin', 'system')
  on conflict (id) do update set role = 'admin', email = 'alcides@planner.com.br';


  -- 2. Provisionar Usuário Comum: paula@planner.com.br (Senha: 232107)
  if not exists (select 1 from auth.users where email = 'paula@planner.com.br') then
    insert into auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) values (
      paula_id,
      '00000000-0000-0000-0000-000000000000',
      'paula@planner.com.br',
      crypt('232107', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Paula","role":"member"}'::jsonb,
      now(),
      now(),
      'authenticated',
      'authenticated'
    );
  else
    select id into paula_id from auth.users where email = 'paula@planner.com.br';
    update auth.users
    set encrypted_password = crypt('232107', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', '"member"')
    where id = paula_id;
  end if;

  -- Criar identidade para Paula (com id no tipo uuid e provider_id no tipo text)
  if not exists (select 1 from auth.identities where user_id = paula_id) then
    insert into auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      paula_id,
      paula_id::text,
      paula_id,
      json_build_object('sub', paula_id::text, 'email', 'paula@planner.com.br')::jsonb,
      'email',
      now(),
      now(),
      now()
    );
  end if;

  -- Garantir perfil no public.user_profiles
  insert into public.user_profiles (id, email, name, role, theme)
  values (paula_id, 'paula@planner.com.br', 'Paula', 'member', 'system')
  on conflict (id) do update set role = 'member', email = 'paula@planner.com.br';

end $$;
