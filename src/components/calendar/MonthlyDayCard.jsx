import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const getBarColor = (percent) => {
  if (percent <= 30) return '#86efac';
  if (percent <= 50) return '#a3e635';
  if (percent <= 70) return '#fbbf24';
  if (percent <= 85) return '#f97316';
  return '#ef4444';
};

const DAY_NAMES_SHORT = {
  tr: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
};

export default function MonthlyDayCard({
  date, dayOfMonth, dayOfWeek, occupancy,
  isToday, isSelected, isClosed, isPast, onClick,
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2) || 'tr';
  const dayName = (DAY_NAMES_SHORT[lang] || DAY_NAMES_SHORT.tr)[dayOfWeek];

  const massageOcc = occupancy?.massagePercent || 0;
  const facilityOcc = occupancy?.facilityPercent || 0;
  const massageCount = occupancy?.massageCount || 0;
  const facilityCount = occupancy?.facilityCount || 0;
  const massageMax = occupancy?.massageMax || 0;
  const facilityMax = occupancy?.facilityMax || 0;

  if (isClosed) {
    return (
      <div className="flex flex-col border-r border-b border-slate-100 bg-slate-50/70 p-1.5 select-none min-h-0 overflow-hidden">
        <div className="flex items-baseline gap-1 mb-auto">
          <span className="text-sm font-medium text-slate-300">{dayOfMonth}</span>
          <span className="text-[10px] text-slate-300">{dayName}</span>
        </div>
        <div className="flex items-center justify-center flex-1">
          <span className="text-[10px] text-slate-300 italic">{t('closed')}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex flex-col border-r border-b p-1.5 cursor-pointer select-none transition-all min-h-0 overflow-hidden',
        isToday && !isSelected && 'border-2 border-blue-400 rounded-lg bg-blue-50/20',
        isSelected && 'border-2 border-emerald-500 rounded-lg bg-emerald-50/30',
        isPast && !isSelected && !isToday && 'border-slate-100 bg-white opacity-70',
        !isToday && !isSelected && !isPast && 'border-slate-100 bg-white hover:bg-slate-50'
      )}
    >
      {/* Tarih + gun adi */}
      <div className="flex items-baseline gap-1 shrink-0">
        <span className={cn(
          'text-[15px] font-bold leading-none',
          isToday ? 'text-blue-600' : isSelected ? 'text-emerald-700' : 'text-slate-800'
        )}>
          {dayOfMonth}
        </span>
        <span className={cn(
          'text-[10px] leading-none',
          isToday ? 'text-blue-400' : 'text-slate-400'
        )}>
          {dayName}
        </span>
      </div>

      {/* Doluluk barlari — en alta sabitlenmis */}
      <div className="mt-auto space-y-0.5 shrink-0">
        {/* Masaj */}
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
          <span className="text-[8px] text-slate-400 w-7 shrink-0">{t('massageOccupancy').toLowerCase()}</span>
          <div className="flex-1 h-[4px] rounded-full bg-slate-100 overflow-hidden min-w-0">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, massageOcc)}%`, backgroundColor: getBarColor(massageOcc) }} />
          </div>
          <span className="text-[8px] font-bold text-slate-500 tabular-nums whitespace-nowrap shrink-0">
            %{massageOcc}
          </span>
          {massageMax > 0 && (
            <span className="text-[7px] text-slate-400 tabular-nums whitespace-nowrap shrink-0">
              {massageCount}/{massageMax}
            </span>
          )}
        </div>

        {/* Tesis */}
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-[8px] text-slate-400 w-7 shrink-0">{t('facilityOccupancy').toLowerCase()}</span>
          <div className="flex-1 h-[4px] rounded-full bg-slate-100 overflow-hidden min-w-0">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, facilityOcc)}%`, backgroundColor: getBarColor(facilityOcc) }} />
          </div>
          <span className="text-[8px] font-bold text-slate-500 tabular-nums whitespace-nowrap shrink-0">
            %{facilityOcc}
          </span>
          {facilityMax > 0 && (
            <span className="text-[7px] text-slate-400 tabular-nums whitespace-nowrap shrink-0">
              {facilityCount}/{facilityMax}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
