import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Users, Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAvailableRoomsForService } from '@/services/availabilityService';
import { getRoomUnits, getUnitAvailability } from '@/services/roomUnitService';

const BOOKING_MODE_ICONS = {
  private: Lock,
  shared: Users,
  group_private: Droplets,
};

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
  const [unitData, setUnitData] = useState([]); // secili odanin birimleri
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Hizmet icin musait odalari yukle
  useEffect(() => {
    if (!company?.id || !service?.id || !date) return;

    const load = async () => {
      setLoadingRooms(true);
      try {
        // Hizmetin kaynak gereksinimlerine gore filtrele
        // Basit yaklasim: tum aktif odalari goster
        const rooms = spaces.filter(s => s.is_active);
        setAvailableRooms(rooms);
      } catch (err) {
        console.error('Odalar yuklenemedi:', err);
      } finally {
        setLoadingRooms(false);
      }
    };

    load();
  }, [company?.id, service?.id, date, spaces]);

  // Secili odanin birimlerini yukle
  useEffect(() => {
    if (!selectedRoom?.id || !company?.id) {
      setUnitData([]);
      return;
    }

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

  if (loadingRooms) {
    return (
      <div className="px-5 py-3 text-[11px] text-slate-400">
        {t('loadingRooms')}
      </div>
    );
  }

  if (availableRooms.length === 0) {
    return (
      <div className="px-5 py-3 text-[11px] text-slate-400">
        {t('noRoomsAvailable')}
      </div>
    );
  }

  return (
    <div className="pl-5 pr-2 py-2 bg-slate-50/50 space-y-1.5">
      {availableRooms.map(room => {
        const isRoomSelected = selectedRoom?.id === room.id;
        const ModeIcon = BOOKING_MODE_ICONS[room.booking_mode] || Lock;

        return (
          <div key={room.id}>
            {/* Oda karti */}
            <div
              onClick={() => onSelectRoom(isRoomSelected ? null : room)}
              className={cn(
                'flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-all text-xs',
                isRoomSelected
                  ? 'border-purple-400 bg-purple-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <div
                className="w-3 h-3 rounded shrink-0"
                style={{ backgroundColor: room.color || '#6366f1' }}
              />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-slate-700 truncate block">{room.name}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <ModeIcon className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] text-slate-400">
                    {t(`bookingMode${room.booking_mode?.charAt(0).toUpperCase()}${room.booking_mode?.slice(1)}`) || room.booking_mode}
                  </span>
                  {room.capacity > 1 && (
                    <span className="text-[10px] text-slate-400">
                      · {room.capacity} {t('units').toLowerCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Secili odanin birimleri */}
            {isRoomSelected && (
              <div className="pl-3 pt-1.5 pb-1 space-y-1">
                {loadingUnits ? (
                  <div className="text-[10px] text-slate-400 py-1">...</div>
                ) : unitData.length === 0 ? (
                  <div className="text-[10px] text-slate-400 py-1">
                    {t('noUnitsInRoom')}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {unitData.map(unit => {
                      const isUnitSelected = selectedUnit?.id === unit.id;
                      const hasAppointments = unit.appointmentCount > 0;

                      return (
                        <button
                          key={unit.id}
                          onClick={() => {
                            onSelectUnit(isUnitSelected ? null : unit);
                          }}
                          className={cn(
                            'flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] transition-all',
                            isUnitSelected
                              ? 'border-purple-400 bg-purple-100 text-purple-700 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                          )}
                        >
                          <span className="font-medium">{unit.name}</span>
                          <span
                            className={cn(
                              'text-[9px] px-1 py-0.5 rounded-full font-medium',
                              hasAppointments
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-green-100 text-green-700'
                            )}
                          >
                            {hasAppointments
                              ? `${unit.appointmentCount}`
                              : t('unitAvailable')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
