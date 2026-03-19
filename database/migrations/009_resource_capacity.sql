-- ============================================================
-- Migration 009: Kapasite-Merkezli Mimari Katmanı
-- Tarih: 2026-03-19
-- Açıklama: Alan (Space), Ekipman (Equipment) ve çok boyutlu
--           müsaitlik kontrolü için temel veri yapıları
-- ============================================================

-- ============================================================
-- 1. SPACES — Fiziksel alanlar (oda, hamam, sauna, VIP suit)
-- ============================================================
CREATE TABLE IF NOT EXISTS spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0),
  booking_mode TEXT NOT NULL DEFAULT 'private'
    CHECK (booking_mode IN ('shared', 'private', 'group_private')),
  buffer_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_minutes >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  color TEXT DEFAULT '#6366F1',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_spaces_company_id ON spaces(company_id);
CREATE INDEX IF NOT EXISTS idx_spaces_company_active ON spaces(company_id, is_active);

-- RLS
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spaces_select" ON spaces;
CREATE POLICY "spaces_select" ON spaces FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "spaces_insert" ON spaces;
CREATE POLICY "spaces_insert" ON spaces FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "spaces_update" ON spaces;
CREATE POLICY "spaces_update" ON spaces FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "spaces_delete" ON spaces;
CREATE POLICY "spaces_delete" ON spaces FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- ============================================================
-- 2. SPACE_WORKING_HOURS — Alan bazlı çalışma saatleri
-- ============================================================
CREATE TABLE IF NOT EXISTS space_working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  day TEXT NOT NULL,  -- Pazartesi, Salı, Çarşamba, Perşembe, Cuma, Cumartesi, Pazar
  is_open BOOLEAN NOT NULL DEFAULT true,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, space_id, day)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_space_wh_company ON space_working_hours(company_id);
CREATE INDEX IF NOT EXISTS idx_space_wh_space ON space_working_hours(space_id);
CREATE INDEX IF NOT EXISTS idx_space_wh_space_day ON space_working_hours(space_id, day);

-- RLS
ALTER TABLE space_working_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "space_wh_select" ON space_working_hours;
CREATE POLICY "space_wh_select" ON space_working_hours FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "space_wh_insert" ON space_working_hours;
CREATE POLICY "space_wh_insert" ON space_working_hours FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "space_wh_update" ON space_working_hours;
CREATE POLICY "space_wh_update" ON space_working_hours FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "space_wh_delete" ON space_working_hours;
CREATE POLICY "space_wh_delete" ON space_working_hours FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- ============================================================
-- 3. EQUIPMENT — Fiziksel ekipmanlar
-- ============================================================
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  location_type TEXT NOT NULL DEFAULT 'portable'
    CHECK (location_type IN ('fixed', 'portable')),
  fixed_space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_equipment_company_id ON equipment(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_company_active ON equipment(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_equipment_fixed_space ON equipment(fixed_space_id);

-- RLS
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipment_select" ON equipment;
CREATE POLICY "equipment_select" ON equipment FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "equipment_insert" ON equipment;
CREATE POLICY "equipment_insert" ON equipment FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "equipment_update" ON equipment;
CREATE POLICY "equipment_update" ON equipment FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "equipment_delete" ON equipment;
CREATE POLICY "equipment_delete" ON equipment FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- ============================================================
-- 4. SERVICE_RESOURCE_REQUIREMENTS — Hizmet-Kaynak ilişkisi
-- ============================================================
CREATE TABLE IF NOT EXISTS service_resource_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES company_services(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('space', 'equipment')),
  resource_id UUID NOT NULL,  -- spaces.id veya equipment.id
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_id, resource_type, resource_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_srr_service ON service_resource_requirements(service_id);
CREATE INDEX IF NOT EXISTS idx_srr_resource ON service_resource_requirements(resource_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_srr_company ON service_resource_requirements(company_id);

-- RLS
ALTER TABLE service_resource_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "srr_select" ON service_resource_requirements;
CREATE POLICY "srr_select" ON service_resource_requirements FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "srr_insert" ON service_resource_requirements;
CREATE POLICY "srr_insert" ON service_resource_requirements FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "srr_update" ON service_resource_requirements;
CREATE POLICY "srr_update" ON service_resource_requirements FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "srr_delete" ON service_resource_requirements;
CREATE POLICY "srr_delete" ON service_resource_requirements FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- ============================================================
-- 5. EXPERT_SPACES — Uzman-Alan ilişkisi (expert_services pattern)
-- ============================================================
CREATE TABLE IF NOT EXISTS expert_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id UUID NOT NULL REFERENCES company_users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  is_preferred BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(expert_id, space_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expert_spaces_expert ON expert_spaces(expert_id);
CREATE INDEX IF NOT EXISTS idx_expert_spaces_space ON expert_spaces(space_id);
CREATE INDEX IF NOT EXISTS idx_expert_spaces_company ON expert_spaces(company_id);

-- RLS
ALTER TABLE expert_spaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "es_select" ON expert_spaces;
CREATE POLICY "es_select" ON expert_spaces FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "es_insert" ON expert_spaces;
CREATE POLICY "es_insert" ON expert_spaces FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "es_update" ON expert_spaces;
CREATE POLICY "es_update" ON expert_spaces FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "es_delete" ON expert_spaces;
CREATE POLICY "es_delete" ON expert_spaces FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- ============================================================
-- 6. APPOINTMENT_RESOURCES — Randevu-Kaynak ilişkisi
-- ============================================================
CREATE TABLE IF NOT EXISTS appointment_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('space', 'equipment')),
  resource_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(appointment_id, resource_type, resource_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ar_appointment ON appointment_resources(appointment_id);
CREATE INDEX IF NOT EXISTS idx_ar_resource ON appointment_resources(resource_id, resource_type);

-- RLS (appointment_services pattern — nested via appointments)
ALTER TABLE appointment_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ar_select" ON appointment_resources;
CREATE POLICY "ar_select" ON appointment_resources FOR SELECT
  USING (appointment_id IN (
    SELECT id FROM appointments WHERE company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "ar_insert" ON appointment_resources;
CREATE POLICY "ar_insert" ON appointment_resources FOR INSERT
  WITH CHECK (appointment_id IN (
    SELECT id FROM appointments WHERE company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "ar_update" ON appointment_resources;
CREATE POLICY "ar_update" ON appointment_resources FOR UPDATE
  USING (appointment_id IN (
    SELECT id FROM appointments WHERE company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "ar_delete" ON appointment_resources;
CREATE POLICY "ar_delete" ON appointment_resources FOR DELETE
  USING (appointment_id IN (
    SELECT id FROM appointments WHERE company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  ));

-- ============================================================
-- 7. ALTER EXISTING TABLES — Mevcut tablolara yeni kolonlar
-- ============================================================

-- company_services: Uzman gereksinimi ve kapasite ayarları
ALTER TABLE company_services ADD COLUMN IF NOT EXISTS requires_expert BOOLEAN DEFAULT true;
ALTER TABLE company_services ADD COLUMN IF NOT EXISTS capacity_per_slot INTEGER DEFAULT 1;
ALTER TABLE company_services ADD COLUMN IF NOT EXISTS privacy_override TEXT
  CHECK (privacy_override IN ('shared', 'private', 'group_private'));

-- appointments: Alan referansı ve grup booking
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES spaces(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS group_booking_id UUID;

-- companies: Kaynak zorunluluk seviyesi
ALTER TABLE companies ADD COLUMN IF NOT EXISTS resource_enforcement TEXT DEFAULT 'optional'
  CHECK (resource_enforcement IN ('optional', 'recommended', 'mandatory'));

-- appointments tablosuna space_id index
CREATE INDEX IF NOT EXISTS idx_appointments_space ON appointments(space_id);
CREATE INDEX IF NOT EXISTS idx_appointments_group_booking ON appointments(group_booking_id);

-- ============================================================
-- 8. RPC: check_resource_availability — Çok boyutlu müsaitlik
-- ============================================================
CREATE OR REPLACE FUNCTION check_resource_availability(
  p_company_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_duration INTEGER,  -- dakika
  p_space_id UUID DEFAULT NULL,
  p_expert_id UUID DEFAULT NULL,
  p_equipment_ids UUID[] DEFAULT '{}',
  p_exclude_appointment_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_end_time TIME;
  v_space RECORD;
  v_conflicts JSONB := '[]'::JSONB;
  v_available BOOLEAN := true;
  v_concurrent_count INTEGER;
  v_buffer_end TIME;
  v_eq_id UUID;
  v_eq RECORD;
  v_eq_used INTEGER;
  v_expert_conflict RECORD;
BEGIN
  -- Bitiş saatini hesapla
  v_end_time := p_start_time + (p_duration || ' minutes')::INTERVAL;

  -- ─────────────────────────────────────────────
  -- 1. ALAN (SPACE) MÜSAİTLİK KONTROLÜ
  -- ─────────────────────────────────────────────
  IF p_space_id IS NOT NULL THEN
    SELECT * INTO v_space FROM spaces
    WHERE id = p_space_id AND company_id = p_company_id AND is_active = true;

    IF NOT FOUND THEN
      v_available := false;
      v_conflicts := v_conflicts || jsonb_build_object(
        'type', 'space', 'resource_name', 'Bilinmeyen Alan',
        'message', 'Alan bulunamadı veya aktif değil'
      );
    ELSE
      -- Aynı alanda çakışan randevuları say (buffer dahil)
      SELECT COUNT(DISTINCT a.id) INTO v_concurrent_count
      FROM appointments a
      JOIN appointment_resources ar ON ar.appointment_id = a.id
      WHERE ar.resource_type = 'space'
        AND ar.resource_id = p_space_id
        AND a.company_id = p_company_id
        AND a.date = p_date
        AND a.status != 'iptal'
        AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
        AND (
          -- Zaman çakışması (buffer dahil)
          a.time < v_end_time
          AND (a.time + ((COALESCE(a.total_duration, 60) + v_space.buffer_minutes) || ' minutes')::INTERVAL)::TIME > p_start_time
        );

      -- Booking mode'a göre kontrol
      IF v_space.booking_mode = 'private' THEN
        -- Özel: Herhangi bir randevu varsa → dolu
        IF v_concurrent_count > 0 THEN
          v_available := false;
          v_conflicts := v_conflicts || jsonb_build_object(
            'type', 'space', 'resource_name', v_space.name,
            'message', v_space.name || ' bu saatte başka bir randevu için ayrılmış (Özel mod)'
          );
        END IF;
      ELSIF v_space.booking_mode = 'shared' THEN
        -- Paylaşımlı: Kapasite doluysa → dolu
        IF v_concurrent_count >= v_space.capacity THEN
          v_available := false;
          v_conflicts := v_conflicts || jsonb_build_object(
            'type', 'space', 'resource_name', v_space.name,
            'message', v_space.name || ' kapasitesi dolu (' || v_concurrent_count || '/' || v_space.capacity || ')'
          );
        END IF;
      ELSIF v_space.booking_mode = 'group_private' THEN
        -- Grup-Özel: Farklı gruptan randevu varsa → dolu
        -- Aynı group_booking_id olan randevular paylaşabilir
        SELECT COUNT(DISTINCT a.id) INTO v_concurrent_count
        FROM appointments a
        JOIN appointment_resources ar ON ar.appointment_id = a.id
        WHERE ar.resource_type = 'space'
          AND ar.resource_id = p_space_id
          AND a.company_id = p_company_id
          AND a.date = p_date
          AND a.status != 'iptal'
          AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
          AND a.time < v_end_time
          AND (a.time + ((COALESCE(a.total_duration, 60) + v_space.buffer_minutes) || ' minutes')::INTERVAL)::TIME > p_start_time
          AND (a.group_booking_id IS NULL OR a.group_booking_id != COALESCE(p_exclude_appointment_id, '00000000-0000-0000-0000-000000000000'));

        IF v_concurrent_count > 0 THEN
          v_available := false;
          v_conflicts := v_conflicts || jsonb_build_object(
            'type', 'space', 'resource_name', v_space.name,
            'message', v_space.name || ' bu saatte başka bir grup için ayrılmış (Grup-Özel mod)'
          );
        END IF;
      END IF;
    END IF;
  END IF;

  -- ─────────────────────────────────────────────
  -- 2. UZMAN MÜSAİTLİK KONTROLÜ
  -- ─────────────────────────────────────────────
  IF p_expert_id IS NOT NULL THEN
    -- Çakışan randevu kontrolü
    SELECT a.id, a.time, a.total_duration INTO v_expert_conflict
    FROM appointments a
    WHERE a.expert_id = p_expert_id
      AND a.company_id = p_company_id
      AND a.date = p_date
      AND a.status != 'iptal'
      AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
      AND a.time < v_end_time
      AND (a.time + (COALESCE(a.total_duration, 60) || ' minutes')::INTERVAL)::TIME > p_start_time
    LIMIT 1;

    IF FOUND THEN
      v_available := false;
      v_conflicts := v_conflicts || jsonb_build_object(
        'type', 'expert', 'resource_name', (SELECT name FROM company_users WHERE id = p_expert_id),
        'message', 'Uzman bu saatte başka bir randevuda'
      );
    END IF;

    -- Öğle molası kontrolü
    DECLARE
      v_lunch_start TIME;
      v_lunch_end TIME;
    BEGIN
      SELECT general_lunch_start_time, general_lunch_end_time
      INTO v_lunch_start, v_lunch_end
      FROM company_users
      WHERE id = p_expert_id;

      IF v_lunch_start IS NOT NULL AND v_lunch_end IS NOT NULL THEN
        IF p_start_time < v_lunch_end AND v_end_time > v_lunch_start THEN
          v_available := false;
          v_conflicts := v_conflicts || jsonb_build_object(
            'type', 'expert', 'resource_name', (SELECT name FROM company_users WHERE id = p_expert_id),
            'message', 'Uzmanın öğle molası ile çakışıyor (' || v_lunch_start || '-' || v_lunch_end || ')'
          );
        END IF;
      END IF;
    END;
  END IF;

  -- ─────────────────────────────────────────────
  -- 3. EKİPMAN MÜSAİTLİK KONTROLÜ
  -- ─────────────────────────────────────────────
  IF array_length(p_equipment_ids, 1) > 0 THEN
    FOREACH v_eq_id IN ARRAY p_equipment_ids LOOP
      SELECT * INTO v_eq FROM equipment
      WHERE id = v_eq_id AND company_id = p_company_id AND is_active = true;

      IF NOT FOUND THEN
        v_available := false;
        v_conflicts := v_conflicts || jsonb_build_object(
          'type', 'equipment', 'resource_name', 'Bilinmeyen Ekipman',
          'message', 'Ekipman bulunamadı veya aktif değil'
        );
      ELSE
        -- Bu ekipmanın eşzamanlı kullanım sayısını hesapla
        SELECT COUNT(DISTINCT ar.appointment_id) INTO v_eq_used
        FROM appointment_resources ar
        JOIN appointments a ON a.id = ar.appointment_id
        WHERE ar.resource_type = 'equipment'
          AND ar.resource_id = v_eq_id
          AND a.company_id = p_company_id
          AND a.date = p_date
          AND a.status != 'iptal'
          AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
          AND a.time < v_end_time
          AND (a.time + (COALESCE(a.total_duration, 60) || ' minutes')::INTERVAL)::TIME > p_start_time;

        IF v_eq_used >= v_eq.quantity THEN
          v_available := false;
          v_conflicts := v_conflicts || jsonb_build_object(
            'type', 'equipment', 'resource_name', v_eq.name,
            'message', v_eq.name || ' tüm birimleri kullanımda (' || v_eq_used || '/' || v_eq.quantity || ')'
          );
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Sonuç döndür
  RETURN jsonb_build_object(
    'available', v_available,
    'conflicts', v_conflicts
  );
END;
$$;

-- ============================================================
-- ROLLBACK SQL (gerektiğinde kullanılacak)
-- ============================================================
-- DROP FUNCTION IF EXISTS check_resource_availability;
-- DROP TABLE IF EXISTS appointment_resources CASCADE;
-- DROP TABLE IF EXISTS expert_spaces CASCADE;
-- DROP TABLE IF EXISTS service_resource_requirements CASCADE;
-- DROP TABLE IF EXISTS equipment CASCADE;
-- DROP TABLE IF EXISTS space_working_hours CASCADE;
-- DROP TABLE IF EXISTS spaces CASCADE;
-- ALTER TABLE company_services DROP COLUMN IF EXISTS requires_expert;
-- ALTER TABLE company_services DROP COLUMN IF EXISTS capacity_per_slot;
-- ALTER TABLE company_services DROP COLUMN IF EXISTS privacy_override;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS space_id;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS group_booking_id;
-- ALTER TABLE companies DROP COLUMN IF EXISTS resource_enforcement;
-- DROP INDEX IF EXISTS idx_appointments_space;
-- DROP INDEX IF EXISTS idx_appointments_group_booking;
