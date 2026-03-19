-- Migration 008: Eksik kolon düzeltmeleri (audit sonrası)
-- RandevuBot v0.14.1
-- Tarih: 2026-03-19

-- 1. customers tablosuna average_rating kolonu ekle
ALTER TABLE customers ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,1);

-- 2. companies tablosuna booking ayarları ekle (migration 007'de eksik kalmıştı)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS booking_enabled BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS booking_max_days INTEGER DEFAULT 30;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS booking_require_phone_verification BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS booking_auto_confirm BOOLEAN DEFAULT false;

-- 3. appointments default status'unu Türkçe yap (kod Türkçe kullanıyor)
ALTER TABLE appointments ALTER COLUMN status SET DEFAULT 'beklemede';
