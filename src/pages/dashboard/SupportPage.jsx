import React from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { HelpCircle, Mail } from 'lucide-react';

const SupportPage = () => {
  const handleSupportClick = () => {
    window.location.href = "mailto:info@randevubot.net?subject=Destek Talebi";
  };

  return (
    <>
      <Helmet>
        <title>Destek | RandevuBot</title>
        <meta name="description" content="Yardım ve destek" />
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Destek</h1>
          <p className="text-slate-600">Size nasıl yardımcı olabiliriz?</p>
        </div>

        <div className="glass-effect rounded-2xl p-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <HelpCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Sıkça Sorulan Sorular</h2>
              <p className="text-slate-600">Yaygın soruların cevapları</p>
            </div>
          </div>

          <div className="space-y-4">
            <details className="glass-effect p-4 rounded-xl">
              <summary className="font-semibold cursor-pointer">WhatsApp entegrasyonu nasıl yapılır?</summary>
              <p className="mt-2 text-slate-600">WhatsApp entegrasyonu için ayarlar sayfasından telefon numaranızı doğrulamanız gerekmektedir.</p>
            </details>

            <details className="glass-effect p-4 rounded-xl">
              <summary className="font-semibold cursor-pointer">Randevu hatırlatmaları nasıl çalışır?</summary>
              <p className="mt-2 text-slate-600">Sistem otomatik olarak randevu saatinden 1 saat önce müşterilerinize WhatsApp üzerinden hatırlatma gönderir.</p>
            </details>

            <details className="glass-effect p-4 rounded-xl">
              <summary className="font-semibold cursor-pointer">Plan nasıl değiştirilir?</summary>
              <p className="mt-2 text-slate-600">Abonelik sayfasından istediğiniz plana geçiş yapabilirsiniz.</p>
            </details>
          </div>
        </div>

        <div className="glass-effect rounded-2xl p-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            Destek Talebi Oluştur
          </h2>
          <p className="text-slate-600 mb-4">Sorununuzu çözemediyseniz bize ulaşın</p>
          <Button onClick={handleSupportClick}>
            Destek Talebi Oluştur
          </Button>
          <p className="text-sm text-slate-500 mt-4">
            E-posta: info@randevubot.net
          </p>
        </div>
      </div>
    </>
  );
};

export default SupportPage;