-- ==============================================================================
-- CRIAR / REDEFINIR USUÁRIO EDUARDA COM SENHA 'eduarda123'
-- Cole no SQL Editor do Supabase (https://txumkevqlgjdyqqlmxlh.supabase.co) e clique em RUN
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'eduarda@planner.com.br';
  
  IF v_user_id IS NOT NULL THEN
    -- Redefine a senha para 'eduarda123' e garante status confirmado
    UPDATE auth.users
    SET 
      encrypted_password = crypt('eduarda123', gen_salt('bf')),
      email_confirmed_at = now(),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = '{"name":"Eduarda","role":"member"}'::jsonb,
      updated_at = now()
    WHERE id = v_user_id;

    -- Garante o perfil na tabela user_profiles
    INSERT INTO public.user_profiles (id, email, name, role, is_active, theme)
    VALUES (v_user_id, 'eduarda@planner.com.br', 'Eduarda', 'member', true, 'system')
    ON CONFLICT (id) DO UPDATE SET name = 'Eduarda', role = 'member', is_active = true;
  ELSE
    -- Cria o usuário diretamente com senha 'eduarda123'
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
      'eduarda@planner.com.br',
      crypt('eduarda123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Eduarda","role":"member"}'::jsonb,
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
      format('{"sub":"%s","email":"%s"}', v_user_id, 'eduarda@planner.com.br')::jsonb,
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );

    -- Insere perfil na tabela user_profiles
    INSERT INTO public.user_profiles (id, email, name, role, is_active, theme)
    VALUES (v_user_id, 'eduarda@planner.com.br', 'Eduarda', 'member', true, 'system')
    ON CONFLICT (id) DO UPDATE SET name = 'Eduarda', role = 'member', is_active = true;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
