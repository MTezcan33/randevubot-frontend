import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

// 5 kademeli doluluk renk skalasi
const OCCUPANCY_COLORS = [
  { max: 20, bg: '#dcfce7', text: '#166534', bar: '#86efac' },
  { max: 40, bg: '#fef9c3', text: '#854d0e', bar: '#fde047' },
  { max: 60, bg: '#fed7aa', text: '#9a3412', bar: '#fb923c' },
  { max: 80, bg: '#fecaca', text: '#991b1b', bar: '#f87171' },
  { max: 100, bg: '#fecdd3', text: '#881337', bar: '#fb7185' },
];

function getOccupancyStyle(percent) {
  const level = OCCUPANCY_COLORS.find(l => percent <= l.max) || OCCUPANCY_COLORS[4];
  return level;
}

const DAY_NAMES_SHORT = {
  tr: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
};

export default function MonthlyDayCard({
  date,
  dayOfMonth,
  dayOfWeek,
  occupancy,
  isToday,
  isSelected,
  isClosed,
  isPast,
  onClick,
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2) || 'tr';
  const dayName = (DAY_NAMES_SHORT[lang] || DAY_NAMES_SHORT.tr)[dayOfWeek];

  const massageOcc = occupancy?.massagePercent || 0;
  const facilityOcc = occupancy?.facilityPercent || 0;
  const totalCount = occupancy?.totalCount || 0;

  const massageStyle = getOccupancyStyle(massageOcc);
  const facilityStyle = getOccupancyStyle(facilityOcc);

  if (isClosed) {
    return (
      <div
        className={cn(
          'relative flex flex-col rounded-xl border p-2 select-none',
          'aspect-square',
          'bg-slate-50 border-slate-200 opacity-50 cursor-default'
        )}
      >
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-medium text-slate-400">{dayOfMonth}</span>
          <span className="text-[10px] text-slate-400">{dayName}</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px] text-slate-400 font-medium">{t('closed')}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative flex flex-col rounded-xl border p-2 cursor-pointer select-none',
        'aspect-square transition-all duration-150',
        'hover:shadow-md hover:-translate-y-0.5',
        isToday && !isSelected && 'border-blue-400 border-2',
        isSelected && 'border-emerald-500 border-2 bg-emerald-50/40',
        isPast && !isSelected && 'opacity-60',
        !isToday && !isSelected && !isPast && 'border-slate-200 bg-white hover:border-slate-300'
      )}
    >
      {/* Tarih + gun adi ayni satirda */}
      <div className="flex items-baseline gap-1 mb-auto">
        <span className={cn(
          'text-sm font-semibold',
          isToday ? 'text-blue-600' : isSelected ? 'text-emerald-700' : 'text-slate-800'
        )}>
          {dayOfMonth}
        </span>
        <span className={cn(
          'text-[10px]',
          isToday ? 'text-blue-500' : 'text-slate-400'
        )}>
          {dayName}
        </span>
        {isToday && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
        )}
      </div>

      {/* Doluluk barlari */}
      <div className="mt-auto space-y-1">
        {/* Masaj doluluk */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
            <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${massageOcc}%`, backgroundColor: massageStyle.bar }}
              />
            </div>
            {massageOcc > 0 && (
              <span className="text-[9px] font-medium tabular-nums" style={{ color: massageStyle.text }}>
                {massageOcc}%
              </span>
            )}
          </div>
        </div>

        {/* Tesis doluluk */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${facilityOcc}%`, backgroundColor: facilityStyle.bar }}
              />
            </div>
            {facilityOcc > 0 && (
              <span className="text-[9px] font-medium tabular-nums" style={{ color: facilityStyle.text }}>
                {facilityOcc}%
              </span>
            )}
          </div>
        </div>

        {/* Toplam randevu sayisi */}
        {totalCount > 0 && (
          <div className="text-center">
            <span className="text-[9px] text-slate-500">
              {totalCount}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
