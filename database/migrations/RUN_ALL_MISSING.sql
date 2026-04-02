-- ═══════════════════════════════════════════════════════════════
-- RandevuBot: Eksik Migration'ları Çalıştır
-- Bu dosyayı Supabase Dashboard > SQL Editor'de çalıştırın
-- Tarih: 2026-03-28
-- NOT: Tüm komutlar IF NOT EXISTS kullanır, güvenle tekrar çalıştırılabilir
-- ═══════════════════════════════════════════════════════════════


-- ═══ 1. customers.is_active (Migration 015) ═══════════════════
-- BU OLMADAN YENİ MÜŞTERİ OLUŞTURMA ÇALIŞMAZ!
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
UPDATE customers SET is_active = true WHERE is_active IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers (company_id, is_active);


-- ═══ 2. appointments eksik sütunlar (Migration 009, 010, 017) ═
-- space_id
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES spaces(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_space ON appointments(space_id);

-- payment_status, total_amount, paid_amount
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded', 'free'));
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0;

-- room_unit_id
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS room_unit_id UUID REFERENCES room_units(id);
CREATE INDEX IF NOT EXISTS idx_appointments_room_unit ON appointments(room_unit_id);


-- ═══ 3. Doğrulama ═══════════════════════════════════════════════
-- Çalıştırdıktan sonra bu sorguyla kontrol edin:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'is_active';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'appointments' AND column_name IN ('space_id', 'payment_status', 'total_amount', 'room_unit_id');
