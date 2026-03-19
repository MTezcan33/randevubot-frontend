-- ============================================================
-- Migration 004: Chatbot Sistemi
-- Aciklama: AI chatbot icin oturum, mesaj, bilgi bankasi ve
--           eskalasyon tablolari
-- Tarih: 2026-03-19
-- ============================================================

-- ============================================================
-- 1. chat_sessions: Sohbet oturumlari
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  is_public BOOLEAN DEFAULT false,       -- Landing page'den mi (anonim)
  status TEXT DEFAULT 'active',          -- 'active', 'closed', 'escalated'
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_chat_sessions_company_id ON chat_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_is_public ON chat_sessions(is_public);

-- RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Kullanici kendi oturumlarini gorebilir
CREATE POLICY "chat_sessions_select_own" ON chat_sessions
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_public = true
  );

-- Kullanici oturum olusturabilir
CREATE POLICY "chat_sessions_insert" ON chat_sessions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR is_public = true
  );

-- Kullanici kendi oturumlarini guncelleyebilir
CREATE POLICY "chat_sessions_update_own" ON chat_sessions
  FOR UPDATE USING (
    auth.uid() = user_id
  );

-- ============================================================
-- 2. chat_messages: Mesajlar
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,                    -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Kullanici kendi oturumundaki mesajlari gorebilir
CREATE POLICY "chat_messages_select_own" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_sessions cs
      WHERE cs.id = chat_messages.session_id
        AND (cs.user_id = auth.uid() OR cs.is_public = true)
    )
  );

-- Kullanici kendi oturumuna mesaj ekleyebilir
CREATE POLICY "chat_messages_insert" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions cs
      WHERE cs.id = chat_messages.session_id
        AND (cs.user_id = auth.uid() OR cs.is_public = true)
    )
  );

-- ============================================================
-- 3. chatbot_knowledge_base: Bilgi bankasi
-- ============================================================
CREATE TABLE IF NOT EXISTS chatbot_knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,                -- 'genel_bilgi', 'randevular', 'hizmetler', 'personel', 'calisma_saatleri', 'muhasebe', 'whatsapp', 'abonelik', 'sorun_giderme'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT DEFAULT 'tr',
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_chatbot_kb_category ON chatbot_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_chatbot_kb_language ON chatbot_knowledge_base(language);
CREATE INDEX IF NOT EXISTS idx_chatbot_kb_is_active ON chatbot_knowledge_base(is_active);
CREATE INDEX IF NOT EXISTS idx_chatbot_kb_priority ON chatbot_knowledge_base(priority DESC);

-- RLS
ALTER TABLE chatbot_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Tum giris yapmis kullanicilar okuyabilir
CREATE POLICY "chatbot_kb_select_authenticated" ON chatbot_knowledge_base
  FOR SELECT USING (auth.role() = 'authenticated');

-- Anonim kullanicilar da okuyabilir (landing page chatbot icin)
CREATE POLICY "chatbot_kb_select_anon" ON chatbot_knowledge_base
  FOR SELECT USING (auth.role() = 'anon');

-- ============================================================
-- 4. chat_escalations: Eskalasyonlar
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_escalations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'open',            -- 'open', 'assigned', 'resolved'
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_chat_escalations_session_id ON chat_escalations(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_escalations_company_id ON chat_escalations(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_escalations_status ON chat_escalations(status);

-- RLS
ALTER TABLE chat_escalations ENABLE ROW LEVEL SECURITY;

-- Sirket sahibi kendi eskalasyonlarini gorebilir
CREATE POLICY "chat_escalations_select_company" ON chat_escalations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = chat_escalations.company_id
        AND c.owner_id = auth.uid()
    )
  );

-- Eskalasyon olusturma (oturum sahibi veya sistem)
CREATE POLICY "chat_escalations_insert" ON chat_escalations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions cs
      WHERE cs.id = chat_escalations.session_id
        AND (cs.user_id = auth.uid() OR cs.is_public = true)
    )
  );

-- Sirket sahibi eskalasyonu guncelleyebilir (resolve)
CREATE POLICY "chat_escalations_update_company" ON chat_escalations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = chat_escalations.company_id
        AND c.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 5. updated_at trigger (chatbot_knowledge_base icin)
-- ============================================================
CREATE OR REPLACE FUNCTION update_chatbot_kb_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chatbot_kb_updated_at
  BEFORE UPDATE ON chatbot_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_chatbot_kb_updated_at();
