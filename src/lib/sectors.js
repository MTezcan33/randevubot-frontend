// Aktif sektör kodları (Supabase sectors tablosuyla eşleşmeli)
export const SECTOR_CODES = {
  "SAĞLIK VE WELLNESS": "AA",
  "GÜZELLİK VE KİŞİSEL BAKIM": "AB",
  "SPOR VE FİTNESS": "AC",
  "ETKİNLİK VE EĞLENCE": "AK",
};

const RAW_SECTORS_DATA = {
  "GÜZELLİK VE KİŞİSEL BAKIM": [
    "Kuaför / Berber",
    "Tırnak Salonu",
    "SPA ve Masaj",
    "Güzellik Salonu",
    "Epilasyon Merkezi",
    "Kalıcı Makyaj",
    "Kirpik-Kaş Salonu",
    "Cilt Bakım Merkezi",
    "Erkek Bakım Merkezi / Berber",
    "Gelinlik Salonu / Kuaförü",
    "Solaryum",
    "Lazer / Fotoepilasyon",
  ],
  "SAĞLIK VE WELLNESS": [
    "Fizyoterapi ve Rehabilitasyon",
    "Psikoloji / Terapi",
    "Diyetisyen / Beslenme",
    "Osteopati / Kayropraktik",
    "Akupunktur",
    "Podoloji / Ayak Sağlığı",
    "Masaj Terapisi",
    "Medikal Estetik",
    "Meditasyon / Mindfulness",
  ],
  "SPOR VE FİTNESS": [
    "Spor Salonu / Gym",
    "Yoga / Pilates Stüdyosu",
    "Personal Training",
    "Dans Stüdyosu",
    "Boks / Dövüş Sanatları Salonu",
    "Spinning / Bisiklet Stüdyosu",
    "Yüzme Dersi",
    "Crossfit Box",
    "Tenis / Padel Kortu",
    "Squash Salonu",
  ],
  "ETKİNLİK VE EĞLENCE": [
    "Kaçış Odası (Escape Room)",
    "Bowling Salonu",
    "Laser Tag Arenası",
    "Go-Kart Pisti",
    "Trambolin Park",
    "Paintball Sahası",
    "Okçuluk / Atış Poligonu",
    "E-spor Cafe",
    "Doğum Günü Organizasyonu",
  ],
};

// Supabase sectors/sub_sectors tablolarıyla uyumlu yapıya dönüştür
export const sectors = Object.entries(RAW_SECTORS_DATA).map(([mainSectorName, subSectorNames]) => {
  const mainSectorCode = SECTOR_CODES[mainSectorName];
  return {
    name: mainSectorName,
    code: mainSectorCode,
    subSectors: subSectorNames.map((subSectorName, index) => ({
      name: subSectorName,
      code: `${mainSectorCode}${(index + 1).toString().padStart(2, "0")}`,
    })),
  };
});
