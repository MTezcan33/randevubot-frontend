-- Migration 003: Bildirim sistemi geliştirmeleri
-- RandevuBot v0.14.0
-- Tarih: 2026-03-19

-- 1. Companies tablosuna WhatsApp bildirim toggle'ı ekle
ALTER TABLE companies ADD COLUMN IF NOT EXISTS whatsapp_notification_enabled BOOLEAN DEFAULT true;

-- 2. Bildirim log tablosu — tüm gönderilen bildirimlerin kaydı
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL,           -- 'confirmation', 'reminder_24h', 'reminder_1h', 'cancellation', 'feedback_request', 'expert_changed', 'reschedule', 'no_show', 'birthday'
  channel TEXT NOT NULL DEFAULT 'whatsapp',  -- 'whatsapp', 'email', 'push', 'sms'
  recipient TEXT NOT NULL,      -- Telefon numarası veya email
  status TEXT NOT NULL DEFAULT 'pending',    -- 'pending', 'sent', 'failed', 'delivered'
  error_message TEXT,           -- Başarısız olursa hata mesajı
  metadata JSONB DEFAULT '{}', -- Ek veriler (appointment_id, customer_id, vb.)
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. İndeksler
CREATE INDEX IF NOT EXISTS idx_notification_log_company ON notification_log(company_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON notification_log(type);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_created ON notification_log(created_at DESC);

-- 4. RLS
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_log_company_access" ON notification_log
  FOR ALL USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

-- 5. Yeni bildirim şablonları (varsayılan)
INSERT INTO notification_templates (company_id, type, language, template, is_active)
VALUES
  (NULL, 'expert_changed', 'tr', 'Merhaba {{customer_name}}! Randevunuzun uzmanı değiştirildi. Yeni uzmanınız: {{expert_name}}. Tarih: {{date}} Saat: {{time}}', true),
  (NULL, 'reschedule', 'tr', 'Merhaba {{customer_name}}! Randevunuz yeniden planlandı. Yeni tarih: {{date}} Saat: {{time}}. Uzman: {{expert_name}}', true),
  (NULL, 'no_show', 'tr', 'Merhaba {{customer_name}}, bugünkü randevunuza gelemediğinizi fark ettik. Yeni bir randevu almak isterseniz bize yazabilirsiniz.', true),
  (NULL, 'birthday', 'tr', 'Doğum gününüz kutlu olsun {{customer_name}}! 🎂 {{salon_name}} olarak size özel bir sürprizimiz var. Detaylar için bize yazın!', true)
ON CONFLICT DO NOTHING;
