# Agent 2: Landing Page Güzellik Sektörüne Özelleştirme
# Öncelik: 🟡 Yüksek — Agent 1 ile PARALEL çalışabilir
# Proje: randevubot (C:\Users\Mehmet\randevubot)
# Projenin CLAUDE.md dosyasını oku, oradaki kurallara uy.
# ⚠️ SADECE şu dosyalara dokun: src/pages/LandingPage.jsx, src/lib/translations.js, public/

---

## Amaç
randevubot.net landing page'ini güzellik merkezleri, masaj salonları, kuaförler ve spa merkezleri için optimize et. Genel bir randevu sistemi görünümünden çık, tamamen güzellik sektörüne odaklan.

---

## Tasarım Sistemi

### Renk Paleti
- Ana renk: Pembe/Mor tonları (#E91E8C, #9333EA)
- Vurgu: Altın (#D4AF37)
- Arka plan: Yumuşak beyaz/krem (#FFFBF5, #FFF5F7)
- Metin: Koyu gri (#1A1A2E)
- Başarı: Yeşil (#10B981)

### Font
- Başlıklar: Poppins (bold/semibold)
- Gövde: Inter (regular/medium)

### Genel His
- Şık, profesyonel, feminen ama abartısız
- Bol beyaz alan (whitespace)
- Yumuşak gölgeler ve yuvarlak köşeler
- Güzellik sektörüne ait ikonlar (makas, tırnak, masaj, spa)

---

## Sayfa Yapısı (Yukarıdan Aşağıya)

### 1. Hero Section
- Slogan: "Randevularınızı WhatsApp ile Yönetin, Siz İşinize Odaklanın"
- Alt başlık: "Güzellik merkezleri, kuaförler ve spa salonları için 7/24 AI destekli randevu asistanı"
- CTA butonu: "14 Gün Ücretsiz Deneyin" → /register
- Hero görseli: Güzellik salonu ortamında telefon/WhatsApp mockup
- Güven rozetleri: "500+ salon", "50.000+ randevu", "7/24 aktif"

### 2. Sorun-Çözüm Section
- "Tanıdık Geldi mi?" başlığı
- 3 sorun kartı:
  1. "Telefonla randevu almak için mesai saatlerini bekliyorlar" → Çözüm: 7/24 WhatsApp'tan randevu
  2. "Müşteriler randevularını unutuyor" → Çözüm: Otomatik hatırlatma mesajları
  3. "Kasayı ve gelir-gideri takip etmek zor" → Çözüm: Ön muhasebe modülü

### 3. Özellikler Section
6 özellik kartı (ikon + başlık + açıklama):
1. 7/24 WhatsApp Randevu — Müşterileriniz mesai saati beklemeden randevu alır
2. Otomatik Hatırlatma — 24 saat ve 1 saat önce WhatsApp'tan hatırlatma
3. Ön Muhasebe — Günlük kasa, gelir-gider, aylık rapor
4. Uzman Takvimi — Her uzman için ayrı takvim ve çalışma saatleri
5. Müşteri Takibi — Müşteri geçmişi, tercihleri, geri bildirimler
6. Çok Dilli Asistan — TR, EN, RU, AR dillerinde hizmet

### 4. Demo Konuşma Section
- Güzellik salonu WhatsApp demo konuşması (mevcut güzellik demosu korunsun)
- Telefon mockup içinde göster
- Sadece güzellik/kuaför/masaj demoları kalsın, diğer sektör demoları KALDIRILSIN

### 5. Fiyatlandırma Section
| Plan | Fiyat | Uzman | Özellikler |
|------|-------|-------|------------|
| Starter | $29/ay | 1 | Randevu + WhatsApp + Hatırlatma + Ön Muhasebe |
| Salon | $49/ay | 3 | + Geri Bildirim + Raporlama |
| Premium | $79/ay | 6 | + PDF Export + Öncelikli Destek |

- "En Popüler" rozeti Salon planına
- 14 gün ücretsiz trial vurgusu
- "Tüm planlarda: WhatsApp, hatırlatma, ön muhasebe" notu

### 6. Müşteri Yorumları Section (Yeni)
- 3 adet testimonial kartı
- İsim, salon adı, yıldız puanı, yorum
- (Şimdilik placeholder verilerle, sonra gerçek yorumlar eklenecek)

### 7. SSS (FAQ) Section
- Accordion formatında 5-6 soru:
  - WhatsApp'ım olmadan kullanabilir miyim?
  - Kaç uzman ekleyebilirim?
  - Trial bittikten sonra ne olur?
  - Verilerim güvende mi?
  - Hangi dilleri destekliyorsunuz?
  - Ön muhasebe tam muhasebe programı mı?

### 8. CTA Section (Son)
- "Salonunuzu Dijitale Taşıyın"
- "14 Gün Ücretsiz Başlayın" butonu
- WhatsApp destek linki

### 9. Footer
- Logo + kısa açıklama
- Hızlı linkler: Özellikler, Fiyatlandırma, Giriş, Kayıt
- Yasal linkler: Gizlilik Politikası, Kullanım Koşulları, KVKK
- Sosyal medya ikonları
- © 2025 MT AI Systems LTD

---

## i18n Güncelleme
Tüm yeni stringler `src/lib/translations.js` dosyasında TR, EN, RU, AR olarak eklenecek.

### Örnek yapı:
```javascript
// Hero
heroTitle: "Randevularınızı WhatsApp ile Yönetin",
heroSubtitle: "Güzellik merkezleri, kuaförler ve spa salonları için...",
heroCTA: "14 Gün Ücretsiz Deneyin",
// Pricing
pricingStarter: "Starter",
pricingSalon: "Salon",
pricingPremium: "Premium",
```

---

## Responsive Gereksinimler
- Mobil öncelikli (mobile-first)
- Hamburger menü mobilde
- Tek sütun layout mobilde
- Fiyatlandırma kartları yatay scroll veya dikey stack
- Hero görseli mobilde gizlenebilir veya küçültülebilir

---

## Doğrulama
- [ ] Tüm sektör referansları güzellik/salon/spa odaklı
- [ ] Diğer sektör demoları (hukuk, servis, eğitim, klinik) kaldırılmış
- [ ] Fiyatlandırma güncel (Starter $29, Salon $49, Premium $79)
- [ ] 4 dilde çeviri tamamlanmış
- [ ] Mobilde düzgün görünüyor
- [ ] `npm run build` hatasız
