# RandevuBot Ek Gorsel Konsept — Tum Uygulama Tema Rehberi

## Tema: Huzur, Sakinlik, Dinginlik (Serenity)

LandingPage'de uygulanan emerald/teal/stone temasinin tum uygulamaya yayilmasi.
Tutarli, profesyonel ve sakin bir kullanici deneyimi.

---

## Renk Donusum Tablosu

### Ana Renkler

| Eski | Yeni | Kullanim |
|------|------|----------|
| `#E91E8C` (pembe) | `emerald-700` (#047857) | Butonlar, aktif durumlar, badge |
| `#C91A7A` (koyu pembe) | `emerald-800` (#065f46) | Hover durumlari |
| `#9333EA` (mor) | `teal-700` (#0f766e) | Ikincil vurgu, PDF buton |
| `#7C28C5` (koyu mor) | `teal-800` (#115e59) | Hover durumlari |

### Gradient Donusumleri

| Eski Gradient | Yeni Gradient | Kullanim |
|---------------|---------------|----------|
| `from-pink-500 to-purple-600` | `from-emerald-800 to-teal-700` | Ana butonlar, header |
| `from-pink-600 to-purple-700` | `from-emerald-900 to-teal-800` | Hover, CTA |
| `from-blue-500 to-purple-600` | `from-emerald-800 to-teal-700` | Auth/onboarding ikonlar |
| `from-blue-50 via-white to-purple-50` | `from-white via-emerald-50/20 to-stone-100/30` | Auth sayfa arka plan |
| `from-slate-50 via-blue-50 to-indigo-100` | `from-stone-50 via-emerald-50/20 to-stone-100/30` | Onboarding arka plan |
| `from-[#1A1A2E] to-[#2D1B69]` | `from-stone-900 to-emerald-950` | Sidebar |

### Nötr Renkler

| Eski | Yeni | Kullanim |
|------|------|----------|
| `gray-50` | `stone-50` | Arka planlar |
| `gray-100` | `stone-100` | Kart kenarliklari |
| `gray-500` | `stone-500` | Ikincil metin |
| `gray-800` | `stone-800` | Ana metin |
| `gray-900` | `stone-900` | Footer |

### Accent Donusumleri

| Eski | Yeni | Kullanim |
|------|------|----------|
| `bg-pink-50` | `bg-emerald-50` | Badge, info arka plan |
| `bg-pink-100` | `bg-emerald-100` | Stat kart ikon bg |
| `bg-purple-50` | `bg-emerald-50` | Ozet kart bg |
| `bg-purple-100` | `bg-teal-100` | Stat kart (musteri) |
| `text-pink-*` | `text-emerald-700` | Vurgu metni |
| `text-purple-600` | `text-emerald-700` veya `text-teal-700` | Ikincil vurgu |
| `border-pink-*` | `border-emerald-200` | Kart kenarliklari |
| `ring-pink-*`, `ring-blue-*` | `ring-emerald-500` | Input focus |
| `focus:ring-blue-500` | `focus:ring-emerald-500` | Form elemanlari |
| `text-blue-600` | `text-emerald-700` | Link rengi |

---

## CSS Degiskenleri (index.css)

| Degisken | Eski HSL | Yeni HSL | Renk |
|----------|----------|----------|------|
| `--primary` | `221.2 83.2% 53.3%` (mavi) | `160 84% 39%` (emerald-600) | #059669 |
| `--ring` | `221.2 83.2% 53.3%` | `160 84% 39%` | #059669 |

---

## Sidebar Tasarimi

- Gradient: `from-stone-900 to-emerald-950` (koyu, zarif)
- Logo kutusu: `from-emerald-800 to-teal-700` gradient
- Logo ikon: `Leaf` (lucide-react)
- Aktif menü: `border-emerald-500` (sol kenar)
- Bildirim badge: `bg-emerald-700`

---

## Korunacak Renkler (DEGISMEYECEK)

Bu renkler semantik anlam tasidigi icin degistirilMEZ:

| Renk | Anlam | Kullanim |
|------|-------|----------|
| `emerald-100/700` | Onaylandi | Randevu status badge |
| `amber-100/700` | Beklemede | Randevu status badge |
| `red-100/700` | Iptal | Randevu status badge |
| `green-500/600` | WhatsApp | Marka rengi |
| `amber-400` | Yildiz puani | Musteri degerlendirme |
| `green-600` | Gelir | Muhasebe |
| `red-600` | Gider | Muhasebe |
| Expert COLOR_PRESETS | Veri rengi | Kullanici secimi |
| SERVICE_CATALOG renkleri | Veri rengi | Kategori ayirt etme |

---

## Etkilenen Dosyalar (18 dosya)

### Global
- `src/index.css`

### Layout
- `src/layouts/DashboardLayout.jsx`

### Public Sayfalar
- `src/pages/LoginPage.jsx`
- `src/pages/RegisterPage.jsx`
- `src/pages/ResetPasswordPage.jsx`
- `src/pages/UpdatePasswordPage.jsx`
- `src/pages/LegalPage.jsx`
- `src/pages/OnboardingPage.jsx`

### Dashboard Sayfalari
- `src/pages/dashboard/DashboardHome.jsx`
- `src/pages/dashboard/AppointmentsPage.jsx`
- `src/pages/dashboard/CustomersPage.jsx`
- `src/pages/dashboard/ServicesPage.jsx`
- `src/pages/dashboard/StaffPage.jsx`
- `src/pages/dashboard/WorkingHoursPage.jsx`
- `src/pages/dashboard/AccountingPage.jsx`
- `src/pages/dashboard/BillingPage.jsx`
- `src/pages/dashboard/SettingsPage.jsx`

### Componentler
- `src/components/CreateAppointmentModal.jsx`
- `src/components/ProtectedRoute.jsx`
- `src/components/OnboardingRoute.jsx`
