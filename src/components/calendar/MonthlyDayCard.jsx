import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

// Renk skalasi — mockup'a uygun
const getBarColor = (percent) => {
  if (percent <= 0) return '#e2e8f0';    // bos — gri
  if (percent <= 30) return '#86efac';   // yesil
  if (percent <= 50) return '#a3e635';   // acik yesil
  if (percent <= 70) return '#fbbf24';   // sari/turuncu
  if (percent <= 85) return '#f97316';   // turuncu
  return '#ef4444';                       // kirmizi
};

const getTextColor = (percent) => {
  if (percent <= 0) return '#94a3b8';
  if (percent <= 30) return '#16a34a';
  if (percent <= 50) return '#65a30d';
  if (percent <= 70) return '#d97706';
  if (percent <= 85) return '#ea580c';
  return '#dc2626';
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

  // Kapali gun
  if (isClosed) {
    return (
      <div className="flex flex-col rounded-lg border border-slate-200/50 bg-slate-50/50 p-1.5 min-h-0 overflow-hidden select-none">
        <div className="flex items-baseline gap-1">
          <span className="text-[13px] text-slate-300">{dayOfMonth}</span>
          <span className="text-[10px] text-slate-300">{dayName}</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px] text-slate-300 italic">{t('closed')}</span>
        </div>
      </div>
    );
  }

  // Tek bir occupancy row render helper
  const OccupancyRow = ({ label, percent, count, max, dotColor }) => (
    <div className="space-y-px">
      {/* Etiket + bar */}
      <div className="flex items-center gap-1">
        <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
        <span className="text-[8px] text-slate-400 leading-none">{label}</span>
      </div>
      {/* Renkli bar — tam genislik */}
      <div className="h-[5px] rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(percent > 0 ? 8 : 0, Math.min(100, percent))}%`,
            backgroundColor: getBarColor(percent),
          }}
        />
      </div>
      {/* %XX (sol) + X/X (sag) — bar altinda */}
      <div className="flex items-center justify-between">
        <span
          className="text-[8px] font-bold leading-none"
          style={{ color: getTextColor(percent) }}
        >
          %{percent}
        </span>
        {max > 0 && (
          <span className="text-[8px] text-slate-400 leading-none">
            {count}/{max}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex flex-col p-1.5 cursor-pointer select-none transition-all min-h-0 overflow-hidden rounded-lg border',
        isToday && !isSelected && 'border-blue-400 bg-blue-50/20',
        isSelected && 'border-emerald-500 bg-emerald-50/20 shadow-sm',
        isPast && !isSelected && !isToday && 'border-slate-200/70',
        !isToday && !isSelected && !isPast && 'border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/50'
      )}
    >
      {/* Gun numarasi + gun adi */}
      <div className="flex items-baseline gap-1 mb-auto shrink-0">
        <span className={cn(
          'text-[15px] font-bold leading-tight',
          isToday ? 'text-blue-600' : isSelected ? 'text-emerald-700' : 'text-slate-800'
        )}>
          {dayOfMonth}
        </span>
        <span className={cn(
          'text-[10px] leading-tight',
          isToday ? 'text-blue-400' : 'text-slate-400'
        )}>
          {dayName}
        </span>
      </div>

      {/* Doluluk bloklari — en alta */}
      <div className="mt-auto space-y-1 shrink-0">
        <OccupancyRow
          label={t('massageOccupancy').toLowerCase()}
          percent={massageOcc}
          count={massageCount}
          max={massageMax}
          dotColor="#a855f7"
        />
        <OccupancyRow
          label={t('facilityOccupancy').toLowerCase()}
          percent={facilityOcc}
          count={facilityCount}
          max={facilityMax}
          dotColor="#10b981"
        />
      </div>
    </div>
  );
}
