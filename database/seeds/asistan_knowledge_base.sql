-- ============================================================
-- Seed: Chatbot Bilgi Bankasi (chatbot_knowledge_base)
-- 9 kategori, 22 makale, Turkce icerik
-- Tarih: 2026-03-19
-- ============================================================

-- ============================================================
-- 1. GENEL BILGI (3 makale)
-- ============================================================

INSERT INTO chatbot_knowledge_base (category, title, content, language, priority) VALUES
('genel_bilgi', 'RandevuBot Nedir?',
'RandevuBot, guzellik merkezleri, kuaforler, masaj salonlari ve spa merkezleri icin gelistirilmis bir WhatsApp entegrasyonlu randevu yonetim ve on muhasebe platformudur. MT AI Systems LTD tarafindan gelistirilen bu SaaS (Software as a Service) cozumu, kucuk ve orta olcekli isletmelerin randevu sureclerini otomatiklestirmesine yardimci olur. Sistem uzerinden musterilerinize otomatik WhatsApp hatirlatmalari gonderebilir, randevulari yonetebilir, gelir-gider takibi yapabilir ve uzman performanslarini takip edebilirsiniz. Tum bunlar tek bir panelden, internet baglantisi olan herhangi bir cihazdan erisilebilir sekilde calisir.',
'tr', 10),

('genel_bilgi', 'RandevuBot Nasil Calisir?',
'RandevuBot''u kullanmaya baslamak cok kolaydir. Once randevubot.net uzerinden ucretsiz kayit olun. Kayit sirasinda isletme adinizi, ulkenizi ve saat diliminizi secin. Ardindan hizmetlerinizi, uzmanlarinizi ve calisma saatlerinizi tanimlayin. WhatsApp baglantisi icin telefon numaranizi ekleyip QR kodu taratmaniz yeterlidir. Bundan sonra musterileriniz WhatsApp uzerinden randevu alabilir, siz de dashboard uzerinden tum randevulari gorebilirsiniz. Sistem otomatik olarak musterilere hatirlatma mesajlari gonderir. Ayrica on muhasebe modulu ile gunluk gelir-gider takibinizi de yapabilirsiniz. 14 gunluk ucretsiz deneme suresi ile tum ozellikleri test edebilirsiniz.',
'tr', 9),

('genel_bilgi', 'Hangi Sektorler Icin Uygundur?',
'RandevuBot oncelikli olarak guzellik ve bakim sektoru icin optimize edilmistir. Kuaforler, guzellik merkezleri, masaj salonlari, spa merkezleri, cilt bakim studyolari, tirnak bakim salonlari, kirpik ve kas studyolari, epilasyon merkezleri ve benzeri isletmeler icin idealdir. Platform, randevu tabanli calisan her turlu hizmet isletmesine uygun olacak sekilde tasarlanmistir. Ileride klinikbot.net olarak saglik sektorune de acilmasi planlanmaktadir. Coklu sube yonetimi icin her sube ayri bir hesap olarak kayit olabilir ve kendi WhatsApp hatti ile bagimsiz sekilde calisabilir.',
'tr', 8);

-- ============================================================
-- 2. RANDEVULAR (3 makale)
-- ============================================================

INSERT INTO chatbot_knowledge_base (category, title, content, language, priority) VALUES
('randevular', 'Randevu Olusturma',
'Yeni bir randevu olusturmak icin Dashboard > Randevular sayfasina gidin ve "Randevu Olustur" butonuna tiklayin. Acilan formda sirasiyla musteri secin veya yeni musteri ekleyin, hizmet secin, uzman secin ve uygun tarih ile saat belirleyin. Sistem otomatik olarak secilen uzmanin musait oldugu saatleri gosterir. Randevu olusturuldugunda durumu otomatik olarak "beklemede" olarak ayarlanir. Eger WhatsApp baglantiniz aktifse, musteriye otomatik onay mesaji gonderilir. Takvim gorunumunde randevulari gunluk olarak gorebilir, surukle-birak ile saatlerini degistirebilirsiniz.',
'tr', 10),

('randevular', 'Randevu Guncelleme ve Iptal',
'Mevcut bir randevuyu guncellemek icin takvimde ilgili randevuya tiklayin. Acilan detay panelinde tarih, saat, uzman veya hizmet bilgilerini degistirebilirsiniz. Randevu durumunu da buradan guncelleyebilirsiniz. Iptal etmek icin durumu "iptal" olarak degistirin. Iptal edilen randevular takvimde farkli renkte gosterilir. Guncelleme yapildiginda musteriye otomatik WhatsApp bildirimi gonderilebilir. Dikkat: Gecmis tarihli randevularin durumunu degistirebilirsiniz ancak tarihini ileriye alamazsiniz.',
'tr', 9),

('randevular', 'Randevu Durumlari',
'RandevuBot''ta uc temel randevu durumu vardir. "Beklemede" durumu, randevu yeni olusturuldugunda varsayilan durumdur ve musterinin veya isletmenin onayi beklenir. "Onaylandi" durumu, randevunun kesinlestigini gosterir. Bu durumda musteriye hatirlatma mesajlari gonderilir (24 saat ve 1 saat once). "Iptal" durumu ise randevunun iptal edildigini belirtir. Iptal edilen randevular istatistiklerde ayri olarak takip edilir. Dashboard ana sayfasinda bugunun programini gorebilir, duruma gore filtreleme yapabilirsiniz. Webhook sistemi her durum degisikliginde otomatik olarak tetiklenir.',
'tr', 8);

-- ============================================================
-- 3. HIZMETLER (2 makale)
-- ============================================================

INSERT INTO chatbot_knowledge_base (category, title, content, language, priority) VALUES
('hizmetler', 'Hizmet Ekleme ve Duzenleme',
'Hizmetlerinizi yonetmek icin Dashboard > Hizmetler sayfasina gidin. "Yeni Hizmet Ekle" butonuyla yeni bir hizmet tanimlayabilirsiniz. Her hizmet icin ad, sure (dakika), fiyat ve aciklama bilgilerini girin. Hizmeti hangi uzmanlarin yapabilecegini de secebilirsiniz. Ornegin "Sac Boyama" hizmetini sadece boyama uzmani olan personele atayabilirsiniz. Mevcut hizmetleri duzenlemek icin hizmet kartindaki duzenleme ikonuna tiklayin. Hizmet silme islemi, o hizmete bagli aktif randevu yoksa mumkundur. Hizmet fiyatlari ve sureleri istediginiz zaman guncellenebilir.',
'tr', 7),

('hizmetler', 'Hizmet Fiyatlandirma ve Kategori Yonetimi',
'Her hizmet icin fiyat belirlerken para biriminiz otomatik olarak kayit sirasinda sectiiginiz ulkeye gore ayarlanir. Fiyatlar ondalikli olarak girilebilir (ornegin 150.50 TL). Hizmet suresi dakika cinsinden girilir ve randevu takviminde bu sure kadar yer ayrilir. Ornegin 60 dakikalik bir hizmet, takvimde bir saatlik blok olarak gosterilir. Birden fazla hizmeti ayni randevuya eklemek icin randevu olusturma sirasinda coklu hizmet secimi yapabilirsiniz. Toplam sure ve fiyat otomatik hesaplanir. Hizmetleri aktif/pasif yaparak gecici olarak sunumdan kaldirabilirsiniz.',
'tr', 6);

-- ============================================================
-- 4. PERSONEL (2 makale)
-- ============================================================

INSERT INTO chatbot_knowledge_base (category, title, content, language, priority) VALUES
('personel', 'Uzman Ekleme ve Yonetimi',
'Uzmanlarinizi (personel) yonetmek icin Dashboard > Personel sayfasina gidin. "Yeni Uzman Ekle" ile yeni personel tanimlayabilirsiniz. Her uzman icin ad, e-posta, telefon ve renk bilgisi girin. Renk bilgisi takvimde randevularin hangi uzmana ait oldugunu gorsel olarak ayirt etmenizi saglar. Abonelik planiniza gore uzman sayisi sinirlidir: Starter plani 1, Salon plani 3, Premium plani 6 uzman destekler. Limite ulastiginizda yeni uzman ekleyemezsiniz; planinizi yukseltmeniz gerekir. Uzman silme islemi, o uzmana ait aktif randevu yoksa mumkundur.',
'tr', 7),

('personel', 'Uzmanlara Hizmet Atamasi',
'Her uzmanin hangi hizmetleri verebilecegini belirleyebilirsiniz. Personel sayfasinda uzmanin detayina girin ve "Hizmet Atamasi" bolumunden ilgili hizmetleri secin. Ornegin bir uzman hem "Sac Kesimi" hem "Sac Boyama" yapabilirken, baska bir uzman sadece "Manikur" ve "Pedikur" yapabilir. Bu atama sayesinde randevu olusturulurken secilen hizmete gore sadece o hizmeti verebilen uzmanlar listelenir. Boylece yanlis uzman-hizmet eslesmesi onlenir. Bir uzmana atanan hizmetler istenildiginde guncellenebilir.',
'tr', 6);

-- ============================================================
-- 5. CALISMA SAATLERI (2 makale)
-- ============================================================

INSERT INTO chatbot_knowledge_base (category, title, content, language, priority) VALUES
('calisma_saatleri', 'Gunluk Calisma Saatleri Ayarlama',
'Calisma saatlerinizi yonetmek icin Dashboard > Calisma Saatleri sayfasina gidin. Burada her gun icin (Pazartesi-Pazar) ayri ayri baslangic ve bitis saati belirleyebilirsiniz. Kapali gunler icin o gunun "Acik" anahtarini kapatin. Ornegin Pazar gunu kapaliysa, o gun icin randevu olusturulamaz. Calisma saatleri uzman bazinda da ayarlanabilir; boylece her uzmanin farkli gunlerde calismasi mumkun olur. Takvim gorunumu 05:00 ile 24:00 arasini gosterir ve calisma saatleri disindaki bolgeler gri olarak isaretlenir. Degisiklikler kaydedildikten sonra hemen aktif olur.',
'tr', 7),

('calisma_saatleri', 'Tatil Gunleri ve Ozel Kapanis',
'Resmi tatiller veya ozel kapali gunler icin Dashboard > Calisma Saatleri sayfasindaki "Tatil Gunleri" bolumunu kullanin. Buradan belirli tarihleri tatil olarak isaretleyebilirsiniz. Tatil olarak isaretlenen gunlerde randevu olusturulamaz ve takvimde o gun ozel bir isaretleme ile gosterilir. Tekrarlayan tatiller (ornegin her yil 1 Ocak) icin yillik tekrar secenegi mevcuttur. Ayrica ogle molasi gibi gun ici kapali saatler icin calisma saatlerini ikiye bolerek tanimlayabilirsiniz. Ornegin 09:00-12:00 ve 13:00-18:00 seklinde ayarlayarak 12:00-13:00 arasini mola yapabilirsiniz.',
'tr', 6);

-- ============================================================
-- 6. MUHASEBE (2 makale)
-- ============================================================

INSERT INTO chatbot_knowledge_base (category, title, content, language, priority) VALUES
('muhasebe', 'Gelir ve Gider Takibi',
'On muhasebe modulune Dashboard > Muhasebe sayfasindan ulasabilirsiniz. Gelirler iki sekilde kaydedilir: Randevu tamamlandiginda otomatik gelir kaydi olusturulur (hizmet fiyati uzerinden) ve manuel gelir girisi de yapabilirsiniz. Giderler icin "Yeni Gider Ekle" butonunu kullanin. Gider kategorileri arasinda kira, malzeme, maas, fatura, reklam ve diger bulunur. Kendi ozel kategorilerinizi de ekleyebilirsiniz. Her islem icin tarih, tutar, kategori, aciklama ve odeme yontemi (nakit, kart, havale) bilgilerini girebilirsiniz. Islemler liste halinde goruntulenir ve tarih araligina gore filtrelenebilir.',
'tr', 7),

('muhasebe', 'Gunluk Kasa ve Raporlar',
'Gunluk kasa yonetimi icin Muhasebe sayfasindaki "Gunluk Kasa" sekmesini kullanin. Her gun icin kasa acilis bakiyenizi girin. Gun sonunda kasa kapanisi yaparak gunun toplam gelir ve giderini gorebilirsiniz. Sistem otomatik olarak beklenen kasa bakiyesini hesaplar. Raporlar sekmesinde haftalik ve aylik gelir-gider ozetlerini gorebilirsiniz. Grafikler ile gelir trendlerini takip edebilir, kategorilere gore gider dagilimini inceleyebilirsiniz. Aylik raporlari PDF olarak indirip muhasebecinize gonderebilirsiniz. Premium planda detayli raporlama ve PDF export ozelligi mevcuttur.',
'tr', 6);

-- ============================================================
-- 7. WHATSAPP (3 makale)
-- ============================================================

INSERT INTO chatbot_knowledge_base (category, title, content, language, priority) VALUES
('whatsapp', 'WhatsApp Baglantisi ve QR Kod',
'WhatsApp entegrasyonunu kurmak icin Dashboard > Ayarlar sayfasina gidin. Oncelikle isletmenizin WhatsApp numarasini girin ve kaydedin. Ardindan "WhatsApp Baglan" butonuna tiklayin. Ekranda bir QR kod gorunecektir. Telefonunuzda WhatsApp uygulamasini acin, Ayarlar > Bagli Cihazlar > Cihaz Bagla yolunu izleyin ve ekrandaki QR kodu taratın. Baglanti basarili olursa durum "Bagli" olarak degisecektir. QR kodun suresi sinirlidir; sure dolarsa "Yenile" butonuyla yeni QR kod alabilirsiniz. Baglanti koparsa sistem otomatik olarak sizi bilgilendirir.',
'tr', 10),

('whatsapp', 'Otomatik Hatirlatma Mesajlari',
'WhatsApp baglantiniz aktif oldugunda sistem otomatik olarak musterilerinize hatirlatma mesajlari gonderir. Randevu olusturuldugunda musteriye onay mesaji gider. Randevudan 24 saat once birinci hatirlatma ve 1 saat once ikinci hatirlatma mesaji gonderilir. Randevu iptal edildiginde de bilgilendirme mesaji iletilir. Mesaj sablonlari sistem tarafindan tanimlidir ve musterinizin adi, randevu tarihi, saati ve hizmet adi otomatik olarak mesaja eklenir. Hatirlatma mesajlari sayesinde randevu unutma ve gelmeme oranlari onemli olcude azalir.',
'tr', 9),

('whatsapp', 'WhatsApp AI Asistan Bot',
'WhatsApp AI asistan, musterilerinizin isletmenizle WhatsApp uzerinden etkilesime gecmesini saglar. Musteriler WhatsApp''tan mesaj gonderdiklerinde AI asistan otomatik olarak yanitlar. Musaitlik sorgulama, randevu alma, mevcut randevuyu sorgulama ve genel bilgi alma gibi islemler AI asistan tarafindan yonetilir. Asistan, isletmenizin hizmetlerini, uzmanlarini ve musait saatlerini bilerek musterilere dogru bilgi verir. Karmasik veya cozemedigi durumlarda konusmayi isletme sahibine yonlendirir (eskalasyon). AI asistan 7/24 calisir ve musterilerinize aninda yanit verir.',
'tr', 8);

-- ============================================================
-- 8. ABONELIK (2 makale)
-- ============================================================

INSERT INTO chatbot_knowledge_base (category, title, content, language, priority) VALUES
('abonelik', 'Abonelik Planlari ve Ozellikler',
'RandevuBot uc abonelik plani sunar. Starter plan aylik $29 olup 1 uzman destekler; randevu yonetimi, WhatsApp entegrasyonu, otomatik hatirlatma ve on muhasebe ozelliklerini icerir. Salon plan aylik $49 olup 3 uzman destekler; Starter''in tum ozelliklerine ek olarak musteri geri bildirimi ve detayli raporlama sunar. Premium plan aylik $79 olup 6 uzman destekler; tum ozelliklere ek olarak PDF export ve oncelikli destek icerir. Tum planlar 14 gunluk ucretsiz deneme suresiyle baslar ve deneme surecinde Salon plani ozellikleri aktiftir. Coklu sube indirimi: 3+ sube icin %15, 5+ sube icin %20 indirim.',
'tr', 9),

('abonelik', 'Deneme Suresi ve Odeme',
'Kayit oldugunuzda otomatik olarak 14 gunluk ucretsiz deneme sureci baslar. Bu sure boyunca Salon planinin tum ozelliklerini kullanabilirsiniz. Deneme suresi dolmadan once Dashboard > Faturalama sayfasindan bir plan secip odeme bilgilerinizi girerek aboneliginizi baslatin. Odeme Stripe altyapisi ile guvenlice islenir. Deneme suresi bittiginde odeme yapilmamissa hizmet durdurulur ancak verileriniz 30 gun boyunca saklanir. Bu sure icinde odeme yaparsaniz kaldiginiz yerden devam edersiniz. Aboneliginizi istediginiz zaman yukseltebilir, dusurultebilir veya iptal edebilirsiniz. Kupon kodunuz varsa odeme sirasinda uygulayabilirsiniz.',
'tr', 8);

-- ============================================================
-- 9. SORUN GIDERME (3 makale)
-- ============================================================

INSERT INTO chatbot_knowledge_base (category, title, content, language, priority) VALUES
('sorun_giderme', 'WhatsApp Baglanti Sorunlari',
'WhatsApp baglantisinizda sorun yasiyorsaniz su adimlari izleyin. Oncelikle telefonunuzun internete bagli oldugundan emin olun; WhatsApp Web baglantisi icin telefonun aktif olmasi gerekir. Baglanti koptuysa Ayarlar sayfasinda durumun "Baglanti Kesildi" olarak gorundugunu kontrol edin ve "Yeniden Baglan" butonuna tiklayin. Yeni QR kod olusacaktir; telefonunuzdan taratin. Eger surekli baglanti kopuyorsa telefonunuzdaki WhatsApp > Bagli Cihazlar boluumunden mevcut baglantilari kaldirip tekrar baglantı kurun. Sorun devam ederse internet saglayicinizi veya VPN kullanimi varsa kontrol edin.',
'tr', 10),

('sorun_giderme', 'QR Kod Yenileme ve Zaman Asimi',
'QR kodun belirli bir gecerlilik suresi vardir. Sure dolarsa QR kod gecersiz olur ve yenisinin alinmasi gerekir. Ayarlar sayfasinda "QR Kodu Yenile" butonuna tiklayarak yeni kod alabilirsiniz. QR kod gorunmuyor veya yuklenmediyse sayfayi yenileyin (F5). Hala goruntulenemiyorsa tarayici onbellegini temizleyin ve tekrar deneyin. QR kodu taratirken telefonunuzun kamerasinin net goruntulediginden emin olun. Ayrica telefonunuzdaki WhatsApp uygulamasinin guncel surum oldugunu kontrol edin; eski surumler baglanti sorunlarina neden olabilir. Farkli bir tarayici denemek de sorunu cozebilir.',
'tr', 9),

('sorun_giderme', 'Sik Karsilasilan Hatalar ve Cozumleri',
'Giris yapilamiyor: E-posta ve sifrenizi kontrol edin, gerekirse "Sifremi Unuttum" ile sifre sifirlayin. Randevu olusturulamiyor: Secilen uzmanin o gunde calisma saati tanimli mi ve musait mi kontrol edin; tatil gunlerinde randevu olusturulamaz. Hizmet veya uzman silinemiyor: Aktif randevusu olan hizmet veya uzman silinemez; once ilgili randevulari iptal edin. Dashboard yuklenmiyor: Internet baglantinizi kontrol edin, sayfayi yenileyin, farkli bir tarayici deneyin. Muhasebe verileri gorunmuyor: Secili tarih araligini kontrol edin, filtrelerinizi sifirlayin. Bildirimler gelmiyor: WhatsApp baglantinizin aktif oldugunu Ayarlar sayfasindan dogrulayin. Herhangi bir sorunda Destek sayfasindan bize ulasabilirsiniz.',
'tr', 8);
