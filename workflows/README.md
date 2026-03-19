# N8N Workflows

## Organizasyon
- `active/` — Uretimde calisan workflow'lar
- `disabled/` — Eski versiyonlar veya devre disi birakilmis workflow'lar

## Aktif Workflow'lar

| Dosya | Tetikleyici | Islem |
|-------|------------|-------|
| randevubot-ana-workflow-v3.json | Webhook (Evolution API) | WhatsApp mesaj → Gemini AI → randevu olustur/guncelle/iptal |
| gece-kusu.json | Cron (04:00) | Trial suresi dolan sirketlerin servisini durdur |
| reminder-cron.json | Cron (saatlik) | 24h ve 1h oncesi randevu hatirlatma mesaji |
| feedback-collector.json | Cron (30dk) | Randevu sonrasi memnuniyet anketi |
| admin-daily-summary.json | Cron (22:00) | Gunluk admin ozet raporu |
| stripe-webhook.json | Webhook (Stripe) | Odeme olaylari → Supabase guncelleme |
| randevu-bot-instance.json | Webhook | WhatsApp instance olusturma ve baglantisi |
| qr-disconnected.json | Webhook | WhatsApp baglanti kesme islemleri |

## Degisiklik Protokolu
1. Template workflow'u N8N'de deactivate et
2. Degisikligi yap
3. Test et (N8N test mode)
4. Activate et
5. Bu dizindeki JSON'u guncelle
