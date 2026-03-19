-- ============================================================
-- SEED: MT Masaj Firması — Alanlar, Ekipmanlar, İlişkiler
-- Company ID: e127d8ea-11f7-4aaa-b25d-76f97f7e7bac
-- Tarih: 2026-03-19
-- ============================================================

DO $$
DECLARE
  v_company_id UUID := 'e127d8ea-11f7-4aaa-b25d-76f97f7e7bac'::UUID;
  -- Alan ID'leri
  v_hamam_id UUID;
  v_sauna_id UUID;
  v_buhar_id UUID;
  v_masaj1_id UUID;
  v_masaj2_id UUID;
  v_vip_id UUID;
  v_tuz_id UUID;
  -- Ekipman ID'leri
  v_yatak_id UUID;
  v_hotstone_id UUID;
  v_kese_id UUID;
  v_aroma_id UUID;
  v_bornoz_id UUID;
  v_saltasi_id UUID;
  -- Uzman ID'leri (mevcut seed'den)
  v_expert_ids UUID[];
  v_expert_id UUID;
  -- Hizmet ID'leri
  v_service RECORD;
BEGIN

  RAISE NOTICE 'MT Masaj Resources Seed başlatılıyor...';

  -- ============================================================
  -- 1. ALANLAR (7 adet)
  -- ============================================================

  INSERT INTO spaces (company_id, name, description, capacity, booking_mode, buffer_minutes, is_active, color, sort_order)
  VALUES (v_company_id, 'Türk Hamamı', 'Geleneksel Türk hamamı alanı. Göbek taşı, kurnalar ve buhar sistemi mevcut.', 8, 'shared', 15, true, '#E91E8C', 1)
  ON CONFLICT (company_id, name) DO UPDATE SET capacity = EXCLUDED.capacity, booking_mode = EXCLUDED.booking_mode, buffer_minutes = EXCLUDED.buffer_minutes
  RETURNING id INTO v_hamam_id;

  INSERT INTO spaces (company_id, name, description, capacity, booking_mode, buffer_minutes, is_active, color, sort_order)
  VALUES (v_company_id, 'Fin Saunası', 'Kuru ısı Fin saunası. 80-100°C sıcaklık.', 6, 'shared', 10, true, '#F59E0B', 2)
  ON CONFLICT (company_id, name) DO UPDATE SET capacity = EXCLUDED.capacity
  RETURNING id INTO v_sauna_id;

  INSERT INTO spaces (company_id, name, description, capacity, booking_mode, buffer_minutes, is_active, color, sort_order)
  VALUES (v_company_id, 'Buhar Odası', 'Nemli buhar odası. 40-50°C sıcaklık, %100 nem.', 4, 'shared', 10, true, '#06B6D4', 3)
  ON CONFLICT (company_id, name) DO UPDATE SET capacity = EXCLUDED.capacity
  RETURNING id INTO v_buhar_id;

  INSERT INTO spaces (company_id, name, description, capacity, booking_mode, buffer_minutes, is_active, color, sort_order)
  VALUES (v_company_id, 'Masaj Odası 1', 'Tek kişilik masaj odası. Aromaterapi difüzörü mevcut.', 1, 'private', 15, true, '#8B5CF6', 4)
  ON CONFLICT (company_id, name) DO UPDATE SET capacity = EXCLUDED.capacity
  RETURNING id INTO v_masaj1_id;

  INSERT INTO spaces (company_id, name, description, capacity, booking_mode, buffer_minutes, is_active, color, sort_order)
  VALUES (v_company_id, 'Masaj Odası 2', 'Çift kişilik masaj odası. 2 masaj yatağı mevcut.', 2, 'group_private', 15, true, '#9333EA', 5)
  ON CONFLICT (company_id, name) DO UPDATE SET capacity = EXCLUDED.capacity
  RETURNING id INTO v_masaj2_id;

  INSERT INTO spaces (company_id, name, description, capacity, booking_mode, buffer_minutes, is_active, color, sort_order)
  VALUES (v_company_id, 'VIP Suit', 'Özel VIP suit. Hamam taşı, masaj yatağı, özel duş ve jakuzi.', 2, 'private', 20, true, '#D4AF37', 6)
  ON CONFLICT (company_id, name) DO UPDATE SET capacity = EXCLUDED.capacity
  RETURNING id INTO v_vip_id;

  INSERT INTO spaces (company_id, name, description, capacity, booking_mode, buffer_minutes, is_active, color, sort_order)
  VALUES (v_company_id, 'Tuz Odası', 'Himalaya tuz odası. Solunum ve cilt sağlığı için.', 4, 'shared', 10, true, '#FB923C', 7)
  ON CONFLICT (company_id, name) DO UPDATE SET capacity = EXCLUDED.capacity
  RETURNING id INTO v_tuz_id;

  RAISE NOTICE '7 alan oluşturuldu.';

  -- ============================================================
  -- 2. ALAN ÇALIŞMA SAATLERİ (tüm alanlar: Pzt-Paz 09:00-21:00)
  -- ============================================================
  DECLARE
    v_days TEXT[] := ARRAY['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
    v_space_ids UUID[];
    v_sid UUID;
    v_day TEXT;
  BEGIN
    v_space_ids := ARRAY[v_hamam_id, v_sauna_id, v_buhar_id, v_masaj1_id, v_masaj2_id, v_vip_id, v_tuz_id];

    FOREACH v_sid IN ARRAY v_space_ids LOOP
      FOREACH v_day IN ARRAY v_days LOOP
        INSERT INTO space_working_hours (company_id, space_id, day, is_open, start_time, end_time)
        VALUES (v_company_id, v_sid, v_day, true, '09:00'::TIME, '21:00'::TIME)
        ON CONFLICT (company_id, space_id, day) DO NOTHING;
      END LOOP;
    END LOOP;
  END;

  RAISE NOTICE 'Alan çalışma saatleri oluşturuldu.';

  -- ============================================================
  -- 3. EKİPMANLAR (6 adet)
  -- ============================================================

  INSERT INTO equipment (company_id, name, description, quantity, location_type, fixed_space_id, is_active)
  VALUES (v_company_id, 'Masaj Yatağı', 'Profesyonel masaj yatağı, ayarlanabilir yükseklik', 3, 'fixed', v_masaj1_id, true)
  ON CONFLICT (company_id, name) DO UPDATE SET quantity = EXCLUDED.quantity
  RETURNING id INTO v_yatak_id;

  INSERT INTO equipment (company_id, name, description, quantity, location_type, fixed_space_id, is_active)
  VALUES (v_company_id, 'Hot Stone Seti', 'Bazalt taş seti (40 parça), ısıtıcı dahil', 2, 'portable', NULL, true)
  ON CONFLICT (company_id, name) DO UPDATE SET quantity = EXCLUDED.quantity
  RETURNING id INTO v_hotstone_id;

  INSERT INTO equipment (company_id, name, description, quantity, location_type, fixed_space_id, is_active)
  VALUES (v_company_id, 'Kese Kesesi Seti', 'Geleneksel kese kesesi, sabun kovası, köpük tası', 5, 'fixed', v_hamam_id, true)
  ON CONFLICT (company_id, name) DO UPDATE SET quantity = EXCLUDED.quantity
  RETURNING id INTO v_kese_id;

  INSERT INTO equipment (company_id, name, description, quantity, location_type, fixed_space_id, is_active)
  VALUES (v_company_id, 'Aromaterapi Difüzörü', 'Ultrasonik aromaterapi yağı difüzörü', 2, 'portable', NULL, true)
  ON CONFLICT (company_id, name) DO UPDATE SET quantity = EXCLUDED.quantity
  RETURNING id INTO v_aroma_id;

  INSERT INTO equipment (company_id, name, description, quantity, location_type, fixed_space_id, is_active)
  VALUES (v_company_id, 'VIP Bornoz Seti', 'Premium pamuk bornoz, terlik ve havlu seti', 4, 'fixed', v_vip_id, true)
  ON CONFLICT (company_id, name) DO UPDATE SET quantity = EXCLUDED.quantity
  RETURNING id INTO v_bornoz_id;

  INSERT INTO equipment (company_id, name, description, quantity, location_type, fixed_space_id, is_active)
  VALUES (v_company_id, 'Şal Taşı Seti', 'Doğal şal taşları (20 parça), ısıtıcı dahil', 2, 'portable', NULL, true)
  ON CONFLICT (company_id, name) DO UPDATE SET quantity = EXCLUDED.quantity
  RETURNING id INTO v_saltasi_id;

  RAISE NOTICE '6 ekipman oluşturuldu.';

  -- ============================================================
  -- 4. HİZMET-KAYNAK İLİŞKİLERİ
  -- ============================================================
  -- Hizmetleri bul ve kaynak gereksinimlerini ekle

  -- Klasik Masaj → Masaj Odası 1 veya 2 + Masaj Yatağı
  FOR v_service IN SELECT id FROM company_services WHERE company_id = v_company_id AND description ILIKE '%Klasik Masaj%' LOOP
    INSERT INTO service_resource_requirements (company_id, service_id, resource_type, resource_id, is_required)
    VALUES
      (v_company_id, v_service.id, 'space', v_masaj1_id, true),
      (v_company_id, v_service.id, 'space', v_masaj2_id, true),
      (v_company_id, v_service.id, 'equipment', v_yatak_id, true)
    ON CONFLICT (service_id, resource_type, resource_id) DO NOTHING;
    -- requires_expert zaten true (default)
  END LOOP;

  -- Aromaterapi Masajı → Masaj Odası + Masaj Yatağı + Aromaterapi Difüzörü
  FOR v_service IN SELECT id FROM company_services WHERE company_id = v_company_id AND description ILIKE '%Aromaterapi%' LOOP
    INSERT INTO service_resource_requirements (company_id, service_id, resource_type, resource_id, is_required)
    VALUES
      (v_company_id, v_service.id, 'space', v_masaj1_id, true),
      (v_company_id, v_service.id, 'space', v_masaj2_id, true),
      (v_company_id, v_service.id, 'equipment', v_yatak_id, true),
      (v_company_id, v_service.id, 'equipment', v_aroma_id, true)
    ON CONFLICT (service_id, resource_type, resource_id) DO NOTHING;
  END LOOP;

  -- Hot Stone Masajı → Masaj Odası + Masaj Yatağı + Hot Stone Seti
  FOR v_service IN SELECT id FROM company_services WHERE company_id = v_company_id AND description ILIKE '%Hot Stone%' LOOP
    INSERT INTO service_resource_requirements (company_id, service_id, resource_type, resource_id, is_required)
    VALUES
      (v_company_id, v_service.id, 'space', v_masaj1_id, true),
      (v_company_id, v_service.id, 'space', v_masaj2_id, true),
      (v_company_id, v_service.id, 'equipment', v_yatak_id, true),
      (v_company_id, v_service.id, 'equipment', v_hotstone_id, true)
    ON CONFLICT (service_id, resource_type, resource_id) DO NOTHING;
  END LOOP;

  -- Türk Hamamı Kese → Türk Hamamı + Kese Kesesi
  FOR v_service IN SELECT id FROM company_services WHERE company_id = v_company_id AND (description ILIKE '%Kese%' OR description ILIKE '%Hamam%Kese%') LOOP
    INSERT INTO service_resource_requirements (company_id, service_id, resource_type, resource_id, is_required)
    VALUES
      (v_company_id, v_service.id, 'space', v_hamam_id, true),
      (v_company_id, v_service.id, 'equipment', v_kese_id, true)
    ON CONFLICT (service_id, resource_type, resource_id) DO NOTHING;
  END LOOP;

  -- Fin Saunası Seans → Fin Saunası (self-service — requires_expert = false)
  FOR v_service IN SELECT id FROM company_services WHERE company_id = v_company_id AND description ILIKE '%Sauna%' LOOP
    UPDATE company_services SET requires_expert = false, capacity_per_slot = 1 WHERE id = v_service.id;
    INSERT INTO service_resource_requirements (company_id, service_id, resource_type, resource_id, is_required)
    VALUES (v_company_id, v_service.id, 'space', v_sauna_id, true)
    ON CONFLICT (service_id, resource_type, resource_id) DO NOTHING;
  END LOOP;

  -- Buhar Odası Seans → Buhar Odası (self-service)
  FOR v_service IN SELECT id FROM company_services WHERE company_id = v_company_id AND description ILIKE '%Buhar%' LOOP
    UPDATE company_services SET requires_expert = false, capacity_per_slot = 1 WHERE id = v_service.id;
    INSERT INTO service_resource_requirements (company_id, service_id, resource_type, resource_id, is_required)
    VALUES (v_company_id, v_service.id, 'space', v_buhar_id, true)
    ON CONFLICT (service_id, resource_type, resource_id) DO NOTHING;
  END LOOP;

  -- Tuz Odası Seans → Tuz Odası (self-service)
  FOR v_service IN SELECT id FROM company_services WHERE company_id = v_company_id AND description ILIKE '%Tuz%' LOOP
    UPDATE company_services SET requires_expert = false, capacity_per_slot = 1 WHERE id = v_service.id;
    INSERT INTO service_resource_requirements (company_id, service_id, resource_type, resource_id, is_required)
    VALUES (v_company_id, v_service.id, 'space', v_tuz_id, true)
    ON CONFLICT (service_id, resource_type, resource_id) DO NOTHING;
  END LOOP;

  -- VIP Masaj → VIP Suit + Masaj Yatağı + VIP Bornoz
  FOR v_service IN SELECT id FROM company_services WHERE company_id = v_company_id AND description ILIKE '%VIP%' LOOP
    INSERT INTO service_resource_requirements (company_id, service_id, resource_type, resource_id, is_required)
    VALUES
      (v_company_id, v_service.id, 'space', v_vip_id, true),
      (v_company_id, v_service.id, 'equipment', v_yatak_id, true),
      (v_company_id, v_service.id, 'equipment', v_bornoz_id, true)
    ON CONFLICT (service_id, resource_type, resource_id) DO NOTHING;
  END LOOP;

  -- Çift Masajı → Masaj Odası 2 (group_private) + 2 Masaj Yatağı
  FOR v_service IN SELECT id FROM company_services WHERE company_id = v_company_id AND description ILIKE '%Çift%' LOOP
    UPDATE company_services SET capacity_per_slot = 2, privacy_override = 'group_private' WHERE id = v_service.id;
    INSERT INTO service_resource_requirements (company_id, service_id, resource_type, resource_id, is_required)
    VALUES
      (v_company_id, v_service.id, 'space', v_masaj2_id, true),
      (v_company_id, v_service.id, 'equipment', v_yatak_id, true)
    ON CONFLICT (service_id, resource_type, resource_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Hizmet-kaynak ilişkileri oluşturuldu.';

  -- ============================================================
  -- 5. UZMAN-ALAN ATAMALARI
  -- ============================================================
  -- Tüm uzmanları al
  SELECT ARRAY_AGG(id) INTO v_expert_ids
  FROM company_users
  WHERE company_id = v_company_id AND role = 'Uzman';

  IF v_expert_ids IS NOT NULL THEN
    FOREACH v_expert_id IN ARRAY v_expert_ids LOOP
      -- Tüm uzmanlar hamam, masaj odaları ve VIP'de çalışabilir
      INSERT INTO expert_spaces (expert_id, space_id, company_id, is_preferred)
      VALUES
        (v_expert_id, v_hamam_id, v_company_id, false),
        (v_expert_id, v_masaj1_id, v_company_id, true),  -- Masaj Odası 1 tercih
        (v_expert_id, v_masaj2_id, v_company_id, false),
        (v_expert_id, v_vip_id, v_company_id, false)
      ON CONFLICT (expert_id, space_id) DO NOTHING;
    END LOOP;
    RAISE NOTICE '% uzman için alan atamaları yapıldı.', array_length(v_expert_ids, 1);
  END IF;

  RAISE NOTICE 'MT Masaj Resources Seed tamamlandı!';

END $$;
