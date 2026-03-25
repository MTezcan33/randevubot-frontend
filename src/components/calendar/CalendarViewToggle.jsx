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
    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
      {buttons.map(btn => {
        const Icon = btn.icon;
        const isActive = view === btn.value;
        return (
          <button
            key={btn.value}
            onClick={() => onChange(btn.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              isActive
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
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
