import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  const detailRef = useRef(null);

  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [spaces, setSpaces] = useState([]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const experts = useMemo(() => (staff || []).filter(s => s.role === 'Uzman'), [staff]);

  useEffect(() => { if (company?.id) getSpaces(company.id).then(d => setSpaces(d || [])); }, [company?.id]);
  const { occupancyMap } = useMonthlyOccupancy(company?.id, viewMonth, workingHours, experts, spaces);

  const prevMonth = () => { setViewMonth(p => new Date(p.getFullYear(), p.getMonth() - 1, 1)); setSelectedDay(null); };
  const nextMonth = () => { setViewMonth(p => new Date(p.getFullYear(), p.getMonth() + 1, 1)); setSelectedDay(null); };

  const handleDayClick = useCallback((ds) => {
    setSelectedDay(ds);
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, []);

  const { calendarDays, weekCount } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let offset = firstDay.getDay() - 1; if (offset < 0) offset = 6;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const days = [];
    for (let i = 0; i < offset; i++) days.push({ type: 'empty', key: `e${i}` });
    for (let d = 1; d <= daysInMonth; d++) {
      const obj = new Date(year, month, d); const dow = obj.getDay();
      const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      days.push({ type: 'day', key: ds, date: ds, dayOfMonth: d, dayOfWeek: dow, isToday: ds === todayStr, isSelected: ds === selectedDay, isClosed: dow === 0, isPast: obj < new Date(today.getFullYear(), today.getMonth(), today.getDate()), occupancy: occupancyMap[ds] || null });
    }
    const rem = days.length % 7; if (rem > 0) for (let i = 0; i < 7 - rem; i++) days.push({ type: 'empty', key: `ee${i}` });
    return { calendarDays: days, weekCount: Math.ceil(days.length / 7) };
  }, [year, month, selectedDay, occupancyMap]);

  const monthStats = useMemo(() => {
    let m = 0, f = 0, mMax = 0, fMax = 0;
    Object.values(occupancyMap).forEach(o => { m += o.massageCount||0; f += o.facilityCount||0; mMax += o.massageMax||0; fMax += o.facilityMax||0; });
    return { m, f, pct: (mMax+fMax) > 0 ? Math.round(((m+f)/(mMax+fMax))*100) : 0 };
  }, [occupancyMap]);

  const monthName = (MONTHS[lang] || MONTHS.tr)[month];
  const weekdays = WEEKDAYS[lang] || WEEKDAYS.tr;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ═══ KOMPAKT HEADER ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0 8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{t('appointments')}</span>
          <button onClick={prevMonth} style={navBtnStyle}><ChevronSvg dir="left" /></button>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', minWidth: 110, textAlign: 'center' }}>{monthName} {year}</span>
          <button onClick={nextMonth} style={navBtnStyle}><ChevronSvg dir="right" /></button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <StatBox value={monthStats.m} label="masaj" />
          <StatBox value={monthStats.f} label="tesis" />
          <StatBox value={`%${monthStats.pct}`} label="doluluk" />
        </div>
      </div>

      {/* ═══ WEEKDAY + GRID — flex-1 ile kalan alani doldur ═══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, flexShrink: 0 }}>
          {weekdays.map((d, i) => (
            <div key={i} style={{ fontSize: 11, fontWeight: 500, color: '#999', textAlign: 'center', padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid — satirlar esit yukseklikte, tum alani doldurur */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
          gridTemplateRows: `repeat(${weekCount}, 1fr)`,
          gap: 4, flex: 1, minHeight: 0,
        }}>
          {calendarDays.map(day => {
            if (day.type === 'empty') return <div key={day.key} />;
            return (
              <MonthlyDayCard key={day.key} dayOfMonth={day.dayOfMonth} dayOfWeek={day.dayOfWeek}
                occupancy={day.occupancy} isToday={day.isToday} isSelected={day.isSelected}
                isClosed={day.isClosed} isPast={day.isPast}
                onClick={() => { if (!day.isClosed) handleDayClick(day.date); }}
              />
            );
          })}
        </div>
      </div>

      {/* ═══ LEGEND — kompakt ═══ */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', padding: '6px 0 0', flexShrink: 0 }}>
        <Ldot color="#534AB7" label="masaj" /><Ldot color="#1D9E75" label="tesis" />
        <div style={{ width: 1, height: 10, background: '#e8e8e3' }} />
        <Lbar color="#97C459" label="müsait" /><Lbar color="#EF9F27" label="yoğun" /><Lbar color="#E24B4A" label="dolu" />
      </div>

      {/* ═══ DETAIL PANEL ═══ */}
      {selectedDay && (
        <div ref={detailRef}>
          <DayDetailPanel date={selectedDay} onClose={() => setSelectedDay(null)}
            company={company} experts={experts} spaces={spaces} workingHours={workingHours} />
        </div>
      )}
    </div>
  );
}

const navBtnStyle = {
  width: 26, height: 26, borderRadius: '50%', border: '1px solid #e8e8e3',
  background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center', color: '#666', padding: 0,
};

function ChevronSvg({ dir }) {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d={dir==='left'?'M10 12L6 8l4-4':'M6 4l4 4-4 4'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function StatBox({ value, label }) {
  return (
    <div style={{ border: '1px solid #e8e8e3', borderRadius: 8, padding: '4px 12px', textAlign: 'center', background: '#fff', minWidth: 50 }}>
      <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'SF Mono','Menlo',monospace" }}>{value}</div>
      <div style={{ fontSize: 9, color: '#999', fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function Ldot({ color, label }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#666' }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />{label}</div>;
}
function Lbar({ color, label }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#666' }}><div style={{ width: 10, height: 4, borderRadius: 2, background: color }} />{label}</div>;
}
