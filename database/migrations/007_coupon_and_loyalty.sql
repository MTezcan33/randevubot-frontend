-- =============================================
-- Migration 007: Coupon Expansion + Loyalty System
-- FAZ 7 - Kupon genisletme ve sadakat sistemi
-- =============================================

-- 1. Mevcut coupons tablosuna yeni kolonlar ekle
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS coupon_type TEXT DEFAULT 'percentage';
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS applicable_plans TEXT[] DEFAULT '{}';
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_uses_per_company INT DEFAULT 1;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS min_plan TEXT;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_uses INT;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS current_uses INT DEFAULT 0;

-- 2. Referral codes tablosu
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  reward_type TEXT DEFAULT 'percentage',
  reward_amount NUMERIC DEFAULT 10,
  referral_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Coupon usage tracking
CREATE TABLE IF NOT EXISTS coupon_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  applied_at TIMESTAMPTZ DEFAULT now(),
  discount_applied NUMERIC,
  UNIQUE(coupon_id, company_id)
);

-- 4. Loyalty/Sadakat sistemi
CREATE TABLE IF NOT EXISTS loyalty_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT false,
  points_per_appointment INT DEFAULT 10,
  points_per_currency NUMERIC DEFAULT 1, -- Her 1$ harcamaya kac puan
  min_redeem_points INT DEFAULT 100,
  discount_per_point NUMERIC DEFAULT 0.1, -- Her puan kac $ indirim
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_loyalty_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  points INT DEFAULT 0,
  total_earned INT DEFAULT 0,
  total_redeemed INT DEFAULT 0,
  last_earned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, customer_id)
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'expire', 'adjust')),
  points INT NOT NULL,
  description TEXT,
  appointment_id UUID REFERENCES appointments(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Companies tablosuna company_slug ekle (booking widget icin)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 6. Indeksler
CREATE INDEX IF NOT EXISTS idx_referral_codes_company ON referral_codes(company_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_company ON coupon_usage(company_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_company ON customer_loyalty_points(company_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_customer ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);

-- 7. RLS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_codes_access" ON referral_codes FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE POLICY "coupon_usage_access" ON coupon_usage FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE POLICY "loyalty_settings_access" ON loyalty_settings FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE POLICY "loyalty_points_access" ON customer_loyalty_points FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE POLICY "loyalty_tx_access" ON loyalty_transactions FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- 8. Companies tablosuna booking ayarlari ekle
ALTER TABLE companies ADD COLUMN IF NOT EXISTS booking_enabled BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS booking_max_days INT DEFAULT 30;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS booking_require_phone_verification BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS booking_auto_confirm BOOLEAN DEFAULT false;
