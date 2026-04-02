import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useMonthlyOccupancy } from '@/hooks/useMonthlyOccupancy';
import { getSpaces } from '@/services/resourceService';
import DayDetailPanel from './DayDetailPanel';

const MONTHS = {
  tr: ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  ru: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
};
const WEEKDAYS_SHORT = {
  tr: ['Pt','Sa','Ça','Pe','Cu','Ct','Pa'],
  en: ['Mo','Tu','We','Th','Fr','Sa','Su'],
  ru: ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'],
};

export default function MonthlyCalendar() {
  const { t, i18n } = useTranslation();
  const { company, staff, workingHours } = useAuth();
  const lang = i18n.language?.substring(0, 2) || 'tr';

  const [baseMonth, setBaseMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [spaces, setSpaces] = useState([]);

  const experts = useMemo(() => (staff || []).filter(s => s.role === 'Uzman'), [staff]);

  useEffect(() => { if (company?.id) getSpaces(company.id).then(d => setSpaces(d || [])); }, [company?.id]);

  // 3 ay icin occupancy verileri
  const { occupancyMap: occ1 } = useMonthlyOccupancy(company?.id, baseMonth, workingHours, experts, spaces);
  const month2 = useMemo(() => new Date(baseMonth.getFullYear(), baseMonth.getMonth() + 1, 1), [baseMonth]);
  const month3 = useMemo(() => new Date(baseMonth.getFullYear(), baseMonth.getMonth() + 2, 1), [baseMonth]);
  const { occupancyMap: occ2 } = useMonthlyOccupancy(company?.id, month2, workingHours, experts, spaces);
  const { occupancyMap: occ3 } = useMonthlyOccupancy(company?.id, month3, workingHours, experts, spaces);

  const prevMonth = () => { setBaseMonth(p => new Date(p.getFullYear(), p.getMonth() - 1, 1)); setSelectedDay(null); };
  const nextMonth = () => { setBaseMonth(p => new Date(p.getFullYear(), p.getMonth() + 1, 1)); setSelectedDay(null); };

  const handleDayClick = useCallback((ds) => {
    setSelectedDay(ds);
  }, []);

  const weekdays = WEEKDAYS_SHORT[lang] || WEEKDAYS_SHORT.tr;

  // Sayfa acildiginda bugunun tarihini sec
  useEffect(() => {
    if (!selectedDay) {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      setSelectedDay(todayStr);
    }
  }, []);

  // ═══ YAN YANA LAYOUT: Takvim + DayDetailPanel ═══
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', gap: 0 }}>

      {/* ═══ SOL: Kompakt 3 Aylik Takvim ═══ */}
      <div style={{
        width: 156,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        padding: '8px 0',
        borderRight: '1px solid #e8e8e3',
        background: '#fafafa',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 8px', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a' }}>Takvim</span>
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={prevMonth} style={navBtnStyle}><ChevronSvg dir="left" /></button>
            <button onClick={nextMonth} style={navBtnStyle}><ChevronSvg dir="right" /></button>
          </div>
        </div>

        {/* 3 Ay Grid */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto', padding: '0 4px' }}>
          <MiniMonth
            date={baseMonth}
            occupancyMap={occ1}
            weekdays={weekdays}
            lang={lang}
            selectedDay={selectedDay}
            onDayClick={handleDayClick}
          />
          <MiniMonth
            date={month2}
            occupancyMap={occ2}
            weekdays={weekdays}
            lang={lang}
            selectedDay={selectedDay}
            onDayClick={handleDayClick}
          />
          <MiniMonth
            date={month3}
            occupancyMap={occ3}
            weekdays={weekdays}
            lang={lang}
            selectedDay={selectedDay}
            onDayClick={handleDayClick}
          />
        </div>
      </div>

      {/* ═══ SAG: Gun Detay Paneli ═══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {selectedDay ? (
          <DayDetailPanel
            date={selectedDay}
            onClose={() => setSelectedDay(null)}
            company={company}
            experts={experts}
            spaces={spaces}
            workingHours={workingHours}
          />
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: 14,
          }}>
            Takvimden bir gun secin
          </div>
        )}
      </div>
    </div>
  );
}

// ═══ MINI AY KOMPONENTI ═══
function MiniMonth({ date, occupancyMap, weekdays, lang, selectedDay, onDayClick }) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthName = (MONTHS[lang] || MONTHS.tr)[month];

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let offset = firstDay.getDay() - 1;
    if (offset < 0) offset = 6;

    const days = [];
    for (let i = 0; i < offset; i++) days.push({ type: 'empty', key: `e${i}` });

    for (let d = 1; d <= daysInMonth; d++) {
      const obj = new Date(year, month, d);
      const dow = obj.getDay();
      const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const occ = occupancyMap[ds];
      const hasAppointment = occ && ((occ.massageCount || 0) + (occ.facilityCount || 0)) > 0;

      days.push({
        type: 'day',
        key: ds,
        date: ds,
        dayOfMonth: d,
        isToday: ds === todayStr,
        isSelected: ds === selectedDay,
        isClosed: dow === 0,
        isPast: obj < new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        hasAppointment,
        occupancy: occ,
      });
    }

    const rem = days.length % 7;
    if (rem > 0) for (let i = 0; i < 7 - rem; i++) days.push({ type: 'empty', key: `ee${i}` });

    return days;
  }, [year, month, occupancyMap, selectedDay, todayStr]);

  return (
    <div style={{
      background: '#fff',
      borderRadius: 6,
      border: '1px solid #e8e8e3',
      padding: '6px',
    }}>
      {/* Ay basligi */}
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        color: '#1a1a1a',
        marginBottom: 4,
        textAlign: 'center',
      }}>
        {monthName} {year}
      </div>

      {/* Hafta gunleri */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 2 }}>
        {weekdays.map((d, i) => (
          <div key={i} style={{
            fontSize: 8,
            fontWeight: 600,
            color: '#999',
            textAlign: 'center',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Gun grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {calendarDays.map(day => {
          if (day.type === 'empty') {
            return <div key={day.key} style={{ height: 18 }} />;
          }

          const bgColor = day.isSelected
            ? '#534AB7'
            : day.isToday
              ? '#E8F5E9'
              : day.isClosed
                ? '#f5f5f5'
                : 'transparent';

          const textColor = day.isSelected
            ? '#fff'
            : day.isClosed
              ? '#ccc'
              : day.isPast
                ? '#999'
                : '#1a1a1a';

          // Doluluk rengi hesapla
          let dotColor = null;
          if (day.hasAppointment && day.occupancy) {
            const totalCount = (day.occupancy.massageCount || 0) + (day.occupancy.facilityCount || 0);
            const totalMax = (day.occupancy.massageMax || 0) + (day.occupancy.facilityMax || 0);
            const pct = totalMax > 0 ? (totalCount / totalMax) * 100 : 0;
            if (pct >= 80) dotColor = '#E24B4A';
            else if (pct >= 50) dotColor = '#EF9F27';
            else dotColor = '#1D9E75';
          }

          return (
            <div
              key={day.key}
              onClick={() => !day.isClosed && onDayClick(day.date)}
              style={{
                height: 18,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 3,
                background: bgColor,
                cursor: day.isClosed ? 'default' : 'pointer',
                transition: 'all 0.15s',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (!day.isClosed && !day.isSelected) {
                  e.currentTarget.style.background = '#f0f0f0';
                }
              }}
              onMouseLeave={e => {
                if (!day.isClosed && !day.isSelected) {
                  e.currentTarget.style.background = day.isToday ? '#E8F5E9' : 'transparent';
                }
              }}
            >
              <span style={{
                fontSize: 9,
                fontWeight: day.isToday || day.isSelected ? 600 : 400,
                color: textColor,
              }}>
                {day.dayOfMonth}
              </span>

              {/* Randevu gostergesi - kucuk nokta */}
              {dotColor && !day.isSelected && (
                <div style={{
                  position: 'absolute',
                  bottom: 1,
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  background: dotColor,
                }}/>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const navBtnStyle = {
  width: 20, height: 20, borderRadius: '50%', border: '1px solid #e8e8e3',
  background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center', color: '#666', padding: 0,
};

function ChevronSvg({ dir }) {
  return <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d={dir==='left'?'M10 12L6 8l4-4':'M6 4l4 4-4 4'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
