# Agent 6 — Hizmet Sayfası DB Migration

## Görev
`company_services` tablosuna 5 yeni kolon ekle ve `Supabase/RANDEVUBOT_FULL_CONTEXT.sql` dosyasını güncelle.

## Proje Bağlamı
- Framework: React 18.2 + Vite (SPA, SSR yok)
- Backend: Supabase (PostgreSQL 15)
- Tek Supabase client: `src/lib/supabase.js`
- Auth: `src/contexts/AuthContext.jsx`

## Mevcut `company_services` Tablosu
```sql
CREATE TABLE IF NOT EXISTS public.company_services (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  company_id uuid,
  description text NOT NULL,   -- hizmet adı olarak kullanılıyor
  duration integer,
  price numeric,               -- nullable
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  expert_id uuid,
  CONSTRAINT company_services_pkey PRIMARY KEY (id),
  CONSTRAINT company_services_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT company_services_expert_id_fkey FOREIGN KEY (expert_id) REFERENCES company_users(id)
);
```

## Yapılacaklar

### Adım 1: `Supabase/RANDEVUBOT_FULL_CONTEXT.sql` dosyasını oku
Dosyanın sonuna "Bölüm 11" ekle.

### Adım 2: Aşağıdaki SQL'i ekle

```sql
-- =============================================================================
-- BÖLÜM 11: COMPANY_SERVICES GELİŞTİRME — Kategori, Renk, Aktiflik, PDF, Notlar
-- Tarih: 2026-02-28
-- Amaç: Hizmetler sayfasının profesyonel revizyon için yeni alanlar
-- =============================================================================

-- Yeni kolonlar ekle
ALTER TABLE public.company_services
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#9333EA',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Mevcut kayıtlar için NULL değerleri düzelt
UPDATE public.company_services
  SET color = '#9333EA'
  WHERE color IS NULL;

UPDATE public.company_services
  SET is_active = true
  WHERE is_active IS NULL;

-- Performans index'leri
CREATE INDEX IF NOT EXISTS idx_company_services_category
  ON public.company_services USING btree (company_id, category);

CREATE INDEX IF NOT EXISTS idx_company_services_is_active
  ON public.company_services USING btree (company_id, is_active);

-- Kolon açıklamaları (PostgreSQL COMMENT)
COMMENT ON COLUMN public.company_services.category IS 'Hizmet kategorisi (örn: Saç Bakımı, Cilt Bakımı)';
COMMENT ON COLUMN public.company_services.notes IS 'Hizmet hakkında ek açıklama ve notlar';
COMMENT ON COLUMN public.company_services.pdf_url IS 'Supabase Storage public-files/services/{company_id}/ altındaki PDF broşür URL';
COMMENT ON COLUMN public.company_services.color IS 'Takvim görünümü için renk (HEX, varsayılan: mor #9333EA)';
COMMENT ON COLUMN public.company_services.is_active IS 'Aktif/pasif toggle - pasif hizmetler randevu formunda görünmez';
```

## Kurallar
- Sadece `Supabase/RANDEVUBOT_FULL_CONTEXT.sql` dosyasına dokunun
- Hiçbir .jsx veya .js dosyasına dokunmayın
- SQL yorumları Türkçe yazılsın
- Commit mesajı İngilizce olacak

## Not
Bu SQL Supabase SQL Editor'da manuel olarak çalıştırılmalıdır.
Agent 6 yalnızca dokümantasyonu günceller.
