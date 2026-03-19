import React from 'react';
import { useTranslation } from 'react-i18next';

// Asistan yazma animasyonu - 3 ziplayan nokta
const ChatTypingIndicator = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-start gap-2 px-4 py-2">
      {/* Bot avatar */}
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-bold">A</span>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          {/* Ziplayan noktalar */}
          <span
            className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '600ms' }}
          />
          <span
            className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
            style={{ animationDelay: '150ms', animationDuration: '600ms' }}
          />
          <span
            className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
            style={{ animationDelay: '300ms', animationDuration: '600ms' }}
          />
        </div>
        <p className="text-xs text-stone-400 mt-1">
          {t('assistantTyping', 'Asistan yaziyor...')}
        </p>
      </div>
    </div>
  );
};

export default ChatTypingIndicator;
