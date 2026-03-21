-- ============================================================
-- Migration 015: Paket, Abonelik ve Hediye Karti Sistemi
-- ============================================================

-- 1. Paket tanimlari (isletme bazli)
CREATE TABLE IF NOT EXISTS service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  services JSONB NOT NULL DEFAULT '[]',
  total_sessions INTEGER NOT NULL CHECK (total_sessions > 0),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  validity_days INTEGER DEFAULT 365,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Musteri paket satin alimlari
CREATE TABLE IF NOT EXISTS customer_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES service_packages(id),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  total_sessions INTEGER NOT NULL,
  used_sessions INTEGER DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'online', 'free')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Paket kullanim kayitlari
CREATE TABLE IF NOT EXISTS package_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_package_id UUID NOT NULL REFERENCES customer_packages(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id),
  service_id UUID REFERENCES company_services(id),
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Hediye karti / on odemeli kredi
CREATE TABLE IF NOT EXISTS gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  original_amount DECIMAL(10,2) NOT NULL CHECK (original_amount > 0),
  remaining_amount DECIMAL(10,2) NOT NULL CHECK (remaining_amount >= 0),
  purchased_by TEXT,
  recipient_name TEXT,
  expiry_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_service_packages_company ON service_packages(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customer_packages_customer ON customer_packages(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_packages_company ON customer_packages(company_id, status);
CREATE INDEX IF NOT EXISTS idx_package_usage_package ON package_usage(customer_package_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_company ON gift_cards(company_id, status);
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(company_id, code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_customer ON gift_cards(customer_id);

-- RLS
ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "sp_company" ON service_packages FOR ALL
    USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cp_company" ON customer_packages FOR ALL
    USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "pu_company" ON package_usage FOR ALL
    USING (customer_package_id IN (
      SELECT id FROM customer_packages WHERE company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
      )
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "gc_company" ON gift_cards FOR ALL
    USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- NOTLAR:
-- * service_packages.services: [{ "service_id": "uuid", "quantity": 1 }]
-- * customer_packages: remaining_sessions = total_sessions - used_sessions
-- * gift_cards.code: benzersiz kod (isletme bazli)
-- * package_usage: her seans kullaniminda kayit eklenir
-- ============================================================
