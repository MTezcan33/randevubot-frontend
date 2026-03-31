import React, { useMemo, useState } from 'react';
import { Lock, Users, Droplets, DoorOpen, Plus, Minus, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ═══ Kapasite cubugu — paylasimli alanlar icin ═══
const CapacityMeter = ({ used, total, color }) => {
  const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const barColor = percentage >= 80 ? '#ef4444' : percentage >= 50 ? '#f59e0b' : '#10b981';

  return (
    <div className="flex items-center gap-1 px-1">
      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percentage}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="text-[8px] font-medium text-slate-500 whitespace-nowrap">{used}/{total}</span>
    </div>
  );
};

// ═══ Oda Randevu Karti ═══
const RoomAppointmentCard = ({ appointment, startMinutes, duration, serviceName, expert, spaceColor }) => {
  const formatTime = (minutes) => {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const displayTime = formatTime(startMinutes);
  const displayEndTime = formatTime(startMinutes + duration);

  // Uzman rengi veya oda rengi
  const bgColor = expert?.color || spaceColor || '#0ea5e9';
  const isLight = (() => {
    if (!bgColor || bgColor.length < 7) return false;
    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
  })();

  const textColor = isLight ? '#1e293b' : '#ffffff';
  const subColor = isLight ? '#475569' : 'rgba(255,255,255,0.8)';

  return (
    <div
      className="rounded-xl overflow-hidden h-full flex flex-col cursor-pointer hover:brightness-110 transition-all"
      style={{ backgroundColor: bgColor, boxShadow: `0 2px 6px ${bgColor}40` }}
    >
      <div className="px-2 pt-1 flex items-center gap-1">
        <span className="font-bold text-[9px] whitespace-nowrap" style={{ color: textColor }}>
          {displayTime} - {displayEndTime}
        </span>
        <span className="text-[9px] truncate" style={{ color: subColor }}>{serviceName}</span>
      </div>
      <div className="px-2 pb-1">
        <p className="font-semibold text-[10px] truncate" style={{ color: textColor }}>
          {appointment.customers?.name?.toUpperCase() || '—'}
        </p>
        {expert && (
          <span className="inline-block text-[8px] px-1 py-0.5 rounded bg-black/20 mt-0.5" style={{ color: textColor }}>
            {expert.name}
          </span>
        )}
      </div>
    </div>
  );
};

// ═══ Ana RoomCalendarGrid Komponenti ═══
const RoomCalendarGrid = ({
  spaces,
  appointments,
  appointmentResources,
  timeSlots,
  experts,
  onAppointmentClick,
  ROW_HEIGHT,
  PIXELS_PER_MINUTE,
  // Drag-drop props
  onExpertDrop,
  dragOverSpaceId,
  onDragOver,
  onDragLeave,
  // Walk-in kapasite props
  onWalkIn,
  onWalkOut,
  // Oda tiklandiginda yatak takvimi acmak icin
  onRoomClick,
}) => {
  const { t } = useTranslation();

  // Zaman yardımcı fonksiyonları
  const timeToMinutes = (time) => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  // Oda bazında randevuları grupla
  const appointmentsBySpace = useMemo(() => {
    const map = {};
    spaces.forEach(sp => { map[sp.id] = []; });

    appointments.forEach(app => {
      // 1. Dogrudan space_id ile eslestir
      if (app.space_id && map[app.space_id]) {
        map[app.space_id].push(app);
        return;
      }
      // 2. appointment_resources uzerinden eslestir
      const resourceMatch = appointmentResources.find(
        ar => ar.appointment_id === app.id && ar.resource_type === 'space'
      );
      if (resourceMatch && map[resourceMatch.resource_id]) {
        map[resourceMatch.resource_id].push(app);
      }
    });

    return map;
  }, [spaces, appointments, appointmentResources]);

  // Paylasimli alan icin saatlik kapasite hesapla
  const getCapacityAtMinute = (spaceId, minute, space) => {
    const spaceApps = appointmentsBySpace[spaceId] || [];
    let count = 0;
    spaceApps.forEach(app => {
      const appStart = timeToMinutes(app.time);
      const appEnd = appStart + (app.total_duration || 60);
      if (minute >= appStart && minute < appEnd) count++;
    });
    return { used: count, total: space.capacity || 1 };
  };

  // Booking mode ikonu
  const getModeIcon = (mode) => {
    switch (mode) {
      case 'private': return <Lock className="w-3 h-3" />;
      case 'shared': return <Users className="w-3 h-3" />;
      case 'group_private': return <Droplets className="w-3 h-3" />;
      default: return null;
    }
  };

  // Bolgelere gore grupla
  const groupedSpaces = useMemo(() => {
    const groups = {};
    spaces.forEach(sp => {
      const zone = sp.zone || t('general') || 'Genel';
      if (!groups[zone]) groups[zone] = [];
      groups[zone].push(sp);
    });
    return groups;
  }, [spaces, t]);

  // Duz sirali spaces listesi (zone ile birlikte)
  const orderedSpaces = useMemo(() => {
    const result = [];
    Object.entries(groupedSpaces).forEach(([zone, zoneSpaces]) => {
      zoneSpaces.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      zoneSpaces.forEach(sp => result.push({ ...sp, _zone: zone }));
    });
    return result;
  }, [groupedSpaces]);

  if (orderedSpaces.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="text-center">
          <DoorOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium">{t('noSpacesYet') || 'Henüz alan tanımlanmamış'}</p>
          <p className="text-xs mt-1">{t('addFirstSpace') || 'Kaynaklar sayfasından alan ekleyin'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      {/* Saat Sutunu */}
      <div className="w-14 flex-shrink-0 bg-gray-50 border-r sticky left-0 z-10">
        {/* Zone satırı (birden fazla zone varsa) */}
        {Object.keys(groupedSpaces).length > 1 && (
          <div className="h-5 border-b bg-slate-100" />
        )}
        <div className="h-8 border-b bg-white" />
        {timeSlots.map((time, index) => (
          <div
            key={time}
            style={{ height: `${ROW_HEIGHT}px` }}
            className={`text-right pr-1 text-[10px] text-slate-500 flex items-start pt-0.5 ${
              index % 6 === 0 ? 'border-t border-slate-200' : ''
            }`}
          >
            {index % 6 === 0 ? time : ''}
          </div>
        ))}
      </div>

      {/* Oda Sutunlari */}
      <div className="flex-grow grid relative" style={{
        gridTemplateColumns: `repeat(${orderedSpaces.length}, 160px)`
      }}>
        {/* Zone başlık satırı (birden fazla zone varsa) */}
        {Object.keys(groupedSpaces).length > 1 && orderedSpaces.map((space, idx) => {
          const isFirstInZone = idx === 0 || orderedSpaces[idx - 1]._zone !== space._zone;
          const zoneSpaceCount = groupedSpaces[space._zone]?.length || 1;

          if (isFirstInZone) {
            // Zone renkleri
            const zoneColors = {
              'Masaj Odaları': '#7c3aed', 'Masaj': '#7c3aed',
              'Islak Alan': '#0ea5e9', 'Spa': '#0ea5e9', 'Havuz': '#06b6d4',
              'Hamam': '#f59e0b', 'Sauna': '#ef4444',
              'VIP': '#d97706', 'Genel': '#6b7280',
            };
            const bgColor = zoneColors[space._zone] || '#6b7280';

            return (
              <div
                key={`zone-${space._zone}-${idx}`}
                className="h-5 flex items-center justify-center text-[9px] font-bold text-white tracking-wider"
                style={{
                  gridColumn: `span ${zoneSpaceCount}`,
                  backgroundColor: bgColor,
                }}
              >
                {space._zone.toUpperCase()}
              </div>
            );
          }
          return null; // Span ile kapsandı
        })}

        {orderedSpaces.map(space => {
          const isShared = space.booking_mode === 'shared';
          const spaceApps = appointmentsBySpace[space.id] || [];

          const isDragTarget = dragOverSpaceId === space.id;

          return (
            <div
              key={space.id}
              className={`border-l relative transition-all duration-200 ${
                isDragTarget ? 'bg-emerald-50/40 ring-2 ring-inset ring-emerald-300/50' : ''
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                onDragOver?.(space.id);
              }}
              onDragLeave={() => onDragLeave?.()}
              onDrop={(e) => {
                e.preventDefault();
                try {
                  const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                  if (data.type === 'expert') {
                    onExpertDrop?.(data.expertId, space.id);
                  }
                } catch {}
                onDragLeave?.();
              }}
            >
              {/* Oda Basligi — private odalar icin tiklanabilir (yatak takvimi acar) */}
              <div
                className={`h-8 sticky top-0 backdrop-blur-sm z-30 px-2 border-b flex items-center justify-center gap-1 transition-colors ${
                  isDragTarget ? 'bg-emerald-100/90 border-emerald-400' : 'bg-white/95'
                } ${!isShared && onRoomClick ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                style={!isDragTarget ? { borderBottomColor: space.color || '#e2e8f0' } : {}}
                onClick={() => !isShared && onRoomClick?.(space)}
                title={!isShared ? 'Yatak takvimini görüntüle' : undefined}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: space.color || '#94a3b8' }} />
                <p className="font-medium text-[10px] truncate" style={{ color: space.color || '#1e293b' }}>
                  {space.name.toUpperCase()}
                </p>
                {isShared && space.capacity && (
                  <span className="text-[8px] text-slate-400">({space.capacity})</span>
                )}
                {!isShared && <span className="text-slate-300 flex-shrink-0">{getModeIcon(space.booking_mode)}</span>}
                {/* Walk-in butonları — paylaşımlı alanlar için */}
                {isShared && onWalkIn && (
                  <div className="flex items-center gap-0.5 ml-auto flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); onWalkOut?.(space.id, space); }}
                      className="w-5 h-5 rounded flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                      title="Müşteri çıkışı"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onWalkIn?.(space.id, space); }}
                      className="w-5 h-5 rounded flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                      title="Müşteri girişi"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Zaman Grid */}
              <div className="relative" style={{ height: `${timeSlots.length * ROW_HEIGHT}px` }}>
                {/* Saat cizgileri */}
                {timeSlots.map((_, i) => (
                  <div
                    key={i}
                    style={{ height: `${ROW_HEIGHT}px` }}
                    className={i % 6 === 0 ? 'border-t border-slate-200' : ''}
                  />
                ))}

                {/* Paylasimli alan — kapasite cubuklari + randevu bloklari */}
                {isShared && (() => {
                  const elements = [];
                  // Saatlik kapasite çubukları
                  for (let h = 5; h <= 23; h++) {
                    const minute = h * 60;
                    const cap = getCapacityAtMinute(space.id, minute, space);
                    const top = (minute - 5 * 60) * PIXELS_PER_MINUTE;
                    // Her saat dilimi için arka plan doluluk göstergesi
                    if (cap.used > 0) {
                      const fillPercent = Math.min((cap.used / cap.total) * 100, 100);
                      const fillColor = fillPercent >= 80 ? 'rgba(239,68,68,0.08)' : fillPercent >= 50 ? 'rgba(245,158,11,0.06)' : 'rgba(16,185,129,0.05)';
                      elements.push(
                        <div key={`bg-${h}`} className="absolute left-0 right-0 z-[1]"
                          style={{ top: `${top}px`, height: `${60 * PIXELS_PER_MINUTE}px`, backgroundColor: fillColor }} />
                      );
                      elements.push(
                        <div key={`bar-${h}`} className="absolute left-0 right-0 px-1 z-10"
                          style={{ top: `${top + 2}px` }}>
                          <CapacityMeter used={cap.used} total={cap.total} color={space.color} />
                        </div>
                      );
                    }
                  }

                  // Paylaşımlı alandaki randevu blokları da göster
                  spaceApps.forEach(app => {
                    const appStart = timeToMinutes(app.time);
                    const dur = app.total_duration || 60;
                    const top = (appStart - 5 * 60) * PIXELS_PER_MINUTE;
                    const height = dur * PIXELS_PER_MINUTE;
                    const expert = app.expert_id ? experts.find(e => e.id === app.expert_id) : null;

                    elements.push(
                      <div
                        key={`shared-${app.id}`}
                        className="absolute left-0 w-[95%] px-0.5 z-10 hover:z-20 hover:brightness-110 transition-all"
                        style={{ top: `${top}px`, height: `${Math.max(height, 12)}px` }}
                        onClick={() => onAppointmentClick?.(app)}
                      >
                        <RoomAppointmentCard
                          appointment={app}
                          startMinutes={appStart}
                          duration={dur}
                          serviceName={app.appointment_services?.[0]?.company_services?.description || app.company_services?.description || '—'}
                          expert={expert}
                          spaceColor={space.color}
                        />
                      </div>
                    );
                  });

                  return elements;
                })()}

                {/* Ozel/Grup ozel alan — randevu bloklari */}
                {!isShared && spaceApps.map(app => {
                  const appStartMinutes = timeToMinutes(app.time);
                  const duration = app.total_duration || app.company_services?.duration || 60;

                  // Appointment services varsa, her biri icin ayri blok
                  if (app.appointment_services?.length > 0) {
                    let cumulative = 0;
                    return app.appointment_services.map((as, idx) => {
                      const svcDuration = as.company_services?.duration || duration;
                      const blockStart = appStartMinutes + cumulative;
                      const top = (blockStart - 5 * 60) * PIXELS_PER_MINUTE;
                      const height = svcDuration * PIXELS_PER_MINUTE;
                      cumulative += svcDuration;

                      const expert = as.expert_id ? experts.find(e => e.id === as.expert_id) : null;

                      return (
                        <div
                          key={`${app.id}-${idx}`}
                          className="absolute left-0 w-[95%] px-0.5 z-10 hover:z-20 hover:brightness-110 transition-all"
                          style={{ top: `${top}px`, height: `${height}px` }}
                          onClick={() => onAppointmentClick?.(app)}
                        >
                          <RoomAppointmentCard
                            appointment={app}
                            startMinutes={blockStart}
                            duration={svcDuration}
                            serviceName={as.company_services?.description || '—'}
                            expert={expert}
                            spaceColor={space.color}
                          />
                        </div>
                      );
                    });
                  }

                  // Tek hizmetli randevu
                  const top = (appStartMinutes - 5 * 60) * PIXELS_PER_MINUTE;
                  const height = duration * PIXELS_PER_MINUTE;
                  const expert = app.expert_id ? experts.find(e => e.id === app.expert_id) : null;

                  return (
                    <div
                      key={app.id}
                      className="absolute left-0 w-[95%] px-0.5 z-10 hover:z-20 hover:brightness-110 transition-all"
                      style={{ top: `${top}px`, height: `${height}px` }}
                      onClick={() => onAppointmentClick?.(app)}
                    >
                      <RoomAppointmentCard
                        appointment={app}
                        startMinutes={appStartMinutes}
                        duration={duration}
                        serviceName={
                          app.appointment_services?.map(as => as.company_services?.description).filter(Boolean).join(', ')
                          || app.company_services?.description || '—'
                        }
                        expert={expert}
                        spaceColor={space.color}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoomCalendarGrid;
