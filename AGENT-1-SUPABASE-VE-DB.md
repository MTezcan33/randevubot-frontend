# Agent 1: Supabase Düzeltme + Veritabanı Migrations
# Öncelik: 🔴 KRİTİK — Diğer agentler seni bekliyor
# Proje: randevubot (C:\Users\Mehmet\randevubot)
# Projenin CLAUDE.md dosyasını oku, oradaki kurallara uy.

---

## Görev 1: Supabase Client Düzeltmesi

### Sorun
`src/lib/supabase.js` → hardcoded URL var, env var kullanmıyor.
`src/lib/customSupabaseClient.js` → redundant kopya, silinmeli.

### Adımlar
1. `src/lib/supabase.js` aç, hardcoded URL/key'i değiştir:
```js
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```
2. `src/lib/customSupabaseClient.js` SİL
3. Projede `customSupabaseClient` import eden TÜM dosyaları bul → `../lib/supabase` olarak güncelle
4. `.env` dosyasında VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlı olduğunu doğrula
5. `npm run build` ile hata olmadığını test et

---

## Görev 2: Ön Muhasebe Tabloları

Supabase SQL Editor'da çalıştırılacak migration:

```sql
-- 1. Gelir/gider kategorileri
CREATE TABLE transaction_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT,
  color TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON transaction_categories FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- 2. Gelir/gider kayıtları
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id UUID REFERENCES transaction_categories(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'transfer', 'other')),
  description TEXT,
  appointment_id UUID REFERENCES appointments(id),
  receipt_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_day INTEGER,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON transactions FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- 3. Günlük kasa
CREATE TABLE daily_cash_register (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_balance DECIMAL(10,2) DEFAULT 0,
  closing_balance DECIMAL(10,2),
  total_cash DECIMAL(10,2) DEFAULT 0,
  total_card DECIMAL(10,2) DEFAULT 0,
  total_transfer DECIMAL(10,2) DEFAULT 0,
  total_expense DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes TEXT,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, date)
);
ALTER TABLE daily_cash_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON daily_cash_register FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- 4. Aylık raporlar
CREATE TABLE monthly_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_income DECIMAL(10,2) DEFAULT 0,
  total_expense DECIMAL(10,2) DEFAULT 0,
  net_profit DECIMAL(10,2) DEFAULT 0,
  report_data JSONB,
  pdf_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, month, year)
);
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON monthly_reports FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- 5. Index'ler
CREATE INDEX idx_transactions_company ON transactions(company_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_type ON transactions(company_id, type);
CREATE INDEX idx_cash_register_date ON daily_cash_register(company_id, date);
CREATE INDEX idx_monthly_company ON monthly_reports(company_id, year, month);
```

---

## Görev 3: Bildirim Sistemi Tabloları

```sql
-- 1. Admin bildirimleri
CREATE TABLE admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'new_appointment', 'cancelled_appointment', 'customer_complaint',
    'whatsapp_disconnected', 'daily_summary', 'payment_received',
    'trial_expiring'
  )),
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  related_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON admin_notifications FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE INDEX idx_admin_notif_company ON admin_notifications(company_id, is_read);

-- 2. Mesaj şablonları
CREATE TABLE notification_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'appointment_confirmation', 'reminder_24h', 'reminder_1h',
    'cancellation', 'feedback_request', 'complaint_received'
  )),
  language TEXT DEFAULT 'tr',
  template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON notification_templates FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));

-- 3. Müşteri geri bildirim
CREATE TABLE customer_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  appointment_id UUID REFERENCES appointments(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved')),
  admin_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON customer_feedback FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE INDEX idx_feedback_company ON customer_feedback(company_id, status);
```

---

## Görev 4: Fiyatlandırma Güncelle

`stripe_prices` tablosunu ve BillingPage.jsx'i güncelle:

| Plan | Fiyat | Uzman |
|------|-------|-------|
| Starter | $29/ay | 1 |
| Salon | $49/ay | 3 |
| Premium | $79/ay | 6 |

Tüm planlarda: Randevu + WhatsApp + Hatırlatma + Ön Muhasebe
14 gün ücretsiz trial (Salon planı)
3+ şube kuponu: %15, 5+ şube kuponu: %20

---

## Doğrulama Checklist
- [ ] `grep -r "customSupabaseClient" src/` → 0 sonuç
- [ ] `npm run build` hatasız
- [ ] Supabase'de yeni tablolar oluşmuş
- [ ] RLS tüm yeni tablolarda aktif
- [ ] RANDEVUBOT_FULL_CONTEXT.sql dosyası güncellendi
