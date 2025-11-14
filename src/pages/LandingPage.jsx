import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation, Trans } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { 
  MessageCircle, 
  Clock, 
  Users, 
  Bell, 
  Sparkles, 
  Stethoscope, 
  Wrench, 
  GraduationCap, 
  Check, 
  Menu, 
  X, 
  BarChart3, 
  Scale as Balance 
} from 'lucide-react';
import DemoModal from '@/components/DemoModal';

const LandingPage = () => {
  const navigate = useNavigate();
  const [showDemo, setShowDemo] = useState(false);
  const [demoContent, setDemoContent] = useState('law_office');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();

  const features = [
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: t('feature2Title'),
      description: t('feature2Desc')
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: t('feature1Title'),
      description: t('feature1Desc')
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: t('feature3Title'),
      description: t('feature3Desc')
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: t('feature4Title'),
      description: t('feature4Desc')
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: t('feature5Title'),
      description: t('feature5Desc')
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: t('feature6Title'),
      description: t('feature6Desc')
    }
  ];

  const sectors = [
    { icon: <Stethoscope className="w-8 h-8" />, name: t('sectorKlinikNew'), demo: 'klinik' }, // Sağlık & Klinik Hizmetleri
    { icon: <Sparkles className="w-8 h-8" />, name: t('sectorGuzellikNew'), demo: 'guzellik' }, // Güzellik & Bakım
    { icon: <Balance className="w-8 h-8" />, name: t('sectorLawNew'), demo: 'law_office' }, // Hukuk & Danışmanlık
    { icon: <Wrench className="w-8 h-8" />, name: t('sectorServisNew'), demo: 'servis' }, // Teknik Servis & Hizmet Alımı
    { icon: <GraduationCap className="w-8 h-8" />, name: t('sectorOgretmenNew'), demo: 'ogretmen' } // Eğitim & Özel Ders
  ];
  
  const plans = [
    { 
        name: "Free", 
        price: 0, 
        duration: "14 Gün Ücretsiz", 
        features: [
            "1 Uzman için randevu takvimi", 
            "7/24 çalışan randevu asistanı", 
            "Müşterinin dilinde cevap vererek randevu oluşturma",
            "Müşteri hatırlatma"
        ],
        cta: t('startFree'),
    },
    { 
        name: "Standard", 
        price: 19, 
        duration: "/ ay", 
        features: [
            "1 Uzman için randevu takvimi",
            "7/24 çalışan randevu asistanı",
            "Müşterinin dilinde cevap vererek randevu oluşturma",
            "Müşteri hatırlatma"
        ],
        cta: t('getStarted'),
    },
    { 
        name: "Standard Plus", 
        price: 39, 
        duration: "/ ay", 
        features: [
            "3 Uzman için randevu takvimi",
            "7/24 çalışan randevu asistanı",
            "Müşterinin dilinde cevap vererek randevu oluşturma",
            "Müşteri hatırlatma"
        ],
        cta: t('getStarted'),
    },
    { 
        name: "Pro", 
        price: 69, 
        duration: "/ ay", 
        features: [
            "6 Uzman için randevu takvimi",
            "7/24 çalışan randevu asistanı",
            "Müşterinin dilinde cevap vererek randevu oluşturma",
            "Müşteri hatırlatma"
        ],
        cta: t('getStarted'),
    },
    { 
        name: "Pro Plus", 
        price: 89, 
        duration: "/ ay", 
        features: [
            "9 Uzman için randevu takvimi",
            "7/24 çalışan randevu asistanı",
            "Müşterinin dilinde cevap vererek randevu oluşturma",
            "Müşteri hatırlatma"
        ],
        cta: t('getStarted'),
    }
  ];
  
  const handleDemo = (sectorDemo) => {
    setDemoContent(sectorDemo);
    setShowDemo(true);
  };


  return (
    <>
      <Helmet>
        <title>{t('pageTitle')}</title>
        <meta name="description" content={t('metaDescription')} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <nav className="fixed top-0 w-full glass-effect z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-2"
              >
                <MessageCircle className="w-8 h-8 text-blue-600" />
                <span className="text-xl font-bold gradient-text">RandevuBot</span>
              </motion.div>

              <div className="hidden md:flex items-center space-x-2">
                <LanguageSwitcher />
                <Button variant="ghost" onClick={() => navigate('/login')}>
                  {t('login')}
                </Button>
                <Button onClick={() => navigate('/register')}>
                  {t('startFree')}
                </Button>
              </div>

              <button 
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            {mobileMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="md:hidden py-4 space-y-2"
              >
                 <LanguageSwitcher />
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                >
                  {t('login')}
                </Button>
                <Button 
                  className="w-full"
                  onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}
                >
                  {t('startFree')}
                </Button>
              </motion.div>
            )}
          </div>
        </nav>

        <section className="pt-40 pb-24 px-4 bg-gradient-to-b from-white via-blue-50/30 to-purple-50/20">
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                 <Trans i18nKey="heroTitle">
                    <span className="gradient-text">WhatsApp</span> üzerinden<br />
                    AI destekli randevu sistemi
                 </Trans>
              </h1>
              <p className="text-2xl md:text-3xl font-medium text-slate-800 mt-4 mb-10 max-w-3xl mx-auto leading-relaxed">
                {t('heroSubtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={() => navigate('/register')}>
                  {t('startFree')}
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mt-16"
            >
                <img className="rounded-2xl shadow-2xl mx-auto max-w-4xl w-full" alt="WhatsApp appointment system interface showing a completed doctor appointment conversation" src="https://images.unsplash.com/photo-1593150543200-56e05bdb018e" />
            </motion.div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                <Trans i18nKey="sectorsTitle">Hangi <span className="gradient-text">Sektörler</span> İçin?</Trans>
              </h2>
              <p className="text-slate-600 text-lg">
                {t('sectorsSubtitle')}
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {sectors.map((sector, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative glass-effect p-6 rounded-2xl text-center hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 cursor-pointer"
                  onClick={() => handleDemo(sector.demo)}
                >
                  {/* Play ikonu */}
                  <div className="absolute top-3 right-3 text-xl hover:scale-110 transition-transform duration-200">
                    🎥
                  </div>

                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white mx-auto mb-4">
                    {sector.icon}
                  </div>
                  <p className="font-semibold">{sector.name}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="py-20 px-4 bg-white/50">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                <Trans i18nKey="featuresTitle">
                    İşinizi Kolaylaştıran <span className="gradient-text">Akıllı Özellikler</span>
                </Trans>
              </h2>
              <p className="text-slate-600 text-lg">
                {t('featuresSubtitle')}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-effect p-6 rounded-2xl hover:shadow-2xl transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-slate-600">{feature.description.split('<br />').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20 px-4 bg-white/50">
          <div className="max-w-screen-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                <Trans i18nKey="pricingTitle">
                  Bütçenize <span className="gradient-text">Uygun Akıllı Çözümler</span>
                </Trans>
              </h2>
              <p className="text-slate-600 text-lg">
                {t('pricingSubtitle')}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {plans.map((plan, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-effect p-6 rounded-2xl flex flex-col"
                >
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">{plan.price > 0 ? `$${plan.price}`: 'Free'}</span>
                    <span className="text-slate-600">{plan.duration}</span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-grow">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start text-sm">
                        <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full mt-auto"
                    onClick={() => navigate('/register')}
                  >
                    {plan.cta}
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <footer className="bg-slate-900 text-white py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <MessageCircle className="w-6 h-6" />
                  <span className="font-bold">RandevuBot</span>
                </div>
                <p className="text-slate-400 text-sm">
                  {t('metaDescription')}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-4">{t('footerProduct')}</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><a href="#features" className="hover:text-white transition-colors">{t('footerFeatures')}</a></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors">{t('footerPricing')}</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">{t('footerCompany')}</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><a href="/legal" className="hover:text-white transition-colors">{t('footerAbout')}</a></li>
                  <li><a href="mailto:info@randevubot.net" className="hover:text-white transition-colors">{t('footerContact')}</a></li>
                  <li><a href="mailto:info@randevubot.net" className="hover:text-white transition-colors">{t('footerSupport')}</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">{t('footerLegal')}</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><a href="/legal" className="hover:text-white transition-colors">{t('footerPrivacy')}</a></li>
                  <li><a href="/legal" className="hover:text-white transition-colors">{t('footerTerms')}</a></li>
                  <li><a href="/legal" className="hover:text-white transition-colors">{t('kvkk')}</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
              <p>{t('copyright')}</p>
            </div>
          </div>
        </footer>

        <DemoModal open={showDemo} onClose={() => setShowDemo(false)} contentType={demoContent}/>
      </div>
    </>
  );
};

export default LandingPage;