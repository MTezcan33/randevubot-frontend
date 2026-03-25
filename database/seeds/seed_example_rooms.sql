-- ============================================================================
-- Ornek Odalar ve Tesis Alanlari
-- Supabase SQL Editor'da calistirin
-- ============================================================================

DO $$
DECLARE
  v_cid UUID;
BEGIN
  SELECT id INTO v_cid FROM companies LIMIT 1;

  -- Oncekileri temizle
  DELETE FROM spaces WHERE company_id = v_cid;

  -- ═══════════════════════════════════════════
  -- MASAJ ODALARI (private, yatak bazli)
  -- ═══════════════════════════════════════════

  -- 1 kisilik masaj odasi
  INSERT INTO spaces (company_id, name, description, capacity, booking_mode, color, sort_order, zone, is_active)
  VALUES (v_cid, 'Masaj Odası 1', 'Tek kişilik masaj odası. Aromaterapi difüzörü mevcut.', 1, 'private', '#6366F1', 1, 'Masaj Odaları', true);

  -- 2 kisilik masaj odasi
  INSERT INTO spaces (company_id, name, description, capacity, booking_mode, color, sort_order, zone, is_active)
  VALUES (v_cid, 'Masaj Odası 2', 'Çift kişilik masaj odası. 2 masaj yatağı mevcut.', 2, 'private', '#8B5CF6', 2, 'Masaj Odaları', true);

  -- 3 kisilik VIP suit
  INSERT INTO spaces (company_id, name, description, capacity, booking_mode, color, sort_order, zone, is_active)
  VALUES (v_cid, 'VIP Suit', 'Özel VIP suit. Hamam taşı, masaj yatağı ve jakuzi.', 3, 'private', '#EC4899', 3, 'Masaj Odaları', true);

  -- ═══════════════════════════════════════════
  -- TESİS ALANLARI (shared, kapasite bazli)
  -- Uzman atanmaz, doluluk orani gosterilir
  -- ═══════════════════════════════════════════

  -- Sauna — 8 kisilik
  INSERT INTO spaces (company_id, name, description, capacity, booking_mode, color, sort_order, zone, is_active)
  VALUES (v_cid, 'Fin Saunası', 'Kuru ısı Fin saunası. 80-100°C. Maksimum 8 kişi.', 8, 'shared', '#F59E0B', 10, 'Islak Alan', true);

  -- Turk Hamami — 6 kisilik
  INSERT INTO spaces (company_id, name, description, capacity, booking_mode, color, sort_order, zone, is_active)
  VALUES (v_cid, 'Türk Hamamı', 'Geleneksel Türk hamamı. Göbek taşı ve kurnalar.', 6, 'shared', '#EF4444', 11, 'Islak Alan', true);

  -- Buhar Odasi — 4 kisilik
  INSERT INTO spaces (company_id, name, description, capacity, booking_mode, color, sort_order, zone, is_active)
  VALUES (v_cid, 'Buhar Odası', 'Nemli buhar odası. 40-50°C. Cilt bakımı için ideal.', 4, 'shared', '#06B6D4', 12, 'Islak Alan', true);

  RAISE NOTICE 'Odalar ve tesisler olusturuldu: company_id = %', v_cid;
END $$;
