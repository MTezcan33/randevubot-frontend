# Agent 5: Dashboard Görsel Yenileme
# Öncelik: 🟢 Normal — Tüm diğer agentler BİTTİKTEN SONRA başla
# Proje: randevubot (C:\Users\Mehmet\randevubot)
# Projenin CLAUDE.md dosyasını oku, oradaki kurallara uy.
# ⚠️ Dokunacağın dosyalar: src/pages/dashboard/*.jsx, src/layouts/DashboardLayout.jsx

---

## Amaç
Dashboard'u güzellik sektörüne uygun, modern ve profesyonel bir tasarıma kavuştur. Mevcut işlevsellik korunacak, sadece görsel iyileştirme yapılacak.

---

## Tasarım Sistemi

### Renkler
- Sidebar: Koyu mor gradient (#1A1A2E → #2D1B69)
- Aktif menü: Pembe vurgu (#E91E8C)
- Kartlar: Beyaz, yumuşak gölge (shadow-sm)
- Başlıklar: Koyu gri (#1A1A2E)
- İstatistik kartları: Pastel arka planlar (pembe, mor, altın, yeşil)

### Layout
- Sol sidebar (daraltılabilir) + üst header + ana içerik
- Sidebar genişliği: 260px (açık), 72px (daraltılmış)
- Mobilde sidebar drawer olarak açılsın

---

## Görev 1: DashboardLayout.jsx Yenileme

### Sidebar
- Logo üstte
- Menü öğeleri: ikon + metin + aktif durumda pembe sol border
- Alt kısımda: kullanıcı avatarı + isim + çıkış butonu
- Daraltma/genişletme toggle butonu
- Mobilde hamburger menü ile drawer açılsın

### Header
- Sayfa başlığı (dinamik)
- Sağ tarafta: Bildirim zili (okunmamış sayısı badge) + dil değiştirici + kullanıcı dropdown

---

## Görev 2: DashboardHome.jsx Yenileme

### İstatistik Kartları (üst sıra, 4 kart)
1. Bugünkü Randevular (sayı + önceki güne göre %)
2. Bu Aydaki Gelir (tutar + önceki aya göre %)
3. Toplam Müşteri (sayı + bu ay yeni eklenen)
4. Doluluk Oranı (% + bar göstergesi)

Her kart: pastel arka plan + büyük sayı + küçük trend ikonu (yukarı/aşağı ok)

### Bugünkü Program (orta bölüm)
- Timeline görünümü (saatlik)
- Her randevu: müşteri adı, hizmet, uzman, saat
- Renkli dot (uzman rengi)

### Hızlı İşlemler (sağ veya alt)
- "Yeni Randevu" butonu
- "Kasa Durumu" mini kart
- "Okunmamış Bildirimler" listesi

### Haftalık Grafik (alt)
- Son 7 gün randevu sayısı bar chart
- recharts kullan

---

## Görev 3: Diğer Dashboard Sayfaları

### AppointmentsPage.jsx
- Takvim ızgarası renkleri güzellik temasına uyumlu
- Randevu kartları yumuşak renkler
- Filtre bölümü daha kompakt

### ServicesPage.jsx
- Hizmet kartları grid layout (2-3 sütun)
- Her kartta: hizmet adı, süre, fiyat, atanmış uzmanlar
- Güzellik ikonları

### StaffPage.jsx
- Uzman kartları avatar + isim + rol + renk kodu
- Çalışma durumu badge (aktif/izinli)

### CustomersPage.jsx
- Tablo görünümü iyileştirme
- Avatar placeholder
- Son randevu tarihi kolonu

---

## Görev 4: Responsive İyileştirmeler

### Mobil (< 768px)
- Sidebar → drawer (hamburger menü)
- İstatistik kartları 2x2 grid
- Takvim → liste görünümü seçeneği
- Tablo → kart görünümü seçeneği

### Tablet (768px - 1024px)
- Sidebar daraltılmış
- 2 sütun layout

### Desktop (> 1024px)
- Tam sidebar
- 3-4 sütun layout

---

## Kullanılacak Bileşenler
- Radix UI: Dialog, DropdownMenu, Tabs, Tooltip, Avatar, Badge
- Lucide React: ikonlar
- Framer Motion: sayfa geçişleri, kart animasyonları
- recharts: grafikler

---

## i18n
Yeni string eklenmesi gerekiyorsa TR, EN, RU, AR hepsini güncelle.

---

## Doğrulama
- [ ] Sidebar açılıp kapanıyor (toggle)
- [ ] Mobilde hamburger menü çalışıyor
- [ ] İstatistik kartları doğru veri gösteriyor
- [ ] Tüm sayfalar responsive
- [ ] Renk paleti tutarlı (pembe/mor/altın)
- [ ] Karanlık/aydınlık tema çakışması yok
- [ ] Mevcut işlevsellik bozulmamış
- [ ] `npm run build` hatasız
- [ ] 4 dilde çeviri sorunsuz
