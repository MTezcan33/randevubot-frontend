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
  const [selectedDay, setSelectedDay] = useState(null); // "YYYY-MM-DD" veya null
  const [spaces, setSpaces] = useState([]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  // Aktif uzmanlar
  const experts = useMemo(
    () => (staff || []).filter(s => s.role === 'Uzman'),
    [staff]
  );

  // Spaces yukle
  useEffect(() => {
    if (company?.id) {
      getSpaces(company.id).then(data => setSpaces(data || []));
    }
  }, [company?.id]);

  // Aylik doluluk verisi
  const { occupancyMap, loading } = useMonthlyOccupancy(
    company?.id, viewMonth, workingHours, experts, spaces
  );

  // Ay navigasyonu
  const goToPrevMonth = () => {
    setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(null);
  };
  const goToNextMonth = () => {
    setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(null);
  };
  const goToToday = () => {
    setViewMonth(new Date());
    setSelectedDay(null);
  };

  // Takvim grid hesaplama
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Pazartesi = 0, Pazar = 6
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const days = [];

    // Onceki ayin bos kartlari
    for (let i = 0; i < startOffset; i++) {
      days.push({ type: 'empty', key: `empty-${i}` });
    }

    // Ayin gunleri
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dayOfWeek = dateObj.getDay(); // 0=Paz, 1=Pzt, ...
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isPast = dateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate());

      days.push({
        type: 'day',
        key: dateStr,
        date: dateStr,
        dayOfMonth: d,
        dayOfWeek,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDay,
        isClosed: dayOfWeek === 0, // Pazar kapali (varsayilan)
        isPast,
        occupancy: occupancyMap[dateStr] || null,
      });
    }

    return days;
  }, [year, month, selectedDay, occupancyMap]);

  // Toplam istatistikler
  const monthStats = useMemo(() => {
    let totalAppointments = 0;
    let totalMassage = 0;
    let totalFacility = 0;
    Object.values(occupancyMap).forEach(occ => {
      totalAppointments += occ.totalCount || 0;
      totalMassage += occ.massageCount || 0;
      totalFacility += occ.facilityCount || 0;
    });
    return { totalAppointments, totalMassage, totalFacility };
  }, [occupancyMap]);

  const monthName = (MONTH_NAMES[lang] || MONTH_NAMES.tr)[month];
  const weekHeaders = WEEKDAY_HEADERS[lang] || WEEKDAY_HEADERS.tr;

  return (
    <div className="flex flex-col h-full">
      {/* Header: Ay navigasyonu + istatistikler */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-800">
            {t('appointments')}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevMonth}
              className="w-7 h-7 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-sm font-medium text-slate-700 min-w-[120px] text-center">
              {monthName} {year}
            </span>
            <button
              onClick={goToNextMonth}
              className="w-7 h-7 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
            <button
              onClick={goToToday}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded-md hover:bg-emerald-50 transition-colors"
            >
              {t('today')}
            </button>
          </div>
        </div>

        {/* Istatistik kutulari */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-purple-50 rounded-lg px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-xs font-medium text-purple-700">
              {monthStats.totalMassage} {t('massageOccupancy').toLowerCase()}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-50 rounded-lg px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">
              {monthStats.totalFacility} {t('facilityOccupancy').toLowerCase()}
            </span>
          </div>
          <div className="bg-slate-100 rounded-lg px-3 py-1.5">
            <span className="text-xs font-medium text-slate-600">
              {monthStats.totalAppointments} {t('appointments').toLowerCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Hafta gunu basliklari */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {weekHeaders.map((day, i) => (
          <div key={i} className="text-center text-[11px] font-medium text-slate-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Takvim grid */}
      <div className="grid grid-cols-7 gap-1.5">
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
                if (!day.isClosed) {
                  setSelectedDay(day.isSelected ? null : day.date);
                }
              }}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-[10px] text-slate-500">{t('massageOccupancy')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-slate-500">{t('facilityOccupancy')}</span>
        </div>
        <span className="text-[10px] text-slate-400">|</span>
        <div className="flex items-center gap-1">
          <span className="w-3 h-1.5 rounded-sm bg-green-300" />
          <span className="text-[10px] text-slate-500">{t('occupancyLow')}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-1.5 rounded-sm bg-amber-300" />
          <span className="text-[10px] text-slate-500">{t('occupancyBusy')}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-1.5 rounded-sm bg-red-400" />
          <span className="text-[10px] text-slate-500">{t('occupancyFull')}</span>
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
