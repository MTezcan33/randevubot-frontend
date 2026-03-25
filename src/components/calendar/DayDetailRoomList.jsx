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

  const isSelfService = service?.requires_expert === false;

  // Self-servis → shared spaces, Uzman hizmeti → private spaces
  const availableRooms = (spaces || []).filter(s => {
    if (!s.is_active) return false;
    if (isSelfService) return s.booking_mode === 'shared';
    return s.booking_mode === 'private';
  });

  // Birimler yukle (sadece uzman hizmetleri icin)
  useEffect(() => {
    if (isSelfService || !selectedRoom?.id || !company?.id) { setUnitData([]); return; }
    setLoadingUnits(true);
    getUnitAvailability(company.id, selectedRoom.id, date)
      .then(setUnitData).catch(() => setUnitData([]))
      .finally(() => setLoadingUnits(false));
  }, [selectedRoom?.id, company?.id, date, isSelfService]);

  if (!availableRooms.length) return null;

  const generateDefaultUnits = (room) => {
    const cap = room.capacity || 1;
    return Array.from({ length: cap }, (_, i) => ({
      id: `auto-${room.id}-${i + 1}`,
      name: cap === 1 ? 'Yatak 1' : `Yatak ${i + 1}`,
      busy: false,
    }));
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
                background: isRS ? (isSelfService ? '#E1F5EE' : '#EEEDFE') : '#fff',
                border: `1px solid ${isRS ? (isSelfService ? '#1D9E75' : '#534AB7') : '#e8e8e3'}`,
                borderRadius: 10, padding: '10px 12px', marginBottom: 8, cursor: 'pointer',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (!isRS) e.currentTarget.style.borderColor = '#d5d5d0'; }}
              onMouseLeave={e => { if (!isRS) e.currentTarget.style.borderColor = '#e8e8e3'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{room.name}</span>
                {/* Self servis icin kapasite goster */}
                {isSelfService && (
                  <span style={{ fontSize: 11, color: '#666', fontWeight: 500 }}>
                    Kapasite: {room.capacity}
                  </span>
                )}
              </div>
              {room.description && (
                <div style={{ fontSize: 11, color: '#666', lineHeight: 1.4, marginTop: 3 }}>{room.description}</div>
              )}

              {/* UZMAN HİZMETİ: Yatak secimi */}
              {isRS && !isSelfService && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}
                  onClick={e => e.stopPropagation()}
                >
                  {loadingUnits ? (
                    <span style={{ fontSize: 11, color: '#999' }}>...</span>
                  ) : (() => {
                    const units = unitData.length > 0
                      ? unitData.map(u => ({ id: u.id, name: u.name, busy: u.appointmentCount > 0 }))
                      : generateDefaultUnits(room);
                    return units.map(unit => (
                      <BedButton key={unit.id} name={unit.name} busy={unit.busy}
                        selected={selectedUnit?.id === unit.id}
                        onClick={() => !unit.busy && onSelectUnit(selectedUnit?.id === unit.id ? null : { id: unit.id, name: unit.name })}
                      />
                    ));
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
    <div onClick={busy ? undefined : onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
      border: `1px solid ${selected ? '#534AB7' : '#e8e8e3'}`,
      background: selected ? '#EEEDFE' : '#fff',
      cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.4 : 1,
      transition: 'all 0.12s', fontSize: 12, fontFamily: 'inherit',
    }}>
      <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{name}</span>
      <span style={{
        fontSize: 10, padding: '2px 8px', borderRadius: 8, fontWeight: 600,
        background: busy ? '#F09595' : '#C0DD97', color: busy ? '#791F1F' : '#27500A',
      }}>{busy ? 'dolu' : 'müsait'}</span>
    </div>
  );
}
