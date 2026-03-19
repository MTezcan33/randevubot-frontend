# RandevuBot.net — MenuBot Deneyiminden Transfer Plani (Tavsiye Dokumani)

## CONTEXT

**Proje:** randevubot.net — Guzellik ve masaj salonlari icin randevu yonetim SaaS'i
**Konum:** C:\Users\Mehmet\randevubot
**Tech Stack:** React 18 + Vite 4 + Tailwind CSS + Radix UI + Supabase + N8N + Evolution API
**Mevcut Durum:** Dashboard, randevu, hizmet, personel, musteri, muhasebe, faturalama, WhatsApp bot (Gemini AI) calisiyor
**Amac:** MenuBot.Shop'ta kazanilan tecrube ve sistemleri RandevuBot'a transfer etmek

---

## ONCELIK SIRASI (14 Haftalik Yol Haritasi)

| Faz | Sure | Sistemler | Milestone |
|-----|------|-----------|-----------|
| **Faz 1: Temel** | Hafta 1 | Yedekleme/Versiyon (S3), Template/Clone (S1), Moduler i18n (S8F) | Versiyon sistemi aktif |
| **Faz 2: Iletisim** | Hafta 2 | Bildirim Sistemi (S6), Hata Yakalayici (S8A) | Tam bildirim pipeline'i |
| **Faz 3: Zeka** | Hafta 3-4 | AI Chatbot (S2), Ziyaretci Analitigi (S8C), Dogrulama (S8D) | "Asistan" chatbot canli |
| **Faz 4: Raporlar** | Hafta 4 | Rapor Sistemi (S7), Abonelik Yasam Dongusu (S8E), AdminPinGate (S8G) | Otomatik raporlar |
| **Faz 5: Paneller** | Hafta 5-7 | Coklu Panel (S4): Uzman, Resepsiyonist, Kasa, Yonetici | Personel mobil panel |
| **Faz 6: Mobil** | Hafta 8-9 | PWA + Android TWA + iOS Capacitor (S5) | Play Store + App Store |
| **Faz 7: Salon Ozellikleri** | Hafta 10-14 | Booking Widget, Takvim Senkr., Sadakat, Portfolyo, Walk-in, Hediye Karti | Tam salon ozellik seti |

---

## SISTEM 1: N8N Template/Clone Workflow Deseni

### Nedir?
Iki workflow mimarisi: `template` (referans) + `clone` (production). Her degisiklik once template'e, sonra clone'a uygulanir.

### Mevcut Durum
- **RandevuBot:** 8-9 workflow JSON `C:/Users/Mehmet/randevubot/workflow/` icinde, ayrim yok
- **MenuBot:** Template ID `IsIdnAiQNcoEsOKD` + Clone ID `dDse1nHYDw5UWrik`

### Uygulama Adimlari
1. `workflows/active/` ve `workflows/disabled/` klasorleri olustur
2. Mevcut `workflow/` dosyalarini `workflows/active/` icine tasi
3. Ana bot workflow'u N8N'de klonla, her iki ID'yi CLAUDE.md'ye kaydet
4. Protokolu dokumante et: deactivate → modify → test → activate
5. `/n8n-fix` skill'i olustur

### Tahmini Sure: 2-3 saat

---

## SISTEM 2: AI Chat Sistemi (Asistan — Alexia Muadili)

### Nedir?
Gemini AI destekli destek chatbot'u: kalici hafiza, bilgi bankasi, eskalasyon, yüzer widget.

### Mevcut Durum
- **RandevuBot:** Chatbot yok. `SupportPage.jsx` bos. `n8n_chat_histories` tablosu sadece WhatsApp bot icin
- **MenuBot:** 9 frontend component, N8N LangChain Agent, 100+ KB makalesi, 4 DB tablosu

### Uygulama Adimlari

**A. Database (migration):**
```
Tablolar: chat_sessions, chat_messages, chatbot_knowledge_base, chat_escalations
Referans: menubot database/migrations/014_alexia_chatbot.sql
FK adaptasyonu: restaurants(id) → companies(id)
```

**B. Bilgi Bankasi:**
- `docs/asistan_knowledge_base.md` master dokuman
- `database/seeds/asistan_knowledge_base.sql` — 9 kategori: genel_bilgi, randevular, hizmetler, personel, calisma_saatleri, muhasebe, whatsapp, abonelik, sorun_giderme
- Oncelik: Sadece TR icerigi ile basla, diger dilleri sonra ekle

**C. N8N Workflow:**
- Webhook → Parse → Fetch History → Search KB → Save → AI Agent (Gemini 2.5 Flash + Postgres Memory) → Parse → Escalation Check → Response
- 9 fazli system prompt: Kimlik → Dil → Davranis → Bilgi → Format → Eskalasyon → Yasaklar → Oturum → KB
- Webhook: `https://n8n.mehmettezcan.uk/webhook/asistan-chat`

**D. Frontend:**
- `src/components/chat/` — 9 component (AsistanChatWidget, ChatWindow, ChatHeader, ChatInput, ChatMessage, ChatMessageList, ChatPreForm, ChatQuickActions, ChatTypingIndicator)
- `src/services/asistanChatService.js` — rate limiting (2s aralik, 30msg/5dk)
- `src/hooks/useChatSession.js`
- Mount: DashboardLayout.jsx + LandingPage.jsx

**E. Env:**
```
VITE_ASISTAN_WEBHOOK_URL_RB=https://n8n.mehmettezcan.uk/webhook/asistan-chat
```

### Referans Dosyalar
- `menubot/src/components/chat/` (9 dosya)
- `menubot/src/lib/alexiaChatService.js`
- `menubot/src/hooks/useChatSession.js`
- `menubot/workflows/active/alexia-chatbot.json`
- `menubot/database/migrations/014_alexia_chatbot.sql`

### Tahmini Sure: 3-4 gun

---

## SISTEM 3: Yedekleme/Versiyon Protokolu

### Nedir?
Versiyonlu yedekleme, deploy pipeline'i, migration takibi, rollback sistemi.

### Mevcut Durum
- **RandevuBot:** Versiyon sistemi yok, yedekleme scripti yok, migration takibi yok
- **MenuBot:** 6 script, versions.json, .version, CHANGELOG.md, migration_log.json

### Uygulama Adimlari
1. Klasor yapisi olustur:
```
randevubot/
├── scripts/ (6 script)
├── database/
│   ├── schema/     (RANDEVUBOT_FULL_CONTEXT.sql buraya)
│   ├── migrations/
│   ├── rollbacks/
│   ├── seeds/
│   └── migration_log.json
├── versions.json
├── .version
└── CHANGELOG.md
```

2. MenuBot'tan 6 scripti kopyala ve adapte et:
   - `version-bump.sh`, `backup.sh`, `deploy.sh`, `rollback.sh`, `migrate.sh`, `validate-version.sh`
   - Find/replace: `Menubotshop-Backup` → `Randevubot-Backup`, `menubot.shop` → `randevubot.net`

3. Mevcut SQL'leri katalogla:
   - `RANDEVUBOT_FULL_CONTEXT.sql` → `database/schema/000_base_schema.sql`
   - `migration_yeni_tablolar.sql` → `database/migrations/001_new_tables.sql`
   - `sub_sectors_migration.sql` → `database/migrations/002_sub_sectors.sql`

4. `/deploy` skill'i olustur

### Referans Dosyalar
- `menubot/scripts/` (6 dosya)
- `menubot/versions.json`, `menubot/.version`, `menubot/CHANGELOG.md`

### Tahmini Sure: 1 gun

---

## SISTEM 4: Coklu Panel Sistemi (Personel Panelleri)

### Nedir?
Farkli personel rolleri icin PIN tabanli giris ve role-bazli mobil arayuzler.

### Salon Rolleri (MenuBot Karsiliklari)

| MenuBot | RandevuBot | Sayfalar |
|---------|-----------|----------|
| isveren | Salon Sahibi | Dashboard, Raporlar, Onaylar, HR, Ayarlar |
| yonetici | Yonetici | Randevular, Raporlar, Personel, Ayarlar |
| garson | Resepsiyonist | Randevular, Walk-in Kuyrugu, Check-in |
| kasiyer | Kasa | Odemeler, Gun Sonu, Profil |
| — | Uzman | Benim Programim, Randevularim, Musterilerim |

### Uygulama Adimlari
1. DB migration: `company_users` tablosuna `pin_code`, `panel_roles` kolonlari
2. RPC: `panel_login(p_company_id, p_pin, p_role)`
3. Klasor yapisi:
```
src/panel/
├── PanelApp.jsx
├── contexts/PanelAuthContext.jsx
├── hooks/usePanelAuth.js
├── components/PanelShell.jsx
└── pages/ (uzman/, resepsiyonist/, kasa/, yonetici/)
```
4. App.jsx'e route ekle: `<Route path="/panel/*" element={<PanelApp />} />`

### Referans: `menubot/src/panel/` (PanelApp.jsx, PanelAuthContext.jsx)
### Tahmini Sure: 5-7 gun

---

## SISTEM 5: Android ve iOS Mobil Uygulama

### PWA On Kosullari (Once)
1. `public/manifest.json` olustur (name, icons, start_url: "/dashboard", display: "standalone")
2. Tum ikon boyutlarini uret (72-512px)
3. Service worker (`public/sw.js`) — temel offline cache
4. `index.html`'e manifest linki ekle

### Android (TWA — Bubblewrap)
1. Bubblewrap ile TWA projesi olustur
2. Keystore olustur (sifreyi GUVENLI kaydet!)
3. AAB build + imzala
4. Google Play Console'a yukle
5. Maliyet: $25 (tek seferlik Google Play developer fee)

### iOS (Capacitor 8 + Codemagic)
1. Apple Developer Account ac ($99/yil) — DUNS numarasi gerekli (Organization)
2. `npm install @capacitor/core @capacitor/cli`
3. `npx cap init "RandevuBot" "net.randevubot.app"`
4. Native plugin'ler ekle: Push Notifications, Biometrics, Splash Screen
5. Codemagic'te cloud build (Mac gerekmiyor)
6. App Store Connect'e yukle

### Apple 4.2 Rehberi Uyarisi
Apple basit WebView wrapper'lari REDDEDER. Sunlar ZORUNLU:
- Native push notifications (Capacitor plugin)
- Offline destek (service worker cache)
- Biometrik giris (Face ID / Touch ID)
- Native splash screen
- App-benzeri deneyim

### Tahmini Sure: Android 2-3 gun, iOS 2-3 gun

---

## SISTEM 6: Gelistirilmis Bildirim Sistemi

### Mevcut Durum
- RandevuBot'ta `notificationService.js` MEVCUT (createAdminNotification, sendWhatsAppMessage, template sistemi)
- N8N'de `reminder_cron.json`, `feedback_collector.json` mevcut

### Eklenecekler
1. `whatsapp_notification_enabled` toggle → `companies` tablosuna
2. Ozel bildirim N8N workflow'u (`notification-system.json`)
3. Yeni bildirim tipleri: expert_changed, reschedule, no_show, birthday, loyalty_milestone
4. Email bildirimleri (Resend API) → `emailService.js`
5. DB tablolari: `notification_templates`, `notification_log`

### Tahmini Sure: 2-3 gun

---

## SISTEM 7: Otomatik Rapor Sistemi

### Uygulama
1. DB: `companies` tablosuna report_settings (JSONB), report_send_log tablosu
2. RPC: `get_companies_needing_report()`, `generate_report_data()`
3. 7 modul: appointment_summary, revenue_breakdown, expert_performance, customer_retention, popular_services, peak_hours, feedback_summary
4. N8N workflow: Cron → RPC → Format → WhatsApp + Email → Log
5. Frontend: `ReportSettings.jsx` — zamanlama, kanal, modul secimi

### Referans: `menubot/workflows/active/report-sender.json`, `menubot/database/migrations/015_report_system.sql`
### Tahmini Sure: 3-4 gun

---

## SISTEM 8: Ek Altyapi

| Sistem | Aciklama | Referans | Sure |
|--------|----------|----------|------|
| **8A. Error Handler** | N8N hatalari yakala → gunluk WhatsApp raporu | `menubot/workflows/active/error-handler.json` | 3-4 saat |
| **8B. Chat Archiver** | 30+ gunluk konusmalari arsive tasi (CTE) | `menubot/workflows/active/chat-archiver.json` | 2-3 saat |
| **8C. Visitor Analytics** | Landing sayfa takibi (ziyaret, tikla, UTM, cihaz) | `menubot/workflows/active/visitor-analytics.json` | 4-5 saat |
| **8D. Verification Sender** | Email/WhatsApp 2FA dogrulama kodu | `menubot/workflows/active/verification-sender.json` | 3-4 saat |
| **8E. Abonelik Yasam Dongusu** | Deneme suresi uyarilari (7/3/1 gun), grace period | `gece_kusu.json` genislet | 1 gun |
| **8F. Moduler i18n** | 139KB translations.js → 14 modul dosyasi | `menubot/src/i18n/` yapisi | 1 gun |
| **8G. AdminPinGate** | Hassas ayarlar PIN korumasi | `menubot/src/components/modals/AdminPinGate.jsx` | 3-4 saat |

---

## SISTEM 9: Kupon/Indirim Sistemi

### Mevcut Durum
- **RandevuBot:** `coupons` tablosu MEVCUT (code, discount_type, amount, usage_limit, expiry). Stripe ile entegre. 3 plan: Starter $29, Salon $49, Premium $79. Coklu sube indirimi: 3+ sube %15, 5+ sube %20
- **MenuBot:** `coupons` tablosu + `apply_coupon_by_code` RPC + admin panel UI + otomatik dogrulama

### Gelistirilecekler
1. **Kupon Tipleri Genisletme:**
   - `percentage` — yuzde indirim (mevcut)
   - `fixed_amount` — sabit tutar indirimi
   - `plan_override` — plan degistirme (ornegin Premium'a upgrade)
   - `free_trial_extension` — deneme suresi uzatma (ek gun)
   - `first_month_free` — ilk ay ucretsiz

2. **Kupon Kullanim Kurallari:**
   - `max_uses` — toplam kullanim limiti
   - `max_uses_per_company` — salon basina limit (1 = tek kullanimlik)
   - `min_plan` — minimum plan gerekliligi
   - `valid_from` / `valid_until` — gecerlilik tarih araligi
   - `applicable_plans` — hangi planlara uygulanabilir (JSON array)

3. **RPC Fonksiyonlari:**
   - `apply_coupon_by_code(p_company_id, p_code)` — Kupon dogrulama + uygulama
   - `admin_create_coupon(...)` — Yeni kupon olusturma
   - `get_coupon_usage_stats(p_code)` — Kullanim istatistikleri

4. **Referans Kampanyalar (Affiliate):**
   - Mevcut musteriler referans kodu ile yeni salon getirirse indirim
   - `referral_codes` tablosu: company_id, code, reward_type, reward_amount
   - Her iki tarafa da indirim (referans eden + yeni salon)

5. **Frontend:**
   - BillingPage.jsx'e kupon girisi alani (zaten mevcut, gelistir)
   - Admin paneli icin kupon yonetim sayfasi (olustur, listele, deaktive et)

### DB Migration
```sql
-- Mevcut coupons tablosuna ek kolonlar
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS coupon_type TEXT DEFAULT 'percentage';
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS applicable_plans TEXT[] DEFAULT '{}';
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_uses_per_company INT DEFAULT 1;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS min_plan TEXT;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ;

-- referral_codes tablosu
CREATE TABLE referral_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  code TEXT UNIQUE NOT NULL,
  reward_type TEXT DEFAULT 'percentage',
  reward_amount NUMERIC DEFAULT 10,
  referral_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- coupon_usage tablosu (kullanim takibi)
CREATE TABLE coupon_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID REFERENCES coupons(id),
  company_id UUID REFERENCES companies(id),
  applied_at TIMESTAMPTZ DEFAULT now(),
  discount_applied NUMERIC,
  UNIQUE(coupon_id, company_id)
);
```

### Referans: `menubot/database/migrations/037_apply_coupon_by_code.sql`
### Tahmini Sure: 2-3 gun

---

## SALON-SPESIFIK OZELLIKLER (MenuBot'ta Olmayan)

| Ozellik | Aciklama | Sure |
|---------|----------|------|
| **Online Booking Widget** | `<iframe>` veya JS snippet, salon web sitesine gomulur. `/book/:companySlug` public route | 3-4 gun |
| **Google Calendar Sync** | Randevu ↔ Google Calendar iki yonlu senkronizasyon (OAuth token mevcut) | 2-3 gun |
| **Musteri Sadakat/Puan** | Randevu basina puan, indirim olarak kullanim. `loyalty_settings`, `customer_loyalty_points` | 3-4 gun |
| **Once/Sonra Foto Galerisi** | Uzman portfolyosu, Supabase Storage. `portfolio_images` tablosu | 2-3 gun |
| **Uzman Portfolyo/Puan** | Public profil: uzmanlik, deneyim, puan, portfolyo | 1-2 gun |
| **Walk-in Kuyruk Yonetimi** | Randevusuz musteri kuyrugu, tahmini bekleme, bildirim | 2-3 gun |
| **Coklu Sube Yonetimi** | `parent_company_id`, toplu istatistik, sube indirimleri | 2-3 gun |
| **Hediye Karti/Paketler** | On odemeli paketler, hediye karti alistirma. `packages`, `gift_cards` | 3-4 gun |

---

## RISK DEGERLENDIRMESI

| Risk | Etki | Olasilik | Onlem |
|------|------|----------|-------|
| N8N workflow tenant uyumsuzlugu | Yuksek | Orta | Tum workflow'larda dinamik instance_name cozumlemesi |
| Yeni tablolarda RLS bosluklari | Yuksek | Orta | Her tablo icin RLS testi ZORUNLU |
| i18n bolme sirasinda ceviri kaybi | Orta | Dusuk | Bolmeden once yedek al, atomik commit |
| Evolution API rate limit | Yuksek | Orta | Bildirim workflow'unda kuyruk/throttle |
| Apple 4.2 reddi (WebView) | Yuksek | Orta | Native plugin'ler (push, biometric) ZORUNLU |
| Keystore sifresi kaybi | Kritik | Dusuk | Sifreyi MEMORY.md + guvenli depoda sakla |
| Bash script Windows uyumlulugu | Dusuk | Yuksek | Git Bash'te test et |

---

## MIMARI TAVSIYELER

1. **Ayni Supabase projesi** kullan — yeni tablo ekle, yeni proje OLUSTURMA
2. **Migration numaralama** 001'den basla, mevcut SQL'leri 000_base olarak katalogla
3. **Workflow isimlendirme** kebab-case: `asistan-chatbot.json`, `notification-system.json`
4. **i18next koru** — MenuBot'un custom LanguageContext'i yerine RandevuBot'un i18next'i daha standart
5. **Panel route** `/panel/*` prefix'i kullan (MenuBot ile ayni)
6. **Tenant tablo** `companies` olarak kalsın (restaurants degil) — gelecekte klinikbot.net icin de uygun
7. **Env degiskenleri** VITE_ prefix'i ile (build-time)

---

## DOGRULAMA

Her sistem implementasyonu sonrasi:
1. `npx vite build` — hatasiz derleme
2. Supabase SQL Editor'da migration test
3. N8N workflow test mode ile webhook testi
4. Farkli roller ile panel girisi testi
5. 4 dilde ceviri kontrolu
6. Mobile responsive test (Chrome DevTools)
7. `bash scripts/deploy.sh` ile deploy protokolu

---

## OZET

Bu plan, MenuBot.Shop'tan 8 ana sistem + 8 salon-spesifik ozelligi RandevuBot.net'e transfer etmek icin 14 haftalik bir yol haritasi sunuyor. Oncelik sirasi: once altyapi (yedekleme, versiyon), sonra iletisim (bildirim), sonra zeka (AI chatbot), sonra paneller ve mobil. Her sistem icin referans dosya yollari, DB migration'lari ve tahmini sureler belirtilmistir.
