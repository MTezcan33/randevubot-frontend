import React from 'react';
import { useTranslation } from 'react-i18next';

const DAY_NAMES = {
  tr: ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'],
  en: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
  ru: ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],
};

function barColor(p) {
  if (p <= 30) return '#97C459';
  if (p <= 50) return '#C0DD97';
  if (p <= 70) return '#EF9F27';
  if (p <= 85) return '#E24B4A';
  return '#A32D2D';
}

function textColor(p) {
  if (p <= 30) return '#27500A';
  if (p <= 50) return '#3B6D11';
  if (p <= 70) return '#854F0B';
  if (p <= 85) return '#791F1F';
  return '#501313';
}

export default function MonthlyDayCard({
  dayOfMonth, dayOfWeek, occupancy,
  isToday, isSelected, isClosed, isPast, onClick,
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2) || 'tr';
  const dayName = (DAY_NAMES[lang] || DAY_NAMES.tr)[dayOfWeek];

  const mo = occupancy?.massagePercent || 0;
  const to = occupancy?.facilityPercent || 0;
  const mCount = occupancy?.massageCount || 0;
  const tCount = occupancy?.facilityCount || 0;
  const mMax = occupancy?.massageMax || 0;
  const tMax = occupancy?.facilityMax || 0;

  const isSaturday = dayOfWeek === 6;

  // Kapali gun — Sage Mist
  if (isClosed) {
    return (
      <div style={{
        background: '#E5EBE7', borderTop: '1px solid #CDD6D0', borderRight: '1px solid #CDD6D0', borderBottom: '1px solid #CDD6D0',
        borderLeft: '3px solid #A8B5AC', borderRadius: '0 10px 10px 0',
        padding: '6px 8px 5px', display: 'flex',
        flexDirection: 'column', opacity: 0.6, cursor: 'default', minHeight: 0, overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 'auto' }}>
          <span style={{ fontSize: 16, fontWeight: 500, color: '#8A9C90' }}>{dayOfMonth}</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#A0B0A6' }}>{dayName}</span>
        </div>
        <div style={{ fontSize: 11, color: '#A0B0A6', fontWeight: 500, marginTop: 'auto' }}>
          {t('closed')}
        </div>
      </div>
    );
  }

  // Sol kenar aksani rengi
  const leftBorderColor = isToday ? '#378ADD' : isSelected ? '#1D9E75' : isSaturday ? '#BA7517' : '#1D9E75';

  const cardStyle = {
    background: isSelected ? '#E1F5EE' : isSaturday ? '#F6F3EC' : '#EFF5F1',
    borderTop: isToday ? '2px solid #378ADD' : isSelected ? '2px solid #1D9E75' : `1px solid ${isSaturday ? '#DDD6C0' : '#C8D9CF'}`,
    borderRight: isToday ? '2px solid #378ADD' : isSelected ? '2px solid #1D9E75' : `1px solid ${isSaturday ? '#DDD6C0' : '#C8D9CF'}`,
    borderBottom: isToday ? '2px solid #378ADD' : isSelected ? '2px solid #1D9E75' : `1px solid ${isSaturday ? '#DDD6C0' : '#C8D9CF'}`,
    borderLeft: `3px solid ${leftBorderColor}`,
    borderRadius: '0 10px 10px 0',
    padding: '6px 8px 5px',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden',
    opacity: isPast ? 0.4 : 1,
  };

  const normalBorderColor = isSaturday ? '#DDD6C0' : '#C8D9CF';

  // Doluluk barı — Sage Mist tonlari
  const OccSection = ({ dotColor, label, percent, count, max, type }) => {
    const isMassage = type === 'massage';
    const trackColor = isSelected ? '#9FE1CB' : isMassage ? '#DDE8E1' : '#D0E2D8';
    const emptyFillColor = isMassage ? '#AFA9EC' : '#9FE1CB';
    const emptyTextColor = isMassage ? '#AFA9EC' : '#9FE1CB';
    const isEmpty = percent === 0;

    return (
      <div style={{ marginTop: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
          <span style={{ fontSize: 9, fontWeight: 500, color: isSelected ? '#0F6E56' : '#6E8878' }}>{label}</span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: trackColor, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3, transition: 'width 0.4s ease',
            width: isEmpty ? '8%' : `${Math.min(100, percent)}%`,
            background: isEmpty ? emptyFillColor : barColor(percent),
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
          <span style={{
            fontSize: 10, fontWeight: isEmpty ? 500 : 600, fontFamily: "'SF Mono','Menlo',monospace",
            letterSpacing: '-0.3px', color: isEmpty ? emptyTextColor : textColor(percent),
          }}>
            {isEmpty ? t('available') || 'müsait' : `%${percent}`}
          </span>
          <span style={{
            fontSize: 9, color: isSelected ? '#0F6E56' : '#8FA69A',
            fontFamily: "'SF Mono','Menlo',monospace", fontWeight: 500,
          }}>
            {count}/{max}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div onClick={onClick} style={cardStyle}
      onMouseEnter={e => { if (!isToday && !isSelected) { e.currentTarget.style.borderColor = '#A8C4B4'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}}
      onMouseLeave={e => { if (!isToday && !isSelected) { e.currentTarget.style.borderColor = normalBorderColor; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 'auto' }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: isSelected ? '#085041' : '#2C2C2A', lineHeight: 1 }}>
          {dayOfMonth}
        </span>
        <span style={{ fontSize: 10, fontWeight: 500, color: isSelected ? '#0F6E56' : isSaturday ? '#854F0B' : '#5A7264' }}>
          {dayName}
        </span>
      </div>

      <OccSection dotColor="#534AB7" label={t('massageOccupancy').toLowerCase()} percent={mo} count={mCount} max={mMax} type="massage" />
      <OccSection dotColor="#1D9E75" label={t('facilityOccupancy').toLowerCase()} percent={to} count={tCount} max={tMax} type="facility" />
    </div>
  );
}
