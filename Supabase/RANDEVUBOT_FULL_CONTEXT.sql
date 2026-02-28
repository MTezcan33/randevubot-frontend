-- =====================================================
-- RandevuBot - GERÇEK Supabase Veritabanı Tam Yedeği
-- Dosya: RANDEVUBOT_FULL_CONTEXT.sql
-- Tarih: 2026-02-27
-- Kaynak: Supabase production verilerinden export edilmiştir
-- KULLANIM: Claude Code'a context olarak verilecek
-- =====================================================


-- =============================================================================
-- BÖLÜM 1: EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
-- NOT: http extension ve pg_net de kullanılıyor (Supabase Dashboard > Extensions)


-- =============================================================================
-- BÖLÜM 2: TABLOLAR (Bağımlılık sırasına göre)
-- =============================================================================

-- 1. Sektörler (Bağımsız)
CREATE TABLE IF NOT EXISTS public.sectors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code character NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sectors_pkey PRIMARY KEY (id)
);

-- 2. Alt Sektörler
CREATE TABLE IF NOT EXISTS public.sub_sectors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sector_id uuid NOT NULL,
  name text NOT NULL,
  code character NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sub_sectors_pkey PRIMARY KEY (id),
  CONSTRAINT sub_sectors_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectors(id),
  CONSTRAINT sub_sectors_sector_id_name_key UNIQUE (sector_id, name),
  CONSTRAINT sub_sectors_sector_id_code_key UNIQUE (sector_id, code)
);

-- 3. Stripe Fiyat Planları (Bağımsız)
CREATE TABLE IF NOT EXISTS public.stripe_prices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plan_name text NOT NULL UNIQUE,
  stripe_price_id text NOT NULL,
  price_amount numeric NOT NULL,
  currency text DEFAULT 'usd'::text,
  expert_limit integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stripe_prices_pkey PRIMARY KEY (id)
);

-- 4. Kuponlar (Bağımsız)
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  discount_percentage numeric NOT NULL,
  expiry_date date,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  plan_override text CHECK (plan_override IS NULL OR (plan_override = ANY (ARRAY['Standard'::text, 'Standard Plus'::text, 'Pro'::text, 'Pro Plus'::text, 'Free'::text]))),
  CONSTRAINT coupons_pkey PRIMARY KEY (id)
);

-- 5. Zaman Dilimi Eşleme (Bağımsız)
CREATE TABLE IF NOT EXISTS public.timezones_mapping (
  friendly_name text NOT NULL,
  utc text[],
  CONSTRAINT timezones_mapping_pkey PRIMARY KEY (friendly_name)
);

-- 6. n8n Chat Geçmişi (Bağımsız)
CREATE SEQUENCE IF NOT EXISTS public.n8n_chat_histories_id_seq;
CREATE TABLE IF NOT EXISTS public.n8n_chat_histories (
  id integer NOT NULL DEFAULT nextval('n8n_chat_histories_id_seq'::regclass),
  session_id character varying NOT NULL,
  message jsonb NOT NULL,
  CONSTRAINT n8n_chat_histories_pkey PRIMARY KEY (id)
);

-- 7. Test Firmaları (Bağımsız)
CREATE TABLE IF NOT EXISTS public.companies_test (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  owner_id uuid,
  name text NOT NULL,
  whatsapp_number text,
  timezone text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT companies_test_pkey PRIMARY KEY (id)
);

-- 8. Firmalar (Ana tablo - auth.users'a bağlı)
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  owner_id uuid,
  name text NOT NULL,
  address text,
  country text,
  timezone text,
  onboarding_completed boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  logo_url text,
  subscription_plan text DEFAULT 'Free'::text,
  expert_limit integer DEFAULT 1,
  whatsapp_number text,
  sector_code text,
  sector text,
  sub_sector text,
  reminder_hours_before integer DEFAULT 24,
  cancellation_hours_before integer DEFAULT 4,
  instance_name text,
  qr_code text,
  status text NOT NULL DEFAULT 'disconnected'::text,
  admin_phone text,
  trial_start_date timestamp with time zone DEFAULT now(),
  trial_end_date timestamp with time zone DEFAULT (now() + '14 days'::interval),
  is_trial_active boolean DEFAULT true,
  subscription_status text DEFAULT 'trialing'::text CHECK (subscription_status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'canceled'::text, 'paused'::text])),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  subscription_start_date timestamp with time zone,
  last_payment_date timestamp with time zone,
  next_billing_date timestamp with time zone,
  notification_7_days_sent boolean DEFAULT false,
  notification_3_days_sent boolean DEFAULT false,
  notification_1_day_sent boolean DEFAULT false,
  service_active boolean DEFAULT true,
  paused_at timestamp with time zone,
  paused_reason text,
  email text UNIQUE,
  manager_phone text,
  CONSTRAINT companies_pkey PRIMARY KEY (id),
  CONSTRAINT companies_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);

-- 9. Firma Kullanıcıları / Uzmanlar
CREATE TABLE IF NOT EXISTS public.company_users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  company_id uuid,
  name text NOT NULL,
  email text UNIQUE,
  phone text,
  role text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  general_lunch_start_time time without time zone,
  general_lunch_end_time time without time zone,
  color text,
  CONSTRAINT company_users_pkey PRIMARY KEY (id),
  CONSTRAINT company_users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

-- 10. Firma Kullanıcı Token'ları
CREATE TABLE IF NOT EXISTS public.company_user_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider_token text NOT NULL,
  provider_refresh_token text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT company_user_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT company_user_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.company_users(id)
);

-- 11. Firma Hizmetleri
CREATE TABLE IF NOT EXISTS public.company_services (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  company_id uuid,
  description text NOT NULL,
  duration integer,
  price numeric,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  expert_id uuid,
  CONSTRAINT company_services_pkey PRIMARY KEY (id),
  CONSTRAINT company_services_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT company_services_expert_id_fkey FOREIGN KEY (expert_id) REFERENCES public.company_users(id)
);

-- 12. Firma Çalışma Saatleri
CREATE TABLE IF NOT EXISTS public.company_working_hours (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  company_id uuid,
  day text NOT NULL,
  is_open boolean DEFAULT true,
  start_time time without time zone,
  end_time time without time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  expert_id uuid,
  CONSTRAINT company_working_hours_pkey PRIMARY KEY (id),
  CONSTRAINT company_working_hours_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT company_working_hours_expert_id_fkey FOREIGN KEY (expert_id) REFERENCES public.company_users(id),
  CONSTRAINT company_working_hours_unique UNIQUE (company_id, day, expert_id)
);

-- 13. Firma Tatil Günleri
CREATE TABLE IF NOT EXISTS public.company_holidays (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  company_id uuid,
  date date NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  expert_id uuid,
  CONSTRAINT company_holidays_pkey PRIMARY KEY (id),
  CONSTRAINT company_holidays_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT company_holidays_expert_id_fkey FOREIGN KEY (expert_id) REFERENCES public.company_users(id)
);

-- 14. Müşteriler
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  company_id uuid,
  name text NOT NULL CHECK (name = upper(name)),
  phone text,
  email text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  tckn text,
  address text,
  CONSTRAINT customers_pkey PRIMARY KEY (id),
  CONSTRAINT customers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT customers_company_id_phone_key UNIQUE (company_id, phone)
);

-- 15. Randevular
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  company_id uuid,
  service_id uuid,
  date date,
  time time without time zone,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  expert_id uuid,
  webhook_status text DEFAULT 'beklemede'::text,
  customer_id uuid NOT NULL,
  localized_date_time text,
  CONSTRAINT appointments_pkey PRIMARY KEY (id),
  CONSTRAINT appointments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT appointments_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.company_services(id),
  CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT appointments_expert_id_fkey FOREIGN KEY (expert_id) REFERENCES public.company_users(id)
);

-- 16. Uzman Verimlilik Metrikleri
CREATE TABLE IF NOT EXISTS public.expert_productivity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  expert_id uuid NOT NULL,
  company_id uuid NOT NULL,
  calculation_date date NOT NULL,
  total_weekly_work_minutes integer DEFAULT 0,
  total_weekly_appointment_minutes integer DEFAULT 0,
  weekly_efficiency numeric DEFAULT 0.00,
  total_monthly_work_minutes integer DEFAULT 0,
  total_monthly_appointment_minutes integer DEFAULT 0,
  monthly_efficiency numeric DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT expert_productivity_pkey PRIMARY KEY (id),
  CONSTRAINT expert_productivity_expert_id_fkey FOREIGN KEY (expert_id) REFERENCES public.company_users(id),
  CONSTRAINT expert_productivity_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT expert_productivity_unique_expert_date UNIQUE (expert_id, calculation_date)
);

-- 17. Bildirimler
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  company_id uuid,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  type text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

-- 18. Webhook Olayları (Stripe)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  processed_at timestamp with time zone DEFAULT now(),
  company_id uuid,
  payload jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT webhook_events_pkey PRIMARY KEY (id),
  CONSTRAINT webhook_events_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

-- 19. WhatsApp Konuşmaları
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  company_id uuid,
  customer_phone text,
  conversation_log text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT whatsapp_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT whatsapp_conversations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);


-- =============================================================================
-- BÖLÜM 3: INDEX'LER (Gerçek Supabase'den)
-- =============================================================================

-- COMPANIES
CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON public.companies USING btree (owner_id);
CREATE INDEX IF NOT EXISTS idx_companies_whatsapp_number ON public.companies USING btree (whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON public.companies USING btree (subscription_status);
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies USING btree (status);
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer_id ON public.companies USING btree (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_companies_email ON public.companies USING btree (email);
CREATE INDEX IF NOT EXISTS idx_companies_instance_name ON public.companies USING btree (instance_name);
CREATE INDEX IF NOT EXISTS idx_companies_trial_end_date ON public.companies USING btree (trial_end_date);
CREATE INDEX IF NOT EXISTS idx_companies_service_active ON public.companies USING btree (service_active);
CREATE INDEX IF NOT EXISTS idx_companies_sector_code ON public.companies USING btree (sector_code);
CREATE INDEX IF NOT EXISTS idx_companies_next_billing_date ON public.companies USING btree (next_billing_date);
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer_prefix ON public.companies USING btree (stripe_customer_id text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_companies_subscription_service ON public.companies USING btree (subscription_status, service_active);
CREATE INDEX IF NOT EXISTS idx_companies_trial_active_end ON public.companies USING btree (is_trial_active, trial_end_date) WHERE (is_trial_active = true);

-- COMPANY_USERS
CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON public.company_users USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_email ON public.company_users USING btree (email);
CREATE INDEX IF NOT EXISTS idx_company_users_role ON public.company_users USING btree (role);

-- COMPANY_USER_TOKENS
CREATE INDEX IF NOT EXISTS idx_company_user_tokens_user_id ON public.company_user_tokens USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_company_user_tokens_expires_at ON public.company_user_tokens USING btree (expires_at);

-- COMPANY_SERVICES
CREATE INDEX IF NOT EXISTS idx_company_services_company_id ON public.company_services USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_company_services_expert_id ON public.company_services USING btree (expert_id);

-- COMPANY_WORKING_HOURS
CREATE INDEX IF NOT EXISTS idx_company_working_hours_company_id ON public.company_working_hours USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_company_working_hours_expert_id ON public.company_working_hours USING btree (expert_id);
CREATE INDEX IF NOT EXISTS idx_company_working_hours_day ON public.company_working_hours USING btree (day);
CREATE INDEX IF NOT EXISTS idx_company_working_hours_company_day ON public.company_working_hours USING btree (company_id, day);

-- COMPANY_HOLIDAYS
CREATE INDEX IF NOT EXISTS idx_company_holidays_company_id ON public.company_holidays USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_company_holidays_date ON public.company_holidays USING btree (date);
CREATE INDEX IF NOT EXISTS idx_company_holidays_expert_id ON public.company_holidays USING btree (expert_id);
CREATE INDEX IF NOT EXISTS idx_company_holidays_company_date ON public.company_holidays USING btree (company_id, date);

-- CUSTOMERS
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON public.customers USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers USING btree (phone);
CREATE INDEX IF NOT EXISTS idx_customers_company_phone ON public.customers USING btree (company_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers USING btree (name);
CREATE INDEX IF NOT EXISTS idx_customers_tckn ON public.customers USING btree (tckn);

-- APPOINTMENTS
CREATE INDEX IF NOT EXISTS idx_appointments_company_id ON public.appointments USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON public.appointments USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_expert_id ON public.appointments USING btree (expert_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON public.appointments USING btree (service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments USING btree (date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments USING btree (status);
CREATE INDEX IF NOT EXISTS idx_appointments_webhook_status ON public.appointments USING btree (webhook_status);
CREATE INDEX IF NOT EXISTS idx_appointments_company_date ON public.appointments USING btree (company_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_expert_date ON public.appointments USING btree (expert_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_company_status ON public.appointments USING btree (company_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_company_date_status ON public.appointments USING btree (company_id, date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_expert_date_status ON public.appointments USING btree (expert_id, date, status);

-- EXPERT_PRODUCTIVITY
CREATE INDEX IF NOT EXISTS idx_expert_productivity_expert_id ON public.expert_productivity USING btree (expert_id);
CREATE INDEX IF NOT EXISTS idx_expert_productivity_company_id ON public.expert_productivity USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_expert_productivity_calc_date ON public.expert_productivity USING btree (calculation_date);
CREATE INDEX IF NOT EXISTS idx_expert_productivity_expert_date ON public.expert_productivity USING btree (expert_id, calculation_date);

-- NOTIFICATIONS
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON public.notifications USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications USING btree (is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_company_read ON public.notifications USING btree (company_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications USING btree (created_at DESC);

-- COUPONS
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons USING btree (code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON public.coupons USING btree (is_active);

-- WHATSAPP_CONVERSATIONS
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_company_id ON public.whatsapp_conversations USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_customer_phone ON public.whatsapp_conversations USING btree (customer_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_company_phone ON public.whatsapp_conversations USING btree (company_id, customer_phone);

-- WEBHOOK_EVENTS
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id ON public.webhook_events USING btree (stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON public.webhook_events USING btree (event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_company_id ON public.webhook_events USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events USING btree (created_at);

-- SUB_SECTORS
CREATE INDEX IF NOT EXISTS idx_sub_sectors_sector_id ON public.sub_sectors USING btree (sector_id);

-- N8N_CHAT_HISTORIES
CREATE INDEX IF NOT EXISTS idx_n8n_chat_histories_session_id ON public.n8n_chat_histories USING btree (session_id);


-- =============================================================================
-- BÖLÜM 4: FONKSİYONLAR (Gerçek kaynak kodları - Production)
-- =============================================================================

-- 4.1 updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now(); 
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.2 Free customer ID oluştur
CREATE OR REPLACE FUNCTION public.generate_free_customer_id(p_trial_days integer)
RETURNS text AS $$
DECLARE
  v_random_string TEXT;
BEGIN
  v_random_string := encode(gen_random_bytes(12), 'base64');
  v_random_string := replace(v_random_string, '/', '');
  v_random_string := replace(v_random_string, '+', '');
  v_random_string := replace(v_random_string, '=', '');
  v_random_string := lower(substring(v_random_string, 1, 16));
  RETURN 'free_' || p_trial_days::text || '_' || v_random_string;
END;
$$ LANGUAGE plpgsql;

-- 4.3 Yeni firma oluşturulurken free customer ID ata
CREATE OR REPLACE FUNCTION public.set_free_customer_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stripe_customer_id IS NULL OR NEW.stripe_customer_id = '' THEN
    NEW.stripe_customer_id := generate_free_customer_id(14);
  END IF;
  IF NEW.subscription_status IS NULL THEN
    NEW.subscription_status := 'trialing';
  END IF;
  IF NEW.is_trial_active IS NULL THEN
    NEW.is_trial_active := true;
  END IF;
  IF NEW.trial_start_date IS NULL THEN
    NEW.trial_start_date := NOW();
  END IF;
  IF NEW.trial_end_date IS NULL THEN
    NEW.trial_end_date := NOW() + INTERVAL '14 days';
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in auto_set_free_customer_id: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.4 Plan değiştiğinde expert_limit güncelle
CREATE OR REPLACE FUNCTION public.update_expert_limit_on_plan_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.subscription_plan = 'Standard' THEN NEW.expert_limit := 1;
  ELSIF NEW.subscription_plan = 'Standard Plus' THEN NEW.expert_limit := 3;
  ELSIF NEW.subscription_plan = 'Pro' THEN NEW.expert_limit := 6;
  ELSIF NEW.subscription_plan = 'Pro Plus' THEN NEW.expert_limit := 9;
  ELSE NEW.expert_limit := 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.5 Firma instance varsayılanları
CREATE OR REPLACE FUNCTION public.set_company_instance_defaults()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.whatsapp_number IS NOT NULL THEN
        NEW.instance_name := REPLACE(NEW.name, ' ', '_') || '_' || NEW.whatsapp_number;
    END IF;
    IF TG_OP = 'INSERT' THEN
        NEW.status := 'disconnected';
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.whatsapp_number IS DISTINCT FROM NEW.whatsapp_number THEN
            NEW.status := 'disconnected';
            NEW.qr_code := NULL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.6 Yeni kullanıcı signup → otomatik firma oluştur (auth.users trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_free_customer_id TEXT;
  v_trial_start_date TIMESTAMPTZ;
  v_trial_end_date TIMESTAMPTZ;
  v_user_phone TEXT;
BEGIN
  v_free_customer_id := 'free_14_' || lower(substring(md5(random()::text || NEW.id::text), 1, 16));
  v_trial_start_date := NOW();
  v_trial_end_date := NOW() + INTERVAL '14 days';
  v_user_phone := NEW.raw_user_meta_data->>'user_phone';
  
  INSERT INTO public.companies (
    owner_id, email, name, admin_phone, manager_phone, whatsapp_number,
    sector, sub_sector, sector_code, stripe_customer_id,
    subscription_status, subscription_plan, expert_limit,
    is_trial_active, trial_start_date, trial_end_date,
    service_active, onboarding_completed
  ) VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
    v_user_phone, v_user_phone,
    NEW.raw_user_meta_data->>'company_whatsapp',
    NEW.raw_user_meta_data->>'sector',
    NEW.raw_user_meta_data->>'sub_sector',
    NEW.raw_user_meta_data->>'sector_code',
    v_free_customer_id, 'trialing', 'Free', 1,
    true, v_trial_start_date, v_trial_end_date, true, false
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.7 Webhook gönder (randevu değişikliklerinde n8n'e)
CREATE OR REPLACE FUNCTION public.send_appointment_webhook(appointment_id uuid)
RETURNS void AS $$
DECLARE
    webhook_url TEXT;
    payload JSONB;
    company_info RECORD;
    expert_info RECORD;
    customer_info RECORD;
    service_info RECORD;
    appointment_info RECORD;
    available_experts JSONB;
BEGIN
    SELECT decrypted_secret INTO webhook_url FROM vault.decrypted_secrets WHERE name = 'N8N_WEBHOOK_URL' LIMIT 1;
    IF webhook_url IS NULL THEN RAISE LOG 'N8N_WEBHOOK_URL secret not found'; RETURN; END IF;

    SELECT * INTO appointment_info FROM public.appointments WHERE id = appointment_id;
    SELECT * INTO company_info FROM public.companies WHERE id = appointment_info.company_id;
    SELECT * INTO customer_info FROM public.customers WHERE id = appointment_info.customer_id;
    SELECT * INTO service_info FROM public.company_services WHERE id = appointment_info.service_id;
    SELECT * INTO expert_info FROM public.company_users WHERE id = appointment_info.expert_id;

    SELECT jsonb_agg(jsonb_build_object(
        'id', u.id, 'name', u.name,
        'working_hours', (SELECT jsonb_agg(wh) FROM public.company_working_hours wh WHERE wh.expert_id = u.id OR (wh.expert_id IS NULL AND wh.company_id = u.company_id)),
        'appointments', (SELECT jsonb_agg(app) FROM public.appointments app WHERE app.expert_id = u.id AND app.date >= CURRENT_DATE)
    ))
    INTO available_experts
    FROM public.company_users u WHERE u.company_id = appointment_info.company_id AND u.role = 'Uzman';

    payload := jsonb_build_object(
        'event_type', 'appointment_change',
        'appointment', to_jsonb(appointment_info),
        'company', jsonb_build_object('id', company_info.id, 'name', company_info.name, 'address', company_info.address, 'whatsapp_number', company_info.whatsapp_number, 'sector', company_info.sector, 'sub_sector', company_info.sub_sector, 'sector_code', company_info.sector_code),
        'customer', to_jsonb(customer_info),
        'service', to_jsonb(service_info),
        'expert', to_jsonb(expert_info),
        'available_experts_for_booking', available_experts
    );

    PERFORM http(('POST', webhook_url, ARRAY[http_header('Content-Type', 'application/json')], 'application/json', payload::TEXT));
    UPDATE public.appointments SET webhook_status = 'sent' WHERE id = appointment_id;
EXCEPTION
    WHEN others THEN
        UPDATE public.appointments SET webhook_status = 'failed' WHERE id = appointment_id;
        RAISE LOG 'Webhook failed for appointment %: %', appointment_id, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 4.8 Randevu trigger fonksiyonu (localized datetime + webhook gönder)
CREATE OR REPLACE FUNCTION public.trigger_send_appointment_webhook()
RETURNS TRIGGER AS $$
DECLARE
    company_tz TEXT; iana_tz TEXT; localized_dt TEXT;
BEGIN
    -- Recursion engelle
    IF TG_OP = 'UPDATE' AND 
       OLD.webhook_status IS DISTINCT FROM NEW.webhook_status AND
       (OLD.id, OLD.company_id, OLD.service_id, OLD.date, OLD.time, OLD.status, OLD.expert_id, OLD.customer_id)
       IS NOT DISTINCT FROM
       (NEW.id, NEW.company_id, NEW.service_id, NEW.date, NEW.time, NEW.status, NEW.expert_id, NEW.customer_id)
    THEN RETURN NEW; END IF;

    SELECT timezone INTO company_tz FROM public.companies WHERE id = NEW.company_id;
    SELECT utc[1] INTO iana_tz FROM public.timezones_mapping WHERE friendly_name = company_tz LIMIT 1;
    IF iana_tz IS NULL THEN iana_tz := 'UTC'; END IF;

    localized_dt := to_char((NEW.date + NEW.time) AT TIME ZONE 'UTC' AT TIME ZONE iana_tz, 'DD Mon YYYY HH24:MI:SS');
    NEW.localized_date_time := localized_dt;
    PERFORM public.send_appointment_webhook(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.9 WhatsApp instance oluşturma (n8n webhook çağır)
CREATE OR REPLACE FUNCTION public.invoke_create_whatsapp_instance()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.whatsapp_number IS NOT NULL) OR 
       (TG_OP = 'UPDATE' AND NEW.whatsapp_number IS NOT NULL AND OLD.whatsapp_number IS DISTINCT FROM NEW.whatsapp_number) THEN
        PERFORM net.http_post(
            url := 'https://n8n.mehmettezcan.uk/webhook/instance/create',
            headers := jsonb_build_object('Content-Type', 'application/json'),
            body := jsonb_build_object('record', row_to_json(NEW))
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.10 Tüm uzmanların verimliliğini hesapla
CREATE OR REPLACE FUNCTION public.calculate_all_experts_productivity()
RETURNS void AS $$
DECLARE
    expert_record RECORD;
    calc_date DATE := CURRENT_DATE;
    week_start DATE := date_trunc('week', calc_date);
    week_end DATE := week_start + interval '6 days';
    month_start DATE := date_trunc('month', calc_date);
    month_end DATE := (date_trunc('month', calc_date) + interval '1 month - 1 day');
    total_weekly_work_mins INT; total_monthly_work_mins INT;
    total_weekly_appt_mins INT; total_monthly_appt_mins INT;
    day_record RECORD;
    work_start_mins INT; work_end_mins INT;
    lunch_start_mins INT; lunch_end_mins INT; lunch_duration_mins INT;
    workable_days_in_week INT; workable_days_in_month INT;
BEGIN
    CREATE OR REPLACE FUNCTION time_to_minutes(t TIME) RETURNS INT AS $f$
    BEGIN RETURN EXTRACT(HOUR FROM t) * 60 + EXTRACT(MINUTE FROM t); END;
    $f$ LANGUAGE plpgsql IMMUTABLE;

    FOR expert_record IN SELECT * FROM public.company_users WHERE role = 'Uzman' LOOP
        total_weekly_work_mins := 0; total_monthly_work_mins := 0;

        FOR day_record IN SELECT * FROM public.company_working_hours WHERE expert_id = expert_record.id AND is_open = true LOOP
            work_start_mins := time_to_minutes(day_record.start_time);
            work_end_mins := time_to_minutes(day_record.end_time);
            lunch_start_mins := time_to_minutes(expert_record.general_lunch_start_time);
            lunch_end_mins := time_to_minutes(expert_record.general_lunch_end_time);
            lunch_duration_mins := 0;
            IF lunch_end_mins > lunch_start_mins THEN lunch_duration_mins := lunch_end_mins - lunch_start_mins; END IF;

            IF work_end_mins > work_start_mins THEN
                SELECT count(*) INTO workable_days_in_week FROM generate_series(week_start, week_end, '1 day'::interval) d WHERE trim(to_char(d, 'Day')) = day_record.day;
                SELECT count(*) INTO workable_days_in_month FROM generate_series(month_start, month_end, '1 day'::interval) d WHERE trim(to_char(d, 'Day')) = day_record.day;
                total_weekly_work_mins := total_weekly_work_mins + (workable_days_in_week * (work_end_mins - work_start_mins - lunch_duration_mins));
                total_monthly_work_mins := total_monthly_work_mins + (workable_days_in_month * (work_end_mins - work_start_mins - lunch_duration_mins));
            END IF;
        END LOOP;

        SELECT COALESCE(SUM(s.duration), 0) INTO total_weekly_appt_mins FROM public.appointments a JOIN public.company_services s ON a.service_id = s.id WHERE a.expert_id = expert_record.id AND a.date BETWEEN week_start AND week_end;
        SELECT COALESCE(SUM(s.duration), 0) INTO total_monthly_appt_mins FROM public.appointments a JOIN public.company_services s ON a.service_id = s.id WHERE a.expert_id = expert_record.id AND a.date BETWEEN month_start AND month_end;
        
        INSERT INTO public.expert_productivity (expert_id, company_id, calculation_date, total_weekly_work_minutes, total_weekly_appointment_minutes, weekly_efficiency, total_monthly_work_minutes, total_monthly_appointment_minutes, monthly_efficiency)
        VALUES (expert_record.id, expert_record.company_id, calc_date, total_weekly_work_mins, total_weekly_appt_mins,
            CASE WHEN total_weekly_work_mins > 0 THEN (total_weekly_appt_mins::numeric / total_weekly_work_mins) * 100 ELSE 0 END,
            total_monthly_work_mins, total_monthly_appt_mins,
            CASE WHEN total_monthly_work_mins > 0 THEN (total_monthly_appt_mins::numeric / total_monthly_work_mins) * 100 ELSE 0 END)
        ON CONFLICT (expert_id, calculation_date) DO UPDATE SET
            total_weekly_work_minutes = EXCLUDED.total_weekly_work_minutes, total_weekly_appointment_minutes = EXCLUDED.total_weekly_appointment_minutes, weekly_efficiency = EXCLUDED.weekly_efficiency,
            total_monthly_work_minutes = EXCLUDED.total_monthly_work_minutes, total_monthly_appointment_minutes = EXCLUDED.total_monthly_appointment_minutes, monthly_efficiency = EXCLUDED.monthly_efficiency, updated_at = now();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4.11 Webhook event kontrol
CREATE OR REPLACE FUNCTION public.check_webhook_event_processed(event_id text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS(SELECT 1 FROM webhook_events WHERE stripe_event_id = event_id);
END;
$$ LANGUAGE plpgsql;

-- 4.12 Webhook event kaydet
CREATE OR REPLACE FUNCTION public.record_webhook_event(p_stripe_event_id text, p_event_type text, p_company_id uuid, p_payload jsonb)
RETURNS uuid AS $$
DECLARE v_event_id UUID;
BEGIN
    INSERT INTO webhook_events (stripe_event_id, event_type, company_id, payload, processed_at)
    VALUES (p_stripe_event_id, p_event_type, p_company_id, p_payload, NOW())
    ON CONFLICT (stripe_event_id) DO NOTHING RETURNING id INTO v_event_id;
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- 4.13 Checkout sonrası firma güncelle
CREATE OR REPLACE FUNCTION public.update_company_on_checkout(p_stripe_customer_id text, p_stripe_subscription_id text, p_customer_email text, p_subscription_status text, p_stripe_price_id text DEFAULT NULL)
RETURNS TABLE(company_id uuid, company_name text, owner_email text, updated boolean, old_customer_id text, message text) AS $$
DECLARE v_company_id UUID; v_company_name TEXT; v_owner_email TEXT; v_old_customer_id TEXT;
BEGIN
  SELECT c.id, c.name, u.email, c.stripe_customer_id INTO v_company_id, v_company_name, v_owner_email, v_old_customer_id
  FROM companies c JOIN auth.users u ON u.id = c.owner_id WHERE u.email = p_customer_email ORDER BY c.created_at DESC LIMIT 1;
  IF v_company_id IS NOT NULL THEN
    UPDATE companies SET stripe_customer_id = p_stripe_customer_id, stripe_subscription_id = p_stripe_subscription_id, stripe_price_id = COALESCE(p_stripe_price_id, stripe_price_id), subscription_status = p_subscription_status, subscription_start_date = NOW(), last_payment_date = NOW(), is_trial_active = false, service_active = true WHERE id = v_company_id;
    RETURN QUERY SELECT v_company_id, v_company_name, v_owner_email, true, v_old_customer_id, 'Company updated successfully'::text;
  ELSE
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, p_customer_email, false, NULL::TEXT, 'No company found with this email'::text;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.14 Ödeme sonrası firma güncelle
CREATE OR REPLACE FUNCTION public.update_company_on_payment(p_stripe_customer_id text, p_period_start timestamptz, p_period_end timestamptz)
RETURNS TABLE(company_id uuid, company_name text, updated boolean) AS $$
DECLARE v_company_id UUID; v_company_name TEXT;
BEGIN
  SELECT id, name INTO v_company_id, v_company_name FROM companies WHERE stripe_customer_id = p_stripe_customer_id LIMIT 1;
  IF v_company_id IS NOT NULL THEN
    UPDATE companies SET last_payment_date = NOW(), next_billing_date = p_period_end, subscription_status = 'active', service_active = true WHERE id = v_company_id;
    RETURN QUERY SELECT v_company_id, v_company_name, true;
  ELSE RETURN QUERY SELECT NULL::UUID, NULL::TEXT, false; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.15 Subscription değişikliği
CREATE OR REPLACE FUNCTION public.update_company_on_subscription_change(p_stripe_subscription_id text, p_stripe_price_id text, p_subscription_status text, p_period_end timestamptz)
RETURNS TABLE(company_id uuid, company_name text, plan_name text, expert_limit integer, updated boolean) AS $$
DECLARE v_company_id UUID; v_company_name TEXT; v_plan_name TEXT; v_expert_limit INTEGER;
BEGIN
  SELECT id, name INTO v_company_id, v_company_name FROM companies WHERE stripe_subscription_id = p_stripe_subscription_id LIMIT 1;
  SELECT sp.plan_name, sp.expert_limit INTO v_plan_name, v_expert_limit FROM stripe_prices sp WHERE sp.stripe_price_id = p_stripe_price_id LIMIT 1;
  IF v_company_id IS NOT NULL THEN
    UPDATE companies SET stripe_price_id = p_stripe_price_id, subscription_plan = COALESCE(v_plan_name, subscription_plan), expert_limit = COALESCE(v_expert_limit, companies.expert_limit), subscription_status = p_subscription_status WHERE id = v_company_id;
    RETURN QUERY SELECT v_company_id, v_company_name, v_plan_name, v_expert_limit, true;
  ELSE RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::INTEGER, false; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.16 Subscription iptal
CREATE OR REPLACE FUNCTION public.update_company_on_cancellation(p_stripe_subscription_id text, p_canceled_at timestamptz, p_cancel_reason text)
RETURNS TABLE(company_id uuid, company_name text, updated boolean) AS $$
DECLARE v_company_id UUID; v_company_name TEXT;
BEGIN
  SELECT id, name INTO v_company_id, v_company_name FROM companies WHERE stripe_subscription_id = p_stripe_subscription_id LIMIT 1;
  IF v_company_id IS NOT NULL THEN
    UPDATE companies SET subscription_status = 'canceled', service_active = false, paused_at = p_canceled_at, paused_reason = p_cancel_reason WHERE id = v_company_id;
    RETURN QUERY SELECT v_company_id, v_company_name, true;
  ELSE RETURN QUERY SELECT NULL::UUID, NULL::TEXT, false; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.17 Ödeme başarısız
CREATE OR REPLACE FUNCTION public.update_company_on_payment_failure(p_stripe_customer_id text)
RETURNS TABLE(company_id uuid, company_name text, updated boolean) AS $$
DECLARE v_company_id UUID; v_company_name TEXT;
BEGIN
  SELECT id, name INTO v_company_id, v_company_name FROM companies WHERE stripe_customer_id = p_stripe_customer_id LIMIT 1;
  IF v_company_id IS NOT NULL THEN
    UPDATE companies SET subscription_status = 'past_due' WHERE id = v_company_id;
    RETURN QUERY SELECT v_company_id, v_company_name, true;
  ELSE RETURN QUERY SELECT NULL::UUID, NULL::TEXT, false; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- BÖLÜM 5: TRIGGER'LAR (Gerçek production trigger'ları)
-- =============================================================================

-- Companies: Free customer ID otomatik ata (INSERT)
DROP TRIGGER IF EXISTS auto_set_free_customer_id ON public.companies;
CREATE TRIGGER auto_set_free_customer_id
    BEFORE INSERT ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.set_free_customer_id_on_insert();

-- Companies: Expert limit plan'a göre ayarla (INSERT)
DROP TRIGGER IF EXISTS set_expert_limit_on_companies_insert ON public.companies;
CREATE TRIGGER set_expert_limit_on_companies_insert
    BEFORE INSERT ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_expert_limit_on_plan_change();

-- Companies: Expert limit plan'a göre ayarla (UPDATE)
DROP TRIGGER IF EXISTS set_expert_limit_on_companies_update ON public.companies;
CREATE TRIGGER set_expert_limit_on_companies_update
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_expert_limit_on_plan_change();

-- Appointments: Webhook + localized_date_time (INSERT)
DROP TRIGGER IF EXISTS on_appointment_created_or_updated ON public.appointments;
CREATE TRIGGER on_appointment_created_or_updated
    AFTER INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_send_appointment_webhook();

-- Appointments: Webhook + localized_date_time (UPDATE)
CREATE TRIGGER on_appointment_updated
    AFTER UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_send_appointment_webhook();

-- NOT: handle_new_user() auth.users üzerinde tetiklenir
-- Supabase Dashboard > Authentication > Hooks veya:
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- BÖLÜM 6: ROW LEVEL SECURITY (Gerçek production RLS politikaları)
-- =============================================================================

-- RLS Aktif Et
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_productivity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_prices ENABLE ROW LEVEL SECURITY;

-- COMPANIES (3 ayrı politika: SELECT, INSERT, UPDATE)
CREATE POLICY "Users can view own company" ON public.companies FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own company" ON public.companies FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own company" ON public.companies FOR UPDATE USING (auth.uid() = owner_id);

-- Multi-tenant izolasyon (firma sahibi üzerinden)
CREATE POLICY "Users can manage own company users" ON public.company_users FOR ALL USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage own company services" ON public.company_services FOR ALL USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage own company working hours" ON public.company_working_hours FOR ALL USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage own holidays" ON public.company_holidays FOR ALL USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage own company customers" ON public.customers FOR ALL USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage own company appointments" ON public.appointments FOR ALL USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE POLICY "Users can view own company productivity" ON public.expert_productivity FOR SELECT USING (company_id IN (SELECT c.id FROM companies c WHERE c.owner_id = auth.uid()));
CREATE POLICY "Users can manage own notifications" ON public.notifications FOR ALL USING (company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid()));
CREATE POLICY "Allow users to manage their own tokens" ON public.company_user_tokens FOR ALL USING (user_id IN (SELECT cu.id FROM company_users cu WHERE cu.company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())));

-- Webhook events (authenticated + service_role erişebilir)
CREATE POLICY "System can manage webhook events" ON public.webhook_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage webhook events" ON public.webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- WhatsApp conversations (sadece super admin)
CREATE POLICY "Superusers can manage conversations" ON public.whatsapp_conversations FOR ALL USING (auth.uid() IN (SELECT id FROM auth.users WHERE is_super_admin = true));

-- Coupons (authenticated kullanıcılar)
CREATE POLICY "Allow all access for authenticated users" ON public.coupons FOR ALL USING (auth.role() = 'authenticated'::text);

-- Genel okuma tabloları
CREATE POLICY "Allow public read access" ON public.sectors FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.sectors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access" ON public.sub_sectors FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.sub_sectors FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read prices" ON public.stripe_prices FOR SELECT TO authenticated USING (true);


-- =============================================================================
-- BÖLÜM 7: VAULT SECRETS (Dashboard'dan yönetilir)
-- =============================================================================
-- N8N_WEBHOOK_URL      → n8n webhook endpoint (randevu webhook)
-- N8N_WEBHOOK_SECRET   → n8n güvenlik anahtarı
-- EVOLUTION_API_KEY    → Evolution API key (WhatsApp instance)


-- =============================================================================
-- BÖLÜM 8: TABLO İLİŞKİ HARİTASI
-- =============================================================================
-- auth.users
--   └── companies (owner_id)
--         ├── company_users (company_id)
--         │     ├── company_services (expert_id)
--         │     ├── company_working_hours (expert_id)
--         │     ├── company_holidays (expert_id)
--         │     ├── company_user_tokens (user_id)
--         │     ├── expert_productivity (expert_id)
--         │     └── appointments (expert_id)
--         ├── company_services (company_id)
--         │     └── appointments (service_id)
--         ├── company_working_hours (company_id)
--         ├── company_holidays (company_id)
--         ├── customers (company_id) [UNIQUE: company_id + phone]
--         │     └── appointments (customer_id)
--         ├── appointments (company_id)
--         ├── expert_productivity (company_id)
--         ├── notifications (company_id)
--         ├── webhook_events (company_id)
--         └── whatsapp_conversations (company_id)
-- sectors → sub_sectors (sector_id) [UNIQUE: sector_id + name, sector_id + code]
-- stripe_prices, coupons, timezones_mapping, n8n_chat_histories, companies_test (bağımsız)
--         ├── transaction_categories (company_id)
--         │     └── transactions (category_id)
--         ├── transactions (company_id, appointment_id)
--         ├── daily_cash_register (company_id) [UNIQUE: company_id + date]
--         ├── monthly_reports (company_id) [UNIQUE: company_id + month + year]
--         ├── admin_notifications (company_id)
--         ├── notification_templates (company_id)
--         └── customer_feedback (company_id, customer_id, appointment_id)


-- =============================================================================
-- BÖLÜM 9: ÖN MUHASEBE TABLOLARI (Migration)
-- Eklenme tarihi: 2026-02-27
-- =============================================================================

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

-- 5. Ön muhasebe index'leri
CREATE INDEX idx_transactions_company ON transactions(company_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_type ON transactions(company_id, type);
CREATE INDEX idx_cash_register_date ON daily_cash_register(company_id, date);
CREATE INDEX idx_monthly_company ON monthly_reports(company_id, year, month);


-- =============================================================================
-- BÖLÜM 10: BİLDİRİM SİSTEMİ TABLOLARI (Migration)
-- Eklenme tarihi: 2026-02-27
-- =============================================================================

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


-- =============================================================================
-- BÖLÜM 11: COMPANY_SERVICES GELİŞTİRME — Kategori, Renk, Aktiflik, PDF, Notlar
-- Tarih: 2026-02-28
-- Amaç: Hizmetler sayfasının profesyonel revizyon için yeni alanlar
-- =============================================================================

-- Yeni kolonlar ekle
ALTER TABLE public.company_services
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#9333EA',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Mevcut kayıtlar için NULL değerleri düzelt
UPDATE public.company_services
  SET color = '#9333EA'
  WHERE color IS NULL;

UPDATE public.company_services
  SET is_active = true
  WHERE is_active IS NULL;

-- Performans index'leri
CREATE INDEX IF NOT EXISTS idx_company_services_category
  ON public.company_services USING btree (company_id, category);

CREATE INDEX IF NOT EXISTS idx_company_services_is_active
  ON public.company_services USING btree (company_id, is_active);

-- Kolon açıklamaları (PostgreSQL COMMENT)
COMMENT ON COLUMN public.company_services.category IS 'Hizmet kategorisi (örn: Saç Bakımı, Cilt Bakımı)';
COMMENT ON COLUMN public.company_services.notes IS 'Hizmet hakkında ek açıklama ve notlar';
COMMENT ON COLUMN public.company_services.pdf_url IS 'Supabase Storage public-files/services/{company_id}/ altındaki PDF broşür URL';
COMMENT ON COLUMN public.company_services.color IS 'Takvim görünümü için renk (HEX, varsayılan: mor #9333EA)';
COMMENT ON COLUMN public.company_services.is_active IS 'Aktif/pasif toggle - pasif hizmetler randevu formunda görünmez';
