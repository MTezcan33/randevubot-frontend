import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRoomUnits, getUnitAvailability } from '@/services/roomUnitService';

// Seans saatleri olustur: 08:00'den 20:00'e kadar 1.5 saatlik araliklar
function generateSessionTimes(startHour = 8, endHour = 20, intervalMinutes = 90) {
  const sessions = [];
  let current = startHour * 60;
  while (current < endHour * 60) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    sessions.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    current += intervalMinutes;
  }
  return sessions;
}

export default function DayDetailRoomList({
  company,
  date,
  service,
  spaces,
  experts,
  expertServicesMap,
  selectedRoom,
  onSelectRoom,
  selectedUnit,
  onSelectUnit,
}) {
  const { t } = useTranslation();
  const [availableRooms, setAvailableRooms] = useState([]);
  const [unitData, setUnitData] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Odalari yukle
  useEffect(() => {
    if (!company?.id || !service?.id) return;
    const rooms = (spaces || []).filter(s => s.is_active);
    setAvailableRooms(rooms);
  }, [company?.id, service?.id, spaces]);

  // Secili odanin birimlerini yukle
  useEffect(() => {
    if (!selectedRoom?.id || !company?.id) { setUnitData([]); return; }
    const load = async () => {
      setLoadingUnits(true);
      try {
        const units = await getUnitAvailability(company.id, selectedRoom.id, date);
        setUnitData(units);
      } catch (err) {
        console.error('Birimler yuklenemedi:', err);
      } finally {
        setLoadingUnits(false);
      }
    };
    load();
  }, [selectedRoom?.id, company?.id, date]);

  if (availableRooms.length === 0) {
    return <div className="px-5 py-3 text-[11px] text-slate-400">{t('noRoomsAvailable')}</div>;
  }

  // Seans zamanlari — her 1.5 saatte bir
  const sessionTimes = generateSessionTimes(8, 20, 90);

  return (
    <div className="pl-4 pr-2 py-2 bg-slate-50/50 space-y-2">
      {availableRooms.map(room => {
        const isRoomSelected = selectedRoom?.id === room.id;

        return (
          <div key={room.id}>
            {/* Oda karti */}
            <div
              onClick={() => onSelectRoom(isRoomSelected ? null : room)}
              className={cn(
                'flex items-center px-3 py-2 rounded-lg border cursor-pointer transition-all',
                isRoomSelected
                  ? 'border-amber-400 bg-amber-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <div className="flex-1 min-w-0">
                <span className="text-[12px] font-semibold text-slate-800 block">{room.name}</span>
                {room.description && (
                  <span className="text-[10px] text-slate-400">{room.description}</span>
                )}
              </div>
              <ChevronRight className={cn(
                'w-4 h-4 shrink-0 transition-transform',
                isRoomSelected ? 'rotate-90 text-amber-600' : 'text-slate-300'
              )} />
            </div>

            {/* Secili odanin birimleri — Seans formati */}
            {isRoomSelected && (
              <div className="pl-3 pt-2 pb-1 space-y-1.5">
                {loadingUnits ? (
                  <div className="text-[10px] text-slate-400 py-1">...</div>
                ) : unitData.length === 0 ? (
                  // Birim yoksa seans saatleri goster
                  <div className="space-y-1">
                    {sessionTimes.slice(0, 6).map(time => {
                      // Basit musaitlik kontrolu — randevu yoksa musait
                      return (
                        <button
                          key={time}
                          onClick={() => onSelectUnit({ id: `session-${time}`, name: `Seans ${time}`, sessionTime: time })}
                          className={cn(
                            'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] w-full transition-all',
                            selectedUnit?.sessionTime === time
                              ? 'border-purple-400 bg-purple-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          )}
                        >
                          <span className="font-medium text-slate-700">Seans {time}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-green-100 text-green-700">
                            {t('unitAvailable').toLowerCase()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  // Birimler varsa her birimi seans saatleri ile goster
                  unitData.map(unit => {
                    const isUnitExpanded = selectedUnit?.parentUnitId === unit.id || selectedUnit?.id === unit.id;

                    return (
                      <div key={unit.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                        <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                          <span className="text-[11px] font-semibold text-slate-700">{unit.name}</span>
                          {unit.unit_type && unit.unit_type !== 'bed' && (
                            <span className="text-[10px] text-slate-400 ml-1">{unit.unit_type}</span>
                          )}
                        </div>
                        <div className="px-2 py-1.5 space-y-1">
                          {sessionTimes.slice(0, 4).map(time => {
                            // Musaitlik: bu birimin bu saatte randevusu var mi?
                            const isBooked = (unit.appointments || []).some(apt => {
                              if (!apt.time) return false;
                              const aptH = parseInt(apt.time.split(':')[0]);
                              const sesH = parseInt(time.split(':')[0]);
                              return Math.abs(aptH - sesH) < 2;
                            });
                            const isThisSelected = selectedUnit?.sessionTime === time && selectedUnit?.parentUnitId === unit.id;

                            return (
                              <button
                                key={time}
                                onClick={() => {
                                  if (!isBooked) {
                                    onSelectUnit({
                                      id: unit.id,
                                      parentUnitId: unit.id,
                                      name: unit.name,
                                      sessionTime: time,
                                    });
                                  }
                                }}
                                disabled={isBooked}
                                className={cn(
                                  'flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[11px] w-full transition-all',
                                  isBooked && 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-50',
                                  isThisSelected && !isBooked && 'border-purple-400 bg-purple-50',
                                  !isBooked && !isThisSelected && 'border-slate-200 bg-white hover:border-slate-300'
                                )}
                              >
                                <span className="font-medium text-slate-700">Seans {time}</span>
                                <span className={cn(
                                  'text-[9px] px-1.5 py-0.5 rounded-full font-semibold',
                                  isBooked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                                )}>
                                  {isBooked ? t('unitOccupied').toLowerCase() : t('unitAvailable').toLowerCase()}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
