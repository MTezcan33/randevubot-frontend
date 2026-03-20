# RandevuBot — Ödeme Al (Payment Collection) Sistemi — Detaylı Uygulama Planı

## Context

RandevuBot'un mevcut sistemi randevu oluşturma, muhasebe ve kasa yönetimi altyapısına sahip ancak **randevu bazlı ödeme tahsilat** akışı yok. Müşteri geldiğinde veya hizmet sonrasında "Bu randevunun ödemesini al" diyebileceği bir ekran bulunmuyor. Mevcut `transactions` tablosu gelir/gider kaydı tutuyor ancak randevuyla entegre ödeme akışı eksik.

**Referans:** MenuBot'un PaymentModal sistemi (parçalı ödeme, birim bazlı takip, geri alma)

---

## Mevcut Durum Analizi

### Veritabanı
| Tablo | İlgili Alanlar | Durum |
|-------|----------------|-------|
| `appointments` | id, company_id, service_id, expert_id, customer_id, date, time, status | **Ödeme durumu YOK** |
| `appointment_services` | appointment_id, service_id | Çoklu hizmet desteği var |
| `company_services` | id, price, duration, name | Fiyat bilgisi burada |
| `transactions` | id, amount, payment_method, appointment_id, type, category_id | Gelir kaydı var ama ödeme akışı yok |
| `daily_cash_register` | opening_balance, closing_balance, total_cash/card/transfer | Kasa var |

### Eksikler
1. **`appointments` tablosunda `payment_status` yok** — ödendi mi, bekliyor mu bilinmiyor
2. **Parçalı ödeme altyapısı yok** — bir randevuya birden fazla ödeme yöntemiyle ödeme yapılamıyor
3. **Ödeme geçmişi yok** — hangi randevuya ne zaman, ne kadar, nasıl ödeme yapıldı kaydı tutulmuyor
4. **Sidebar'da ödeme al butonu yok** — hızlı erişim noktası eksik
5. **Hizmet bazlı ödeme takibi yok** — çoklu hizmet randevusunda hangi hizmetin ödendiği bilinmiyor

---

## Tasarım İlkeleri

1. **MenuBot Referansı:** Parçalı ödeme, 4 ödeme yöntemi, geri alma, birim bazlı takip
2. **Mevcut Muhasebe Entegrasyonu:** Ödeme alındığında otomatik `transactions` kaydı oluşturulacak
3. **Kasa Entegrasyonu:** Nakit ödemeler `daily_cash_register`'a yansıyacak
4. **Geriye Dönük Uyumluluk:** Tüm yeni kolonlar nullable + default
5. **Ödeme Akışı Esnekliği:** Hizmet öncesi, sırası veya sonrası ödeme alınabilir

---

## VERİTABANI MİGRASYONU

### Migration Dosyası: `database/migrations/010_payment_system.sql`

### Yeni Tablolar (2 adet)

#### `appointment_payments` — Randevu Ödeme Kayıtları
Her ödeme işlemi ayrı bir kayıt. Parçalı ödemede aynı randevuya birden fazla kayıt oluşur.

```sql
CREATE TABLE IF NOT EXISTS public.appointment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,

  -- Ödeme detayları
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash','card','online','free')),

  -- Hangi hizmet(ler) için ödendi (opsiyonel, hizmet bazlı takip)
  service_id UUID REFERENCES company_services(id) ON DELETE SET NULL,

  -- İlişkili transaction kaydı (otomatik oluşturulur)
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

  -- Meta
  note TEXT,
  collected_by UUID REFERENCES company_users(id) ON DELETE SET NULL, -- Kim tahsil etti
  is_refunded BOOLEAN DEFAULT false,
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_appointment_payments_company ON appointment_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_appointment_payments_appointment ON appointment_payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_payments_date ON appointment_payments(created_at);
CREATE INDEX IF NOT EXISTS idx_appointment_payments_method ON appointment_payments(company_id, payment_method);

-- RLS
ALTER TABLE appointment_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own appointment_payments" ON appointment_payments
  FOR ALL USING (company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
  ));
```

#### `payment_settings` — Şirket Ödeme Ayarları
```sql
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Aktif ödeme yöntemleri
  cash_enabled BOOLEAN DEFAULT true,
  card_enabled BOOLEAN DEFAULT true,
  online_enabled BOOLEAN DEFAULT true,
  free_enabled BOOLEAN DEFAULT true,

  -- Varsayılan ayarlar
  default_payment_method TEXT DEFAULT 'cash' CHECK (default_payment_method IN ('cash','card','online','free')),
  auto_create_transaction BOOLEAN DEFAULT true,  -- Ödeme alındığında otomatik transaction oluştur
  require_full_payment BOOLEAN DEFAULT false,     -- Tam ödeme zorunlu mu (parçalı izin ver/verme)

  -- Makbuz ayarları
  receipt_enabled BOOLEAN DEFAULT false,
  receipt_template TEXT DEFAULT 'default',

  -- KDV
  vat_enabled BOOLEAN DEFAULT false,
  vat_rate DECIMAL(5,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)
);

-- RLS
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own payment_settings" ON payment_settings
  FOR ALL USING (company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
  ));
```

### Mevcut Tablo Değişiklikleri (ALTER)

#### `appointments` — 3 yeni kolon
```sql
-- Ödeme durumu
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded', 'free'));

-- Toplam tutar (randevu oluşturulduğunda hizmet fiyatlarından hesaplanır)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0;

-- Ödenen tutar (appointment_payments'dan hesaplanır, denormalize)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0;
```

### Trigger: Ödeme sonrası otomatik güncelleme
```sql
CREATE OR REPLACE FUNCTION update_appointment_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid DECIMAL(10,2);
  v_total_amount DECIMAL(10,2);
  v_new_status TEXT;
BEGIN
  -- Toplam ödenen miktarı hesapla (iade edilmemiş ödemeler)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM appointment_payments
  WHERE appointment_id = COALESCE(NEW.appointment_id, OLD.appointment_id)
    AND is_refunded = false;

  -- Randevunun toplam tutarını al
  SELECT COALESCE(total_amount, 0) INTO v_total_amount
  FROM appointments
  WHERE id = COALESCE(NEW.appointment_id, OLD.appointment_id);

  -- Durumu belirle
  IF v_total_amount = 0 THEN
    v_new_status := 'free';
  ELSIF v_total_paid >= v_total_amount THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'unpaid';
  END IF;

  -- Güncelle
  UPDATE appointments
  SET payment_status = v_new_status,
      paid_amount = v_total_paid
  WHERE id = COALESCE(NEW.appointment_id, OLD.appointment_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_payment_status
  AFTER INSERT OR UPDATE OR DELETE ON appointment_payments
  FOR EACH ROW EXECUTE FUNCTION update_appointment_payment_status();
```

### Trigger: Randevu oluşturulduğunda total_amount hesaplama
```sql
CREATE OR REPLACE FUNCTION calculate_appointment_total()
RETURNS TRIGGER AS $$
DECLARE
  v_total DECIMAL(10,2);
BEGIN
  -- appointment_services'dan hizmet fiyatlarını topla
  SELECT COALESCE(SUM(cs.price), 0) INTO v_total
  FROM appointment_services aps
  JOIN company_services cs ON cs.id = aps.service_id
  WHERE aps.appointment_id = NEW.appointment_id;

  -- Eğer appointment_services yoksa, doğrudan service_id'den al
  IF v_total = 0 THEN
    SELECT COALESCE(cs.price, 0) INTO v_total
    FROM appointments a
    JOIN company_services cs ON cs.id = a.service_id
    WHERE a.id = NEW.appointment_id;
  END IF;

  UPDATE appointments SET total_amount = v_total
  WHERE id = NEW.appointment_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- appointment_services INSERT sonrası tetiklenir
CREATE TRIGGER trg_calculate_total
  AFTER INSERT ON appointment_services
  FOR EACH ROW EXECUTE FUNCTION calculate_appointment_total();
```

### Rollback SQL
```sql
-- ROLLBACK:
-- DROP TRIGGER IF EXISTS trg_update_payment_status ON appointment_payments;
-- DROP TRIGGER IF EXISTS trg_calculate_total ON appointment_services;
-- DROP FUNCTION IF EXISTS update_appointment_payment_status;
-- DROP FUNCTION IF EXISTS calculate_appointment_total;
-- DROP TABLE IF EXISTS payment_settings CASCADE;
-- DROP TABLE IF EXISTS appointment_payments CASCADE;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS payment_status;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS total_amount;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS paid_amount;
```

---

## ÖDEME AL SAYFASI — PaymentsPage

### Dosya: `src/pages/dashboard/PaymentsPage.jsx`

### Sayfa Yapısı (3 Tab)

```
┌──────────────────────────────────────────────────────────────────┐
│  💳 Ödeme Al                                        [Filtreler]  │
├──────────────────────────────────────────────────────────────────┤
│  [Bekleyen Ödemeler]  [Ödeme Geçmişi]  [Ayarlar]               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TAB İÇERİĞİ                                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### TAB 1: Bekleyen Ödemeler (Ana Ekran)

Ödeme bekleyen randevuların listesi. `payment_status IN ('unpaid', 'partial')` ve `status != 'iptal'`

#### Filtreler (Üst Bar)
- **Tarih:** Bugün (default) | Bu Hafta | Bu Ay | Tümü | Özel Aralık
- **Uzman:** Tüm Uzmanlar | [Uzman Seçimi]
- **Durum:** Tümü | Ödenmemiş | Kısmi Ödenen
- **Arama:** Müşteri adı veya telefon ile arama

#### Liste Görünümü — Kart Tabanlı

Her randevu bir kart olarak gösterilir:

```
┌──────────────────────────────────────────────────────────────────┐
│  👤 AYŞE YILMAZ                           📅 19 Mart 2026 14:00 │
│  📱 +90 532 XXX XX XX                     👩‍⚕️ Fatma Uzman       │
│  ─────────────────────────────────────────────────────────────── │
│  Hizmetler:                                                      │
│  ├─ Klasik Masaj (60dk)                              ₺500.00    │
│  ├─ Kese-Köpük (45dk)                                ₺300.00    │
│  └─ Aromaterapi (30dk)                               ₺200.00    │
│  ─────────────────────────────────────────────────────────────── │
│  Toplam: ₺1,000.00                                              │
│  Ödenen: ₺300.00  (nakit ₺300)           ░░░░░░░░░░ %30         │
│  Kalan:  ₺700.00                                                │
│  ─────────────────────────────────────────────────────────────── │
│  [🏷️ Kısmi Ödendi]                            [💳 Ödeme Al →]   │
└──────────────────────────────────────────────────────────────────┘
```

#### Durum Badgeleri
| Durum | Badge Renk | Metin |
|-------|-----------|-------|
| `unpaid` | Kırmızı | Ödenmedi |
| `partial` | Turuncu | Kısmi Ödendi |
| `paid` | Yeşil | Ödendi |
| `free` | Gri | Ücretsiz |
| `refunded` | Mor | İade Edildi |

#### Sıralama
- Varsayılan: Tarih/saat (en yakın randevu en üstte)
- Alternatif: Tutar (yüksekten düşüğe), Müşteri adı (A-Z)

---

### ÖDEME MODAL — PaymentCollectionModal

"Ödeme Al" butonuna tıklandığında açılır. **Bu sistemin kalbi.**

#### Modal Yapısı (2 Panelli — Responsive)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  💳 Ödeme Al — AYŞE YILMAZ                                    [✕]     │
│  📅 19 Mart 2026 14:00 · 👩‍⚕️ Fatma Uzman                              │
├────────────────────────────────┬────────────────────────────────────────┤
│  SOL PANEL — Hizmet Listesi   │  SAĞ PANEL — Ödeme İşlemi             │
│                                │                                        │
│  ☑ Klasik Masaj     ₺500.00  │  Ödeme Yöntemi:                        │
│  ☐ Kese-Köpük       ₺300.00  │  ┌────────┐ ┌────────┐                 │
│  ☐ Aromaterapi      ₺200.00  │  │💵 Nakit │ │💳 Kart │                 │
│                                │  │ (aktif) │ │        │                 │
│  ───────────────────────────  │  └────────┘ └────────┘                 │
│  📊 Ödeme Özeti:              │  ┌────────┐ ┌────────┐                 │
│  Toplam:      ₺1,000.00      │  │🌐Online│ │🎁Ücrtsz│                 │
│  Önceki:        ₺300.00      │  │        │ │        │                 │
│  Kalan:         ₺700.00      │  └────────┘ └────────┘                 │
│  ───────────────────────────  │                                        │
│  Bu İşlem:      ₺500.00      │  Tutar:                                │
│  (1 hizmet seçili)            │  ┌──────────────────────────────┐      │
│                                │  │ ₺ [    500.00             ] │      │
│  ───────────────────────────  │  └──────────────────────────────┘      │
│  Önceki Ödemeler:             │                                        │
│  ✓ ₺300 nakit (14:35)  [↩]  │  Hızlı Tutar:                          │
│                                │  [Tamamı] [₺100] [₺200] [₺500]       │
│                                │                                        │
│                                │  Not (opsiyonel):                      │
│                                │  ┌──────────────────────────────┐      │
│                                │  │ [                          ] │      │
│                                │  └──────────────────────────────┘      │
│                                │                                        │
│                                │  ┌──────────────────────────────┐      │
│                                │  │     💰 ÖDEMEYİ KAYDET        │      │
│                                │  │        ₺500.00 Nakit         │      │
│                                │  └──────────────────────────────┘      │
│                                │                                        │
│                                │  İşlem sonrası kalan: ₺200.00         │
├────────────────────────────────┴────────────────────────────────────────┤
│  [Tüm Ödemeleri İptal Et]                    [Kapat]                   │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Sol Panel — Hizmet Listesi & Ödeme Özeti

**Hizmet Kartları:**
- Her hizmet bir satır, checkbox ile seçilebilir
- Seçilen hizmetlerin fiyatları otomatik toplanır → sağ paneldeki tutara yansır
- Zaten ödenmiş hizmetler ✅ işaretli, seçilemez (gri, strikethrough)
- Kısmi ödenmiş hizmetler kalan tutarı gösterir

**Ödeme Özeti Bölümü:**
```
Toplam Tutar:     ₺1,000.00    (tüm hizmetlerin toplamı)
Önceki Ödemeler:    ₺300.00    (daha önce alınan)
Kalan Tutar:        ₺700.00    (henüz ödenmemiş)
Bu İşlem:           ₺500.00    (şu an alınacak)
İşlem Sonrası:      ₺200.00    (bu işlemden sonra kalan)
```

**Önceki Ödemeler Listesi:**
- Her ödeme: tutar, yöntem, zaman, [↩ Geri Al] butonu
- Geri Al: onay dialog → `is_refunded = true` → tutar güncellenir

#### Sağ Panel — Ödeme İşlemi

**1. Ödeme Yöntemi Seçimi (2×2 Grid)**

| Yöntem | İkon | Renk | Açıklama |
|--------|------|------|----------|
| Nakit | 💵 Banknote | Yeşil (#22C55E) | Nakit para |
| Kart | 💳 CreditCard | Mavi (#3B82F6) | Kredi/Banka kartı |
| Online | 🌐 Globe | Mor (#8B5CF6) | Havale/EFT/Online |
| Ücretsiz | 🎁 Gift | Turuncu (#F59E0B) | Hediye/Kampanya/İkram |

Her buton aktif olduğunda dolgu rengini alır, pasifken outline görünümde.

**2. Tutar Girişi**

- Büyük, net bir input alanı — varsayılan olarak kalan tutarla doldurulur
- **Müşteri Belirlemeli Tutar:** Input düzenlenebilir, müşteri istediği kadar ödeyebilir
  - Örnek: Kalan ₺700, müşteri "₺100 nakit ödeyeceğim" der → ₺100 yazılır
  - Kalan ₺600 sonraki ödeme için kalır
- **Hızlı Tutar Butonları:** `[Tamamı]` `[₺50]` `[₺100]` `[₺200]` `[₺500]`
  - "Tamamı" kalan tutarı yazar
  - Diğerleri sabit tutarlar (kalan tutardan büyükse disable)
- **Validasyon:**
  - Tutar 0'dan büyük olmalı
  - Tutar kalan tutarı aşamaz (fazla ödeme engellenir)
  - "Ücretsiz" seçildiğinde tutar otomatik kalan tutar olur

**3. Not Alanı (Opsiyonel)**
- Serbest metin — "Müşteri sonra ödeyecek", "Kampanya indirimi", vb.

**4. Ödeme Kaydet Butonu**
- Büyük, belirgin buton
- Tutar ve yöntem bilgisi buton üzerinde gösterilir: "💰 ₺500.00 Nakit Öde"
- Tıklandığında:
  1. `appointment_payments` INSERT
  2. Trigger → `appointments.payment_status` + `paid_amount` güncellenir
  3. `auto_create_transaction = true` ise → `transactions` tablosuna gelir kaydı oluşturulur
  4. Nakit ise → `daily_cash_register` güncellenir
  5. Toast: "✅ ₺500.00 nakit ödeme kaydedildi"
  6. Modal kapanmaz — kalan tutar güncellenir, yeni ödeme alınabilir

---

### PARÇALI ÖDEME AKIŞI — Detaylı Senaryo

**Senaryo:** Müşteri 3 hizmet aldı (Klasik Masaj ₺500 + Kese ₺300 + Aromaterapi ₺200 = ₺1,000)

#### Adım 1: İlk Ödeme (Nakit ₺300)
```
Müşteri: "Şimdilik 300 lira nakit vereyim"
Kasiyer:
1. "Ödeme Al" butonuna basar
2. Modal açılır — Kalan: ₺1,000
3. Ödeme yöntemi: 💵 Nakit seçer
4. Tutar alanına ₺300 yazar (veya hızlı butonlardan ₺100 × 3)
5. "₺300.00 Nakit Öde" butonuna basar

Sonuç:
- appointment_payments: { amount: 300, method: 'cash' }
- appointments: { payment_status: 'partial', paid_amount: 300 }
- transactions: { amount: 300, type: 'income', method: 'cash', appointment_id: xxx }
- Modal'da: Kalan ₺700 gösterilir
```

#### Adım 2: İkinci Ödeme (Kart ₺500)
```
Müşteri: "500 lirayı kartla ödeyeceğim"
Kasiyer:
1. Modal hâlâ açık — Kalan: ₺700
2. Ödeme yöntemi: 💳 Kart seçer
3. Tutar: ₺500
4. "₺500.00 Kart Öde" butonuna basar

Sonuç:
- appointment_payments: yeni kayıt { amount: 500, method: 'card' }
- appointments: { payment_status: 'partial', paid_amount: 800 }
- Modal'da: Kalan ₺200 gösterilir
```

#### Adım 3: Üçüncü Ödeme (Ücretsiz ₺200)
```
Kasiyer: "Kalan 200 lirayı ikram ediyoruz"
1. Ödeme yöntemi: 🎁 Ücretsiz seçer
2. Tutar otomatik: ₺200 (kalan tutar)
3. Not: "Sadık müşteri ikramı"
4. "₺200.00 Ücretsiz" butonuna basar

Sonuç:
- appointment_payments: yeni kayıt { amount: 200, method: 'free' }
- appointments: { payment_status: 'paid', paid_amount: 1000 }
- 🎉 "Ödeme tamamlandı!" konfeti animasyonu
- Modal otomatik kapanır
```

#### Sonuç Özet
```
Randevu Toplam: ₺1,000
├── ₺300 Nakit  (14:35)
├── ₺500 Kart   (14:36)
└── ₺200 Ücretsiz (14:37) — "Sadık müşteri ikramı"
Durum: ✅ Ödendi
```

---

### ÖDEME GERİ ALMA (İade)

Sol paneldeki "Önceki Ödemeler" bölümünde her ödemenin yanında `[↩ Geri Al]` butonu var.

#### Geri Alma Akışı
1. Kasiyer `[↩]` butonuna basar
2. Onay dialog: "₺500 kartla alınan ödemeyi geri almak istediğinize emin misiniz?"
3. Opsiyonel: İade nedeni text input
4. Onaylandığında:
   - `appointment_payments`: `is_refunded = true`, `refunded_at = NOW()`, `refund_reason = '...'`
   - Trigger → `paid_amount` yeniden hesaplanır, `payment_status` güncellenir
   - İlişkili `transaction` da güncellenir (veya eksi transaction oluşturulur)
5. Toast: "↩ ₺500 kart ödemesi iade edildi"

#### Toplu Geri Alma
Modal alt barında `[Tüm Ödemeleri İptal Et]` butonu:
- Onay: "Bu randevuya ait tüm ödemeleri (₺800) geri almak istediğinize emin misiniz?"
- Tüm ödemeler `is_refunded = true` yapılır
- `payment_status = 'unpaid'`, `paid_amount = 0`

---

### TAB 2: Ödeme Geçmişi

Tüm yapılmış ödemelerin kronolojik listesi. Filtreler ile daraltılabilir.

#### Filtreler
- **Tarih Aralığı:** Bugün | Bu Hafta | Bu Ay | Özel
- **Ödeme Yöntemi:** Tümü | Nakit | Kart | Online | Ücretsiz
- **Durum:** Tümü | Aktif | İade Edildi
- **Uzman:** Tüm Uzmanlar | [Seçim]
- **Arama:** Müşteri adı/telefon

#### Liste Görünümü — Tablo

```
┌────────┬──────────────────┬────────────┬──────────┬──────────┬────────┬────────┐
│ Tarih  │ Müşteri          │ Hizmet     │ Tutar    │ Yöntem   │ Uzman  │ Durum  │
├────────┼──────────────────┼────────────┼──────────┼──────────┼────────┼────────┤
│ 19.03  │ AYŞE YILMAZ      │ K. Masaj   │ ₺500.00  │ 💵 Nakit │ Fatma  │ ✅     │
│ 19.03  │ AYŞE YILMAZ      │ Kese-Köpük │ ₺300.00  │ 💳 Kart  │ Fatma  │ ✅     │
│ 18.03  │ MEHMET DEMIR      │ Hot Stone  │ ₺800.00  │ 💵 Nakit │ Ali    │ ↩ İade │
│ 18.03  │ FATMA KAYA        │ Aromaterapi│ ₺200.00  │ 🎁 Ücrz │ Zeynep │ ✅     │
└────────┴──────────────────┴────────────┴──────────┴──────────┴────────┴────────┘
```

#### Özet Kartları (Üst Bar)

```
┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ 💰 Toplam      │ │ 💵 Nakit       │ │ 💳 Kart        │ │ 🌐 Online      │
│    ₺12,500     │ │    ₺5,200      │ │    ₺6,100      │ │    ₺1,200      │
│    32 ödeme    │ │    15 ödeme    │ │    12 ödeme    │ │    5 ödeme     │
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘
```

#### Excel Export
- "📥 Excel'e Aktar" butonu
- Seçili filtreler dahilindeki tüm ödemeleri XLSX olarak indirir
- Kolonlar: Tarih, Müşteri, Hizmet, Tutar, Ödeme Yöntemi, Uzman, Durum, Not

---

### TAB 3: Ödeme Ayarları

#### Ödeme Yöntemleri
```
┌──────────────────────────────────────────────────────┐
│ Aktif Ödeme Yöntemleri                               │
│                                                      │
│ ☑ 💵 Nakit                                           │
│ ☑ 💳 Kredi/Banka Kartı                               │
│ ☑ 🌐 Online (Havale/EFT)                             │
│ ☑ 🎁 Ücretsiz (İkram/Kampanya)                       │
│                                                      │
│ Varsayılan yöntem: [Nakit ▾]                         │
└──────────────────────────────────────────────────────┘
```

#### Genel Ayarlar
```
┌──────────────────────────────────────────────────────┐
│ Ödeme Ayarları                                       │
│                                                      │
│ ☑ Ödeme alındığında otomatik muhasebe kaydı oluştur  │
│ ☐ Sadece tam ödeme kabul et (parçalı ödemeyi kapat)  │
│                                                      │
│ KDV Ayarları:                                        │
│ ☐ KDV hesapla                                        │
│   KDV Oranı: [%18]                                   │
└──────────────────────────────────────────────────────┘
```

---

## HİZMET BAZLI ÖDEME TAKİBİ — Detaylı Tasarım

Çoklu hizmet randevularında her hizmetin ödeme durumu ayrı takip edilir.

### Nasıl Çalışır?

1. **Seçimli Ödeme:** Sol panelde hizmetler checkbox ile seçilir
2. **Otomatik Tutar:** Seçilen hizmetlerin fiyatı sağ panele yansır
3. **Kısmi Hizmet Ödemesi:** Bir hizmetin fiyatından az tutar da girilebilir
4. **Takip:** `appointment_payments.service_id` ile hangi hizmet için ödeme yapıldığı kaydedilir

### Örnek: 3 Hizmetli Randevu

```
Başlangıç:
☐ Klasik Masaj    ₺500  [Ödenmedi]
☐ Kese-Köpük      ₺300  [Ödenmedi]
☐ Aromaterapi     ₺200  [Ödenmedi]

Müşteri "Masaj parasını vereyim" der:
☑ Klasik Masaj    ₺500  [Seçili]     ← Checkbox işaretlendi
☐ Kese-Köpük      ₺300  [Ödenmedi]
☐ Aromaterapi     ₺200  [Ödenmedi]
Sağ panel tutar: ₺500

Ödeme sonrası:
✅ Klasik Masaj    ₺500  [Ödendi ✓]   ← Yeşil, strikethrough, disable
☐ Kese-Köpük      ₺300  [Ödenmedi]
☐ Aromaterapi     ₺200  [Ödenmedi]

Müşteri "Kalan kısmından 100 lira vereyim" der:
☑ Kese-Köpük      ₺300  [Seçili]
☐ Aromaterapi     ₺200  [Ödenmedi]
Tutar: ₺100 (manuel girilir, ₺300'den az)

Ödeme sonrası:
✅ Klasik Masaj    ₺500  [Ödendi ✓]
⚡ Kese-Köpük      ₺300  [₺100/₺300 Kısmi]  ← Turuncu badge
☐ Aromaterapi     ₺200  [Ödenmedi]
```

### "Toplam Üzerinden Ödeme" Modu (Alternatif)

Hizmet seçmeden doğrudan tutar girişi de mümkün:
- Sol panelde hiçbir checkbox işaretlenmezse → tutar serbestçe girilir
- Ödeme `service_id = NULL` ile kaydedilir (genel ödeme)
- Bu mod daha hızlı ama hizmet bazlı takip yapılamaz

---

## SERVİS KATMANI

### Dosya: `src/services/paymentService.js`

```javascript
// === ÖDEME İŞLEMLERİ ===

// Bekleyen ödemeleri getir (randevular + hizmetler + müşteri + önceki ödemeler)
getUnpaidAppointments(companyId, filters)
// filters: { date, dateRange, expertId, status, search }
// Returns: appointments[] with nested services[], payments[], customer

// Randevu ödeme detayını getir (modal için)
getAppointmentPaymentDetail(appointmentId)
// Returns: { appointment, services[], payments[], customer, totalAmount, paidAmount, remainingAmount }

// Ödeme kaydet
collectPayment(companyId, { appointmentId, amount, paymentMethod, serviceId?, note?, collectedBy? })
// 1. appointment_payments INSERT
// 2. (trigger handles status update)
// 3. auto_create_transaction → transactions INSERT
// 4. Returns: { payment, updatedAppointment }

// Ödeme iade et
refundPayment(paymentId, { reason? })
// 1. appointment_payments UPDATE (is_refunded, refunded_at, refund_reason)
// 2. (trigger handles status update)
// 3. İlgili transaction güncelle veya eksi transaction oluştur

// Toplu iade
refundAllPayments(appointmentId, { reason? })

// === ÖDEME GEÇMİŞİ ===

// Ödeme geçmişi getir (filtrelenebilir)
getPaymentHistory(companyId, filters)
// filters: { dateRange, paymentMethod, status, expertId, search }

// Ödeme özeti (summary cards)
getPaymentSummary(companyId, dateRange)
// Returns: { totalAmount, byCash, byCard, byOnline, byFree, totalCount, refundedCount }

// Excel export için veri
getPaymentExportData(companyId, filters)

// === ÖDEME AYARLARI ===

// Şirket ödeme ayarlarını getir (yoksa default oluştur)
getPaymentSettings(companyId)

// Ödeme ayarlarını güncelle
updatePaymentSettings(companyId, settings)

// === MUHASEBE ENTEGRASYONU ===

// Ödeme → Transaction otomatik oluşturma
createTransactionFromPayment(companyId, payment, appointment)
// payment_method mapping: cash→cash, card→card, online→transfer, free→other
// category: otomatik "Randevu Geliri" kategorisi

// Kasa güncellemesi (nakit ödemelerde)
updateCashRegister(companyId, amount, type)
```

---

## NAVİGASYON ENTEGRASYONU

### DashboardLayout.jsx — Sidebar
Randevular'dan sonra, Muhasebe'den önce:

```javascript
{ icon: Wallet, label: 'payments', path: '/dashboard/payments' }
```

**İkon:** `Wallet` (lucide-react) — Ödeme/tahsilat hissi veren bir ikon
**Sıralama:**
```
📅 Randevular
💳 Ödeme Al        ← YENİ
📋 Hizmetler
👥 Personel
👤 Müşteriler
⏰ Çalışma Saatleri
🏢 Kaynak Yönetimi
🧮 Muhasebe
...
```

### App.jsx — Route
```javascript
<Route path="payments" element={<PaymentsPage />} />
```

---

## RANDEVU SAYFASI ENTEGRASYONU

### AppointmentsPage.jsx Değişiklikleri

1. **Ödeme durumu göstergesi:** Her randevu kartında/hücrede küçük bir badge
   - 🔴 Ödenmedi | 🟠 Kısmi | 🟢 Ödendi | ⚪ Ücretsiz

2. **Hızlı ödeme butonu:** Randevu detay popover'ında "💳 Ödeme Al" butonu
   - Tıklandığında PaymentCollectionModal açılır (PaymentsPage'e gitmeden)

3. **Randevu oluşturulduğunda:** `total_amount` otomatik hesaplanır (hizmet fiyatlarından)

### CreateAppointmentModal.jsx Değişiklikleri

1. Randevu kaydedilirken `total_amount` hesaplanıp yazılır
2. Opsiyonel: "Hemen ödeme al" checkbox — randevu oluşturulur oluşturulmaz PaymentCollectionModal açılır

---

## DASHBOARD ENTEGRASYONU

### DashboardHome.jsx — Yeni Widget

**"Bugünün Ödemeleri" Kartı:**
```
┌────────────────────────────────────────┐
│ 💰 Bugünün Ödemeleri                   │
│                                        │
│ Toplam Tahsilat:     ₺3,200           │
│ ├── 💵 Nakit:        ₺1,500           │
│ ├── 💳 Kart:         ₺1,200           │
│ ├── 🌐 Online:         ₺500           │
│ └── 🎁 Ücretsiz:         ₺0           │
│                                        │
│ Bekleyen:            ₺2,800 (4 adet)  │
│                                        │
│ [Ödeme Al Sayfasına Git →]             │
└────────────────────────────────────────┘
```

---

## HIZLI ÖDEME — Randevular Sayfasından Doğrudan Erişim

Ödeme Al sayfasına gitmeden, randevular sayfasından da ödeme alınabilmeli:

1. Takvim grid'de randevuya tıkla → detay popover açılır
2. Popover'da ödeme durumu + "💳 Ödeme Al" butonu görünür
3. Buton tıklandığında PaymentCollectionModal açılır (standalone component)
4. Ödeme alınır → popover güncellenir

Bu sayede kasiyer randevular sayfasını hiç terk etmeden ödeme alabilir.

---

## i18n ÇEVİRİLERİ

### Yeni Anahtarlar (~50 key × 3 dil)

```javascript
// Genel
payments: { tr: 'Ödeme Al', en: 'Collect Payment', ru: 'Прием оплаты' },
paymentHistory: { tr: 'Ödeme Geçmişi', en: 'Payment History', ru: 'История платежей' },
paymentSettings: { tr: 'Ödeme Ayarları', en: 'Payment Settings', ru: 'Настройки оплаты' },
pendingPayments: { tr: 'Bekleyen Ödemeler', en: 'Pending Payments', ru: 'Ожидающие оплаты' },

// Ödeme yöntemleri
cash: { tr: 'Nakit', en: 'Cash', ru: 'Наличные' },
card: { tr: 'Kredi Kartı', en: 'Credit Card', ru: 'Банковская карта' },
online: { tr: 'Online', en: 'Online', ru: 'Онлайн' },
freePayment: { tr: 'Ücretsiz', en: 'Free', ru: 'Бесплатно' },

// Durumlar
unpaid: { tr: 'Ödenmedi', en: 'Unpaid', ru: 'Не оплачено' },
partiallyPaid: { tr: 'Kısmi Ödendi', en: 'Partially Paid', ru: 'Частично оплачено' },
fullyPaid: { tr: 'Ödendi', en: 'Paid', ru: 'Оплачено' },
refunded: { tr: 'İade Edildi', en: 'Refunded', ru: 'Возвращено' },

// Modal
collectPayment: { tr: 'Ödeme Al', en: 'Collect Payment', ru: 'Принять оплату' },
totalAmount: { tr: 'Toplam Tutar', en: 'Total Amount', ru: 'Общая сумма' },
paidAmount: { tr: 'Ödenen Tutar', en: 'Paid Amount', ru: 'Оплаченная сумма' },
remainingAmount: { tr: 'Kalan Tutar', en: 'Remaining Amount', ru: 'Остаток' },
thisPayment: { tr: 'Bu İşlem', en: 'This Payment', ru: 'Текущий платеж' },
afterPayment: { tr: 'İşlem Sonrası', en: 'After Payment', ru: 'После оплаты' },
payAll: { tr: 'Tamamı', en: 'Pay All', ru: 'Всё' },
quickAmounts: { tr: 'Hızlı Tutar', en: 'Quick Amounts', ru: 'Быстрая сумма' },
savePayment: { tr: 'Ödemeyi Kaydet', en: 'Save Payment', ru: 'Сохранить оплату' },
paymentNote: { tr: 'Not (opsiyonel)', en: 'Note (optional)', ru: 'Заметка (необяз.)' },

// İade
refund: { tr: 'İade Et', en: 'Refund', ru: 'Возврат' },
refundAll: { tr: 'Tüm Ödemeleri İptal Et', en: 'Refund All Payments', ru: 'Вернуть все платежи' },
refundConfirm: { tr: 'Bu ödemeyi iade etmek istediğinize emin misiniz?', en: 'Are you sure you want to refund this payment?', ru: 'Вы уверены, что хотите вернуть этот платеж?' },
refundReason: { tr: 'İade Nedeni', en: 'Refund Reason', ru: 'Причина возврата' },

// Geçmiş
previousPayments: { tr: 'Önceki Ödemeler', en: 'Previous Payments', ru: 'Предыдущие платежи' },
paymentCompleted: { tr: 'Ödeme tamamlandı!', en: 'Payment completed!', ru: 'Оплата завершена!' },
paymentRecorded: { tr: 'Ödeme kaydedildi', en: 'Payment recorded', ru: 'Платеж записан' },
noUnpaidAppointments: { tr: 'Bekleyen ödeme bulunmuyor', en: 'No pending payments', ru: 'Нет ожидающих платежей' },

// Ayarlar
enabledPaymentMethods: { tr: 'Aktif Ödeme Yöntemleri', en: 'Enabled Payment Methods', ru: 'Активные способы оплаты' },
defaultPaymentMethod: { tr: 'Varsayılan Yöntem', en: 'Default Method', ru: 'Способ по умолчанию' },
autoCreateTransaction: { tr: 'Otomatik muhasebe kaydı oluştur', en: 'Auto-create accounting record', ru: 'Автосоздание бух. записи' },
requireFullPayment: { tr: 'Sadece tam ödeme kabul et', en: 'Require full payment only', ru: 'Только полная оплата' },
vatEnabled: { tr: 'KDV hesapla', en: 'Calculate VAT', ru: 'Рассчитывать НДС' },
vatRate: { tr: 'KDV Oranı', en: 'VAT Rate', ru: 'Ставка НДС' },

// Dashboard widget
todaysPayments: { tr: 'Bugünün Ödemeleri', en: "Today's Payments", ru: 'Платежи сегодня' },
totalCollected: { tr: 'Toplam Tahsilat', en: 'Total Collected', ru: 'Всего собрано' },
pendingPaymentCount: { tr: 'Bekleyen', en: 'Pending', ru: 'Ожидается' },

// Export
exportPayments: { tr: 'Excel\'e Aktar', en: 'Export to Excel', ru: 'Экспорт в Excel' },

// Hizmet bazlı
servicePayment: { tr: 'Hizmet Bazlı Ödeme', en: 'Per-Service Payment', ru: 'Оплата по услугам' },
selectedServices: { tr: 'Seçili Hizmetler', en: 'Selected Services', ru: 'Выбранные услуги' },
paymentSummary: { tr: 'Ödeme Özeti', en: 'Payment Summary', ru: 'Итог оплаты' },
```

---

## DOKUNULACAK DOSYALAR

| Dosya | İşlem | Açıklama |
|-------|-------|----------|
| `database/migrations/010_payment_system.sql` | **YENİ** | Tablolar, triggerlar, alterler |
| `src/services/paymentService.js` | **YENİ** | Ödeme service katmanı |
| `src/pages/dashboard/PaymentsPage.jsx` | **YENİ** | Ana ödeme sayfası (3 tab) |
| `src/components/PaymentCollectionModal.jsx` | **YENİ** | Ödeme alma modal (standalone) |
| `src/App.jsx` | **GÜNCELLE** | Route ekle |
| `src/layouts/DashboardLayout.jsx` | **GÜNCELLE** | Sidebar menü item ekle |
| `src/pages/dashboard/AppointmentsPage.jsx` | **GÜNCELLE** | Ödeme badge + hızlı ödeme butonu |
| `src/components/CreateAppointmentModal.jsx` | **GÜNCELLE** | total_amount hesaplama |
| `src/pages/dashboard/DashboardHome.jsx` | **GÜNCELLE** | Bugünün ödemeleri widget |
| `src/lib/translations.js` | **GÜNCELLE** | ~50 key × 3 dil |

---

## UYGULAMA FAZLARI

### FAZ A: Veritabanı Temeli (0.5 gün)
- [ ] `010_payment_system.sql` migration dosyası oluştur
- [ ] Supabase'de çalıştır
- [ ] Mevcut randevulara `total_amount` hesapla (one-time script)

### FAZ B: Servis Katmanı + PaymentCollectionModal (1-2 gün)
- [ ] `paymentService.js` — tüm fonksiyonlar
- [ ] `PaymentCollectionModal.jsx` — 2 panelli modal
- [ ] Parçalı ödeme akışı
- [ ] İade akışı
- [ ] Muhasebe entegrasyonu (auto transaction)

### FAZ C: PaymentsPage + Navigasyon (1-2 gün)
- [ ] `PaymentsPage.jsx` — 3 tab (bekleyen, geçmiş, ayarlar)
- [ ] Sidebar menü item
- [ ] Route ekleme
- [ ] Filtreleme + arama
- [ ] Excel export

### FAZ D: Entegrasyonlar (1 gün)
- [ ] AppointmentsPage — ödeme badge + hızlı ödeme butonu
- [ ] CreateAppointmentModal — total_amount hesaplama
- [ ] DashboardHome — bugünün ödemeleri widget
- [ ] i18n çevirileri (TR, EN, RU)

### FAZ E: Polish & Test (0.5 gün)
- [ ] Responsive tasarım (mobil)
- [ ] Edge case'ler (0 tutarlı randevu, iptal edilmiş randevu)
- [ ] Konfeti animasyonu (ödeme tamamlandığında)
- [ ] Loading states, error handling

---

## TEST SENARYOLARI

| # | Senaryo | Beklenen |
|---|---------|----------|
| P01 | Tek hizmet, tam ödeme nakit | payment_status='paid', transaction oluşur |
| P02 | Tek hizmet, parçalı ödeme (₺100 nakit + kalan kart) | 2 payment kaydı, partial→paid |
| P03 | 3 hizmet, hizmet bazlı ödeme | Her payment'a service_id atanır |
| P04 | Ücretsiz ödeme | amount=kalan, method='free', no transaction |
| P05 | Ödeme geri alma | is_refunded=true, paid_amount düşer |
| P06 | Toplu geri alma | Tüm ödemeler refunded, payment_status='unpaid' |
| P07 | Kalan tutardan fazla ödeme girişimi | Validasyon hatası |
| P08 | İptal edilmiş randevu ödeme | Listede görünmez |
| P09 | Parçalı ödeme sonrası modal kapanıp açılma | Doğru kalan tutar |
| P10 | Excel export | Tüm filtreler uygulanmış veri |
| P11 | Ödeme ayarları: tam ödeme zorunlu | Parçalı ödeme engellenir |
| P12 | Muhasebe entegrasyonu | transaction + daily_cash_register güncellenir |
| P13 | Hızlı ödeme (AppointmentsPage'den) | Modal açılır, ödeme alınır |
| P14 | Randevu oluşturma sonrası total_amount | Hizmet fiyatlarından hesaplanır |
| P15 | KDV hesaplama açık | Tutar + KDV ayrı gösterilir |

---

## GERİYE DÖNÜK UYUMLULUK

1. **`payment_status` default 'unpaid'** → Mevcut randevular otomatik "ödenmedi" olur
2. **`total_amount` default 0** → Mevcut randevulara one-time script ile hesaplanır
3. **`paid_amount` default 0** → Mevcut randevular 0 ödenen olarak görünür
4. **Ödeme sistemi opsiyonel** → Kullanmayan firmalar mevcut gibi devam eder
5. **Muhasebe entegrasyonu opsiyonel** → `auto_create_transaction` toggle ile açılıp kapatılabilir
6. **Mevcut transactions tablosu korunur** → Sadece otomatik kayıt eklenir, mevcut veriye dokunulmaz

---

## MOBİL RESPONSIVE TASARIM

### PaymentsPage (Mobil)
- Kart listesi tek sütun
- Filtreler collapsible (aşağı açılır panel)
- Tablo → kart görünümüne dönüşür

### PaymentCollectionModal (Mobil)
- 2 panel → tek panel (alt alta)
- Sol panel üstte (hizmet listesi)
- Sağ panel altta (ödeme işlemi)
- Ödeme yöntemi butonları 2×2 grid korunur
- Hızlı tutar butonları yatay scroll

---

## GÜVENLİK

1. **RLS:** Tüm tablolarda `company_id` bazlı izolasyon
2. **Validasyon:** Tutar > 0, tutar <= kalan, geçerli payment_method
3. **Audit Trail:** Her ödeme kaydında `collected_by` (kim tahsil etti), `created_at` (ne zaman)
4. **İade Takibi:** `is_refunded`, `refunded_at`, `refund_reason` — geri alma kaydı tutulur
5. **Transaction Bütünlüğü:** Ödeme + transaction oluşturma atomik (hata olursa ikisi de geri alınır)
