-- ═══════════════════════════════════════════════════════════════
-- Migration 018: Alan Tipleri + Yatak Çalışma Saatleri + Çakışma Kontrolü
-- Tarih: 2026-03-29
-- ═══════════════════════════════════════════════════════════════

-- ═══ 1. spaces tablosuna space_type kolonu ═══════════════════
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS space_type TEXT;
CREATE INDEX IF NOT EXISTS idx_spaces_type ON spaces(company_id, space_type);

-- ═══ 2. room_units performans indexi ═════════════════════════
CREATE INDEX IF NOT EXISTS idx_room_units_company_active ON room_units(company_id, is_active);

-- ═══ 3. Yatak bazlı çalışma saatleri tablosu ════════════════
CREATE TABLE IF NOT EXISTS room_unit_working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  room_unit_id UUID NOT NULL REFERENCES room_units(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT true,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, room_unit_id, day)
);

CREATE INDEX IF NOT EXISTS idx_ruwh_company ON room_unit_working_hours(company_id);
CREATE INDEX IF NOT EXISTS idx_ruwh_unit ON room_unit_working_hours(room_unit_id);
CREATE INDEX IF NOT EXISTS idx_ruwh_space ON room_unit_working_hours(space_id);
CREATE INDEX IF NOT EXISTS idx_ruwh_unit_day ON room_unit_working_hours(room_unit_id, day);

-- RLS
ALTER TABLE room_unit_working_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ruwh_company_isolation" ON room_unit_working_hours
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- ═══ 4. check_resource_availability RPC güncelleme ══════════
-- p_room_unit_id parametresi ekleniyor (backward compatible, DEFAULT NULL)
CREATE OR REPLACE FUNCTION check_resource_availability(
  p_company_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_duration INTEGER,
  p_space_id UUID DEFAULT NULL,
  p_expert_id UUID DEFAULT NULL,
  p_equipment_ids UUID[] DEFAULT '{}',
  p_exclude_appointment_id UUID DEFAULT NULL,
  p_room_unit_id UUID DEFAULT NULL
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
  v_unit_conflict RECORD;
  v_eq_id UUID;
  v_eq RECORD;
  v_eq_used INTEGER;
  v_expert_conflict RECORD;
  v_day_name TEXT;
  v_unit_wh RECORD;
  v_space_wh RECORD;
BEGIN
  v_end_time := p_start_time + (p_duration || ' minutes')::INTERVAL;

  -- 1. ALAN (SPACE) KONTROLÜ
  IF p_space_id IS NOT NULL THEN
    SELECT * INTO v_space FROM spaces
      WHERE id = p_space_id AND company_id = p_company_id AND is_active = true;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('available', false, 'conflicts', jsonb_build_array(
        jsonb_build_object('type', 'space', 'resource_name', 'Alan bulunamadı', 'message', 'Belirtilen alan bulunamadı veya pasif')
      ));
    END IF;

    IF v_space.booking_mode = 'private' THEN
      SELECT COUNT(*) INTO v_concurrent_count
      FROM appointments a
      WHERE a.space_id = p_space_id
        AND a.company_id = p_company_id
        AND a.date = p_date
        AND a.status != 'iptal'
        AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
        AND a.time < v_end_time
        AND (a.time + (COALESCE(a.total_duration, 60) || ' minutes')::INTERVAL)::TIME > p_start_time;

      IF v_concurrent_count >= v_space.capacity THEN
        v_available := false;
        v_conflicts := v_conflicts || jsonb_build_object(
          'type', 'space', 'resource_name', v_space.name,
          'message', v_space.name || ' belirtilen saatte dolu (kapasite: ' || v_space.capacity || ')'
        );
      END IF;

    ELSIF v_space.booking_mode = 'shared' THEN
      SELECT COUNT(*) INTO v_concurrent_count
      FROM appointments a
      WHERE a.space_id = p_space_id
        AND a.company_id = p_company_id
        AND a.date = p_date
        AND a.status != 'iptal'
        AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
        AND a.time < v_end_time
        AND (a.time + (COALESCE(a.total_duration, 60) || ' minutes')::INTERVAL)::TIME > p_start_time;

      IF v_concurrent_count >= v_space.capacity THEN
        v_available := false;
        v_conflicts := v_conflicts || jsonb_build_object(
          'type', 'space', 'resource_name', v_space.name,
          'message', v_space.name || ' maksimum kapasiteye ulaştı (' || v_concurrent_count || '/' || v_space.capacity || ')'
        );
      END IF;
    END IF;
  END IF;

  -- 2. UZMAN (EXPERT) KONTROLÜ
  IF p_expert_id IS NOT NULL THEN
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
        'type', 'expert', 'resource_name', 'Uzman',
        'message', 'Uzman belirtilen saatte başka bir randevusu var ('
          || v_expert_conflict.time::TEXT || '-'
          || (v_expert_conflict.time + (COALESCE(v_expert_conflict.total_duration, 60) || ' minutes')::INTERVAL)::TIME::TEXT
          || ')'
      );
    END IF;
  END IF;

  -- 3. EKİPMAN KONTROLÜ
  IF array_length(p_equipment_ids, 1) IS NOT NULL THEN
    FOREACH v_eq_id IN ARRAY p_equipment_ids LOOP
      SELECT * INTO v_eq FROM equipment WHERE id = v_eq_id AND company_id = p_company_id AND is_active = true;
      IF NOT FOUND THEN CONTINUE; END IF;

      SELECT COUNT(DISTINCT ar.appointment_id) INTO v_eq_used
      FROM appointment_resources ar
      JOIN appointments a ON ar.appointment_id = a.id
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
          'message', v_eq.name || ' tümü kullanımda (' || v_eq_used || '/' || v_eq.quantity || ')'
        );
      END IF;
    END LOOP;
  END IF;

  -- 4. YATAK (ROOM UNIT) KONTROLÜ
  IF p_room_unit_id IS NOT NULL THEN
    -- Zaman çakışma kontrolü
    SELECT a.id, a.time, a.total_duration INTO v_unit_conflict
    FROM appointments a
    WHERE a.room_unit_id = p_room_unit_id
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
        'type', 'room_unit',
        'resource_name', (SELECT name FROM room_units WHERE id = p_room_unit_id),
        'message', 'Bu yatak belirtilen saatte dolu ('
          || v_unit_conflict.time::TEXT || '-'
          || (v_unit_conflict.time + (COALESCE(v_unit_conflict.total_duration, 60) || ' minutes')::INTERVAL)::TIME::TEXT
          || ')'
      );
    END IF;

    -- Yatak çalışma saatleri kontrolü
    v_day_name := CASE EXTRACT(DOW FROM p_date)
      WHEN 0 THEN 'Pazar'
      WHEN 1 THEN 'Pazartesi'
      WHEN 2 THEN 'Salı'
      WHEN 3 THEN 'Çarşamba'
      WHEN 4 THEN 'Perşembe'
      WHEN 5 THEN 'Cuma'
      WHEN 6 THEN 'Cumartesi'
    END;

    -- Önce yatak özel saatlerine bak
    SELECT * INTO v_unit_wh FROM room_unit_working_hours
      WHERE room_unit_id = p_room_unit_id AND day = v_day_name AND company_id = p_company_id;

    IF FOUND THEN
      IF NOT v_unit_wh.is_open THEN
        v_available := false;
        v_conflicts := v_conflicts || jsonb_build_object(
          'type', 'room_unit', 'resource_name', 'Yatak kapalı',
          'message', 'Bu yatak ' || v_day_name || ' günü kapalıdır'
        );
      ELSIF p_start_time < v_unit_wh.start_time OR v_end_time > v_unit_wh.end_time THEN
        v_available := false;
        v_conflicts := v_conflicts || jsonb_build_object(
          'type', 'room_unit', 'resource_name', 'Yatak çalışma saatleri dışı',
          'message', 'Yatak çalışma saatleri: ' || v_unit_wh.start_time::TEXT || '-' || v_unit_wh.end_time::TEXT
        );
      END IF;
    ELSE
      -- Yoksa alan çalışma saatlerine bak
      IF p_space_id IS NOT NULL THEN
        SELECT * INTO v_space_wh FROM space_working_hours
          WHERE space_id = p_space_id AND day = v_day_name AND company_id = p_company_id;
        IF FOUND AND NOT v_space_wh.is_open THEN
          v_available := false;
          v_conflicts := v_conflicts || jsonb_build_object(
            'type', 'space', 'resource_name', 'Alan kapalı',
            'message', 'Bu alan ' || v_day_name || ' günü kapalıdır'
          );
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('available', v_available, 'conflicts', v_conflicts);
END;
$$;
