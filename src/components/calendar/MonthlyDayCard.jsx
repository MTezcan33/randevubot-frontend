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

// Koyu tema icin daha parlak text renkleri
function textColorDark(p) {
  if (p <= 30) return '#27500A';
  if (p <= 50) return '#3B6D11';
  if (p <= 70) return '#854F0B';
  if (p <= 85) return '#791F1F';
  return '#501313';
}

function textColorLight(p) {
  if (p <= 30) return '#4A8C1F';
  if (p <= 50) return '#5BA028';
  if (p <= 70) return '#B87A1A';
  if (p <= 85) return '#C43A39';
  return '#A32D2D';
}

export default function MonthlyDayCard({
  dayOfMonth, dayOfWeek, occupancy,
  isToday, isSelected, isClosed, isPast, onClick,
  theme = 'dark',
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2) || 'tr';
  const dayName = (DAY_NAMES[lang] || DAY_NAMES.tr)[dayOfWeek];
  const isDark = theme === 'dark';

  const mo = occupancy?.massagePercent || 0;
  const to = occupancy?.facilityPercent || 0;
  const mCount = occupancy?.massageCount || 0;
  const tCount = occupancy?.facilityCount || 0;
  const mMax = occupancy?.massageMax || 0;
  const tMax = occupancy?.facilityMax || 0;

  const isSaturday = dayOfWeek === 6;
  const textColor = isDark ? textColorDark : textColorLight;

  // Kapali gun
  if (isClosed) {
    return (
      <div style={{
        background: isDark ? '#f8f7f4' : '#fafafa',
        borderTop: `1px solid ${isDark ? '#e8e5de' : '#eee'}`,
        borderRight: `1px solid ${isDark ? '#e8e5de' : '#eee'}`,
        borderBottom: `1px solid ${isDark ? '#e8e5de' : '#eee'}`,
        borderLeft: `3px solid ${isDark ? '#ccc' : '#ddd'}`,
        borderRadius: '0 10px 10px 0',
        padding: '6px 8px 5px', display: 'flex',
        flexDirection: 'column', opacity: 0.6, cursor: 'default', minHeight: 0, overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 'auto' }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#1a1a1a' : '#666' }}>{dayOfMonth}</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#999' }}>{dayName}</span>
        </div>
        <div style={{ fontSize: 11, color: '#999', fontWeight: 500, marginTop: 'auto' }}>
          {t('closed')}
        </div>
      </div>
    );
  }

  // Sol kenar aksani rengi
  const leftBorderColor = isToday ? '#378ADD' : isSelected ? '#1D9E75' : isSaturday ? '#BA7517' : '#1D9E75';

  // Tema bazli kart renkleri
  const normalBorderColor = isDark
    ? (isSaturday ? '#E8DFC0' : '#d8ddd8')
    : (isSaturday ? '#f0e8d0' : '#e8e8e8');

  const cardBg = isSelected ? '#E1F5EE'
    : isSaturday ? (isDark ? '#FFFDF5' : '#FFFEF8')
    : (isDark ? '#fff' : '#fff');

  const cardShadow = isDark ? '0 1px 3px rgba(0,0,0,0.08)' : 'none';

  const cardStyle = {
    background: cardBg,
    borderTop: isToday ? '2px solid #378ADD' : isSelected ? '2px solid #1D9E75' : `1px solid ${normalBorderColor}`,
    borderRight: isToday ? '2px solid #378ADD' : isSelected ? '2px solid #1D9E75' : `1px solid ${normalBorderColor}`,
    borderBottom: isToday ? '2px solid #378ADD' : isSelected ? '2px solid #1D9E75' : `1px solid ${normalBorderColor}`,
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
    boxShadow: cardShadow,
  };

  // Doluluk barı track ve fill renkleri (bos durum icin)
  const OccSection = ({ dotColor, label, percent, count, max, type }) => {
    const isMassage = type === 'massage';
    const trackColor = isSelected ? '#9FE1CB' : isMassage ? '#EEEDFE' : '#E1F5EE';
    const emptyFillColor = isMassage ? '#AFA9EC' : '#9FE1CB';
    const emptyTextColor = isMassage ? '#AFA9EC' : '#9FE1CB';
    const isEmpty = percent === 0;

    return (
      <div style={{ marginTop: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 500, color: isSelected ? '#0F6E56' : '#999' }}>{label}</span>
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
            fontSize: 9, color: isSelected ? '#0F6E56' : (isEmpty ? '#bbb' : '#888'),
            fontFamily: "'SF Mono','Menlo',monospace", fontWeight: 500,
          }}>
            {count}/{max}
          </span>
        </div>
      </div>
    );
  };

  const hoverBorderColor = isDark ? '#c0c0b8' : '#d5d5d0';

  return (
    <div onClick={onClick} style={cardStyle}
      onMouseEnter={e => { if (!isToday && !isSelected) { e.currentTarget.style.borderColor = hoverBorderColor; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = isDark ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.06)'; }}}
      onMouseLeave={e => { if (!isToday && !isSelected) { e.currentTarget.style.borderColor = normalBorderColor; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = cardShadow; }}}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 'auto' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: isSelected ? '#085041' : '#1a1a1a', lineHeight: 1 }}>
          {dayOfMonth}
        </span>
        <span style={{ fontSize: 10, fontWeight: 500, color: isSelected ? '#0F6E56' : isSaturday ? '#854F0B' : '#666' }}>
          {dayName}
        </span>
      </div>

      <OccSection dotColor="#534AB7" label={t('massageOccupancy').toLowerCase()} percent={mo} count={mCount} max={mMax} type="massage" />
      <OccSection dotColor="#1D9E75" label={t('facilityOccupancy').toLowerCase()} percent={to} count={tCount} max={tMax} type="facility" />
    </div>
  );
}
