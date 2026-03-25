import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMonthlyOccupancy } from '@/hooks/useMonthlyOccupancy';
import { getSpaces } from '@/services/resourceService';
import MonthlyDayCard from './MonthlyDayCard';
import DayDetailPanel from './DayDetailPanel';

const WEEKDAY_HEADERS = {
  tr: ['pzt', 'sal', 'car', 'per', 'cum', 'cmt', 'paz'],
  en: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  ru: ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'],
};

const MONTH_NAMES = {
  tr: ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
};

export default function MonthlyCalendar() {
  const { t, i18n } = useTranslation();
  const { company, staff, workingHours } = useAuth();
  const lang = i18n.language?.substring(0, 2) || 'tr';

  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [spaces, setSpaces] = useState([]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  const experts = useMemo(
    () => (staff || []).filter(s => s.role === 'Uzman'),
    [staff]
  );

  useEffect(() => {
    if (company?.id) {
      getSpaces(company.id).then(data => setSpaces(data || []));
    }
  }, [company?.id]);

  const { occupancyMap, loading } = useMonthlyOccupancy(
    company?.id, viewMonth, workingHours, experts, spaces
  );

  const goToPrevMonth = () => {
    setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(null);
  };
  const goToNextMonth = () => {
    setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  // Takvim grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const days = [];
    for (let i = 0; i < startOffset; i++) {
      days.push({ type: 'empty', key: `empty-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dayOfWeek = dateObj.getDay();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isPast = dateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      days.push({
        type: 'day', key: dateStr, date: dateStr, dayOfMonth: d, dayOfWeek,
        isToday: dateStr === todayStr, isSelected: dateStr === selectedDay,
        isClosed: dayOfWeek === 0, isPast,
        occupancy: occupancyMap[dateStr] || null,
      });
    }
    return days;
  }, [year, month, selectedDay, occupancyMap]);

  // Ay toplam istatistikler
  const monthStats = useMemo(() => {
    let totalMassage = 0, totalFacility = 0, totalCount = 0;
    let totalMassageMax = 0, totalFacilityMax = 0;
    Object.values(occupancyMap).forEach(occ => {
      totalMassage += occ.massageCount || 0;
      totalFacility += occ.facilityCount || 0;
      totalCount += occ.totalCount || 0;
      totalMassageMax += occ.massageMax || 0;
      totalFacilityMax += occ.facilityMax || 0;
    });
    const overallPercent = (totalMassageMax + totalFacilityMax) > 0
      ? Math.round(((totalMassage + totalFacility) / (totalMassageMax + totalFacilityMax)) * 100)
      : 0;
    return { totalMassage, totalFacility, totalCount, overallPercent };
  }, [occupancyMap]);

  const monthName = (MONTH_NAMES[lang] || MONTH_NAMES.tr)[month];
  const weekHeaders = WEEKDAY_HEADERS[lang] || WEEKDAY_HEADERS.tr;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-800">{t('appointments')}</h2>
          <div className="flex items-center gap-2">
            <button onClick={goToPrevMonth} className="w-7 h-7 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-sm font-semibold text-slate-700 min-w-[130px] text-center">
              {monthName} {year}
            </span>
            <button onClick={goToNextMonth} className="w-7 h-7 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Istatistik kutulari — screenshot formatinda */}
        <div className="flex items-center gap-2">
          <div className="border border-slate-200 rounded-lg px-3 py-1.5 text-center">
            <div className="text-sm font-bold text-slate-800">{monthStats.totalMassage}</div>
            <div className="text-[10px] text-slate-500">{t('massageOccupancy').toLowerCase()}</div>
          </div>
          <div className="border border-slate-200 rounded-lg px-3 py-1.5 text-center">
            <div className="text-sm font-bold text-slate-800">{monthStats.totalFacility}</div>
            <div className="text-[10px] text-slate-500">{t('facilityOccupancy').toLowerCase()}</div>
          </div>
          <div className="border border-slate-200 rounded-lg px-3 py-1.5 text-center">
            <div className="text-sm font-bold text-slate-800">%{monthStats.overallPercent}</div>
            <div className="text-[10px] text-slate-500">doluluk</div>
          </div>
        </div>
      </div>

      {/* Hafta gunu basliklari */}
      <div className="grid grid-cols-7 gap-1.5 mb-1">
        {weekHeaders.map((day, i) => (
          <div key={i} className="text-center text-[11px] font-medium text-slate-400 py-0.5">
            {day}
          </div>
        ))}
      </div>

      {/* Takvim grid — tum ay sayfaya sigmali */}
      <div className="grid grid-cols-7 gap-1.5 flex-1">
        {calendarDays.map(day => {
          if (day.type === 'empty') {
            return <div key={day.key} className="aspect-square" />;
          }
          return (
            <MonthlyDayCard
              key={day.key}
              date={day.date}
              dayOfMonth={day.dayOfMonth}
              dayOfWeek={day.dayOfWeek}
              occupancy={day.occupancy}
              isToday={day.isToday}
              isSelected={day.isSelected}
              isClosed={day.isClosed}
              isPast={day.isPast}
              onClick={() => {
                if (!day.isClosed) setSelectedDay(day.isSelected ? null : day.date);
              }}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-[10px] text-slate-500">{t('massageOccupancy').toLowerCase()}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-slate-500">{t('facilityOccupancy').toLowerCase()}</span>
        </div>
        <span className="text-[10px] text-slate-300">|</span>
        <div className="flex items-center gap-1">
          <span className="w-3 h-1.5 rounded-sm bg-green-300" />
          <span className="text-[10px] text-slate-500">{t('occupancyLow').toLowerCase()}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-1.5 rounded-sm bg-amber-400" />
          <span className="text-[10px] text-slate-500">{t('occupancyBusy').toLowerCase()}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-1.5 rounded-sm bg-red-400" />
          <span className="text-[10px] text-slate-500">{t('occupancyFull').toLowerCase()}</span>
        </div>
      </div>

      {/* Gun detay paneli */}
      {selectedDay && (
        <DayDetailPanel
          date={selectedDay}
          onClose={() => setSelectedDay(null)}
          company={company}
          experts={experts}
          spaces={spaces}
          workingHours={workingHours}
        />
      )}
    </div>
  );
}
