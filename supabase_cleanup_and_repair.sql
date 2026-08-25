-- ==============================================================================
-- SCRIPT DE LIMPEZA E REPARO DEFINITIVO DO SUPABASE AUTH
-- Cole no SQL Editor do Supabase e clique em RUN
-- ==============================================================================

-- 1. Remover qualquer trigger em auth.users para evitar interferência no GoTrue
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 2. Limpar os registros anteriores das tabelas de autenticação
delete from auth.identities where identity_data->>'email' in ('alcides@planner.com.br', 'paula@planner.com.br');
delete from auth.users where email in ('alcides@planner.com.br', 'paula@planner.com.br');
delete from public.user_profiles where email in ('alcides@planner.com.br', 'paula@planner.com.br');

-- 3. Garantir a estrutura das tabelas da aplicação
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

alter table public.user_profiles enable row level security;

-- 4. Função de verificação de Admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Políticas de RLS
drop policy if exists "user_profiles_select" on public.user_profiles;
create policy "user_profiles_select" on public.user_profiles for select using (auth.uid() = id or public.is_admin());

drop policy if exists "user_profiles_insert" on public.user_profiles;
create policy "user_profiles_insert" on public.user_profiles for insert with check (auth.uid() = id or public.is_admin() or auth.uid() is null);

drop policy if exists "user_profiles_update" on public.user_profiles;
create policy "user_profiles_update" on public.user_profiles for update using (auth.uid() = id or public.is_admin());

-- 5. Conceder permissões no schema public
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all routines in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;

-- 6. Recarregar PostgREST
notify pgrst, 'reload schema';
