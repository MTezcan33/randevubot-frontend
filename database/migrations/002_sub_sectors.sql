-- ============================================================
-- Sub-sektör temizleme ve yenileme migrasyonu
-- Çalıştırma: Supabase SQL Editor
-- Tarih: 2026-02-28
-- ============================================================

-- 1. code kolonu CHAR(2) → CHAR(4) olarak genişlet (AB01 formatı için)
ALTER TABLE sub_sectors ALTER COLUMN code TYPE CHAR(4);

-- 2. Mevcut tüm sub_sectors'ı sil (temiz başlangıç)
DELETE FROM sub_sectors;

-- ============================================================
-- GÜZELLİK VE KİŞİSEL BAKIM (AB) — 12 alt sektör
-- ============================================================
INSERT INTO sub_sectors (sector_id, name, code)
SELECT s.id, sub.name, sub.code
FROM sectors s,
(VALUES
  ('Kuaför / Berber',              'AB01'),
  ('Tırnak Salonu',                'AB02'),
  ('SPA ve Masaj',                 'AB03'),
  ('Güzellik Salonu',              'AB04'),
  ('Epilasyon Merkezi',            'AB05'),
  ('Kalıcı Makyaj',                'AB06'),
  ('Kirpik-Kaş Salonu',           'AB07'),
  ('Cilt Bakım Merkezi',           'AB08'),
  ('Erkek Bakım Merkezi / Berber', 'AB09'),
  ('Gelinlik Salonu / Kuaförü',   'AB10'),
  ('Solaryum',                     'AB11'),
  ('Lazer / Fotoepilasyon',        'AB12')
) AS sub(name, code)
WHERE s.code = 'AB';

-- ============================================================
-- SAĞLIK VE WELLNESS (AA) — 9 alt sektör
-- ============================================================
INSERT INTO sub_sectors (sector_id, name, code)
SELECT s.id, sub.name, sub.code
FROM sectors s,
(VALUES
  ('Fizyoterapi ve Rehabilitasyon', 'AA01'),
  ('Psikoloji / Terapi',            'AA02'),
  ('Diyetisyen / Beslenme',         'AA03'),
  ('Osteopati / Kayropraktik',      'AA04'),
  ('Akupunktur',                    'AA05'),
  ('Podoloji / Ayak Sağlığı',      'AA06'),
  ('Masaj Terapisi',                'AA07'),
  ('Medikal Estetik',               'AA08'),
  ('Meditasyon / Mindfulness',      'AA09')
) AS sub(name, code)
WHERE s.code = 'AA';

-- ============================================================
-- SPOR VE FİTNESS (AC) — 10 alt sektör
-- ============================================================
INSERT INTO sub_sectors (sector_id, name, code)
SELECT s.id, sub.name, sub.code
FROM sectors s,
(VALUES
  ('Spor Salonu / Gym',                'AC01'),
  ('Yoga / Pilates Stüdyosu',         'AC02'),
  ('Personal Training',                'AC03'),
  ('Dans Stüdyosu',                    'AC04'),
  ('Boks / Dövüş Sanatları Salonu',   'AC05'),
  ('Spinning / Bisiklet Stüdyosu',    'AC06'),
  ('Yüzme Dersi',                      'AC07'),
  ('Crossfit Box',                     'AC08'),
  ('Tenis / Padel Kortu',             'AC09'),
  ('Squash Salonu',                    'AC10')
) AS sub(name, code)
WHERE s.code = 'AC';

-- ============================================================
-- ETKİNLİK VE EĞLENCE (AK) — 9 alt sektör
-- ============================================================
INSERT INTO sub_sectors (sector_id, name, code)
SELECT s.id, sub.name, sub.code
FROM sectors s,
(VALUES
  ('Kaçış Odası (Escape Room)',   'AK01'),
  ('Bowling Salonu',               'AK02'),
  ('Laser Tag Arenası',            'AK03'),
  ('Go-Kart Pisti',               'AK04'),
  ('Trambolin Park',               'AK05'),
  ('Paintball Sahası',             'AK06'),
  ('Okçuluk / Atış Poligonu',     'AK07'),
  ('E-spor Cafe',                  'AK08'),
  ('Doğum Günü Organizasyonu',     'AK09')
) AS sub(name, code)
WHERE s.code = 'AK';

-- ============================================================
-- Sonuç kontrolü (kaç kayıt eklendi?)
-- ============================================================
SELECT s.name AS sektor, COUNT(ss.id) AS alt_sektor_sayisi
FROM sectors s
LEFT JOIN sub_sectors ss ON ss.sector_id = s.id
GROUP BY s.name, s.code
ORDER BY s.code;
