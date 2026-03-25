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

  // Kapali gun
  if (isClosed) {
    return (
      <div style={{
        background: '#fafaf8', border: '1px solid transparent', borderRadius: 10,
        padding: '6px 8px 5px', display: 'flex',
        flexDirection: 'column', opacity: 0.6, cursor: 'default', minHeight: 0, overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 'auto' }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>{dayOfMonth}</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#666' }}>{dayName}</span>
        </div>
        <div style={{ fontSize: 11, color: '#999', fontWeight: 500, marginTop: 'auto' }}>
          {t('closed')}
        </div>
      </div>
    );
  }

  const cardStyle = {
    background: isSelected ? '#E1F5EE' : '#fff',
    border: isToday ? '2px solid #378ADD' : isSelected ? '2px solid #1D9E75' : '1px solid #e8e8e3',
    borderRadius: 10,
    padding: '6px 8px 5px',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden',
    opacity: isPast ? 0.4 : 1,
  };

  const OccSection = ({ dotColor, label, percent, count, max }) => (
    <div style={{ marginTop: 3 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 500, color: isSelected ? '#0F6E56' : '#999' }}>{label}</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: isSelected ? '#9FE1CB' : '#eeeee8', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 3, transition: 'width 0.4s ease',
          width: `${Math.min(100, percent)}%`,
          background: barColor(percent),
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
        <span style={{
          fontSize: 10, fontWeight: 600, fontFamily: "'SF Mono','Menlo',monospace",
          letterSpacing: '-0.3px', color: textColor(percent),
        }}>
          %{percent}
        </span>
        {max > 0 && (
          <span style={{
            fontSize: 9, color: isSelected ? '#0F6E56' : '#999',
            fontFamily: "'SF Mono','Menlo',monospace", fontWeight: 500,
          }}>
            {count}/{max}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div onClick={onClick} style={cardStyle}
      onMouseEnter={e => { if (!isToday && !isSelected) { e.currentTarget.style.borderColor = '#d5d5d0'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}}
      onMouseLeave={e => { if (!isToday && !isSelected) { e.currentTarget.style.borderColor = '#e8e8e3'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 'auto' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: isSelected ? '#085041' : '#1a1a1a', lineHeight: 1 }}>
          {dayOfMonth}
        </span>
        <span style={{ fontSize: 10, fontWeight: 500, color: isSelected ? '#0F6E56' : '#666' }}>
          {dayName}
        </span>
      </div>

      <OccSection dotColor="#534AB7" label={t('massageOccupancy').toLowerCase()} percent={mo} count={mCount} max={mMax} />
      <OccSection dotColor="#1D9E75" label={t('facilityOccupancy').toLowerCase()} percent={to} count={tCount} max={tMax} />
    </div>
  );
}
