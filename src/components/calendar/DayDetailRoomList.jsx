import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getUnitAvailability } from '@/services/roomUnitService';

export default function DayDetailRoomList({
  company, date, service, spaces, experts, expertServicesMap,
  selectedRoom, onSelectRoom, selectedUnit, onSelectUnit,
}) {
  const { t } = useTranslation();
  const [unitData, setUnitData] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const availableRooms = (spaces || []).filter(s => s.is_active);

  // Birimler yukle
  useEffect(() => {
    if (!selectedRoom?.id || !company?.id) { setUnitData([]); return; }
    setLoadingUnits(true);
    getUnitAvailability(company.id, selectedRoom.id, date)
      .then(setUnitData).catch(() => setUnitData([]))
      .finally(() => setLoadingUnits(false));
  }, [selectedRoom?.id, company?.id, date]);

  if (!availableRooms.length) return null;

  // DB'de birim yoksa odanin capacity'sine gore yatak/alan uret
  const generateDefaultUnits = (room) => {
    const cap = room.capacity || 1;
    const units = [];
    for (let i = 1; i <= cap; i++) {
      units.push({
        id: `auto-${room.id}-${i}`,
        name: cap === 1 ? 'Yatak 1' : `Yatak ${i}`,
        busy: false,
      });
    }
    return units;
  };

  return (
    <div style={{ padding: '8px 16px 10px 24px', background: '#f5f5f0', borderBottom: '1px solid #e8e8e3' }}>
      {availableRooms.map(room => {
        const isRS = selectedRoom?.id === room.id;

        return (
          <div key={room.id}>
            <div
              onClick={() => onSelectRoom(isRS ? null : room)}
              style={{
                background: isRS ? '#EEEDFE' : '#fff',
                border: `1px solid ${isRS ? '#534AB7' : '#e8e8e3'}`,
                borderRadius: 10, padding: '10px 12px', marginBottom: 8, cursor: 'pointer',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (!isRS) e.currentTarget.style.borderColor = '#d5d5d0'; }}
              onMouseLeave={e => { if (!isRS) e.currentTarget.style.borderColor = '#e8e8e3'; }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{room.name}</div>
              {room.description && (
                <div style={{ fontSize: 11, color: '#666', lineHeight: 1.4, margin: '3px 0 6px' }}>{room.description}</div>
              )}

              {/* Yatak / birim secimi */}
              {isRS && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}
                  onClick={e => e.stopPropagation()}
                >
                  {loadingUnits ? (
                    <span style={{ fontSize: 11, color: '#999' }}>...</span>
                  ) : (() => {
                    // DB'den birim varsa onlari, yoksa capacity'den uret
                    const units = unitData.length > 0
                      ? unitData.map(u => ({ id: u.id, name: u.name, busy: u.appointmentCount > 0 }))
                      : generateDefaultUnits(room);

                    return units.map(unit => {
                      const isUS = selectedUnit?.id === unit.id;
                      return (
                        <BedButton
                          key={unit.id}
                          name={unit.name}
                          busy={unit.busy}
                          selected={isUS}
                          onClick={() => !unit.busy && onSelectUnit(isUS ? null : { id: unit.id, name: unit.name })}
                        />
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BedButton({ name, busy, selected, onClick }) {
  return (
    <div
      onClick={busy ? undefined : onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
        border: `1px solid ${selected ? '#534AB7' : '#e8e8e3'}`,
        background: selected ? '#EEEDFE' : '#fff',
        cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.4 : 1,
        transition: 'all 0.12s', fontSize: 12, fontFamily: 'inherit',
      }}
    >
      <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{name}</span>
      <span style={{
        fontSize: 10, padding: '2px 8px', borderRadius: 8, fontWeight: 600,
        background: busy ? '#F09595' : '#C0DD97',
        color: busy ? '#791F1F' : '#27500A',
      }}>
        {busy ? 'dolu' : 'müsait'}
      </span>
    </div>
  );
}
