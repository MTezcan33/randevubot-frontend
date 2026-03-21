-- 012: transactions tablosuna expert_id ekleme
-- Uzman bazlı gelir takibi için her transaction'ın hangi uzmana ait olduğunu kaydetme

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS expert_id UUID REFERENCES company_users(id);

-- Mevcut randevu bağlantılı transaction'ları güncelle (appointment.expert_id'den al)
UPDATE transactions t
SET expert_id = a.expert_id
FROM appointments a
WHERE t.appointment_id = a.id
  AND t.expert_id IS NULL
  AND a.expert_id IS NOT NULL;

-- Index ekle — uzman bazlı raporlama sorguları için
CREATE INDEX IF NOT EXISTS idx_transactions_expert_id ON transactions(expert_id);
CREATE INDEX IF NOT EXISTS idx_transactions_expert_date ON transactions(expert_id, transaction_date);

COMMENT ON COLUMN transactions.expert_id IS 'Hizmeti yapan uzman — uzman bazlı gelir takibi için';
