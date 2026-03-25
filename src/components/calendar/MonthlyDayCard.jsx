import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

// 5 kademeli doluluk renk skalasi — screenshot'a uygun
const getBarColor = (percent) => {
  if (percent <= 30) return '#86efac'; // yesil
  if (percent <= 50) return '#a3e635'; // acik yesil
  if (percent <= 70) return '#fbbf24'; // sari/turuncu
  if (percent <= 85) return '#f97316'; // turuncu
  return '#ef4444'; // kirmizi
};

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
  const massageCount = occupancy?.massageCount || 0;
  const facilityCount = occupancy?.facilityCount || 0;
  const massageMax = occupancy?.massageMax || 0;
  const facilityMax = occupancy?.facilityMax || 0;

  // Kapali gun (pazar)
  if (isClosed) {
    return (
      <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-1.5 select-none opacity-50 aspect-square">
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
        'flex flex-col rounded-xl border p-1.5 cursor-pointer select-none',
        'aspect-square transition-all duration-150',
        'hover:shadow-md hover:-translate-y-0.5',
        isToday && !isSelected && 'border-blue-400 border-2',
        isSelected && 'border-emerald-500 border-2 bg-emerald-50/30',
        isPast && !isSelected && 'opacity-60',
        !isToday && !isSelected && !isPast && 'border-slate-200 bg-white hover:border-slate-300'
      )}
    >
      {/* Tarih + gun adi */}
      <div className="flex items-baseline gap-1 mb-1">
        <span className={cn(
          'text-sm font-bold leading-none',
          isToday ? 'text-blue-600' : isSelected ? 'text-emerald-700' : 'text-slate-800'
        )}>
          {dayOfMonth}
        </span>
        <span className={cn(
          'text-[10px] leading-none',
          isToday ? 'text-blue-500' : 'text-slate-400'
        )}>
          {dayName}
        </span>
      </div>

      {/* Doluluk barlari — "masaj" ve "tesis" etiketli */}
      <div className="mt-auto space-y-0.5">
        {/* Masaj satiri */}
        <div className="space-y-px">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
            <span className="text-[8px] text-slate-500 leading-none">{t('massageOccupancy').toLowerCase()}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex-1 h-[5px] rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, massageOcc)}%`, backgroundColor: getBarColor(massageOcc) }}
              />
            </div>
            <span className="text-[8px] font-semibold text-slate-600 tabular-nums whitespace-nowrap leading-none">
              %{massageOcc}
            </span>
            {massageMax > 0 && (
              <span className="text-[8px] text-slate-400 tabular-nums whitespace-nowrap leading-none">
                {massageCount}/{massageMax}
              </span>
            )}
          </div>
        </div>

        {/* Tesis satiri */}
        <div className="space-y-px">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[8px] text-slate-500 leading-none">{t('facilityOccupancy').toLowerCase()}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex-1 h-[5px] rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, facilityOcc)}%`, backgroundColor: getBarColor(facilityOcc) }}
              />
            </div>
            <span className="text-[8px] font-semibold text-slate-600 tabular-nums whitespace-nowrap leading-none">
              %{facilityOcc}
            </span>
            {facilityMax > 0 && (
              <span className="text-[8px] text-slate-400 tabular-nums whitespace-nowrap leading-none">
                {facilityCount}/{facilityMax}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
