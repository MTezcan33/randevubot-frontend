import React from 'react';
import { DoorOpen, Users, CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CalendarViewToggle = ({ view, onChange }) => {
  const { t } = useTranslation();

  const buttons = [
    { value: 'monthly', icon: CalendarDays, label: t('monthlyView') || 'Aylık' },
    { value: 'expert', icon: Users, label: t('expertView') || 'Uzman' },
    { value: 'room', icon: DoorOpen, label: t('roomView') || 'Oda' },
  ];

  return (
    <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden">
      {buttons.map((btn, i) => {
        const Icon = btn.icon;
        const isActive = view === btn.value;
        return (
          <button
            key={btn.value}
            onClick={() => onChange(btn.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
              i > 0 ? 'border-l border-slate-200' : ''
            } ${
              isActive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
            title={btn.label}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{btn.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default CalendarViewToggle;
