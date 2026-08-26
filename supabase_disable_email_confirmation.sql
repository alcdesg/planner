-- ==============================================================================
-- CORREÇÃO DEFINITIVA: DESATIVAR CONFIRMAÇÃO DE E-MAIL E LIBERAR USUÁRIOS
-- Cole este script no SQL Editor do Supabase (https://txumkevqlgjdyqqlmxlh.supabase.co) e clique em RUN
-- ==============================================================================

-- 1. Confirmar instantaneamente todos os usuários pendentes (ex: mila@planner.com.br)
-- Nota: confirmed_at é uma coluna gerada automaticamente pelo PostgreSQL a partir de email_confirmed_at
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  last_sign_in_at = COALESCE(last_sign_in_at, now())
WHERE email_confirmed_at IS NULL;

-- 2. Garantir que todos os usuários do auth.users possuam seus perfis em public.user_profiles
INSERT INTO public.user_profiles (id, email, name, role, is_active, theme)
SELECT 
  u.id, 
  u.email, 
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1), 'Usuário'),
  COALESCE(u.raw_user_meta_data->>'role', 'member'),
  true,
  'system'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- 3. Trigger de Segurança no Banco: Auto-confirmar qualquer novo usuário inserido
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS trigger AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth, pg_temp;

DROP TRIGGER IF EXISTS trg_auto_confirm_user ON auth.users;
CREATE TRIGGER trg_auto_confirm_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_new_user();

-- 4. Notificar recarregamento do PostgREST
NOTIFY pgrst, 'reload schema';
