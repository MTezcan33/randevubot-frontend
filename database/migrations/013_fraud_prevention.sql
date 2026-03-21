-- ============================================================
-- Migration 013: Fraud Prevention & Immutable Audit System
-- POS dolandiricilik onleme, silme yasagi, audit log
-- ============================================================

-- 1. Appointments: iptal alanlari (silme yerine iptal)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES company_users(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- 2. Transactions: void sistemi (silme yerine void)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES company_users(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS void_reason TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES company_users(id);

-- Status constraint (mevcut kayitlar 'active' olur)
DO $$
BEGIN
  ALTER TABLE transactions ADD CONSTRAINT transactions_status_check
    CHECK (status IN ('active', 'voided'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Payments: iade sorumlusu
ALTER TABLE appointment_payments ADD COLUMN IF NOT EXISTS refunded_by UUID REFERENCES company_users(id);

-- 4. Immutable Audit Log tablosu
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID REFERENCES company_users(id),
  user_name TEXT NOT NULL DEFAULT 'Sistem',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Audit log indexleri
CREATE INDEX IF NOT EXISTS idx_audit_log_company ON audit_log(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(company_id, action, created_at DESC);

-- Audit log RLS: SADECE SELECT ve INSERT — guncelleme ve silme YOK
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Okuma politikasi
  CREATE POLICY "audit_log_select" ON audit_log FOR SELECT
    USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  -- Ekleme politikasi
  CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT
    WITH CHECK (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- UPDATE ve DELETE politikasi YOK — audit_log degistirilemez ve silinemez!

-- 5. Iptal sebebi indexi (raporlama icin)
CREATE INDEX IF NOT EXISTS idx_appointments_cancelled ON appointments(company_id, cancelled_at DESC)
  WHERE status = 'iptal';

-- 6. Void edilen islemler indexi
CREATE INDEX IF NOT EXISTS idx_transactions_voided ON transactions(company_id, voided_at DESC)
  WHERE status = 'voided';

-- ============================================================
-- NOTLAR:
-- * audit_log tablosunda UPDATE ve DELETE RLS politikasi YOKTUR
--   Bu, tablonun immutable (degistirilemez) olmasini saglar
-- * Mevcut transactions kayitlari otomatik olarak status='active' alir
-- * Appointments'da status='iptal' zaten mevcuttur, ek check gerekmez
-- ============================================================
