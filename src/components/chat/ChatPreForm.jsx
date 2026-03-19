import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Sparkles, ArrowRight } from 'lucide-react';
import ChatQuickActions from './ChatQuickActions';

// Sohbet baslamadan once gosterilen karsilama formu
const ChatPreForm = ({ onStartSession, isPublic }) => {
  const { t } = useTranslation();

  const handleQuickAction = (text) => {
    // Hizli islem secildiginde sohbeti baslatip mesaji gonder
    onStartSession(text);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Karsilama bolumu */}
      <div className="px-5 pt-6 pb-4 text-center">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
          <Bot className="w-7 h-7 text-white" />
        </div>

        <h3 className="text-base font-semibold text-stone-800 mb-1.5">
          {t('chatWelcomeTitle', 'Merhaba! Ben Asistan')}
        </h3>
        <p className="text-sm text-stone-500 leading-relaxed">
          {t('chatWelcomeMessage', 'Size nasil yardimci olabilirim?')}
        </p>

        {/* Public sayfada RandevuBot tanitimi */}
        {isPublic && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
            <div className="flex items-center justify-center gap-1.5 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700">RandevuBot</span>
            </div>
            <p className="text-xs text-emerald-600 leading-relaxed">
              {t(
                'chatPublicDesc',
                'WhatsApp entegrasyonlu randevu ve on muhasebe sistemi. Guzellik salonlari icin ozel tasarlandi.'
              )}
            </p>
          </div>
        )}
      </div>

      {/* Ayirici */}
      <div className="px-5">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-stone-200" />
          <span className="text-[11px] text-stone-400 font-medium">
            {t('chatQuickQuestions', 'Hizli Sorular')}
          </span>
          <div className="flex-1 h-px bg-stone-200" />
        </div>
      </div>

      {/* Hizli islemler */}
      <ChatQuickActions onSelect={handleQuickAction} />

      {/* Alt kisim: sohbet baslat butonu */}
      <div className="mt-auto px-5 pb-4 pt-2">
        <button
          onClick={() => onStartSession()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5
                     bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium
                     rounded-xl hover:from-emerald-700 hover:to-teal-700
                     transition-all duration-200 shadow-md shadow-emerald-200/50"
        >
          {t('startChat', 'Sohbeti Baslat')}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ChatPreForm;
