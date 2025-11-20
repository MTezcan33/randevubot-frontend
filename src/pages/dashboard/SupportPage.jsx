import React from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { HelpCircle, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SupportPage = () => {
  const { t } = useTranslation();
  
  const handleSupportClick = () => {
    window.location.href = `mailto:info@randevubot.net?subject=${t('createSupportTicket')}`;
  };

  return (
    <>
      <Helmet>
        <title>{t('supportTitle')} | RandevuBot</title>
        <meta name="description" content={t('supportSubtitle')} />
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t('supportTitle')}</h1>
          <p className="text-slate-600">{t('supportSubtitle')}</p>
        </div>

        <div className="glass-effect rounded-2xl p-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <HelpCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">{t('faq')}</h2>
              <p className="text-slate-600">{t('faqAnswers')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <details className="glass-effect p-4 rounded-xl">
              <summary className="font-semibold cursor-pointer">{t('faqQuestion1')}</summary>
              <p className="mt-2 text-slate-600">{t('faqAnswer1')}</p>
            </details>

            <details className="glass-effect p-4 rounded-xl">
              <summary className="font-semibold cursor-pointer">{t('faqQuestion2')}</summary>
              <p className="mt-2 text-slate-600">{t('faqAnswer2')}</p>
            </details>

            <details className="glass-effect p-4 rounded-xl">
              <summary className="font-semibold cursor-pointer">{t('faqQuestion3')}</summary>
              <p className="mt-2 text-slate-600">{t('faqAnswer3')}</p>
            </details>
          </div>
        </div>

        <div className="glass-effect rounded-2xl p-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            {t('createSupportTicket')}
          </h2>
          <p className="text-slate-600 mb-4">{t('cantSolve')}</p>
          <Button onClick={handleSupportClick}>
            {t('createTicketButton')}
          </Button>
          <p className="text-sm text-slate-500 mt-4">
            {t('emailSupport')}
          </p>
        </div>
      </div>
    </>
  );
};

export default SupportPage;