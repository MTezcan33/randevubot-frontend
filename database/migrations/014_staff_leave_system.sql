-- ============================================================
-- Migration 014: Personel Izin Sistemi
-- Yillik izin, mazeret izni, hastalik izni yonetimi
-- ============================================================

-- 1. Izin kayitlari tablosu
CREATE TABLE IF NOT EXISTS staff_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES company_users(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('annual', 'sick', 'excuse', 'unpaid')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL CHECK (days > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  approved_by UUID REFERENCES company_users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_staff_leaves_company ON staff_leaves(company_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_leaves_dates ON staff_leaves(company_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_staff_leaves_status ON staff_leaves(company_id, status);

-- RLS
ALTER TABLE staff_leaves ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "staff_leaves_company" ON staff_leaves FOR ALL
    USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. company_users'a yeni alanlar
ALTER TABLE company_users ADD COLUMN IF NOT EXISTS annual_leave_days INTEGER DEFAULT 14;
ALTER TABLE company_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- ============================================================
-- NOTLAR:
-- * leave_type: annual (yillik), sick (hastalik), excuse (mazeret), unpaid (ucretsiz)
-- * status: pending (beklemede), approved (onaylandi), rejected (reddedildi)
-- * annual_leave_days: varsayilan 14 gun (Turkiye standardi)
-- ============================================================
