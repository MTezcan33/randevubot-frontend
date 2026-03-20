-- =============================================================================
-- MİGRASYON 010: ÖDEME TAHSİLAT SİSTEMİ (Payment Collection System)
-- Tarih: 2026-03-19
-- Amaç: Randevu bazlı ödeme tahsilat, parçalı ödeme, iade, muhasebe entegrasyonu
-- =============================================================================

-- ─── 1. appointments tablosuna ödeme kolonları ───────────────────────────────

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded', 'free'));

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0;

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0;

-- ─── 2. appointment_payments — Randevu Ödeme Kayıtları ──────────────────────

CREATE TABLE IF NOT EXISTS public.appointment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,

  -- Ödeme detayları
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash','card','online','free')),

  -- Hangi hizmet için ödendi (opsiyonel)
  service_id UUID REFERENCES company_services(id) ON DELETE SET NULL,

  -- İlişkili transaction kaydı
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

  -- Meta
  note TEXT,
  collected_by UUID REFERENCES company_users(id) ON DELETE SET NULL,
  is_refunded BOOLEAN DEFAULT false,
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_appointment_payments_company ON appointment_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_appointment_payments_appointment ON appointment_payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_payments_date ON appointment_payments(created_at);
CREATE INDEX IF NOT EXISTS idx_appointment_payments_method ON appointment_payments(company_id, payment_method);

-- RLS
ALTER TABLE appointment_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own appointment_payments" ON appointment_payments
  FOR ALL USING (company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
  ));

-- ─── 3. payment_settings — Şirket Ödeme Ayarları ────────────────────────────

CREATE TABLE IF NOT EXISTS public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  cash_enabled BOOLEAN DEFAULT true,
  card_enabled BOOLEAN DEFAULT true,
  online_enabled BOOLEAN DEFAULT true,
  free_enabled BOOLEAN DEFAULT true,

  default_payment_method TEXT DEFAULT 'cash' CHECK (default_payment_method IN ('cash','card','online','free')),
  auto_create_transaction BOOLEAN DEFAULT true,
  require_full_payment BOOLEAN DEFAULT false,

  vat_enabled BOOLEAN DEFAULT false,
  vat_rate DECIMAL(5,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)
);

ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own payment_settings" ON payment_settings
  FOR ALL USING (company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
  ));

-- ─── 4. Trigger: Ödeme sonrası otomatik durum güncelleme ────────────────────

CREATE OR REPLACE FUNCTION update_appointment_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid DECIMAL(10,2);
  v_total_amount DECIMAL(10,2);
  v_new_status TEXT;
  v_apt_id UUID;
BEGIN
  v_apt_id := COALESCE(NEW.appointment_id, OLD.appointment_id);

  -- Toplam ödenen miktarı hesapla (iade edilmemiş ödemeler)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM appointment_payments
  WHERE appointment_id = v_apt_id
    AND is_refunded = false;

  -- Randevunun toplam tutarını al
  SELECT COALESCE(total_amount, 0) INTO v_total_amount
  FROM appointments
  WHERE id = v_apt_id;

  -- Durumu belirle
  IF v_total_amount = 0 THEN
    v_new_status := 'free';
  ELSIF v_total_paid >= v_total_amount THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'unpaid';
  END IF;

  -- Güncelle
  UPDATE appointments
  SET payment_status = v_new_status,
      paid_amount = v_total_paid
  WHERE id = v_apt_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_payment_status ON appointment_payments;
CREATE TRIGGER trg_update_payment_status
  AFTER INSERT OR UPDATE OR DELETE ON appointment_payments
  FOR EACH ROW EXECUTE FUNCTION update_appointment_payment_status();

-- ─── 5. Mevcut randevulara total_amount hesapla (one-time) ──────────────────

-- appointment_services olan randevular
UPDATE appointments a
SET total_amount = sub.total
FROM (
  SELECT aps.appointment_id, COALESCE(SUM(cs.price), 0) AS total
  FROM appointment_services aps
  JOIN company_services cs ON cs.id = aps.service_id
  GROUP BY aps.appointment_id
) sub
WHERE a.id = sub.appointment_id
  AND (a.total_amount IS NULL OR a.total_amount = 0);

-- appointment_services olmayan, doğrudan service_id olan randevular
UPDATE appointments a
SET total_amount = COALESCE(cs.price, 0)
FROM company_services cs
WHERE a.service_id = cs.id
  AND (a.total_amount IS NULL OR a.total_amount = 0)
  AND NOT EXISTS (
    SELECT 1 FROM appointment_services aps WHERE aps.appointment_id = a.id
  );

-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
-- DROP TRIGGER IF EXISTS trg_update_payment_status ON appointment_payments;
-- DROP FUNCTION IF EXISTS update_appointment_payment_status;
-- DROP TABLE IF EXISTS payment_settings CASCADE;
-- DROP TABLE IF EXISTS appointment_payments CASCADE;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS payment_status;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS total_amount;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS paid_amount;
