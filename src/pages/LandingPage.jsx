import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation, Trans } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import {
  MessageCircle,
  Bell,
  Sparkles,
  Check,
  Menu,
  X,
  Calendar,
  Users,
  Globe,
  Star,
  ChevronDown,
  ChevronUp,
  Leaf,
  Send,
  DollarSign,
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [demoMessages, setDemoMessages] = useState([]);
  const [demoStep, setDemoStep] = useState(0);
  const [demoStarted, setDemoStarted] = useState(false);
  const demoRef = useRef(null);
  const { t, i18n } = useTranslation();

  // Guzellik sektorune ozel 6 ozellik karti
  const features = [
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: t('beautyFeature1Title'),
      description: t('beautyFeature1Desc'),
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: t('beautyFeature2Title'),
      description: t('beautyFeature2Desc'),
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: t('beautyFeature3Title'),
      description: t('beautyFeature3Desc'),
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: t('beautyFeature4Title'),
      description: t('beautyFeature4Desc'),
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: t('beautyFeature5Title'),
      description: t('beautyFeature5Desc'),
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: t('beautyFeature6Title'),
      description: t('beautyFeature6Desc'),
    },
  ];

  // 3 abonelik plani
  const plans = [
    {
      name: t('planStarter'),
      price: 29,
      duration: t('durationMonthly'),
      popular: false,
      features: [
        t('feature1Expert'),
        t('feature247Assistant'),
        t('featureReminder'),
        t('featureAccounting'),
      ],
    },
    {
      name: t('planSalon'),
      price: 49,
      duration: t('durationMonthly'),
      popular: true,
      features: [
        t('feature3Expert'),
        t('feature247Assistant'),
        t('featureReminder'),
        t('featureAccounting'),
        t('featureFeedback'),
        t('featureReporting'),
      ],
    },
    {
      name: t('planPremium'),
      price: 79,
      duration: t('durationMonthly'),
      popular: false,
      features: [
        t('feature6Expert'),
        t('feature247Assistant'),
        t('featureReminder'),
        t('featureAccounting'),
        t('featureFeedback'),
        t('featureReporting'),
        t('featurePdfExport'),
        t('featurePrioritySupport'),
      ],
    },
  ];

  // Sorun-Cozum kartlari
  const problems = [
    {
      emoji: '📞',
      title: t('problem1Title'),
      desc: t('problem1Desc'),
      solution: t('problem1Solution'),
    },
    {
      emoji: '⏰',
      title: t('problem2Title'),
      desc: t('problem2Desc'),
      solution: t('problem2Solution'),
    },
    {
      emoji: '📊',
      title: t('problem3Title'),
      desc: t('problem3Desc'),
      solution: t('problem3Solution'),
    },
  ];

  // Musteri yorumlari
  const testimonials = [
    {
      name: t('testimonial1Name'),
      business: t('testimonial1Business'),
      text: t('testimonial1Text'),
      rating: 5,
    },
    {
      name: t('testimonial2Name'),
      business: t('testimonial2Business'),
      text: t('testimonial2Text'),
      rating: 5,
    },
    {
      name: t('testimonial3Name'),
      business: t('testimonial3Business'),
      text: t('testimonial3Text'),
      rating: 5,
    },
  ];

  // SSS — Accordion
  const faqs = [
    { q: t('faqLanding1Q'), a: t('faqLanding1A') },
    { q: t('faqLanding2Q'), a: t('faqLanding2A') },
    { q: t('faqLanding3Q'), a: t('faqLanding3A') },
    { q: t('faqLanding4Q'), a: t('faqLanding4A') },
    { q: t('faqLanding5Q'), a: t('faqLanding5A') },
    { q: t('faqLanding6Q'), a: t('faqLanding6A') },
  ];

  // Guzellik salonu WhatsApp demo konusmasi
  const demoFlow = [
    { sender: 'user', text: t('guzellikDemoUser1') },
    { sender: 'bot', text: t('guzellikDemoBot1') },
    { sender: 'user', text: t('guzellikDemoUser2') },
    { sender: 'bot', text: t('guzellikDemoBot2') },
    { sender: 'user', text: t('guzellikDemoUser3') },
    { sender: 'bot', text: t('guzellikDemoBot3') },
    { sender: 'user', text: t('guzellikDemoUser4') },
    { sender: 'bot', text: t('guzellikDemoBot4') },
    { sender: 'user', text: t('guzellikDemoUser5') },
    { sender: 'bot', text: t('guzellikDemoBot5') },
  ];

  // Demo bolumu gorunur oldugunda otomatik baslat
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !demoStarted) {
          setDemoStarted(true);
        }
      },
      { threshold: 0.3 }
    );
    if (demoRef.current) observer.observe(demoRef.current);
    return () => observer.disconnect();
  }, [demoStarted]);

  // Demo mesajlarini sirayla goster
  useEffect(() => {
    if (demoStarted && demoStep < demoFlow.length) {
      const timer = setTimeout(
        () => {
          setDemoMessages((prev) => [...prev, demoFlow[demoStep]]);
          setDemoStep((prev) => prev + 1);
        },
        demoStep === 0 ? 800 : 1500
      );
      return () => clearTimeout(timer);
    }
  }, [demoStarted, demoStep]);

  return (
    <>
      <Helmet>
        <title>{t('pageTitle')}</title>
        <meta name="description" content={t('metaDescription')} />
      </Helmet>

      <div className="min-h-screen" style={{ backgroundColor: '#FAF8F5' }}>
        {/* --- NAVIGASYON --- */}
        <nav className="fixed top-0 w-full backdrop-blur-md bg-white/85 border-b border-stone-200 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-2"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-800 to-teal-700 rounded-lg flex items-center justify-center">
                  <Leaf className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-emerald-800 to-teal-700 bg-clip-text text-transparent">
                  RandevuBot
                </span>
              </motion.div>

              <div className="hidden md:flex items-center space-x-2">
                <LanguageSwitcher />
                <Button variant="ghost" onClick={() => navigate('/login')}>
                  {t('login')}
                </Button>
                <Button
                  className="bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-900 hover:to-teal-800 text-white border-0"
                  onClick={() => navigate('/register')}
                >
                  {t('heroCta')}
                </Button>
              </div>

              <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="md:hidden py-4 space-y-2 border-t border-stone-200"
              >
                <LanguageSwitcher />
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    navigate('/login');
                    setMobileMenuOpen(false);
                  }}
                >
                  {t('login')}
                </Button>
                <Button
                  className="w-full bg-gradient-to-r from-emerald-800 to-teal-700 text-white border-0"
                  onClick={() => {
                    navigate('/register');
                    setMobileMenuOpen(false);
                  }}
                >
                  {t('heroCta')}
                </Button>
              </motion.div>
            )}
          </div>
        </nav>

        {/* --- HERO --- */}
        <section className="relative min-h-[90vh] flex items-center justify-center px-4 overflow-hidden bg-gradient-to-b from-white via-emerald-50/20 to-stone-100/30">
          {/* Dekoratif blob'lar */}
          <div className="absolute top-20 -left-32 w-96 h-96 bg-emerald-200/15 rounded-full blur-3xl" />
          <div className="absolute bottom-10 -right-32 w-80 h-80 bg-teal-200/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-100/10 rounded-full blur-3xl" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.0, ease: 'easeOut' }}
            >
              {/* Ust etiket */}
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-full px-4 py-1.5 text-sm font-medium mb-8 border border-emerald-100">
                <Sparkles className="w-4 h-4" />
                <span>{t('heroTag')}</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-light mb-8 text-stone-900 leading-tight tracking-tight">
                <Trans
                  i18nKey="heroTitle"
                  components={[
                    <span className="bg-gradient-to-r from-emerald-800 to-teal-700 bg-clip-text text-transparent font-normal" />,
                  ]}
                />
              </h1>

              <p className="text-xl md:text-2xl text-stone-500 font-light mt-4 mb-12 max-w-2xl mx-auto leading-relaxed">
                {t('heroSubtitle')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-900 hover:to-teal-800 text-white border-0 text-lg px-10 py-6 rounded-2xl shadow-lg shadow-emerald-900/20"
                  onClick={() => navigate('/register')}
                >
                  {t('heroCta')}
                </Button>
              </div>

              {/* Guven rozetleri */}
              <div className="flex flex-wrap justify-center gap-8 mt-16">
                {[
                  { emoji: '💆‍♀️', label: t('trustBadge1') },
                  { emoji: '📅', label: t('trustBadge2') },
                  { emoji: '🟢', label: t('trustBadge3') },
                ].map((badge, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 + i * 0.15 }}
                    className="flex items-center gap-2 text-stone-500 font-medium"
                  >
                    <span className="text-2xl">{badge.emoji}</span>
                    <span>{badge.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- SORUN-COZUM --- */}
        <section className="py-24 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-stone-900">
                {t('problemTitle')}
              </h2>
              <p className="text-stone-600 text-lg">{t('problemSubtitle')}</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {problems.map((prob, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.8 }}
                  className="bg-gradient-to-br from-stone-50 to-emerald-50/30 border border-stone-200 p-6 rounded-2xl"
                >
                  <div className="text-4xl mb-4">{prob.emoji}</div>
                  <h3 className="text-xl font-semibold mb-2 text-stone-900">{prob.title}</h3>
                  <p className="text-stone-600 mb-4">{prob.desc}</p>
                  <p className="text-emerald-700 font-medium text-sm">{prob.solution}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- OZELLIKLER --- */}
        <section id="features" className="py-24 px-4 bg-gradient-to-b from-white to-stone-50/60">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-stone-900">
                <Trans
                  i18nKey="featuresTitle"
                  components={[
                    <span className="bg-gradient-to-r from-emerald-800 to-teal-700 bg-clip-text text-transparent" />,
                  ]}
                />
              </h2>
              <p className="text-stone-600 text-lg">{t('featuresSubtitle')}</p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.8 }}
                  className="bg-white border border-stone-200 p-6 rounded-2xl hover:shadow-lg hover:border-emerald-200 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-800 to-teal-700 rounded-xl flex items-center justify-center text-white mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-stone-900">{feature.title}</h3>
                  <p className="text-stone-600">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- DEMO (TELEFON MOCKUP) --- */}
        <section className="py-24 px-4 bg-white" ref={demoRef}>
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-stone-900">
                <Trans
                  i18nKey="demoSectionTitle"
                  components={[
                    <span className="bg-gradient-to-r from-emerald-800 to-teal-700 bg-clip-text text-transparent" />,
                  ]}
                />
              </h2>
              <p className="text-stone-600 text-lg">{t('demoSectionSubtitle')}</p>
            </motion.div>

            <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20">
              {/* Telefon cercevesi */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="w-[300px] bg-gray-900 rounded-[42px] p-3 shadow-2xl ring-4 ring-gray-800 flex-shrink-0"
              >
                <div className="bg-gray-800 rounded-[36px] overflow-hidden">
                  {/* WhatsApp header */}
                  <div className="bg-green-600 flex items-center p-3 gap-2">
                    <div className="w-9 h-9 bg-emerald-200 rounded-full flex items-center justify-center text-lg">
                      💅
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">MT Beauty</p>
                      <p className="text-green-200 text-xs">{t('demoOnline')}</p>
                    </div>
                  </div>

                  {/* Mesajlar */}
                  <div className="bg-[#ECE5DD] h-[450px] overflow-y-auto p-3 space-y-2">
                    <AnimatePresence>
                      {demoMessages.map((msg, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] px-3 py-2 rounded-xl text-xs shadow-sm ${
                              msg.sender === 'user'
                                ? 'bg-[#DCF8C6] rounded-br-none'
                                : 'bg-white rounded-bl-none'
                            }`}
                          >
                            <p className="whitespace-pre-line text-gray-800 leading-relaxed">
                              {msg.text}
                            </p>
                            <p className="text-right text-[10px] text-gray-400 mt-0.5">
                              {new Date().toLocaleTimeString(i18n.language, {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {!demoStarted && (
                      <div className="flex justify-center items-center pt-8">
                        <button
                          onClick={() => setDemoStarted(true)}
                          className="bg-green-500 text-white px-5 py-2 rounded-full text-xs font-medium shadow-md"
                        >
                          {t('demoButton')}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Input alani */}
                  <div className="bg-[#F0F0F0] flex items-center gap-2 p-2">
                    <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-xs text-gray-400">
                      {t('demoPlaceholder')}
                    </div>
                    <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                      <Send className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Demo aciklamasi */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="max-w-sm text-left"
              >
                <h3 className="text-2xl font-semibold text-stone-900 mb-6">{t('demoSideTitle')}</h3>
                <ul className="space-y-4">
                  {[t('demoPoint1'), t('demoPoint2'), t('demoPoint3')].map((point, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-stone-600">{point}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-8 bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-900 hover:to-teal-800 text-white border-0"
                  onClick={() => navigate('/register')}
                >
                  {t('heroCta')}
                </Button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* --- FIYATLANDIRMA --- */}
        <section id="pricing" className="py-24 px-4 bg-gradient-to-b from-stone-50/60 to-white">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-stone-900">
                <Trans
                  i18nKey="pricingTitle"
                  components={[
                    <span className="bg-gradient-to-r from-emerald-800 to-teal-700 bg-clip-text text-transparent" />,
                  ]}
                />
              </h2>
              <p className="text-stone-600 text-lg mb-3">{t('pricingSubtitle')}</p>
              <span className="inline-block bg-emerald-50 text-emerald-700 text-sm font-medium px-4 py-1.5 rounded-full border border-emerald-100">
                {t('pricingTrialNote')}
              </span>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 items-center">
              {plans.map((plan, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.8 }}
                  className={`relative bg-white rounded-2xl p-8 flex flex-col ${
                    plan.popular
                      ? 'ring-2 ring-emerald-600 shadow-2xl scale-105'
                      : 'border border-stone-200 shadow-lg'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-700 text-white text-sm font-semibold px-4 py-1 rounded-full whitespace-nowrap">
                      {t('planMostPopular')}
                    </div>
                  )}

                  <h3 className="text-2xl font-bold mb-2 text-stone-900">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-stone-900">${plan.price}</span>
                    <span className="text-stone-500 ml-1">{plan.duration}</span>
                  </div>

                  <ul className="space-y-3 mb-8 flex-grow">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start text-sm text-stone-700">
                        <Check className="w-5 h-5 text-emerald-600 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full mt-auto ${
                      plan.popular
                        ? 'bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-900 hover:to-teal-800 text-white border-0'
                        : ''
                    }`}
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => navigate('/register')}
                  >
                    {t('heroCta')}
                  </Button>
                </motion.div>
              ))}
            </div>

            <p className="text-center text-stone-500 text-sm mt-10">
              ✓ {t('pricingAllPlansNote')}
            </p>
          </div>
        </section>

        {/* --- MUSTERI YORUMLARI --- */}
        <section className="py-24 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-stone-900">
                {t('testimonialsTitle')}
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.8 }}
                  className="bg-gradient-to-br from-stone-50 to-emerald-50/30 border border-stone-200 p-6 rounded-2xl"
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-stone-700 mb-4 italic">"{testimonial.text}"</p>
                  <div>
                    <p className="font-semibold text-stone-900">{testimonial.name}</p>
                    <p className="text-sm text-emerald-700">{testimonial.business}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SSS (FAQ) --- */}
        <section className="py-24 px-4 bg-gradient-to-b from-white to-stone-50/60">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-stone-900">
                {t('faqLandingTitle')}
              </h2>
            </motion.div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05, duration: 0.8 }}
                  className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm"
                >
                  <button
                    className="w-full flex justify-between items-center p-5 text-left font-semibold text-stone-900 hover:bg-stone-50 transition-colors"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    <span className="pr-4">{faq.q}</span>
                    {openFaq === index ? (
                      <ChevronUp className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    )}
                  </button>
                  {openFaq === index && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="px-5 pb-5 text-stone-600 leading-relaxed"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SON CTA --- */}
        <section className="py-24 px-4 bg-gradient-to-r from-emerald-800 to-teal-700">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">{t('ctaTitle')}</h2>
              <p className="text-emerald-100 text-lg mb-8">{t('ctaSubtitle')}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-white text-emerald-800 hover:bg-emerald-50 border-0 text-lg px-8 py-6 rounded-xl shadow-lg font-semibold"
                  onClick={() => navigate('/register')}
                >
                  {t('ctaButton')}
                </Button>
                <a
                  href="mailto:info@randevubot.net"
                  className="inline-flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 border border-white/40 text-white text-lg px-8 py-4 rounded-xl font-medium transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  {t('ctaContact')}
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="bg-stone-900 text-white py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-7 h-7 bg-gradient-to-br from-emerald-800 to-teal-700 rounded-lg flex items-center justify-center">
                    <Leaf className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="font-bold text-lg">RandevuBot</span>
                </div>
                <p className="text-stone-400 text-sm">{t('footerDesc')}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-4">{t('footerProduct')}</h4>
                <ul className="space-y-2 text-sm text-stone-400">
                  <li>
                    <a href="#features" className="hover:text-white transition-colors">
                      {t('footerFeatures')}
                    </a>
                  </li>
                  <li>
                    <a href="#pricing" className="hover:text-white transition-colors">
                      {t('footerPricing')}
                    </a>
                  </li>
                  <li>
                    <button
                      onClick={() => navigate('/login')}
                      className="hover:text-white transition-colors"
                    >
                      {t('login')}
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => navigate('/register')}
                      className="hover:text-white transition-colors"
                    >
                      {t('startFree')}
                    </button>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">{t('footerCompany')}</h4>
                <ul className="space-y-2 text-sm text-stone-400">
                  <li>
                    <a href="/legal" className="hover:text-white transition-colors">
                      {t('footerAbout')}
                    </a>
                  </li>
                  <li>
                    <a href="mailto:info@randevubot.net" className="hover:text-white transition-colors">
                      {t('footerContact')}
                    </a>
                  </li>
                  <li>
                    <a href="mailto:info@randevubot.net" className="hover:text-white transition-colors">
                      {t('footerSupport')}
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">{t('footerLegal')}</h4>
                <ul className="space-y-2 text-sm text-stone-400">
                  <li>
                    <a href="/legal" className="hover:text-white transition-colors">
                      {t('footerPrivacy')}
                    </a>
                  </li>
                  <li>
                    <a href="/legal" className="hover:text-white transition-colors">
                      {t('footerTerms')}
                    </a>
                  </li>
                  <li>
                    <a href="/legal" className="hover:text-white transition-colors">
                      {t('kvkk')}
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t border-stone-800 pt-8 text-center text-sm text-stone-400">
              <p>{t('copyright')}</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;
