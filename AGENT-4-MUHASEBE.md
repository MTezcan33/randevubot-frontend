# Agent 4: Ön Muhasebe Modülü
# Öncelik: 🟡 Yüksek — Agent 1 DB migration'larından SONRA başla
# Proje: randevubot (C:\Users\Mehmet\randevubot)
# Projenin CLAUDE.md dosyasını oku, oradaki kurallara uy.
# ⚠️ Dokunacağın dosyalar: YENİ dosyalar oluştur + App.jsx'e route ekle + DashboardLayout.jsx'e menü ekle

---

## Ön Koşul
Agent 1'in şu tabloları oluşturmuş olması gerekiyor:
- transactions, transaction_categories, daily_cash_register, monthly_reports
Tablolar yoksa önce Agent 1'i çalıştır.

---

## Görev 1: Muhasebe Servis Katmanı

### Yeni Dosya: `src/services/accountingService.js`

```javascript
import { supabase } from '../lib/supabase';

// === GELİR/GİDER İŞLEMLERİ ===

// Yeni işlem ekle (gelir veya gider)
export const addTransaction = async (companyId, data) => {
  // data: { type, category_id, amount, payment_method, description, transaction_date, appointment_id?, receipt_url? }
};

// İşlemleri listele (filtreleme: tarih aralığı, tip, kategori)
export const getTransactions = async (companyId, filters = {}) => {
  // filters: { startDate, endDate, type, categoryId, paymentMethod }
};

// İşlem sil
export const deleteTransaction = async (transactionId) => {};

// === KATEGORİ YÖNETİMİ ===
export const getCategories = async (companyId) => {};
export const addCategory = async (companyId, data) => {};
export const deleteCategory = async (categoryId) => {};

// === GÜNLÜK KASA ===

// Bugünkü kasayı aç/getir
export const getTodayCashRegister = async (companyId) => {
  // Bugün için kayıt yoksa otomatik oluştur (opening_balance = dünkü closing_balance)
};

// Kasayı kapat
export const closeCashRegister = async (registerId, closingBalance, notes) => {};

// === RAPORLAMA ===

// Haftalık özet
export const getWeeklySummary = async (companyId, startDate) => {};

// Aylık özet
export const getMonthlySummary = async (companyId, month, year) => {};

// Uzman bazlı ciro
export const getExpertRevenue = async (companyId, startDate, endDate) => {};

// Hizmet bazlı ciro
export const getServiceRevenue = async (companyId, startDate, endDate) => {};

// === OTOMATİK GELİR KAYDI ===

// Randevu tamamlandığında otomatik gelir kaydı oluştur
export const createIncomeFromAppointment = async (appointment) => {
  // appointment.status === 'onaylandı' olduğunda çağrılacak
  // Hizmet fiyatını transactions tablosuna gelir olarak ekle
};
```

---

## Görev 2: Muhasebe Dashboard Sayfası

### Yeni Dosya: `src/pages/dashboard/AccountingPage.jsx`

4 ana tab:
1. **Günlük Kasa** — Bugünkü durum
2. **İşlemler** — Gelir/gider listesi
3. **Raporlar** — Grafik ve özetler
4. **Kategoriler** — Gelir/gider kategorileri yönetimi

### Tab 1: Günlük Kasa
- Kasa durumu kartı: Açılış bakiyesi, toplam gelir (nakit/kart/havale ayrı), toplam gider, net
- "Kasayı Kapat" butonu (gün sonu)
- Son 7 gün mini tablo

### Tab 2: İşlemler
- Gelir/gider ekleme modal:
  - Tip seçimi (gelir/gider)
  - Kategori dropdown
  - Tutar + para birimi
  - Ödeme yöntemi (nakit/kart/havale/diğer)
  - Açıklama
  - Tarih
  - Fiş/fatura fotoğrafı yükleme (Supabase Storage)
- İşlem listesi (tarih sıralı, filtrelenebilir)
- Filtreler: tarih aralığı, tip, kategori, ödeme yöntemi
- Excel export butonu

### Tab 3: Raporlar
- Tarih aralığı seçici
- Gelir vs gider bar chart (recharts kullan)
- Kategori bazlı pasta grafik
- Uzman bazlı ciro tablosu
- Hizmet bazlı ciro tablosu
- Aylık trend çizgi grafik
- "PDF İndir" butonu (muhasebeciye gönderilecek format)
- PDF içeriği: dönem, toplam gelir/gider/net, kategori breakdown, günlük detay

### Tab 4: Kategoriler
- Mevcut kategoriler listesi (ikon + renk + ad)
- Yeni kategori ekleme (gelir veya gider tipi seçerek)
- Varsayılan kategoriler silinemez (is_default=true)
- Özel kategoriler silinebilir (transaction yoksa)

---

## Görev 3: Randevu → Otomatik Gelir Kaydı

`src/pages/dashboard/AppointmentsPage.jsx` veya `CreateAppointmentModal.jsx` içinde:
Randevu durumu "onaylandı" olarak değiştiğinde:
```javascript
import { createIncomeFromAppointment } from '../../services/accountingService';

// Randevu onaylandığında otomatik gelir kaydı
if (newStatus === 'onaylandı') {
  await createIncomeFromAppointment({
    company_id: company.id,
    appointment_id: appointment.id,
    amount: servicePrice,
    payment_method: selectedPaymentMethod, // kullanıcı seçecek
    description: `${serviceName} - ${customerName}`
  });
}
```

---

## Görev 4: Route ve Menü Ekleme

### App.jsx'e route ekle:
```jsx
<Route path="accounting" element={<AccountingPage />} />
```

### DashboardLayout.jsx sidebar menüsüne ekle:
```jsx
{ name: t('accounting'), path: '/dashboard/accounting', icon: Calculator }
// Calculator ikonu lucide-react'ten
```

---

## i18n Stringler (translations.js'e eklenecek)

```javascript
// TR
accounting: "Muhasebe",
dailyCash: "Günlük Kasa",
transactions: "İşlemler", 
reports: "Raporlar",
categories: "Kategoriler",
income: "Gelir",
expense: "Gider",
cashRegister: "Kasa",
openingBalance: "Açılış Bakiyesi",
closingBalance: "Kapanış Bakiyesi",
closeRegister: "Kasayı Kapat",
addTransaction: "İşlem Ekle",
totalIncome: "Toplam Gelir",
totalExpense: "Toplam Gider",
netProfit: "Net Kar",
paymentMethod: "Ödeme Yöntemi",
cash: "Nakit",
card: "Kredi Kartı",
transfer: "Havale/EFT",
downloadPdf: "PDF İndir",
expertRevenue: "Uzman Cirosu",
serviceRevenue: "Hizmet Cirosu",
// EN, RU, AR için de aynı key'ler
```

---

## Kullanılacak Kütüphaneler
- recharts (zaten projede var) → grafikler
- xlsx (zaten projede var) → Excel export
- Yeni: react-to-print veya jspdf → PDF export
  - `npm install jspdf jspdf-autotable`

---

## Doğrulama
- [ ] /dashboard/accounting route'u çalışıyor
- [ ] Sidebar'da Muhasebe menüsü görünüyor
- [ ] Gelir/gider eklenebiliyor
- [ ] Günlük kasa açılıyor/kapanıyor
- [ ] Raporlar grafik ile görüntüleniyor
- [ ] PDF export çalışıyor
- [ ] Randevu onaylandığında otomatik gelir kaydı oluşuyor
- [ ] 4 dilde çeviri tamamlanmış
- [ ] Mobilde düzgün görünüyor
