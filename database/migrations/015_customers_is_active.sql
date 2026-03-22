-- ═══════════════════════════════════════════════════════════════
-- Migration 015: Müşteri soft delete — is_active kolonu
-- ═══════════════════════════════════════════════════════════════

-- Müşteri pasif yapma (randevusu olan müşteriler silinemez)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Mevcut tüm müşterileri aktif yap
UPDATE customers SET is_active = true WHERE is_active IS NULL;

-- Index: aktif müşteri filtreleme
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers (company_id, is_active);
