import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMonthlyOccupancy } from '@/hooks/useMonthlyOccupancy';
import { getSpaces } from '@/services/resourceService';
import MonthlyDayCard from './MonthlyDayCard';
import DayDetailPanel from './DayDetailPanel';

const WEEKDAY_HEADERS = {
  tr: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
};

const MONTH_NAMES = {
  tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
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

  const { occupancyMap } = useMonthlyOccupancy(
    company?.id, viewMonth, workingHours, experts, spaces
  );

  const goToPrevMonth = () => { setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)); setSelectedDay(null); };
  const goToNextMonth = () => { setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)); setSelectedDay(null); };

  // Takvim grid hesaplama
  const { calendarDays, weekCount } = useMemo(() => {
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
    // Haftanin kalanini doldur
    const remainder = days.length % 7;
    if (remainder > 0) {
      for (let i = 0; i < 7 - remainder; i++) {
        days.push({ type: 'empty', key: `empty-end-${i}` });
      }
    }
    return { calendarDays: days, weekCount: Math.ceil(days.length / 7) };
  }, [year, month, selectedDay, occupancyMap]);

  // Ay istatistikleri
  const monthStats = useMemo(() => {
    let totalMassage = 0, totalFacility = 0;
    let totalMassageMax = 0, totalFacilityMax = 0;
    Object.values(occupancyMap).forEach(occ => {
      totalMassage += occ.massageCount || 0;
      totalFacility += occ.facilityCount || 0;
      totalMassageMax += occ.massageMax || 0;
      totalFacilityMax += occ.facilityMax || 0;
    });
    const overallPercent = (totalMassageMax + totalFacilityMax) > 0
      ? Math.round(((totalMassage + totalFacility) / (totalMassageMax + totalFacilityMax)) * 100)
      : 0;
    return { totalMassage, totalFacility, overallPercent };
  }, [occupancyMap]);

  const monthName = (MONTH_NAMES[lang] || MONTH_NAMES.tr)[month];
  const weekHeaders = WEEKDAY_HEADERS[lang] || WEEKDAY_HEADERS.tr;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── HEADER: "Randevular" baslik + ay nav + istatistikler ── */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-base font-bold text-slate-800">{t('appointments')}</h2>
          {/* Ay navigasyonu */}
          <div className="flex items-center gap-1.5">
            <button onClick={goToPrevMonth}
              className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <span className="text-sm font-semibold text-slate-700 min-w-[120px] text-center">
              {monthName} {year}
            </span>
            <button onClick={goToNextMonth}
              className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Istatistik kutulari */}
        <div className="flex items-center gap-2">
          <div className="border border-slate-200 rounded-lg px-3 py-1 text-center min-w-[60px]">
            <div className="text-sm font-bold text-slate-800 leading-tight">{monthStats.totalMassage}</div>
            <div className="text-[9px] text-slate-400">{t('massageOccupancy').toLowerCase()}</div>
          </div>
          <div className="border border-slate-200 rounded-lg px-3 py-1 text-center min-w-[60px]">
            <div className="text-sm font-bold text-slate-800 leading-tight">{monthStats.totalFacility}</div>
            <div className="text-[9px] text-slate-400">{t('facilityOccupancy').toLowerCase()}</div>
          </div>
          <div className="border border-slate-200 rounded-lg px-3 py-1 text-center min-w-[60px]">
            <div className="text-sm font-bold text-slate-800 leading-tight">%{monthStats.overallPercent}</div>
            <div className="text-[9px] text-slate-400">doluluk</div>
          </div>
        </div>
      </div>

      {/* ── HAFTA GUNU BASLIKLARI ── */}
      <div className="grid grid-cols-7 gap-px mb-px shrink-0">
        {weekHeaders.map((day, i) => (
          <div key={i} className="text-center text-[11px] font-semibold text-slate-400 py-1 uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* ── TAKVIM GRID — tüm ay sayfaya sığsın ── */}
      <div
        className="grid grid-cols-7 gap-px flex-1 min-h-0"
        style={{ gridTemplateRows: `repeat(${weekCount}, 1fr)` }}
      >
        {calendarDays.map(day => {
          if (day.type === 'empty') {
            return <div key={day.key} />;
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

      {/* ── LEGEND ── */}
      <div className="flex items-center justify-center gap-4 pt-1.5 shrink-0">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-[9px] text-slate-400">{t('massageOccupancy').toLowerCase()}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[9px] text-slate-400">{t('facilityOccupancy').toLowerCase()}</span>
        </div>
        <span className="text-[9px] text-slate-300">|</span>
        <div className="flex items-center gap-1">
          <span className="w-3 h-1 rounded-sm bg-green-300" />
          <span className="text-[9px] text-slate-400">{t('occupancyLow').toLowerCase()}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-1 rounded-sm bg-amber-400" />
          <span className="text-[9px] text-slate-400">{t('occupancyBusy').toLowerCase()}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-1 rounded-sm bg-red-400" />
          <span className="text-[9px] text-slate-400">{t('occupancyFull').toLowerCase()}</span>
        </div>
      </div>

      {/* ── GÜN DETAY PANELİ ── */}
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
