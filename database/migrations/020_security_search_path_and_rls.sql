-- ═══════════════════════════════════════════════════════════════
-- Migration 020: Function search_path + RLS Policy Düzeltmeleri
-- Tarih: 2026-03-30
-- Kaynak: Supabase Security Advisor (WARN seviyesi)
-- NOT: Bu degisiklikler fonksiyonlarin davranisini DEGISTIRMEZ,
--       sadece guvenlik best-practice'e uyumlu hale getirir.
-- ═══════════════════════════════════════════════════════════════

-- ═══ 1. FUNCTION SEARCH_PATH DÜZELTMELERI ═══════════════════
-- search_path = '' ayarlamak, fonksiyonlarin sadece tam yol ile
-- (public.tablename) tablolara erismesini saglar.
-- Mevcut fonksiyonlar zaten public schema'da calistigi icin
-- davranis degismez — sadece guvenlik artar.

ALTER FUNCTION public.record_webhook_event SET search_path = '';
ALTER FUNCTION public.test_checkout_webhook SET search_path = '';
ALTER FUNCTION public.update_appointment_payment_status SET search_path = '';
ALTER FUNCTION public.update_company_on_cancellation SET search_path = '';
ALTER FUNCTION public.test_webhook SET search_path = '';
ALTER FUNCTION public.invoke_create_whatsapp_instance SET search_path = '';
ALTER FUNCTION public.update_company_on_payment SET search_path = '';
ALTER FUNCTION public.set_free_customer_id_on_insert SET search_path = '';
ALTER FUNCTION public.panel_login SET search_path = '';
ALTER FUNCTION public.create_appointment_multi_service SET search_path = '';
ALTER FUNCTION public.update_updated_at_column SET search_path = '';
ALTER FUNCTION public.calculate_all_experts_productivity SET search_path = '';
ALTER FUNCTION public.set_company_instance_defaults SET search_path = '';
ALTER FUNCTION public.update_chatbot_kb_updated_at SET search_path = '';
ALTER FUNCTION public.bot_get_company_context SET search_path = '';
ALTER FUNCTION public.bot_check_message_dedup SET search_path = '';
ALTER FUNCTION public.update_company_on_payment_failure SET search_path = '';
ALTER FUNCTION public.send_appointment_webhook SET search_path = '';
ALTER FUNCTION public.recalculate_customer_stats SET search_path = '';
ALTER FUNCTION public.update_company_on_subscription_change SET search_path = '';
ALTER FUNCTION public.generate_free_customer_id SET search_path = '';
ALTER FUNCTION public.bot_create_appointment_with_side_effects SET search_path = '';
ALTER FUNCTION public.update_company_on_checkout SET search_path = '';
ALTER FUNCTION public.trigger_evolution_instance_creation_test SET search_path = '';
ALTER FUNCTION public.trigger_bot_admin_notification SET search_path = '';
ALTER FUNCTION public.bot_get_available_slots SET search_path = '';
ALTER FUNCTION public.update_expert_limit_on_plan_change SET search_path = '';
ALTER FUNCTION public.check_webhook_event_processed SET search_path = '';
ALTER FUNCTION public.bot_cancel_appointment_with_side_effects SET search_path = '';
ALTER FUNCTION public.bot_get_customer_by_phone SET search_path = '';
ALTER FUNCTION public.trigger_send_appointment_webhook SET search_path = '';

-- check_resource_availability birden fazla overload olabilir — hepsini duzelt
-- (Supabase 2 ayri signature raporlamis)
-- Migration 018'de zaten SET search_path = '' ile olusturulduysa sorun yok,
-- yoksa burada duzeltilir. Hata verirse atla.
DO $$ BEGIN
  ALTER FUNCTION public.check_resource_availability(UUID, DATE, TIME, INTEGER, UUID, UUID, UUID[], UUID, UUID) SET search_path = '';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  ALTER FUNCTION public.check_resource_availability(UUID, DATE, TIME, INTEGER, UUID, UUID, UUID[], UUID) SET search_path = '';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ═══ 2. RLS POLICY DÜZELTMELERI ═════════════════════════════

-- 2a. sectors — INSERT'e herkese acik WITH CHECK(true) var
-- Sektorler referans verisi, sadece okunmali. INSERT gereksiz.
DROP POLICY IF EXISTS "Allow public insert access" ON public.sectors;

-- 2b. sub_sectors — ayni durum
DROP POLICY IF EXISTS "Allow public insert access" ON public.sub_sectors;

-- 2c. webhook_events — authenticated icin ALL with true/true
-- Webhook events sadece system tarafindan yazilmali,
-- authenticated kullanicilar sadece kendi sirketinin eventlerini gormeli
DROP POLICY IF EXISTS "System can manage webhook events" ON public.webhook_events;

-- Yeni policy: authenticated sadece kendi sirketinin eventlerini gorsun
CREATE POLICY "webhook_events_company_read" ON public.webhook_events
  FOR SELECT USING (
    company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
  );
-- N8N/system service_role ile yazar (RLS bypass)


-- ═══ 3. LEAKED PASSWORD PROTECTION ══════════════════════════
-- Bu ayar Supabase Dashboard'dan yapilir:
-- Authentication > Settings > Password Protection > Enable
-- SQL ile degistirilemez — Dashboard'dan aktif edin.
-- Supabase Auth > HaveIBeenPwned entegrasyonu


-- ═══ 4. DOĞRULAMA ═══════════════════════════════════════════
-- Calistirdiktan sonra Supabase Dashboard > Security Advisor'i
-- tekrar calistirin. Tum WARN'lar gidecek (leaked password haric,
-- o Dashboard'dan yapilmali).
