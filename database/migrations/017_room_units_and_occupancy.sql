-- ============================================================================
-- Migration 017: room_units tablosu + appointments.room_unit_id
-- Her oda (space) icindeki fiziksel birimler (yatak, tas, kabin)
-- ============================================================================

-- room_units tablosu
CREATE TABLE IF NOT EXISTS room_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit_type TEXT DEFAULT 'bed',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksler
CREATE INDEX IF NOT EXISTS idx_room_units_space ON room_units(space_id);
CREATE INDEX IF NOT EXISTS idx_room_units_company ON room_units(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_room_units_unique_name ON room_units(space_id, name);

-- RLS
ALTER TABLE room_units ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'room_units_company_isolation') THEN
        CREATE POLICY room_units_company_isolation ON room_units
            FOR ALL USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- appointments tablosuna room_unit_id sutunu ekle
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS room_unit_id UUID REFERENCES room_units(id);
CREATE INDEX IF NOT EXISTS idx_appointments_room_unit ON appointments(room_unit_id);
