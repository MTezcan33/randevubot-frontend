import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Bed, User } from 'lucide-react';
import { getAllExpertSpaces } from '@/services/resourceService';

/**
 * Bagimsiz yatak takvimi gorunumu icin sol sidebar.
 * Odalari accordion tarzinda listeler, oda tiklaninca personelleri gosterir.
 * Yatak takvimi sag tarafta grid olarak goruntulenir.
 */
export default function BedCalendarSidebar({
  company,
  date,
  spaces,
  experts, // Tum uzmanlar
  selectedRoom,
  onSelectRoom,
}) {
  const [expandedRoomId, setExpandedRoomId] = useState(null);
  const [expertSpaceMap, setExpertSpaceMap] = useState({}); // { spaceId: [expertId, ...] }

  // Sadece private odalar (yatak takvimi icin)
  const privateRooms = (spaces || []).filter(s => s.is_active && s.booking_mode === 'private');

  // Uzman-oda atamalarini yukle
  useEffect(() => {
    if (!company?.id) return;
    getAllExpertSpaces(company.id)
      .then(data => {
        // { spaceId: [expertId, ...] } formatina cevir
        const map = {};
        (data || []).forEach(es => {
          if (!map[es.space_id]) map[es.space_id] = [];
          map[es.space_id].push(es.expert_id);
        });
        setExpertSpaceMap(map);
      })
      .catch(() => setExpertSpaceMap({}));
  }, [company?.id]);

  // Bir odaya atanmis uzmanlar
  const getRoomExperts = (roomId) => {
    const expertIds = expertSpaceMap[roomId] || [];
    return (experts || []).filter(e => expertIds.includes(e.id));
  };

  const handleRoomClick = (room) => {
    const isExpanded = expandedRoomId === room.id;
    if (isExpanded) {
      // Kapaniyor
      setExpandedRoomId(null);
      if (selectedRoom?.id === room.id) {
        onSelectRoom(null);
      }
    } else {
      // Aciliyor
      setExpandedRoomId(room.id);
      onSelectRoom(room);
    }
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
          const roomExperts = getRoomExperts(room.id);

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

              {/* Oda icerigi - Personeller (acik oldugunda) */}
              {isExpanded && (
                <div style={{
                  background: '#F8FAF9',
                  border: '1px solid #B5D0C0',
                  borderTop: 'none',
                  borderRadius: '0 0 8px 8px',
                  padding: '10px 12px',
                }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: '#5A8A6E', marginBottom: 6, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <User size={10} />
                    Personeller
                  </div>

                  {roomExperts.length === 0 ? (
                    <div style={{ fontSize: 10, color: '#888', fontStyle: 'italic' }}>
                      Bu odaya atanmis personel yok
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {roomExperts.map(expert => (
                        <div
                          key={expert.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 8px',
                            borderRadius: 6,
                            background: '#fff',
                            border: '1px solid #C5DDD0',
                            fontSize: 10,
                            fontWeight: 500,
                            color: '#0F3D2A',
                          }}
                        >
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: expert.color || '#1D9E75',
                            }}
                          />
                          {expert.name}
                        </div>
                      ))}
                    </div>
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
