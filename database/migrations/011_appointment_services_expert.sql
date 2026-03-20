-- ============================================================================
-- Migration 011: appointment_services tablosuna hizmet bazlı uzman atama desteği
-- Tarih: 2026-03-20
-- Açıklama: Her hizmete ayrı uzman atanabilmesi için appointment_services tablosuna
--           expert_id kolonu eklenir. NULL = parent appointment'ın expert_id'si kullanılır.
-- ============================================================================

-- appointment_services tablosuna expert_id kolonu ekle
ALTER TABLE public.appointment_services
  ADD COLUMN IF NOT EXISTS expert_id uuid REFERENCES public.company_users(id) ON DELETE SET NULL;

-- Performans için index
CREATE INDEX IF NOT EXISTS idx_appointment_services_expert
  ON public.appointment_services(expert_id);

-- ============================================================================
-- ROLLBACK:
-- ALTER TABLE public.appointment_services DROP COLUMN IF EXISTS expert_id;
-- DROP INDEX IF EXISTS idx_appointment_services_expert;
-- ============================================================================
