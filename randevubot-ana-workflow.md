# RandevuBot Ana Workflow Optimizasyon Plani (v2 - Tum Supabase Tool)

## Context

`workflow/firma-1-randevubot-tool-v2-1551-FIXED.json` dosyasi, WhatsApp uzerinden musteri randevu taleplerini yoneten N8N workflow'u. 24 node iceriyor: Webhook → Supabase company lookup → AI Agent (Google Gemini + 11 tool) → Parse → WhatsApp yanit.

**Tasarim karari:** Tum AI tool'lari Supabase Tool node'u olacak (HTTP Request kullanilmayacak). Side-effect'ler (admin bildirimi, musteri stats) DB trigger'lariyla otomatik yapilacak.

---

## Bolum 1: Kritik Bug Duzeltmeleri (6 adet)

| # | Sorun | Dosya/Satir | Cozum |
|---|-------|-------------|-------|
| 1 | Status `'pending'` yerine `'beklemede'` olmali | Create Appointment node (satir 374) | Status'u `'beklemede'` olarak hardcode et |
| 2 | Switch node bos (routing yapmiyor) | Check Operation Type (satir 570-608) | Node'u kaldir |
| 3 | Session memory key yanlis (`webhookUrl`) | Window Buffer Memory (satir 112) | `customerPhone + '_' + companyId` kullan |
| 4 | Hardcoded WhatsApp fallback | Get Company by WhatsApp (satir 29) | Fallback'i kaldir |
| 5 | Evolution API tek firmaya bagli | Send text1 (satir 657) | Evolution API node'unda dinamik `instanceName` kullan |
| 6 | DB default status yanlis | appointments tablosu | `ALTER TABLE appointments ALTER COLUMN status SET DEFAULT 'beklemede'` |

---

## Bolum 2: DB Degisiklikleri

Dosya: `Supabase/RANDEVUBOT_FULL_CONTEXT.sql`

### 2a. Status Default Duzeltmesi
```sql
ALTER TABLE public.appointments ALTER COLUMN status SET DEFAULT 'beklemede';
```

### 2b. Admin Bildirim Trigger'i (YENI)
Randevu INSERT/UPDATE'de otomatik admin_notifications olusturur.
Side-effect'ler workflow yerine DB katmaninda gerceklesir → daha guvenilir, atomik.

```sql
CREATE OR REPLACE FUNCTION public.trigger_bot_admin_notification()
RETURNS TRIGGER AS $$
-- INSERT → 'new_appointment' bildirimi
-- UPDATE status='iptal' → 'cancelled_appointment' bildirimi + recalculate_customer_stats
```

### 2c. Mevcut RPC Fonksiyonlari (Bolum 14 — zaten yazildi, korunur)
SQL dosyasindaki 6 RPC fonksiyonu (`bot_get_company_context`, `bot_get_available_slots`, vb.) korunur.
Workflow'dan dogrudan cagirilmayacak ama gelecekte baska entegrasyonlar icin hazir.

---

## Bolum 3: Yeni Workflow Mimarisi

### Mevcut: 24 node, 11 AI tool
### Hedef: ~25 node, 9 AI tool (HEPSI Supabase Tool)

```
[1] Webhook Trigger (KORUNUR)
  |
[2] Extract Message Data (YENI - Code)
  |   → customerPhone, messageText, messageId, remoteJid cikartir
  |   → Bos mesajlari filtreler
  |
[3] Get Company by WhatsApp (DUZELTME - fallback kaldirilir)
  |
[4] Company Found? (KORUNUR)
  |   ├─ FALSE → Error - No Company → Error Response
  |
[5] Dedup Check (YENI - Code node)
  |   → whatsapp_conversations tablosunda messageId arar
  |   → Yoksa loglar, varsa isDuplicate=true doner
  |
[6] Is Duplicate? (YENI - If)
  |   ├─ TRUE → Sessizce atla
  |
[7] Pre-fetch Context (YENI - Code node)
  |   → 5 paralel Supabase REST sorgusu:
  |     company_users, company_services, expert_services,
  |     company_working_hours, company_holidays
  |   → AI prompt'una okunabilir metin olarak enjekte edilir
  |
[8] AI Agent (9 Supabase Tool)
  |   ├─ (ai_languageModel) ← Google Gemini Chat Model
  |   ├─ (ai_memory) ← Window Buffer Memory (DUZELTME - session key)
  |   ├─ (ai_tool) ← Find Customer by Phone (getAll customers, phone filtreli)
  |   ├─ (ai_tool) ← Create Customer (create customers)
  |   ├─ (ai_tool) ← Get Expert Appointments (getAll appointments, expert+date filtreli)
  |   ├─ (ai_tool) ← Get Working Hours (getAll company_working_hours)
  |   ├─ (ai_tool) ← Get Company Holidays (getAll company_holidays)
  |   ├─ (ai_tool) ← Get Expert Services (getAll expert_services)
  |   ├─ (ai_tool) ← Create Appointment (create appointments, status='beklemede')
  |   ├─ (ai_tool) ← Cancel Appointment (update appointments, status='iptal')
  |   └─ (ai_tool) ← Update Appointment (update appointments, Turkce status)
  |
[9] Parse AI Response (SADELEISTIRILIR - 80 → 15 satir)
  |   → Sadece customer_message cikarilir
  |
[10] Send WhatsApp Message (Evolution API node, dinamik instanceName)
  |   → instanceName: company.instance_name
  |   → remoteJid: musteri WhatsApp ID
  |   → Tek Evolution API credential tum firmalar icin calisir

Hata yolu:
AI Agent [onError] → Error Handler (Code) → Send Error WhatsApp (Evolution API)
```

### Kaldirilan Node'lar (4 adet):
1. "Check Operation Type" (Switch) — bos, kirik
2. "No Database Operation" (Code) — ulasilamaz
3. "WhatsApp Response" (respondToWebhook) — devre disi
4. Eski "Send text1" credential'i → tek shared credential'a gecilir

### AI Tool Karsilastirmasi (Eski → Yeni):

| Eski Tool | Yeni Tool | Degisiklik |
|-----------|-----------|------------|
| Get Company Users | (pre-fetch'e tasindi) | AI prompt'ta context olarak gelir |
| Get Company Services | (pre-fetch'e tasindi) | AI prompt'ta context olarak gelir |
| Get Expert Services | Get Expert Services (KORUNUR) | AI tool olarak kalir (randevu oncesi dogrulama) |
| Get Working Hours | Get Working Hours (KORUNUR) | AI tool olarak kalir (slot hesaplama) |
| Get Company Holidays | Get Company Holidays (KORUNUR) | AI tool olarak kalir (tatil kontrolu) |
| Get All Customers | Find Customer by Phone (IYILESTIRILIR) | Phone filtresi eklendi |
| Get All Appointments | Get Expert Appointments (IYILESTIRILIR) | Expert + date filtresi, limit 500 |
| Create Customers | Create Customer (KORUNUR) | Degisiklik yok |
| Create Appointment | Create Appointment (DUZELTILIR) | status='beklemede' |
| Update Appointment | Update Appointment (DUZELTILIR) | Turkce status degerleri |
| Cancel Appointment | Cancel Appointment (KORUNUR) | status='iptal' zaten dogru |

### Side-Effect'ler: DB Trigger ile Otomatik

AI tool'lari basit CRUD yapar. Side-effect'ler DB trigger'iyla garantilenir:

| Olay | Trigger Aksiyonu |
|------|-----------------|
| Appointment INSERT | → admin_notifications'a 'new_appointment' ekle |
| Appointment UPDATE status='iptal' | → admin_notifications'a 'cancelled_appointment' ekle + recalculate_customer_stats cagir |

**Avantaj:** Workflow'da post-processing switch/routing gerekmez. Side-effect atomik ve guvenilir.

---

## Bolum 4: AI Prompt Sadeleistirmesi

### Degisiklikler:
- System + text prompt tekrari kaldirilir (~%60 token tasarrufu)
- JSON yanit formati → **duz metin** (Parse node sadeleisir)
- Status degerleri Turkce'ye duzeltilir
- Pre-fetched context (uzmanlar, hizmetler) prompt'a eklenir
- Musteri VIP/tercih edilen uzman bilgisi belirtilir

### Tool Kullanim Sirasi (prompt'ta):
```
Randevu Olusturma:
1. Find Customer by Phone → Musteri var mi?
2. (yoksa) Create Customer → Kaydet
3. Get Working Hours → O gun musait mi?
4. Get Company Holidays → Tatil mi?
5. Get Expert Appointments → Cakisma var mi?
6. Get Expert Services → Uzman bu hizmeti yapabiliyor mu?
7. Musteriden onay al
8. Create Appointment → Kaydet

Randevu Iptali:
1. Get Expert Appointments → Randevuyu bul
2. Cancel Appointment → status='iptal'

Genel Sorular:
→ Context'teki bilgileri kullan, tool cagirma
```

---

## Bolum 5: Multi-Tenant Credential Yonetimi

### Evolution API Node (tek shared credential):
- N8N'de TEK Evolution API credential tanimlanir (API key)
- `instanceName` parametresi dinamik: `{{ company.instance_name }}`
- Her firma icin farkli WhatsApp instance, ayni API key
- Credential ismini `randevubot-global` olarak guncelle

### Supabase Credential:
- Mevcut "Randevubotnet" credential korunur
- Service role key ile RLS bypass (bot tum firmalara erisir)

---

## Bolum 6: Uygulama Sirasi

### Adim 1: SQL Migration
1. `ALTER TABLE appointments ALTER COLUMN status SET DEFAULT 'beklemede'`
2. Admin bildirim trigger fonksiyonu + trigger olustur
3. Mevcut Bolum 14 RPC'leri korunur (gelecek kullanim)

### Adim 2: N8N Credential Guncelleme
- Evolution API credential'ini paylasilabilir hale getir (tum firmalar icin)

### Adim 3: Workflow JSON Guncelleme (`randevubot-ana-workflow-v3.json`)
1. Extract Message Data (Code node) ekle
2. Get Company by WhatsApp fallback kaldir
3. Dedup Check (Code) + Is Duplicate? (If) ekle
4. Pre-fetch Context (Code) ekle
5. AI Agent prompt'unu guncelle (sadeleistirilmis, Turkce status)
6. Window Buffer Memory session key duzelt
7. 9 Supabase Tool node'u ayarla (filtreler, status duzeltmeleri)
8. Parse AI Response sadele (15 satir)
9. Send WhatsApp → Evolution API node (dinamik instanceName)
10. Error Handler + Send Error WhatsApp ekle
11. Eski node'lari kaldir (Switch, No DB Op, WhatsApp Response)

### Adim 4: Test
Senaryolar: selamlama, hizmet sorgusu, randevu olusturma, iptal, coklu hizmet,
cakisma tespiti, tatil, calisma disi saat, duplicate mesaj

### Adim 5: Aktivasyon
Yeni workflow aktif, eski deaktif (rollback icin korunur)

---

## Bolum 7: Dokunulacak Dosyalar

| Dosya | Islem |
|-------|-------|
| `Supabase/RANDEVUBOT_FULL_CONTEXT.sql` | Bolum 14 korunur + admin trigger eklenir |
| `workflow/firma-1-randevubot-tool-v2-1551-FIXED.json` | Referans olarak korunur |
| `workflow/randevubot-ana-workflow-v3.json` | GUNCELLENIR: Tum Supabase Tool mimarisi |

---

## Bolum 8: Beklenen Kazanclar

| Metrik | Oncesi | Sonrasi |
|--------|--------|---------|
| AI Tool call sayisi (randevu olusturma) | 8-11 | 6-8 |
| Tum AI tool'lar Supabase Tool | Hayir (karisik) | Evet |
| Pre-fetch DB query | 0 | 1 (Code node, 5 paralel sorgu) |
| Prompt token boyutu | ~4000 token | ~1600 token |
| Parse node satir sayisi | 80+ | 15 |
| Multi-tenant | Hayir (tek firma) | Evet (dinamik instanceName) |
| Mesaj dedup | Yok | Var (5dk pencere) |
| Session memory | Yanlis (webhookUrl) | Dogru (phone+company) |
| Hata yonetimi | Yok | Var (fallback mesaj) |
| Admin bildirimi | Yok | Otomatik (DB trigger) |
| Musteri stats guncelleme | Yok | Otomatik (DB trigger) |
| Side-effect guvenilirligi | Yok | Atomik (DB katmaninda) |
