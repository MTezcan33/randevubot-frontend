-- =====================================================
-- Migration 016: Zone kolonu + Walk-in Entries tablosu
-- Tesis merkezli mimari donusumu icin
-- =====================================================

-- 1. Spaces tablosuna zone kolonu ekle (bolge gruplama)
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS zone TEXT;
CREATE INDEX IF NOT EXISTS idx_spaces_zone ON spaces(company_id, zone);

-- 2. Walk-in giris/cikis tablosu (sauna, havuz, hamam gibi paylasimli alanlar icin)
CREATE TABLE IF NOT EXISTS walk_in_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exited_at TIMESTAMPTZ,
  created_by UUID REFERENCES company_users(id),
  notes TEXT,
  CONSTRAINT walk_in_active CHECK (exited_at IS NULL OR exited_at > entered_at)
);

-- Walk-in indexler
CREATE INDEX IF NOT EXISTS idx_walk_in_company ON walk_in_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_walk_in_space ON walk_in_entries(space_id);
CREATE INDEX IF NOT EXISTS idx_walk_in_active ON walk_in_entries(space_id, exited_at) WHERE exited_at IS NULL;

-- Walk-in RLS
ALTER TABLE walk_in_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "walk_in_select" ON walk_in_entries FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE POLICY "walk_in_insert" ON walk_in_entries FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE POLICY "walk_in_update" ON walk_in_entries FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE POLICY "walk_in_delete" ON walk_in_entries FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
