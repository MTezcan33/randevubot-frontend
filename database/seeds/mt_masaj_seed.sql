-- ============================================================
-- MT MASAJ — Hamam, Sauna & Masaj Merkezi
-- Hizmetler (15 adet) + Uzmanlar (8 adet)
-- ============================================================
-- KULLANIM: Supabase SQL Editor'da çalıştır
-- NOT: company_id'yi kendi şirketinize göre değiştirin
-- ============================================================

-- 1. Önce company_id'yi bul
-- Aşağıdaki satırdaki şirket adını kendi şirketinizle değiştirin
DO $$
DECLARE
  v_company_id UUID;
  v_expert_1 UUID;
  v_expert_2 UUID;
  v_expert_3 UUID;
  v_expert_4 UUID;
  v_expert_5 UUID;
  v_expert_6 UUID;
  v_expert_7 UUID;
  v_expert_8 UUID;
BEGIN

  -- Şirket ID'si doğrudan atanıyor
  v_company_id := 'e127d8ea-11f7-4aaa-b25d-76f97f7e7bac'::UUID;

  RAISE NOTICE 'Şirket bulundu: %', v_company_id;

  -- ============================================================
  -- 2. UZMANLAR (8 kişi)
  -- ============================================================
  -- Mevcut uzmanları temizle (isteğe bağlı - dikkatli ol!)
  -- DELETE FROM company_users WHERE company_id = v_company_id;

  INSERT INTO company_users (id, company_id, name, email, phone, role, color, pin_code, panel_roles)
  VALUES
    (gen_random_uuid(), v_company_id, 'AHMET YILMAZ', 'ahmet@mtmasaj.com', '+905551001001', 'Uzman', '#2563EB', '1001', ARRAY['Uzman'])
  RETURNING id INTO v_expert_1;

  INSERT INTO company_users (id, company_id, name, email, phone, role, color, pin_code, panel_roles)
  VALUES
    (gen_random_uuid(), v_company_id, 'MEHMET KAYA', 'mehmet@mtmasaj.com', '+905551001002', 'Uzman', '#DC2626', '1002', ARRAY['Uzman'])
  RETURNING id INTO v_expert_2;

  INSERT INTO company_users (id, company_id, name, email, phone, role, color, pin_code, panel_roles)
  VALUES
    (gen_random_uuid(), v_company_id, 'AYŞE DEMİR', 'ayse@mtmasaj.com', '+905551001003', 'Uzman', '#9333EA', '1003', ARRAY['Uzman'])
  RETURNING id INTO v_expert_3;

  INSERT INTO company_users (id, company_id, name, email, phone, role, color, pin_code, panel_roles)
  VALUES
    (gen_random_uuid(), v_company_id, 'FATİH ÖZTÜRK', 'fatih@mtmasaj.com', '+905551001004', 'Uzman', '#059669', '1004', ARRAY['Uzman'])
  RETURNING id INTO v_expert_4;

  INSERT INTO company_users (id, company_id, name, email, phone, role, color, pin_code, panel_roles)
  VALUES
    (gen_random_uuid(), v_company_id, 'ZEYNEP ARSLAN', 'zeynep@mtmasaj.com', '+905551001005', 'Uzman', '#D97706', '1005', ARRAY['Uzman'])
  RETURNING id INTO v_expert_5;

  INSERT INTO company_users (id, company_id, name, email, phone, role, color, pin_code, panel_roles)
  VALUES
    (gen_random_uuid(), v_company_id, 'ALİ ÇELIK', 'ali@mtmasaj.com', '+905551001006', 'Uzman', '#0891B2', '1006', ARRAY['Uzman'])
  RETURNING id INTO v_expert_6;

  INSERT INTO company_users (id, company_id, name, email, phone, role, color, pin_code, panel_roles)
  VALUES
    (gen_random_uuid(), v_company_id, 'SEDA YILDIZ', 'seda@mtmasaj.com', '+905551001007', 'Uzman', '#BE185D', '1007', ARRAY['Uzman'])
  RETURNING id INTO v_expert_7;

  INSERT INTO company_users (id, company_id, name, email, phone, role, color, pin_code, panel_roles)
  VALUES
    (gen_random_uuid(), v_company_id, 'HASAN DOĞAN', 'hasan@mtmasaj.com', '+905551001008', 'Uzman', '#4F46E5', '1008', ARRAY['Uzman'])
  RETURNING id INTO v_expert_8;

  RAISE NOTICE 'Uzmanlar oluşturuldu: 8 kişi';

  -- ============================================================
  -- 3. HİZMETLER (15 adet — gerçekçi hamam/sauna/masaj hizmetleri)
  -- ============================================================
  -- Mevcut hizmetleri temizle (isteğe bağlı)
  -- DELETE FROM company_services WHERE company_id = v_company_id;

  -- ─── HAMAM HİZMETLERİ ───
  INSERT INTO company_services
    (company_id, description, duration, price, expert_id, category, color, is_active, service_content, preparation_info, contraindications)
  VALUES
    -- 1. Klasik Türk Hamamı
    (v_company_id, 'Klasik Türk Hamamı', 45, 350, v_expert_1,
     'Hamam', '#DC2626', true,
     'Sıcak mermer üzerinde gevşeme, kese, köpük masajı ve yıkama dahildir.',
     'Hamama girmeden 2 saat önce ağır yemek yemeyiniz. Değerli eşyalarınızı soyunma dolabında bırakınız.',
     'Kalp rahatsızlığı, tansiyon, hamilelik, ateşli hastalık durumlarında uygulanmaz.'),

    -- 2. VIP Hamam Paketi
    (v_company_id, 'VIP Hamam Paketi', 75, 650, v_expert_2,
     'Hamam', '#DC2626', true,
     'Özel oda, kese, köpük masajı, bal-süt peeling, yüz maskesi ve bitki çayı ikramı.',
     'En az 1 saat önceden randevu alınız. Aç karnına gelmeniz tavsiye edilir.',
     'Cilt hastalıkları, açık yaralar, ciddi kalp rahatsızlıkları olan kişilere uygulanmaz.'),

    -- 3. Kese + Köpük Masajı
    (v_company_id, 'Kese + Köpük Masajı', 30, 250, v_expert_3,
     'Hamam', '#DC2626', true,
     'Geleneksel Türk kesesi ve ardından köpüklü vücut masajı.',
     'Hamam bölümünde en az 15 dakika ısınmanız önerilir.',
     'Güneş yanığı, cilt tahrişi veya açık yara bulunan bölgelere uygulanmaz.'),

    -- ─── SAUNA HİZMETLERİ ───
    -- 4. Fin Saunası Seans
    (v_company_id, 'Fin Saunası Seans', 30, 200, v_expert_4,
     'Sauna', '#D97706', true,
     '80-100°C kuru sauna seansı. Seans öncesi duş ve seans sonrası soğuk havuz dahil.',
     'Bol su için. Alkol kullanmayınız. Metal takı ve aksesuar çıkarınız.',
     'Kalp-damar hastalıkları, epilepsi, hamilelik ve ateşli hastalıklarda girilmez.'),

    -- 5. Buhar Odası (Steam Room)
    (v_company_id, 'Buhar Odası Seans', 25, 180, v_expert_5,
     'Sauna', '#D97706', true,
     '45-50°C nemli buhar seansı. Solunum yollarını açar, cildi nemlendirir.',
     'Duş alarak gelin. Seans sırasında bol su tüketin.',
     'Astım krizinde, ağır solunum problemlerinde ve tansiyon hastalarında önerilmez.'),

    -- 6. Tuz Odası (Haloterapi)
    (v_company_id, 'Tuz Odası Terapi', 40, 280, v_expert_6,
     'Sauna', '#D97706', true,
     'Himalaya tuzu ile kaplı odada solunum terapisi. Solunum ve cilt sağlığını destekler.',
     'Rahat kıyafetlerle gelin. Seans sırasında telefon kullanmayınız.',
     'Aktif tüberküloz, ağır böbrek rahatsızlığı ve hipertiroidizm durumlarında uygulanmaz.'),

    -- ─── MASAJ HİZMETLERİ ───
    -- 7. İsveç Masajı (Klasik)
    (v_company_id, 'İsveç Masajı (Klasik)', 60, 500, v_expert_1,
     'Masaj', '#2563EB', true,
     'Tüm vücut klasik masaj. Kas gerginliğini çözer, kan dolaşımını artırır. Masaj yağı ile uygulanır.',
     'Masajdan 1 saat önce yemek yemeyiniz. Rahat olun ve terapistinize hassas bölgelerinizi bildirin.',
     'Ateş, enfeksiyon, tromboz, cilt enfeksiyonu olan bölgelerde uygulanmaz.'),

    -- 8. Aromaterapi Masajı
    (v_company_id, 'Aromaterapi Masajı', 60, 550, v_expert_3,
     'Masaj', '#2563EB', true,
     'Uçucu yağlar (lavanta, okaliptüs, portakal) ile rahatlatıcı tüm vücut masajı.',
     'Alerjiniz varsa önceden bildiriniz. Masaj öncesi duş almanız tavsiye edilir.',
     'Yağ alerjisi, hamileliğin ilk 3 ayı, kanser tedavisi sürecinde doktora danışınız.'),

    -- 9. Sıcak Taş Masajı (Hot Stone)
    (v_company_id, 'Sıcak Taş Masajı', 75, 650, v_expert_7,
     'Masaj', '#2563EB', true,
     'Bazalt taşları ile derin kas gevşetme masajı. Taşlar sırt, boyun ve omuz bölgesine yerleştirilir.',
     'Seans öncesi bol su için. Ciltte açık yara olmadığından emin olun.',
     'Diyabet, varisli damarlar, hamilelik, cilt yanığı olan bölgelerde uygulanmaz.'),

    -- 10. Derin Doku Masajı
    (v_company_id, 'Derin Doku Masajı', 60, 600, v_expert_2,
     'Masaj', '#2563EB', true,
     'Yoğun kas gerginliği ve kronik ağrılar için derin basınçlı masaj. Sporcular için ideal.',
     'Masaj sonrası bol su için. Hafif ağrı hissedebilirsiniz, bu normaldir.',
     'Osteoporoz, kan sulandırıcı kullananlar, hamilelik ve akut yaralanmalarda uygulanmaz.'),

    -- 11. Refleksoloji (Ayak Masajı)
    (v_company_id, 'Refleksoloji (Ayak Masajı)', 40, 350, v_expert_5,
     'Masaj', '#2563EB', true,
     'Ayak tabanındaki refleks noktalarına basınç uygulayarak tüm vücudu etkileyen terapi.',
     'Ayaklarınız temiz ve kuru olmalıdır. Çoraplarınızı çıkarınız.',
     'Ayak kırığı, derin ven trombozu, şiddetli diyabetik nöropati durumlarında yapılmaz.'),

    -- ─── ÖZEL PAKETLER ───
    -- 12. Çift Masajı (Couple)
    (v_company_id, 'Çift Masajı (Couple)', 60, 900, v_expert_4,
     'Özel Paket', '#9333EA', true,
     'İki kişilik özel odada eşzamanlı İsveç masajı. Romantik ortam, mum ışığı ve bitki çayı ikramı.',
     'Çiftler birlikte gelmelidir. Önceden randevu zorunludur.',
     'Her iki kişi için de standart masaj kontrendikasyonları geçerlidir.'),

    -- 13. Hamam + Masaj Kombo
    (v_company_id, 'Hamam + Masaj Kombo', 90, 750, v_expert_8,
     'Özel Paket', '#9333EA', true,
     'Klasik Türk hamamı (kese + köpük) ardından 45 dakika İsveç masajı. Tam gün rahatlık.',
     '2,5 saat ayırmanız önerilir. Aç karnına gelmeyin ama ağır yemek de yemeyin.',
     'Hamam ve masaj kontrendikasyonlarının tümü geçerlidir.'),

    -- 14. Anti-Stres Paketi
    (v_company_id, 'Anti-Stres Paketi', 90, 700, v_expert_7,
     'Özel Paket', '#9333EA', true,
     'Aromaterapi masajı + sıcak taş terapisi + kafa derisi masajı. Stres ve uykusuzluk için.',
     'Sessiz ve huzurlu bir seans geçirmek için telefonunuzu kapatınız.',
     'Migren atağı sırasında, yüksek ateş ve aktif enfeksiyon durumlarında uygulanmaz.'),

    -- 15. Spor Masajı
    (v_company_id, 'Spor Masajı', 50, 450, v_expert_6,
     'Masaj', '#2563EB', true,
     'Antrenman öncesi/sonrası kas performansını artıran ve toparlanmayı hızlandıran masaj.',
     'Antrenman sonrası en az 30 dakika bekleyiniz. Bol su için.',
     'Akut kas yırtığı, kırık, ciddi yaralanma durumlarında doktor onayı gereklidir.');

  RAISE NOTICE 'Hizmetler oluşturuldu: 15 adet';
  RAISE NOTICE '✅ MT Masaj seed işlemi başarıyla tamamlandı!';

END $$;

-- ============================================================
-- DOĞRULAMA SORGULARI (opsiyonel — kontrol için çalıştır)
-- ============================================================

-- Uzmanları listele
-- SELECT name, email, phone, role, color, pin_code FROM company_users
-- WHERE company_id = (SELECT id FROM companies WHERE name ILIKE '%MT%' LIMIT 1)
-- ORDER BY name;

-- Hizmetleri listele
-- SELECT s.description, s.duration || ' dk' as sure, s.price || ' ₺' as fiyat,
--        s.category, u.name as uzman
-- FROM company_services s
-- LEFT JOIN company_users u ON s.expert_id = u.id
-- WHERE s.company_id = (SELECT id FROM companies WHERE name ILIKE '%MT%' LIMIT 1)
-- ORDER BY s.category, s.description;
