import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useMonthlyOccupancy } from '@/hooks/useMonthlyOccupancy';
import { getSpaces } from '@/services/resourceService';
import MonthlyDayCard from './MonthlyDayCard';
import DayDetailPanel from './DayDetailPanel';

const MONTHS = {
  tr: ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  ru: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
};
const WEEKDAYS = {
  tr: ['pzt','sal','çar','per','cum','cmt','paz'],
  en: ['mon','tue','wed','thu','fri','sat','sun'],
  ru: ['пн','вт','ср','чт','пт','сб','вс'],
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

  const experts = useMemo(() => (staff || []).filter(s => s.role === 'Uzman'), [staff]);

  useEffect(() => {
    if (company?.id) getSpaces(company.id).then(d => setSpaces(d || []));
  }, [company?.id]);

  const { occupancyMap } = useMonthlyOccupancy(company?.id, viewMonth, workingHours, experts, spaces);

  const prevMonth = () => { setViewMonth(p => new Date(p.getFullYear(), p.getMonth() - 1, 1)); setSelectedDay(null); };
  const nextMonth = () => { setViewMonth(p => new Date(p.getFullYear(), p.getMonth() + 1, 1)); setSelectedDay(null); };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let offset = firstDay.getDay() - 1;
    if (offset < 0) offset = 6;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    const days = [];
    for (let i = 0; i < offset; i++) days.push({ type: 'empty', key: `e${i}` });
    for (let d = 1; d <= daysInMonth; d++) {
      const obj = new Date(year, month, d);
      const dow = obj.getDay();
      const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      days.push({
        type: 'day', key: ds, date: ds, dayOfMonth: d, dayOfWeek: dow,
        isToday: ds === todayStr, isSelected: ds === selectedDay,
        isClosed: dow === 0,
        isPast: obj < new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        occupancy: occupancyMap[ds] || null,
      });
    }
    return days;
  }, [year, month, selectedDay, occupancyMap]);

  const monthStats = useMemo(() => {
    let m = 0, f = 0, mMax = 0, fMax = 0;
    Object.values(occupancyMap).forEach(o => {
      m += o.massageCount || 0; f += o.facilityCount || 0;
      mMax += o.massageMax || 0; fMax += o.facilityMax || 0;
    });
    const pct = (mMax + fMax) > 0 ? Math.round(((m + f) / (mMax + fMax)) * 100) : 0;
    return { m, f, pct };
  }, [occupancyMap]);

  const monthName = (MONTHS[lang] || MONTHS.tr)[month];
  const weekdays = WEEKDAYS[lang] || WEEKDAYS.tr;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ═══ HEADER ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.3px' }}>
            {t('appointments')}
          </span>
          {/* Ay navigasyonu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={prevMonth} style={{
              width: 32, height: 32, borderRadius: '50%', border: '1px solid #e8e8e3',
              background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#666',
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <span style={{ fontSize: 17, fontWeight: 600, color: '#1a1a1a', minWidth: 130, textAlign: 'center', letterSpacing: '-0.2px' }}>
              {monthName} {year}
            </span>
            <button onClick={nextMonth} style={{
              width: 32, height: 32, borderRadius: '50%', border: '1px solid #e8e8e3',
              background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#666',
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
        {/* Stat boxes — 3 kutu */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <StatBox value={monthStats.m} label={t('massageOccupancy').toLowerCase()} />
          <StatBox value={monthStats.f} label={t('facilityOccupancy').toLowerCase()} />
          <StatBox value={`%${monthStats.pct}`} label="doluluk" />
        </div>
      </div>

      {/* ═══ WEEKDAY HEADERS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, marginBottom: 6 }}>
        {weekdays.map((d, i) => (
          <div key={i} style={{ fontSize: 12, fontWeight: 500, color: '#999', textAlign: 'center', padding: '8px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* ═══ CALENDAR GRID ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
        {calendarDays.map(day => {
          if (day.type === 'empty') {
            return <div key={day.key} style={{ aspectRatio: '1/1', background: 'transparent', border: '1px solid transparent', borderRadius: 12 }} />;
          }
          return (
            <MonthlyDayCard
              key={day.key}
              dayOfMonth={day.dayOfMonth}
              dayOfWeek={day.dayOfWeek}
              occupancy={day.occupancy}
              isToday={day.isToday}
              isSelected={day.isSelected}
              isClosed={day.isClosed}
              isPast={day.isPast}
              onClick={() => { if (!day.isClosed) setSelectedDay(day.date); }}
            />
          );
        })}
      </div>

      {/* ═══ LEGEND ═══ */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
        <LegendDot color="#534AB7" label={t('massageOccupancy').toLowerCase()} />
        <LegendDot color="#1D9E75" label={t('facilityOccupancy').toLowerCase()} />
        <div style={{ width: 1, height: 14, background: '#e8e8e3', margin: '0 4px' }} />
        <LegendBar color="#97C459" label={t('occupancyLow').toLowerCase()} />
        <LegendBar color="#EF9F27" label={t('occupancyBusy').toLowerCase()} />
        <LegendBar color="#E24B4A" label={t('occupancyFull').toLowerCase()} />
      </div>

      {/* ═══ DETAIL PANEL — takvimin altında açılır ═══ */}
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

function StatBox({ value, label }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e3', borderRadius: 10, padding: '8px 16px', textAlign: 'center', minWidth: 70 }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', fontFamily: "'SF Mono','Menlo',monospace", letterSpacing: '-0.5px' }}>{value}</div>
      <div style={{ fontSize: 10, color: '#999', fontWeight: 500, marginTop: 1, letterSpacing: '0.2px' }}>{label}</div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#666', fontWeight: 500 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
      {label}
    </div>
  );
}

function LegendBar({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#666', fontWeight: 500 }}>
      <div style={{ width: 14, height: 5, borderRadius: 3, background: color }} />
      {label}
    </div>
  );
}
