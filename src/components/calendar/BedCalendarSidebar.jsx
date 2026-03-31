import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Bed, Layers } from 'lucide-react';
import { getUnitAvailability } from '@/services/roomUnitService';

/**
 * Bagimsiz yatak takvimi gorunumu icin sol sidebar.
 * Odalari accordion tarzinda listeler, oda tiklaninca yataklari gosterir.
 */
export default function BedCalendarSidebar({
  company,
  date,
  spaces,
  selectedRoom,
  selectedUnit,
  onSelectRoom,
  onSelectUnit,
  onSelectAllUnits, // Odanin tum yataklarini sec
}) {
  const [expandedRoomId, setExpandedRoomId] = useState(null);
  const [unitDataMap, setUnitDataMap] = useState({}); // { roomId: unitData[] }
  const [loadingRoomId, setLoadingRoomId] = useState(null);

  // Sadece private odalar (yatak takvimi icin)
  const privateRooms = (spaces || []).filter(s => s.is_active && s.booking_mode === 'private');

  // Oda acildiginda yataklari yukle
  useEffect(() => {
    if (!expandedRoomId || !company?.id) return;
    if (unitDataMap[expandedRoomId]) return; // Zaten yuklenmis

    setLoadingRoomId(expandedRoomId);
    getUnitAvailability(company.id, expandedRoomId, date)
      .then(data => {
        setUnitDataMap(prev => ({ ...prev, [expandedRoomId]: data || [] }));
      })
      .catch(() => {
        setUnitDataMap(prev => ({ ...prev, [expandedRoomId]: [] }));
      })
      .finally(() => setLoadingRoomId(null));
  }, [expandedRoomId, company?.id, date]);

  // Tarih degistiginde cache'i temizle
  useEffect(() => {
    setUnitDataMap({});
  }, [date]);

  const handleRoomClick = (room) => {
    const isExpanded = expandedRoomId === room.id;
    if (isExpanded) {
      // Kapaniyor
      setExpandedRoomId(null);
      if (selectedRoom?.id === room.id) {
        onSelectRoom(null);
        onSelectUnit(null);
      }
    } else {
      // Aciliyor
      setExpandedRoomId(room.id);
      onSelectRoom(room);
    }
  };

  const handleUnitClick = (room, unit, e) => {
    e.stopPropagation();
    if (unit.busy) return;

    const isSelected = selectedUnit?.id === unit.id;
    if (isSelected) {
      onSelectUnit(null);
    } else {
      onSelectRoom(room);
      onSelectUnit({ id: unit.id, name: unit.name });
    }
  };

  const handleAllUnitsClick = (room, units, e) => {
    e.stopPropagation();
    onSelectRoom(room);
    onSelectUnit(null); // Tek yatak secimi kaldir
    if (onSelectAllUnits) {
      onSelectAllUnits(units);
    }
  };

  const totalDayMinutes = (21 - 8) * 60; // 780 dakika

  const processUnits = (roomId, roomCapacity) => {
    const raw = unitDataMap[roomId] || [];
    if (raw.length === 0) {
      // Default yataklar olustur
      return Array.from({ length: roomCapacity || 1 }, (_, i) => ({
        id: `auto-${roomId}-${i + 1}`,
        name: roomCapacity === 1 ? 'Yatak 1' : `Yatak ${i + 1}`,
        busy: false,
        partiallyBooked: false,
        occupancyPct: 0,
      }));
    }
    return raw.map(u => {
      const bookedMinutes = (u.busySlots || []).reduce((sum, s) => sum + (s.endMin - s.startMin), 0);
      const occupancyPct = Math.round((bookedMinutes / totalDayMinutes) * 100);
      return {
        id: u.id,
        name: u.name,
        busy: occupancyPct >= 95,
        partiallyBooked: occupancyPct > 0 && occupancyPct < 95,
        occupancyPct,
      };
    });
  };

  if (!privateRooms.length) {
    return (
      <div style={{ padding: 16, color: '#666', fontSize: 12, textAlign: 'center' }}>
        Yatak iceren oda bulunamadi
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#E8F1EC' }}>
      {/* Baslik */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #B5D0C0',
        background: '#D8E8DE',
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#0F3D2A', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Bed size={14} />
          Oda & Yatak Takvimi
        </div>
      </div>

      {/* Oda listesi */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        {privateRooms.map(room => {
          const isExpanded = expandedRoomId === room.id;
          const isSelected = selectedRoom?.id === room.id;
          const isLoading = loadingRoomId === room.id;
          const units = isExpanded ? processUnits(room.id, room.capacity) : [];

          return (
            <div key={room.id} style={{ marginBottom: 6 }}>
              {/* Oda basligi */}
              <div
                onClick={() => handleRoomClick(room)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  background: isSelected ? '#EEEDFE' : '#F2F7F4',
                  border: `1px solid ${isSelected ? '#7F77DD' : '#B5D0C0'}`,
                  borderRadius: isExpanded ? '8px 8px 0 0' : 8,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {isExpanded ? (
                  <ChevronDown size={14} color="#534AB7" />
                ) : (
                  <ChevronRight size={14} color="#5A8A6E" />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#0F3D2A' }}>
                    {room.name}
                  </div>
                  {room.description && (
                    <div style={{ fontSize: 9, color: '#5A8A6E', marginTop: 2 }}>
                      {room.description}
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: 9,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'rgba(83,74,183,0.1)',
                  color: '#534AB7',
                  fontWeight: 500,
                }}>
                  {room.capacity || 1} yatak
                </div>
              </div>

              {/* Yatak listesi (acik oldugunda) */}
              {isExpanded && (
                <div style={{
                  background: '#F8FAF9',
                  border: '1px solid #B5D0C0',
                  borderTop: 'none',
                  borderRadius: '0 0 8px 8px',
                  padding: '8px 10px',
                }}>
                  {isLoading ? (
                    <div style={{ fontSize: 11, color: '#5A8A6E', padding: '8px 0', textAlign: 'center' }}>
                      Yataklar yukleniyor...
                    </div>
                  ) : (
                    <>
                      {/* Tum Yataklar butonu */}
                      {units.length > 1 && (
                        <div
                          onClick={(e) => handleAllUnitsClick(room, units.filter(u => !u.busy), e)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 10px',
                            marginBottom: 6,
                            background: !selectedUnit && isSelected ? '#E8E5FF' : '#EDF5F0',
                            border: `1px solid ${!selectedUnit && isSelected ? '#7F77DD' : '#C5DDD0'}`,
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 11,
                            fontWeight: 500,
                            color: '#534AB7',
                            transition: 'all 0.12s',
                          }}
                        >
                          <Layers size={12} />
                          Tum Yataklar
                        </div>
                      )}

                      {/* Yatak butonlari */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {units.map(unit => (
                          <BedButton
                            key={unit.id}
                            name={unit.name}
                            busy={unit.busy}
                            partiallyBooked={unit.partiallyBooked}
                            occupancyPct={unit.occupancyPct}
                            selected={selectedUnit?.id === unit.id}
                            onClick={(e) => handleUnitClick(room, unit, e)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
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
      : 'musait';

  return (
    <div
      onClick={busy ? undefined : onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 10px',
        borderRadius: 6,
        border: `1px solid ${selected ? '#7F77DD' : '#C5DDD0'}`,
        background: selected ? '#EEEDFE' : '#fff',
        cursor: busy ? 'not-allowed' : 'pointer',
        opacity: busy ? 0.5 : 1,
        transition: 'all 0.12s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Bed size={12} color={selected ? '#534AB7' : '#5A8A6E'} />
        <span style={{ fontSize: 11, fontWeight: 500, color: '#0F3D2A' }}>{name}</span>
      </div>
      <span style={{
        fontSize: 9,
        padding: '2px 6px',
        borderRadius: 4,
        fontWeight: 600,
        background: statusBg,
        color: statusColor,
      }}>
        {statusText}
      </span>
    </div>
  );
}
