-- ==============================================================================
-- REDEFINIR / CRIAR USUÁRIO MILA COM SENHA 'mila2026'
-- Cole no SQL Editor do Supabase e clique em RUN
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'mila@planner.com.br';
  
  IF v_user_id IS NOT NULL THEN
    -- Redefine a senha para 'mila2026' e garante status confirmado
    UPDATE auth.users
    SET 
      encrypted_password = crypt('mila2026', gen_salt('bf')),
      email_confirmed_at = now(),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = '{"name":"Mila","role":"member"}'::jsonb,
      updated_at = now()
    WHERE id = v_user_id;

    -- Garante o perfil na tabela user_profiles
    INSERT INTO public.user_profiles (id, email, name, role, is_active, theme)
    VALUES (v_user_id, 'mila@planner.com.br', 'Mila', 'member', true, 'system')
    ON CONFLICT (id) DO UPDATE SET name = 'Mila', role = 'member', is_active = true;
  ELSE
    -- Cria o usuário diretamente com senha 'mila2026'
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'mila@planner.com.br',
      crypt('mila2026', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Mila","role":"member"}'::jsonb,
      now(),
      now()
    );

    -- Insere identidade auth GoTrue
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      format('{"sub":"%s","email":"%s"}', v_user_id, 'mila@planner.com.br')::jsonb,
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );

    -- Insere perfil na tabela user_profiles
    INSERT INTO public.user_profiles (id, email, name, role, is_active, theme)
    VALUES (v_user_id, 'mila@planner.com.br', 'Mila', 'member', true, 'system')
    ON CONFLICT (id) DO UPDATE SET name = 'Mila', role = 'member', is_active = true;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
