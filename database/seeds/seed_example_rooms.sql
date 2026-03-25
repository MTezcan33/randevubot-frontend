-- ============================================================================
-- Ornek Odalar: 1 kisilik, 2 kisilik, 3 kisilik
-- KULLANIM: Supabase SQL Editor'da calistirin
-- NOT: company_id'yi kendi sirketinizin ID'si ile degistirin
-- ============================================================================

-- Once sirket ID'nizi bulun:
-- SELECT id, name FROM companies LIMIT 5;

-- Asagidaki sorguda 'YOUR_COMPANY_ID' yerine gercek ID'yi yazin:

DO $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Ilk sirketi al (tek sirket varsa)
  SELECT id INTO v_company_id FROM companies LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Sirket bulunamadi!';
  END IF;

  -- Mevcut ornek odalari temizle (opsiyonel)
  -- DELETE FROM spaces WHERE company_id = v_company_id AND name IN ('Masaj Odası 1','Masaj Odası 2','VIP Suit');

  -- 1 kisilik oda
  INSERT INTO spaces (company_id, name, description, capacity, booking_mode, color, sort_order, is_active)
  VALUES (v_company_id, 'Masaj Odası 1', 'Tek kişilik masaj odası. Aromaterapi difüzörü mevcut.', 1, 'private', '#6366F1', 1, true)
  ON CONFLICT (company_id, name) DO UPDATE SET
    description = EXCLUDED.description, capacity = EXCLUDED.capacity;

  -- 2 kisilik oda
  INSERT INTO spaces (company_id, name, description, capacity, booking_mode, color, sort_order, is_active)
  VALUES (v_company_id, 'Masaj Odası 2', 'Çift kişilik masaj odası. 2 masaj yatağı mevcut.', 2, 'private', '#8B5CF6', 2, true)
  ON CONFLICT (company_id, name) DO UPDATE SET
    description = EXCLUDED.description, capacity = EXCLUDED.capacity;

  -- 3 kisilik VIP suit
  INSERT INTO spaces (company_id, name, description, capacity, booking_mode, color, sort_order, is_active)
  VALUES (v_company_id, 'VIP Suit', 'Özel VIP suit. Hamam taşı, masaj yatağı ve jakuzi. 3 alan mevcut.', 3, 'private', '#EC4899', 3, true)
  ON CONFLICT (company_id, name) DO UPDATE SET
    description = EXCLUDED.description, capacity = EXCLUDED.capacity;

  RAISE NOTICE 'Ornek odalar olusturuldu: company_id = %', v_company_id;
END $$;
