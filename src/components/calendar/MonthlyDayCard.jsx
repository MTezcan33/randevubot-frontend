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
  if (p <= 30) return '#3B6D11';
  if (p <= 50) return '#3B6D11';
  if (p <= 70) return '#BA7517';
  if (p <= 85) return '#A32D2D';
  return '#791F1F';
}

export default function MonthlyDayCard({
  dayOfMonth, dayOfWeek, occupancy,
  isToday, isSelected, isClosed, onClick,
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

  // Kapali gun
  if (isClosed) {
    return (
      <div style={{
        background: '#D5DED8', borderTop: '1px solid #ADBEB4', borderRight: '1px solid #ADBEB4', borderBottom: '1px solid #ADBEB4',
        borderLeft: '4px solid #8AA098', borderRadius: '0 10px 10px 0',
        padding: '6px 8px 5px', display: 'flex',
        flexDirection: 'column', cursor: 'default', minHeight: 0, overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 'auto' }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: '#6E8878' }}>{dayOfMonth}</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: '#8AA098' }}>{dayName}</span>
        </div>
        <div style={{ fontSize: 11, color: '#8AA098', fontWeight: 500, marginTop: 'auto' }}>
          {t('closed')}
        </div>
      </div>
    );
  }

  // Sol kenar aksani rengi
  const leftBorderColor = isToday ? '#378ADD' : isSelected ? '#1D9E75' : isSaturday ? '#BA7517' : '#1D9E75';
  const normalBorderColor = isSaturday ? '#D0C49E' : '#B5D0C0';

  const cardStyle = {
    background: isSelected ? '#E1F5EE' : isSaturday ? '#F2ECDF' : '#E8F1EC',
    borderTop: isToday ? '2px solid #378ADD' : isSelected ? '2px solid #1D9E75' : `1px solid ${normalBorderColor}`,
    borderRight: isToday ? '2px solid #378ADD' : isSelected ? '2px solid #1D9E75' : `1px solid ${normalBorderColor}`,
    borderBottom: isToday ? '2px solid #378ADD' : isSelected ? '2px solid #1D9E75' : `1px solid ${normalBorderColor}`,
    borderLeft: `4px solid ${leftBorderColor}`,
    borderRadius: '0 10px 10px 0',
    padding: '6px 8px 5px',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden',
  };

  // Masaj satiri — mor tonlari
  // Tesis satiri — yesil tonlari
  const OccSection = ({ dotColor, label, percent, count, max, type }) => {
    const isMassage = type === 'massage';
    const trackColor = isSelected ? '#9FE1CB' : isMassage ? '#D0DEDA' : '#C2D8CC';
    const emptyFillColor = isMassage ? '#AFA9EC' : '#5DCAA5';
    const emptyTextColor = isMassage ? '#7F77DD' : '#1D9E75';
    const labelColor = isSelected ? '#0F6E56' : isMassage ? '#534AB7' : '#0F6E56';
    const countColor = isSelected ? '#0F6E56' : isMassage ? '#3C3489' : '#0F6E56';
    const isEmpty = percent === 0;

    return (
      <div style={{ marginTop: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
          <span style={{ fontSize: 9, fontWeight: 500, color: labelColor }}>{label}</span>
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
            fontSize: 9, color: countColor,
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
      onMouseEnter={e => { if (!isToday && !isSelected) { e.currentTarget.style.borderColor = '#8ABFA2'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}}
      onMouseLeave={e => { if (!isToday && !isSelected) { e.currentTarget.style.borderColor = normalBorderColor; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 'auto' }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: isSelected ? '#085041' : '#0F3D2A', lineHeight: 1 }}>
          {dayOfMonth}
        </span>
        <span style={{ fontSize: 11, fontWeight: 500, color: isSelected ? '#0F6E56' : isSaturday ? '#BA7517' : '#1D9E75' }}>
          {dayName}
        </span>
      </div>

      <OccSection dotColor="#534AB7" label={t('massageOccupancy').toLowerCase()} percent={mo} count={mCount} max={mMax} type="massage" />
      <OccSection dotColor="#1D9E75" label={t('facilityOccupancy').toLowerCase()} percent={to} count={tCount} max={tMax} type="facility" />
    </div>
  );
}
