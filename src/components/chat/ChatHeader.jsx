import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, X, PhoneOff } from 'lucide-react';

// Chat penceresi ust cubugu
const ChatHeader = ({ onClose, onEndChat, session }) => {
  const { t } = useTranslation();
  const isActive = !!session;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-2xl">
      {/* Sol: avatar + baslik + durum */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white leading-tight">
            {t('assistantTitle', 'Asistan')}
          </h3>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-300 animate-pulse' : 'bg-stone-300'}`}
            />
            <span className="text-[11px] text-emerald-100">
              {isActive
                ? t('assistantOnline', 'Cevrimici')
                : t('assistantOffline', 'Cevrimdisi')}
            </span>
          </div>
        </div>
      </div>

      {/* Sag: islem butonlari */}
      <div className="flex items-center gap-1">
        {/* Sohbeti sonlandir */}
        {isActive && onEndChat && (
          <button
            onClick={onEndChat}
            className="p-1.5 rounded-lg text-emerald-100 hover:bg-white/15 transition-colors"
            title={t('endChat', 'Sohbeti Sonlandir')}
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        )}

        {/* Kapat */}
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-emerald-100 hover:bg-white/15 transition-colors"
          title={t('close', 'Kapat')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
