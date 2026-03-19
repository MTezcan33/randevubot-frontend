-- Migration 005: Otomatik rapor sistemi
-- RandevuBot v0.15.0
-- Tarih: 2026-03-19

-- 1. Companies tablosuna rapor ayarları ekle
ALTER TABLE companies ADD COLUMN IF NOT EXISTS report_settings JSONB DEFAULT '{
  "enabled": false,
  "frequency": "weekly",
  "day_of_week": 1,
  "time": "09:00",
  "channels": ["whatsapp"],
  "modules": ["appointment_summary", "revenue_breakdown", "popular_services"],
  "recipients": []
}'::jsonb;

-- 2. Rapor gönderim log tablosu
CREATE TABLE IF NOT EXISTS report_send_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,         -- 'weekly', 'monthly', 'custom'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',  -- 'whatsapp', 'email', 'pdf'
  status TEXT NOT NULL DEFAULT 'pending',    -- 'pending', 'sent', 'failed'
  modules TEXT[] DEFAULT '{}',       -- Hangi modüller dahil edildi
  file_url TEXT,                     -- PDF URL'si (Supabase Storage)
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. İndeksler
CREATE INDEX IF NOT EXISTS idx_report_send_log_company ON report_send_log(company_id);
CREATE INDEX IF NOT EXISTS idx_report_send_log_type ON report_send_log(report_type);
CREATE INDEX IF NOT EXISTS idx_report_send_log_created ON report_send_log(created_at DESC);

-- 4. RLS
ALTER TABLE report_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_send_log_company_access" ON report_send_log
  FOR ALL USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );
