-- =============================================
-- Migration 006: Panel System (PIN-based role login)
-- Panel sistemi: Uzman, Resepsiyonist, Kasa rolleri için PIN girişi
-- =============================================

-- company_users tablosuna PIN ve panel rolleri ekle
ALTER TABLE company_users ADD COLUMN IF NOT EXISTS pin_code TEXT;
ALTER TABLE company_users ADD COLUMN IF NOT EXISTS panel_roles TEXT[] DEFAULT '{}';

-- PIN araması için index
CREATE INDEX IF NOT EXISTS idx_company_users_pin ON company_users(company_id, pin_code);

-- RPC: Panel login — PIN + rol doğrulama, kullanıcı verisi döndürür
CREATE OR REPLACE FUNCTION panel_login(p_company_id UUID, p_pin TEXT, p_role TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT id, name, email, phone, role, color, panel_roles
  INTO v_user
  FROM company_users
  WHERE company_id = p_company_id
    AND pin_code = p_pin
    AND (p_role = ANY(panel_roles) OR role = 'Yönetici');

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Geçersiz PIN veya yetki');
  END IF;

  RETURN json_build_object(
    'success', true,
    'user', json_build_object(
      'id', v_user.id,
      'name', v_user.name,
      'email', v_user.email,
      'phone', v_user.phone,
      'role', v_user.role,
      'color', v_user.color,
      'panel_roles', v_user.panel_roles
    )
  );
END;
$$;
