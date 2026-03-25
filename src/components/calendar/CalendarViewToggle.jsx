import React from 'react';
import { useTranslation } from 'react-i18next';

const CalendarViewToggle = ({ view, onChange }) => {
  const { t } = useTranslation();

  const buttons = [
    { value: 'monthly', label: t('monthlyView') || 'Aylık' },
    { value: 'expert', label: t('expertView') || 'Günlük' },
  ];

  return (
    <div style={{
      display: 'flex', gap: 2, background: '#f5f5f0', border: '1px solid #e8e8e3',
      borderRadius: 8, padding: 3,
    }}>
      {buttons.map(btn => (
        <button
          key={btn.value}
          onClick={() => onChange(btn.value)}
          style={{
            padding: '5px 14px', fontSize: 12, fontWeight: 500, borderRadius: 6,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.15s',
            background: view === btn.value ? '#fff' : 'transparent',
            color: view === btn.value ? '#1a1a1a' : '#666',
            boxShadow: view === btn.value ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
};

export default CalendarViewToggle;
