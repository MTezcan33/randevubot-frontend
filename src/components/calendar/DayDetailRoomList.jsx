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
    <div style={{ padding: '5px 12px 6px 18px', background: '#E0EAE4', borderBottom: '1px solid #B5D0C0' }}>
      {availableRooms.map(room => {
        const isRS = selectedRoom?.id === room.id;

        return (
          <div key={room.id}>
            <div
              onClick={() => onSelectRoom(isRS ? null : room)}
              style={{
                background: isRS ? '#EEEDFE' : '#F2F7F4',
                border: `1px solid ${isRS ? '#7F77DD' : '#B5D0C0'}`,
                borderRadius: 8, padding: '7px 9px', marginBottom: 5, cursor: 'pointer',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (!isRS) e.currentTarget.style.borderColor = '#8ABFA2'; }}
              onMouseLeave={e => { if (!isRS) e.currentTarget.style.borderColor = isRS ? '#7F77DD' : '#B5D0C0'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#0F3D2A' }}>{room.name}</span>
                {/* Self servis icin kapasite goster */}
                {isSelfService && (
                  <span style={{ fontSize: 11, color: '#1D9E75', fontWeight: 500 }}>
                    Kapasite: {room.capacity}
                  </span>
                )}
              </div>
              {room.description && (
                <div style={{ fontSize: 9, color: '#3D7055', lineHeight: 1.3, marginTop: 2 }}>{room.description}</div>
              )}

              {/* UZMAN HİZMETİ: Yatak secimi */}
              {isRS && !isSelfService && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}
                  onClick={e => e.stopPropagation()}
                >
                  {loadingUnits ? (
                    <span style={{ fontSize: 11, color: '#5A8A6E' }}>...</span>
                  ) : (() => {
                    const totalDayMinutes = (21 - 8) * 60; // 780 dakika
                    const units = unitData.length > 0
                      ? unitData.map(u => {
                          const bookedMinutes = (u.busySlots || []).reduce((sum, s) => sum + (s.endMin - s.startMin), 0);
                          const occupancyPct = Math.round((bookedMinutes / totalDayMinutes) * 100);
                          return {
                            id: u.id,
                            name: u.name,
                            busy: occupancyPct >= 95,
                            partiallyBooked: occupancyPct > 0 && occupancyPct < 95,
                            occupancyPct,
                            busySlots: u.busySlots || [],
                          };
                        })
                      : generateDefaultUnits(room);
                    return units.map(unit => (
                      <BedButton key={unit.id} name={unit.name} busy={unit.busy}
                        partiallyBooked={unit.partiallyBooked} occupancyPct={unit.occupancyPct}
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

function BedButton({ name, busy, partiallyBooked, occupancyPct, selected, onClick }) {
  const statusBg = busy
    ? 'rgba(226,75,74,0.15)'
    : partiallyBooked
      ? 'rgba(239,159,39,0.2)'
      : 'rgba(29,158,117,0.2)';
  const statusColor = busy
    ? '#A32D2D'
    : partiallyBooked
      ? '#854F0B'
      : '#0F6E56';
  const statusText = busy
    ? 'dolu'
    : partiallyBooked
      ? `%${occupancyPct} dolu`
      : 'müsait';

  return (
    <div onClick={busy ? undefined : onClick} style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6,
      border: `1px solid ${selected ? '#7F77DD' : '#B5D0C0'}`,
      background: selected ? '#EEEDFE' : '#F2F7F4',
      cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.35 : 1,
      transition: 'all 0.12s', fontSize: 10, fontFamily: 'inherit',
    }}>
      <span style={{ fontWeight: 500, fontSize: 10, color: '#0F3D2A' }}>{name}</span>
      <span style={{
        fontSize: 9, padding: '1px 6px', borderRadius: 6, fontWeight: 600,
        background: statusBg,
        color: statusColor,
      }}>{statusText}</span>
    </div>
  );
}
