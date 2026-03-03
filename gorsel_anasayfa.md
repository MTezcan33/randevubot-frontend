# RandevuBot Ana Sayfa Gorsel Tasarim Dokumani

## Tema: Huzur, Sakinlik, Dinginlik

Spa ve guzellik merkezlerinin atmosferini yansitan, sakin ve profesyonel bir tasarim.
Robot gorseli KALDIRILDI — sadece tipografi, gradient ve bosluk ile etki yaratilir.

---

## Renk Paleti

| Kullanim | Renk Kodu | Tailwind | Aciklama |
|----------|-----------|----------|----------|
| Ana gradient | #065f46 → #0f766e | `from-emerald-800 to-teal-700` | Butonlar, vurgular, logo |
| Hover gradient | #064e3b → #115e59 | `from-emerald-900 to-teal-800` | Hover durumlari |
| Arka plan | #FAF8F5 | `stone-50` benzeri | Sicak bej/krem |
| Kart arka plan | #fafaf9 → #ecfdf5 | `from-stone-50 to-emerald-50/30` | Kartlar, bolum arka planlari |
| Metin ana | #1c1917 | `stone-900` | Basliklar |
| Metin ikincil | #57534e | `stone-600` | Aciklamalar, paragraflar |
| Vurgu (ince) | #047857 | `emerald-700` | Linkler, gradient text |
| Border | #e7e5e4 | `stone-200` | Kart kenarliklari |
| Footer | #1c1917 | `stone-900` | Koyu ama sicak |

---

## Tipografi

| Element | Boyut | Agirlik | Ek |
|---------|-------|---------|-----|
| Hero baslik | `text-5xl md:text-7xl` | `font-light` | `tracking-tight leading-tight` |
| Bolum basliklari | `text-3xl md:text-4xl` | `font-semibold` | — |
| Kart basliklari | `text-xl` | `font-semibold` | — |
| Govde metni | `text-lg` | normal | `text-stone-600 leading-relaxed` |
| Alt baslik | `text-xl md:text-2xl` | `font-light` | `text-stone-500` |

---

## Bolum Yapisi

### 1. Navigasyon
- Fixed, transparan → scroll'da beyaz backdrop-blur
- Logo: Leaf ikonu + "RandevuBot" gradient text (emerald)
- Border: `border-stone-200`

### 2. Hero (GORSEL YOK)
- `min-h-[90vh]` tam ekran, centered layout
- Cok katmanli gradient arka plan (bej → sage)
- Dekoratif: 2 adet CSS radial-gradient blob (absolute, opacity-10/20)
- Ortada: ince baslik + alt baslik + CTA butonu
- Altta: trust badge'lar yatay

### 3. Sorun-Cozum
- 3 kart: `from-stone-50 to-emerald-50/30` arka plan
- Border: `border-stone-200`
- Cozum metni: `text-emerald-700`

### 4. Ozellikler
- 6 kart: beyaz arka plan, `border-stone-200`
- Ikon kutulari: `from-emerald-800 to-teal-700` gradient
- Hover: `hover:shadow-lg hover:border-emerald-200`

### 5. Demo (WhatsApp Mockup)
- KORUNUR — yesil tonlari zaten uyumlu
- Yan aciklama CTA: emerald gradient

### 6. Fiyatlandirma
- Popular badge: `bg-emerald-700`
- Popular ring: `ring-emerald-600`
- Trial badge: `bg-emerald-50 text-emerald-700`

### 7. Musteri Yorumlari
- Kartlar: `from-stone-50 to-emerald-50/30`
- Yildizlar: `amber-400` (KORUNUR)
- Isletme adi: `text-emerald-700`

### 8. SSS (FAQ)
- Kartlar: beyaz, `border-stone-200`
- Chevron: `text-emerald-600`
- Hover: `hover:bg-stone-50`

### 9. Son CTA
- Gradient banner: `from-emerald-800 to-teal-700`
- Buton: beyaz uzerine `text-emerald-700`
- Alt metin: `text-emerald-100`

### 10. Footer
- `bg-stone-900`
- Alt metin: `text-stone-400`

---

## Animasyon Kurallari

| Element | Hiz | Not |
|---------|-----|-----|
| Hero giris | `duration: 1.0` | Yavas, zarif |
| Bolum giris | `duration: 0.8` | Sakin gecis |
| Kart giris | `delay: index * 0.1` | Sirali |
| Hover | `duration-300` | KORUNUR |
| Demo mesajlar | `1500ms` | KORUNUR |

---

## Genel Tasarim Prensipleri

- **Fazla bosluk:** Her bolumde generous padding (`py-24`)
- **Yumusak koseler:** `rounded-2xl`, `rounded-3xl`
- **Minimal golge:** `shadow-sm` veya golge yok
- **Border yerine renk farki:** Soft arka plan gecisleri
- **Organik his:** CSS blob'lar ile dekoratif elementler
- **Gorsel yerine tipografi:** Hero'da gorsel yok, metin gucu
