import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarPlus,
  MessageSquare,
  CreditCard,
  UserPlus,
  Clock,
  Calculator,
} from 'lucide-react';

// Hizli islem cipler - on tanimli sorular
const quickActions = [
  { key: 'qaAppointment', fallback: 'Randevu nasil olusturulur?', icon: CalendarPlus },
  { key: 'qaWhatsApp', fallback: 'WhatsApp baglantisi', icon: MessageSquare },
  { key: 'qaPlans', fallback: 'Planlar ve fiyatlar', icon: CreditCard },
  { key: 'qaExpert', fallback: 'Uzman ekleme', icon: UserPlus },
  { key: 'qaWorkingHours', fallback: 'Calisma saatleri', icon: Clock },
  { key: 'qaAccounting', fallback: 'Muhasebe modulu', icon: Calculator },
];

const ChatQuickActions = ({ onSelect }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-2 px-4 py-3">
      {quickActions.map(({ key, fallback, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onSelect(t(key, fallback))}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                     bg-emerald-50 text-emerald-700 border border-emerald-200
                     rounded-full hover:bg-emerald-100 hover:border-emerald-300
                     transition-colors duration-150"
        >
          <Icon className="w-3.5 h-3.5" />
          {t(key, fallback)}
        </button>
      ))}
    </div>
  );
};

export default ChatQuickActions;
