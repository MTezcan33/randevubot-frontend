# Agent 3: Bildirim & Mesajlaşma Sistemi
# Öncelik: 🟡 Yüksek — Agent 1 DB migration'larından SONRA başla
# Proje: randevubot (C:\Users\Mehmet\randevubot)
# Projenin CLAUDE.md dosyasını oku, oradaki kurallara uy.
# ⚠️ Dokunacağın dosyalar: YENİ dosyalar + workflow/ + DashboardLayout.jsx (bildirim zili)

---

## Ön Koşul
Agent 1'in şu tabloları oluşturmuş olması gerekiyor:
- admin_notifications
- notification_templates
- customer_feedback
Tablolar yoksa önce Agent 1'i çalıştır.

---

## Görev 1: WhatsApp Müşteri Hatırlatma Sistemi

### Akış
1. Randevu oluşturulduğunda → onay mesajı gönder
2. Randevudan 24 saat önce → hatırlatma mesajı gönder
3. Randevudan 1 saat önce → hatırlatma mesajı gönder
4. Randevu iptal edildiğinde → iptal bildirimi gönder

### Yeni Dosya: `src/services/notificationService.js`
```javascript
import { supabase } from '../lib/supabase';

// Müşteriye WhatsApp mesajı gönder (N8N webhook üzerinden)
export const sendWhatsAppNotification = async (companyId, customerPhone, templateType, data) => {
  // 1. notification_templates tablosundan şablonu al
  // 2. Şablondaki değişkenleri ({{customer_name}}, {{date}}, {{time}}) değiştir
  // 3. N8N webhook'a POST gönder
  // 4. Logu admin_notifications'a kaydet
};

// Randevu onay mesajı
export const sendAppointmentConfirmation = async (appointment) => {
  // Şablon: "Merhaba {{customer_name}}, {{date}} tarihinde saat {{time}} için randevunuz oluşturuldu. ✅"
};

// Hatırlatma mesajı
export const sendReminder = async (appointment, type) => {
  // type: 'reminder_24h' | 'reminder_1h'
  // Şablon: "Hatırlatma: Yarın/Bugün saat {{time}} randevunuz var. 📅"
};

// İptal bildirimi
export const sendCancellation = async (appointment) => {
  // Şablon: "{{date}} tarihindeki randevunuz iptal edilmiştir. Yeni randevu almak için yazabilirsiniz."
};
```

### N8N Workflow: Hatırlatma Cron Job
Yeni bir N8N workflow oluştur: `reminder_workflow.json`
- Her saat başı çalışsın (cron)
- Supabase'den sonraki 24 saat ve 1 saat içindeki randevuları çek
- Her randevu için WhatsApp mesajı gönder (Evolution API üzerinden)
- Gönderim sonucunu logla

---

## Görev 2: Admin Bildirim Sistemi

### Admin'e bildirim gitmesi gereken olaylar:
1. **Yeni randevu** → "Yeni randevu: {{customer_name}}, {{date}} {{time}}, {{service}}"
2. **Randevu iptali** → "Randevu iptal edildi: {{customer_name}}, {{date}} {{time}}"
3. **Müşteri şikayeti** → "⚠️ Müşteri şikayeti: {{customer_name}} - {{comment}}"
4. **WhatsApp bağlantı kopması** → "❌ WhatsApp bağlantınız koptu! Lütfen yeniden bağlayın."
5. **Günlük özet** → "📊 Bugünkü randevular: {{count}}, Tahmini gelir: {{amount}}"

### Bildirim Oluşturma Fonksiyonu
```javascript
export const createAdminNotification = async (companyId, type, title, message, relatedId = null) => {
  const { error } = await supabase.from('admin_notifications').insert({
    company_id: companyId,
    type,
    title,
    message,
    related_id: relatedId
  });
  if (error) console.error('Bildirim oluşturma hatası:', error);
};
```

### Mevcut Randevu Oluşturma Akışına Entegrasyon
`CreateAppointmentModal.jsx` içinde randevu kaydedildikten sonra:
```javascript
// Randevu kaydedildi, şimdi bildirimleri gönder:
await createAdminNotification(company.id, 'new_appointment', 
  'Yeni Randevu', `${customerName} - ${date} ${time} - ${serviceName}`, appointmentId);
await sendAppointmentConfirmation(appointmentData);
```

### Dashboard Bildirim Zili Güncelleme
`DashboardLayout.jsx`'de mevcut bildirim zili var. Güncelle:
- admin_notifications tablosundan okunmamış bildirimleri çek
- Supabase realtime subscription ekle (yeni bildirim gelince anında göster)
- Tıklandığında bildirim listesi dropdown göster
- "Tümünü okundu işaretle" butonu
- Bildirim tıklandığında ilgili sayfaya yönlendir (randevu → AppointmentsPage)

---

## Görev 3: Müşteri Geri Bildirim Sistemi

### Akış
1. Randevu tamamlandıktan 2 saat sonra → WhatsApp'tan memnuniyet anketi gönder
2. Müşteri 1-5 arası puan verir
3. Puan 3 veya altıysa → admin'e otomatik şikayet bildirimi
4. Dashboard'da geri bildirimler görüntülenir

### Anket Mesajı Şablonu
```
Merhaba {{customer_name}}! 😊
{{salon_name}}'daki deneyiminizi nasıl değerlendirirsiniz?

1️⃣ - Çok Kötü
2️⃣ - Kötü  
3️⃣ - Orta
4️⃣ - İyi
5️⃣ - Mükemmel

Sadece rakamı yazmanız yeterli.
```

### Müşteri Yanıtı İşleme (N8N Workflow)
- WhatsApp'tan gelen mesajı N8N ile yakala
- Mesaj 1-5 arası bir sayı mı kontrol et
- customer_feedback tablosuna kaydet
- Rating ≤ 3 ise → admin_notifications'a şikayet olarak ekle

### Dashboard Geri Bildirim Sayfası
Mevcut SupportPage.jsx yerine veya içine:
- Geri bildirim listesi (müşteri adı, puan, yorum, tarih, durum)
- Filtre: Tümü / Yeni / İnceleniyor / Çözüldü
- Durum değiştirme (Yeni → İnceleniyor → Çözüldü)
- Admin yanıt ekleme
- Ortalama puan göstergesi

---

## N8N Workflow Dosyaları (workflow/ klasörüne eklenecek)
1. `reminder_cron.json` — Saatlik hatırlatma kontrolü
2. `feedback_collector.json` — Randevu sonrası anket gönder + yanıt işle
3. `admin_daily_summary.json` — Günlük özet rapor (her gece 22:00)

---

## Doğrulama
- [ ] Randevu oluşturulduğunda müşteriye WhatsApp onay mesajı gidiyor
- [ ] 24 saat ve 1 saat önce hatırlatma gidiyor
- [ ] Yeni randevuda admin'e bildirim geliyor
- [ ] Müşteri şikayetinde admin'e acil bildirim geliyor
- [ ] Dashboard'da bildirim zili çalışıyor + okunmamış sayısı gösteriyor
- [ ] Geri bildirim listesi ve durum yönetimi çalışıyor
- [ ] 4 dilde çeviri tamamlanmış
