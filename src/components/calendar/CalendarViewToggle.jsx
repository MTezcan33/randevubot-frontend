import React from 'react';
import { DoorOpen, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CalendarViewToggle = ({ view, onChange }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
      <button
        onClick={() => onChange('expert')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          view === 'expert'
            ? 'bg-white text-emerald-700 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
        title={t('expertView') || 'Uzman Görünümü'}
      >
        <Users className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t('expertView') || 'Uzman'}</span>
      </button>
      <button
        onClick={() => onChange('room')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          view === 'room'
            ? 'bg-white text-emerald-700 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
        title={t('roomView') || 'Oda Görünümü'}
      >
        <DoorOpen className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t('roomView') || 'Oda'}</span>
      </button>
    </div>
  );
};

export default CalendarViewToggle;
