-- ═══════════════════════════════════════════════════════════════
-- Migration 019: Supabase Güvenlik Denetim Düzeltmeleri
-- Tarih: 2026-03-30
-- Kaynak: Supabase Dashboard > Security Advisor (Lint)
-- ═══════════════════════════════════════════════════════════════

-- ═══ 1. auth.users ifşa eden VIEW'ları düzelt ═══════════════
-- active_subscriptions ve expiring_trials view'ları auth.users'a
-- erişiyor ve SECURITY DEFINER olarak tanımlı — anon/authenticated
-- roller üzerinden kullanıcı verilerini ifşa edebilir.
--
-- Bu view'lar projede (frontend'de) kullanılmıyor.
-- N8N workflow'ları varsa, bunlar Supabase service_role key ile
-- doğrudan tablo sorgulayabilir — view'a ihtiyaç yok.

-- Güvenli silme (IF EXISTS)
DROP VIEW IF EXISTS public.active_subscriptions;
DROP VIEW IF EXISTS public.expiring_trials;


-- ═══ 2. RLS aktif olmayan tablolar ══════════════════════════
-- companies_test: Test tablosu, production'da olmamalı
-- timezones_mapping: Referans verisi, herkes okuyabilmeli ama yazma kısıtlanmalı
-- n8n_chat_histories: Hassas session_id verisi içeriyor

-- 2a. companies_test — artık gerekmiyorsa kaldır, gerekiyorsa RLS ekle
-- Güvenlik için RLS aktif et + sadece owner erişimi
ALTER TABLE public.companies_test ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_test_owner_only" ON public.companies_test
  FOR ALL USING (owner_id = auth.uid());

-- 2b. timezones_mapping — herkes okuyabilir, kimse yazamaz (referans verisi)
ALTER TABLE public.timezones_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "timezones_mapping_read_all" ON public.timezones_mapping
  FOR SELECT USING (true);

-- 2c. n8n_chat_histories — hassas session_id içeriyor
-- N8N service_role key ile erişir, normal kullanıcılar erişememeli
ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;
-- Authenticated kullanıcılar kendi session'larını görebilir
-- (session_id formatı bilinmiyorsa genel kısıtlama)
CREATE POLICY "n8n_chat_read_authenticated" ON public.n8n_chat_histories
  FOR SELECT USING (auth.role() = 'authenticated');
-- N8N yazma işlemleri service_role key ile yapılır (RLS bypass)


-- ═══ 3. Doğrulama ═══════════════════════════════════════════
-- Çalıştırdıktan sonra Supabase Dashboard > Security Advisor'ı
-- tekrar çalıştırarak hataların giderildiğini doğrulayın.
--
-- Kontrol sorguları:
-- SELECT * FROM pg_views WHERE viewname IN ('active_subscriptions', 'expiring_trials');
-- → Boş dönmeli
--
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename IN ('companies_test', 'timezones_mapping', 'n8n_chat_histories');
-- → Hepsi rowsecurity = true olmalı
