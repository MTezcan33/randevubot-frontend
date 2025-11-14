import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const LegalPage = () => {
  return (
    <>
      <Helmet>
        <title>Yasal | RandevuBot</title>
        <meta name="description" content="Gizlilik politikası ve kullanım şartları" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-4xl mx-auto py-8">
          <Link to="/" className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Ana Sayfaya Dön
          </Link>

          <div className="glass-effect rounded-3xl p-8 space-y-8">
            <section>
              <h1 className="text-3xl font-bold mb-4">Gizlilik Politikası</h1>
              <div className="space-y-4 text-slate-600">
                <p>
                  RandevuBot olarak kullanıcılarımızın gizliliğine önem veriyoruz. Bu gizlilik politikası, 
                  kişisel verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklamaktadır.
                </p>
                <h2 className="text-xl font-semibold text-slate-900 mt-6">Toplanan Bilgiler</h2>
                <p>
                  Hizmetlerimizi kullanırken firma adı, iletişim bilgileri, randevu verileri gibi bilgileri topluyoruz.
                </p>
                <h2 className="text-xl font-semibold text-slate-900 mt-6">Bilgilerin Kullanımı</h2>
                <p>
                  Toplanan bilgiler yalnızca hizmet kalitesini artırmak ve randevu yönetimi sağlamak için kullanılır.
                </p>
              </div>
            </section>

            <section>
              <h1 className="text-3xl font-bold mb-4">Kullanım Şartları</h1>
              <div className="space-y-4 text-slate-600">
                <p>
                  RandevuBot hizmetlerini kullanarak aşağıdaki şartları kabul etmiş olursunuz.
                </p>
                <h2 className="text-xl font-semibold text-slate-900 mt-6">Hizmet Kullanımı</h2>
                <p>
                  Hizmetlerimiz yalnızca yasal amaçlar için kullanılmalıdır. Kötüye kullanım durumunda hesabınız askıya alınabilir.
                </p>
                <h2 className="text-xl font-semibold text-slate-900 mt-6">Sorumluluklar</h2>
                <p>
                  Kullanıcılar, hesaplarının güvenliğinden ve girilen bilgilerin doğruluğundan sorumludur.
                </p>
              </div>
            </section>

            <section>
              <h1 className="text-3xl font-bold mb-4">KVKK / GDPR</h1>
              <div className="space-y-4 text-slate-600">
                <p>
                  Kişisel verileriniz KVKK ve GDPR düzenlemelerine uygun olarak işlenmektedir.
                </p>
                <h2 className="text-xl font-semibold text-slate-900 mt-6">Veri Saklama</h2>
                <p>
                  Verileriniz güvenli sunucularda saklanır ve yetkisiz erişime karşı korunur.
                </p>
                <h2 className="text-xl font-semibold text-slate-900 mt-6">Haklarınız</h2>
                <p>
                  Verilerinize erişim, düzeltme ve silme haklarına sahipsiniz. support@randevubot.com adresinden talepte bulunabilirsiniz.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default LegalPage;