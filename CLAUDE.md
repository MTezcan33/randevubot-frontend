# RandevuBot — Güzellik & Bakım Salonları İçin WhatsApp Randevu Sistemi

## Proje Vizyonu
randevubot.net — Güzellik merkezleri, masaj salonları, kuaförler, spa merkezleri için WhatsApp entegrasyonlu randevu yönetim + ön muhasebe SaaS platformu. Multi-tenant mimari. İleride klinikbot.net olarak sağlık sektörüne de açılacak (tek codebase, domain bazlı tema).

**Şirket:** MT AI Systems LTD (UK)
**Hedef pazar:** Küçük/orta ölçekli güzellik ve bakım işletmeleri
**Rekabet avantajı:** WhatsApp entegrasyonu + ön muhasebe — rakiplerde bu ikisi bir arada yok
**Satış modu hedefi:** Mart 2026

---

## Tech Stack
| Katman | Teknoloji |
|--------|-----------|
| Frontend | React 18.2 + Vite 4.4 |
| Routing | React Router DOM v6 |
| Styling | Tailwind CSS 3.3 + Radix UI |
| Animasyon | Framer Motion |
| Backend/DB | Supabase (PostgreSQL + Auth + RLS) |
| Otomasyon | N8N webhooks |
| WhatsApp | Evolution API + N8N |
| Ödeme | Stripe |
| i18n | i18next (TR, EN, RU, AR) |
| Harita | Leaflet + react-leaflet |
| Excel | XLSX (import/export) |
| Node | 20.19.1 |
| Hosting | Hostinger VPS, Coolify container |

> **Önemli:** Bu proje **Vite** ile build ediliyor, Next.js **değil**. SSR yok, tamamen client-side SPA.

---

## Geliştirme Ortamı

```bash
npm run dev      # Geliştirme sunucusu başlat (http://localhost:3000)
npm run build    # Production build oluştur → dist/
npm run preview  # Build çıktısını önizle
```

Node versiyonu: `20.19.1` (`.nvmrc` dosyasında belirtilmiş)

---

## Ortam Değişkenleri

`.env` dosyasında tanımlanır. Tüm değişkenler `VITE_` prefix'i ile başlar (Vite'ın client-side erişim kuralı).

| Değişken | Açıklama |
|----------|----------|
| `VITE_SUPABASE_URL` | Supabase proje URL'i |
| `VITE_SUPABASE_ANON_KEY` | Supabase public/anon key |
| `VITE_N8N_WEBHOOK_URL` | N8N genel webhook (randevu olayları) |
| `VITE_N8N_CREATE_INSTANCE_WEBHOOK_URL` | WhatsApp instance oluşturma webhook'u |
| `VITE_N8N_GET_QR_WEBHOOK_URL` | QR kod alma webhook'u |
| `VITE_EVOLUTION_API_DELETE_URL` | WhatsApp bağlantı kesme webhook'u |

### Kritik Sorun: Supabase Client Tutarsızlığı

`src/lib/supabase.js` dosyası şu an **hardcoded URL** kullanıyor (env değişkeninden okumUYOR). Bu bir bug'dır:

```js
// YANLIŞ (şu anki hali):
const supabaseUrl = "https://[PROJECT_ID].supabase.co"; // hardcoded!

// DOĞRU (olması gereken):
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

Ayrıca `src/lib/customSupabaseClient.js` **redundant** bir kopyasıdır — silinmeli. Yeni kod yazarken **sadece** `src/lib/supabase.js` kullanılsın.

---

## Klasör Yapısı

```
randevubot/
├── src/
│   ├── App.jsx                      # Router yapısı
│   ├── contexts/AuthContext.jsx     # Merkezi state (user, company, staff)
│   ├── pages/
│   │   ├── LandingPage.jsx         # Ana sayfa (güzellik temalı)
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── OnboardingPage.jsx      # 2 adımlı kurulum sihirbazı
│   │   └── dashboard/
│   │       ├── DashboardHome.jsx   # Analytics & özet
│   │       ├── AppointmentsPage.jsx # Randevu takvimi
│   │       ├── ServicesPage.jsx    # Hizmet yönetimi
│   │       ├── StaffPage.jsx       # Personel/uzman yönetimi
│   │       ├── CustomersPage.jsx   # Müşteri veritabanı
│   │       ├── WorkingHoursPage.jsx # Çalışma saatleri
│   │       ├── BillingPage.jsx     # Stripe abonelik
│   │       ├── SettingsPage.jsx    # Genel ayarlar
│   │       ├── SupportPage.jsx     # Destek
│   │       ├── AccountingPage.jsx  # [YENİ] Ön muhasebe
│   │       └── NotificationsPage.jsx # [YENİ] Bildirim merkezi
│   ├── components/
│   │   ├── ProtectedRoute.jsx      # Auth guard
│   │   ├── OnboardingRoute.jsx     # Onboarding completion guard
│   │   ├── WhatsAppConnection.jsx  # QR kod + bağlantı durumu
│   │   ├── CreateAppointmentModal.jsx
│   │   └── ui/                     # Radix UI bileşenleri
│   ├── layouts/
│   │   └── DashboardLayout.jsx     # Sidebar + header + outlet
│   ├── lib/
│   │   ├── supabase.js             # TEK Supabase client (bu kullanılsın)
│   │   ├── translations.js         # i18n stringleri
│   │   ├── sectors.js              # Sektör verileri
│   │   ├── countries.json
│   │   └── timezones.json
│   └── services/
│       ├── whatsappService.js      # WhatsApp N8N webhook çağrıları
│       ├── notificationService.js  # [YENİ] Bildirim servisi
│       └── accountingService.js    # [YENİ] Muhasebe servisi
├── Supabase/
│   └── RANDEVUBOT_FULL_CONTEXT.sql # Tam DB şeması (referans)
├── workflow/                       # N8N workflow JSON'ları
│   ├── gece_kusu.json              # Trial sona erme (günlük cron)
│   ├── Stripe Webhook → Supabase RPC.json
│   ├── Randevu-Bot_inctance.json   # WhatsApp instance yönetimi
│   └── QR-disconnected.json        # QR bağlantı kesme
└── tools/
    └── optimize-hero.mjs
```

---

## Rota Yapısı

### Public Rotalar (Auth gerektirmez)
| Rota | Sayfa | Açıklama |
|------|-------|----------|
| `/` | LandingPage | Ana sayfa |
| `/login` | LoginPage | Giriş |
| `/register` | RegisterPage | Kayıt |
| `/reset-password` | ResetPasswordPage | Şifre sıfırlama isteği |
| `/update-password` | UpdatePasswordPage | Yeni şifre belirleme |
| `/legal` | LegalPage | Yasal sayfalar |

### Korumalı Rotalar
| Rota | Guard | Açıklama |
|------|-------|----------|
| `/onboarding` | `ProtectedRoute` | Login gerekli, onboarding tamamlanmamış |
| `/dashboard/*` | `OnboardingRoute` | Login + onboarding tamamlanmış gerekli |

### Dashboard Alt Rotaları
| Rota | Sayfa |
|------|-------|
| `/dashboard` | DashboardHome |
| `/dashboard/appointments` | AppointmentsPage |
| `/dashboard/services` | ServicesPage |
| `/dashboard/staff` | StaffPage |
| `/dashboard/customers` | CustomersPage |
| `/dashboard/working-hours` | WorkingHoursPage |
| `/dashboard/accounting` | AccountingPage — [YENİ] Ön muhasebe |
| `/dashboard/billing` | BillingPage |
| `/dashboard/settings` | SettingsPage |
| `/dashboard/support` | SupportPage (geri bildirim yönetimi dahil) |

---

## AuthContext Kullanımı

Tüm dashboard sayfalarında `useAuth()` hook'u ile context'e erişilir:

```jsx
import { useAuth } from '../../contexts/AuthContext';

const { user, company, staff, workingHours, selectedExpert, loading,
        signOut, setSelectedExpert, refreshCompany } = useAuth();
```

### Context State Shape
```javascript
{
  user: null | { id, email, user_metadata, ... },
  company: null | {
    id, name, owner_id, status, qr_code, whatsapp_number,
    timezone, country, logo_url, subscription_plan,
    expert_limit, onboarding_completed,
    is_trial_active, trial_end_date,
    stripe_customer_id, stripe_subscription_id,
    service_active, ...
  },
  staff: Array<{ id, name, email, phone, role, color, ... }>,
  // staff otomatik olarak role='Uzman' ile filtrelenmiş gelir
  workingHours: Array<{ id, company_id, expert_id, day, start_time, end_time, is_open }>,
  selectedExpert: null | { id, name, color, ... },
  loading: boolean
}
```

### Önemli: company.id Kullanımı
Supabase sorgularında her zaman `company.id` ile filtrele:
```js
const { data } = await supabase
  .from('appointments')
  .select('*')
  .eq('company_id', company.id);
```

---

## Kritik İş Mantığı

### Randevu Durum Değerleri (Türkçe!)
Randevu durumları Türkçe string olarak saklanır — İngilizce kullanma:
```javascript
'beklemede'  // Onay bekliyor (default)
'onaylandı'  // Onaylandı
'iptal'      // İptal edildi
```

`webhook_status` için:
```javascript
'beklemede'   // Webhook henüz gönderilmedi
'gönderildi'  // Webhook başarıyla gönderildi
'başarısız'   // Webhook gönderimi başarısız
```

### Müşteri Adı Kuralı
Müşteri adları **otomatik büyük harfe** çevrilir. Name input'larında:
```js
const handleNameInput = (e) => setValue(e.target.value.toUpperCase());
```

### Expert Seçimi
`staff` dizisi boş değilse AuthContext ilk elemanı otomatik `selectedExpert` olarak seçer. Component'lerde `selectedExpert` null kontrolü yapılmalı.

### Onboarding Instance Name Kuralı
```js
// Şirket adı → instance_name dönüşümü:
instanceName = companyName
  .replace(/\s+/g, '_')                // boşluk → _
  .replace(/[^a-zA-Z0-9_]/g, '0')     // özel karakter → 0
  + (sector_code ? `_${sector_code}` : '');
```

---

## WhatsApp Bağlantı Akışı

1. Kullanıcı `SettingsPage`'de WhatsApp numarasını girer ve kaydeder
2. DB trigger (`set_company_instance_defaults`) tetiklenir → `instance_name` oluşturulur, `status = 'disconnected'`
3. Kullanıcı "Bağlan" butonuna tıklar
4. `triggerCreateInstanceWebhook()` → N8N'e POST gönderilir
5. N8N → Evolution API aracılığıyla WhatsApp instance oluşturur
6. `companies.status` güncellenir: `'disconnected'` → `'pending'`
7. QR kod `companies.qr_code` alanına base64 olarak yazılır
8. `WhatsAppConnection.jsx` Supabase real-time subscription ile değişikliği algılar
9. QR kod ekranda gösterilir → kullanıcı telefondaki WhatsApp ile tarar
10. Bağlantı sonrası `status = 'connected'`

---

## Abonelik Planları

| Plan | Fiyat | Uzman Limiti | Özellikler |
|------|-------|--------------|------------|
| **Starter** | $29/ay | 1 | Randevu + WhatsApp + Hatırlatma + Ön Muhasebe |
| **Salon** | $49/ay | 3 | + Geri Bildirim + Detaylı Raporlama |
| **Premium** | $79/ay | 6 | + PDF Export + Öncelikli Destek |

- **14 gün ücretsiz trial** (Salon planı ile başlar)
- **Tüm planlarda:** WhatsApp entegrasyonu, otomatik hatırlatma, ön muhasebe modülü
- Trial bitiminde ödeme yapılmazsa → servis durdurulur, veriler 30 gün saklanır

### Çoklu Şube Stratejisi
Her şube **bağımsız bir hesap** olarak kayıt olur. Teknik olarak ayrı `company` kaydıdır.
- Şubeler birbirinden izole → bir şubede sorun olursa diğerleri etkilenmez
- Her şubenin kendi WhatsApp hattı, kendi kasası, kendi admin'i olur
- `parent_company_id` gibi karmaşık ilişkilere gerek yok

### Çoklu Şube Kuponları
| Koşul | İndirim |
|-------|---------|
| 3+ şube kayıt eden müşteri | %15 kupon |
| 5+ şube kayıt eden müşteri | %20 kupon |

### Kupon Sistemi
`coupons` tablosundan sorgulanır. `plan_override` varsa → planı doğrudan değiştirir. Yoksa → fiyata `discount_percentage` indirim uygulanır.

> ⚠️ Stripe linkleri şu an **test modunda**. Canlıya geçmeden önce production link'lerine güncellenmeli.

---

## Veritabanı Şeması (19+ Tablo)

### Mevcut Tablolar
| Tablo | Açıklama |
|-------|----------|
| companies | Ana tenant tablosu (Stripe, WhatsApp, trial bilgileri) |
| company_users | Personel/uzmanlar |
| company_services | Hizmetler (fiyat, süre, uzman ataması) |
| company_working_hours | Günlük çalışma saatleri |
| company_holidays | Tatil/kapalı günler |
| customers | Müşteri veritabanı |
| appointments | Randevular |
| expert_productivity | Uzman verimlilik metrikleri |
| notifications | Bildirimler |
| webhook_events | Stripe webhook kayıtları |
| whatsapp_conversations | WhatsApp konuşma logları |
| sectors / sub_sectors | Sektör referans verileri |
| stripe_prices | Plan-fiyat eşlemeleri |
| coupons | İndirim kuponları |
| n8n_chat_histories | AI sohbet geçmişi |

### Yeni Eklenecek Tablolar (Ön Muhasebe)
| Tablo | Açıklama |
|-------|----------|
| transactions | Gelir/gider kayıtları (nakit, kart, havale, appointment_id bağlantısı) |
| transaction_categories | Kategori tanımları (kira, malzeme, maaş vb. + varsayılan kategoriler) |
| daily_cash_register | Günlük kasa açılış/kapanış (company_id + date UNIQUE) |
| monthly_reports | Aylık özet raporlar (PDF export, muhasebeciye gönderilecek format) |

### Yeni Eklenecek Tablolar (Bildirim Sistemi)
| Tablo | Açıklama |
|-------|----------|
| admin_notifications | Admin'e giden bildirimler (yeni randevu, şikayet, WhatsApp kopma vb.) |
| notification_templates | WhatsApp mesaj şablonları (onay, hatırlatma, iptal, anket) |
| customer_feedback | Müşteri memnuniyet/şikayet kayıtları (1-5 puan + durum: new/reviewing/resolved) |

### Kritik DB Özellikleri
- RLS tüm tablolarda aktif (multi-tenant izolasyon)
- Triggerlar: yeni user → company oluştur, randevu → webhook, plan değişikliği → uzman limiti
- Vault secrets: N8N ve Evolution API anahtarları (Supabase Dashboard > Vault)
- 14 günlük trial otomatik başlatma

---

## i18n Güncelleme Rehberi

Tüm çeviri stringleri `src/lib/translations.js` dosyasındadır.

### Yeni String Ekleme
```javascript
// translations.js içinde her dil bloğuna ekle:
tr: { translation: { yeniAnahtar: "Türkçe metin" } },
en: { translation: { yeniAnahtar: "English text" } },
ru: { translation: { yeniAnahtar: "Русский текст" } },
ar: { translation: { yeniAnahtar: "النص العربي" } }
```

### Kullanım
```jsx
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
<p>{t('yeniAnahtar')}</p>
```

> **Kural:** Yeni bir UI string eklendiğinde **4 dil de** (TR, EN, RU, AR) güncellenmeli.

---

## Mevcut Özellikler (Tamamlanmış)

- Kimlik doğrulama (kayıt, giriş, şifre sıfırlama, korumalı rotalar)
- 2 adımlı onboarding sihirbazı (şirket adı, ülke, timezone)
- Dashboard analytics (randevu, gelir, doluluk, uzman performansı)
- Hizmet/Personel/Müşteri CRUD
- Görsel randevu takvimi (05:00-24:00 ızgara, uzman filtresi, gerçek zamanlı saat çizgisi)
- Çalışma saatleri + tatil günleri yönetimi
- WhatsApp QR kod bağlantısı + instance yönetimi
- Excel import/export (müşteriler)
- Google Calendar OAuth (token depolama)
- Çok dil desteği (TR, EN, RU, AR)
- Stripe billing UI (fiyatlandırma, kupon doğrulama)
- Bildirim zili (DashboardLayout, notifications tablosundan)

---

## Geliştirme Planı (Öncelik Sırasına Göre)

### Faz 1: Görsel Yenileme & Temel Düzeltmeler
1. **Supabase client düzeltmesi**
   - `supabase.js` env var kullanacak şekilde güncellenmeli
   - `customSupabaseClient.js` silinmeli, tüm importlar yönlendirilmeli

2. **Landing page'i güzellik/masaj salonlarına tamamen özelleştir**
   - Güzellik sektörüne uygun renk paleti (pembe/mor/altın tonları)
   - Sektöre özel hero görsel ve slogan
   - Müşteri yorumları / referanslar bölümü
   - Fiyatlandırma bölümü güncellemesi

3. **Dashboard görsel yenileme**
   - Modern, temiz ve profesyonel tasarım
   - Mobil responsive iyileştirmeler

### Faz 2: Bildirim & Mesajlaşma Sistemi
4. **Müşteriye WhatsApp hatırlatma mesajı**
   - Randevu oluşturulduğunda onay mesajı
   - 24 saat ve 1 saat önce hatırlatma
   - N8N workflow ile otomatik tetikleme

5. **Admin bildirim sistemi**
   - Yeni randevu → admin'e WhatsApp + dashboard bildirimi
   - WhatsApp bağlantısı koptuğunda uyarı
   - Günlük özet rapor

6. **Müşteri geri bildirim sistemi**
   - Randevu sonrası otomatik memnuniyet anketi (WhatsApp)
   - Olumsuz yanıtlarda admin'e eskalesyon

### Faz 3: Ön Muhasebe Modülü
7. Günlük kasa yönetimi
8. Gelir takibi (randevu bazlı otomatik + manuel)
9. Gider takibi (kategoriler, tekrarlayan, fatura fotoğrafı)
10. Haftalık/aylık raporlama + PDF export

### Faz 4: Ödeme & Abonelik
11. Stripe gerçek ödeme akışı (Checkout Session, webhook, fatura geçmişi)
12. Subscription limit enforcement (uzman sayısı limiti, uyarı + yükseltme teklifi)

### Faz 5: Klinik Vertical'i
13. Domain bazlı tema sistemi (klinikbot.net → sağlık teması mavi/beyaz/yeşil)
14. Klinik'e özel özellikler (hasta dosyası, tedavi geçmişi, branş seçimi, KVKK)

---

## Kodlama Kuralları

### Genel
- Tüm yeni kod Türkçe yorumlarla yazılsın
- Commit mesajları İngilizce
- Console.log'lar production'da kaldırılmalı
- Environment variable'lar .env'den okunmalı, hardcode yasak
- Responsive tasarım zorunlu (mobil öncelikli)
- Hata mesajları kullanıcı dostu ve çok dilli olmalı

### Supabase
- Supabase client olarak **SADECE** `lib/supabase.js` kullanılsın
- Her Supabase sorgusunda `error` kontrolü yapılsın
- Her tabloda RLS aktif olmalı
- Yeni tablo eklendiğinde: migration SQL + RLS policy + index birlikte yazılsın
- Sorgularda her zaman `company_id = company.id` filtresi kullanılsın

### UI / Component
- Yeni component'ler Radix UI + Tailwind ile oluşturulsun
- i18n: Yeni string eklendiğinde TR, EN, RU, AR hepsi güncellensin
- Her yeni özellik için sıra: DB migration → service → UI

### Standart Hata Yönetimi
```jsx
const { data, error } = await supabase.from('...').select('*');
if (error) {
  console.error('Hata:', error);
  toast({ title: t('error'), description: error.message, variant: 'destructive' });
  return;
}
```

---

## Dış Servis Entegrasyonları

| Servis | Kullanım | Dosya/Bağlantı |
|--------|----------|----------------|
| Supabase | Database + Auth + RLS | `lib/supabase.js` |
| Evolution API | WhatsApp bağlantısı | N8N üzerinden |
| N8N | Workflow otomasyon | Hostinger VPS (`[N8N_URL]` — .env'de tanımlı) |
| Stripe | Ödeme işleme | Webhook + Checkout Session |
| Google Calendar | Takvim senkronizasyonu | OAuth 2.0 |

---

## N8N Workflow'ları

| Workflow | Tetikleyici | İşlev |
|----------|-------------|-------|
| `gece_kusu.json` | Günlük cron | Trial süresi biten şirketlerin servisini durdur |
| `Stripe Webhook → Supabase RPC` | Stripe olayı | Ödeme, iptal, plan değişikliği → DB güncelle |
| `Randevu-Bot_inctance.json` | Company güncelleme | WhatsApp instance oluştur/yönet |
| `QR-disconnected.json` | QR event | Bağlantı kesme durumunu yönet |
| `reminder_cron.json` | [YENİ] Saatlik cron | 24h ve 1h önce randevu hatırlatma mesajı gönder |
| `feedback_collector.json` | [YENİ] Randevu sonrası | Memnuniyet anketi gönder + yanıt işle |
| `admin_daily_summary.json` | [YENİ] Günlük cron (22:00) | Admin'e günlük özet rapor gönder |

---

## Tasarım Sistemi (Güzellik Teması)

- **Ana renk:** Pembe/Mor tonları (`#E91E8C`, `#9333EA`)
- **Vurgu renk:** Altın (`#D4AF37`)
- **Arka plan:** Yumuşak beyaz/krem tonları
- **Font:** Modern, zarif (Inter veya Poppins)
- **İkonlar:** Lucide React
- **Genel his:** Şık, profesyonel, feminen ama abartısız

---

## Bilinen Teknik Sorunlar

| Sorun | Dosya | Çözüm |
|-------|-------|-------|
| Hardcoded Supabase URL | `src/lib/supabase.js` | `import.meta.env.VITE_SUPABASE_URL` kullan |
| Redundant Supabase client | `src/lib/customSupabaseClient.js` | Sil, tüm importları `supabase.js`'e yönlendir |
| Stripe test linkleri | `src/pages/dashboard/BillingPage.jsx` | Canlıya geçmeden önce production URL'lerine güncelle |
| Destek sayfası boş | `src/pages/dashboard/SupportPage.jsx` | İçerik eklenmeli |
| i18n eksik çeviriler | `src/lib/translations.js` | EN, RU, AR bazı key'ler eksik olabilir |

---

## Başarı Metrikleri

- Kayıt → İlk randevu alma süresi < 5 dakika
- WhatsApp QR bağlantı süresi < 30 saniye
- Dashboard yüklenme süresi < 2 saniye
- Müşteri hatırlatma mesajı teslimat oranı > %95
- Aylık churn rate < %5

---

## Agent Bazlı Geliştirme Yaklaşımı

Proje 5 ayrı Claude Code agent ile paralel geliştiriliyor. Her agent'ın kendi MD dosyası var.

| Agent | Dosya | Görev | Bağımlılık |
|-------|-------|-------|------------|
| Agent 1 | `AGENT-1-SUPABASE-VE-DB.md` | Supabase fix + tüm DB migrations | Yok — hemen başla |
| Agent 2 | `AGENT-2-LANDING-PAGE.md` | Landing page güzellik teması | Yok — Agent 1 ile paralel |
| Agent 3 | `AGENT-3-BILDIRIM.md` | Bildirim + hatırlatma sistemi | Agent 1 bitmeli |
| Agent 4 | `AGENT-4-MUHASEBE.md` | Ön muhasebe modülü | Agent 1 bitmeli |
| Agent 5 | `AGENT-5-DASHBOARD.md` | Dashboard görsel yenileme | Hepsi bitmeli |

### Conflict Önleme Kuralı
Her agent SADECE kendi MD'sinde belirtilen dosyalara dokunur. Ortak dosyalarda (App.jsx, DashboardLayout.jsx) değişiklik gerekiyorsa, agent bunu son adım olarak yapar ve minimal tutar.
