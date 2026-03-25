import React, { useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { timeToMinutes, formatMinutes, timesOverlap } from '@/services/availabilityService';

const SLOT_MINUTES = 15;
const SLOT_HEIGHT = 28; // px per 15dk slot
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 21;
const TOTAL_SLOTS = ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES; // 52

function slotToTime(slotIndex) {
  const totalMinutes = DAY_START_HOUR * 60 + slotIndex * SLOT_MINUTES;
  return formatMinutes(totalMinutes);
}

function timeToSlot(timeStr) {
  const mins = timeToMinutes(timeStr);
  return Math.floor((mins - DAY_START_HOUR * 60) / SLOT_MINUTES);
}

function durationToSlots(durationMinutes) {
  return Math.ceil(durationMinutes / SLOT_MINUTES);
}

export default function DayDetailTimeGrid({
  date,
  experts,
  appointments,
  service,
  room,
  unit,
  newAppointment,
  onSlotClick,
  onDragStart,
  onDragMove,
  onDragEnd,
  dragState,
  cellRefs,
}) {
  const { t } = useTranslation();
  const gridRef = useRef(null);

  const slotsNeeded = service ? durationToSlots(service.duration) : 0;

  // Mevcut randevulari slot bazli haritala
  const bookedSlots = useMemo(() => {
    const map = {}; // "colIndex-slotIndex" → appointment data
    if (!experts?.length || !appointments?.length) return map;

    appointments.forEach(apt => {
      if (!apt.time || apt.status === 'iptal') return;

      const expertId = apt.expert_id;
      const colIndex = experts.findIndex(e => e.id === expertId);
      if (colIndex === -1) return;

      const startSlot = timeToSlot(apt.time);
      const duration = apt.total_duration || apt.company_services?.duration || 60;
      const slots = durationToSlots(duration);

      for (let k = 0; k < slots; k++) {
        const s = startSlot + k;
        if (s >= 0 && s < TOTAL_SLOTS) {
          map[`${colIndex}-${s}`] = {
            appointment: apt,
            isFirst: k === 0,
            totalSlots: slots,
          };
        }
      }
    });

    return map;
  }, [experts, appointments]);

  // Cakisma kontrolu
  const canFit = useCallback((colIndex, startSlot, slotsCount) => {
    for (let k = 0; k < slotsCount; k++) {
      const s = startSlot + k;
      if (s >= TOTAL_SLOTS) return false;
      if (bookedSlots[`${colIndex}-${s}`]) return false;
    }
    return true;
  }, [bookedSlots]);

  // Saat etiketleri (her tam saatte)
  const timeLabels = useMemo(() => {
    const labels = [];
    for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
      labels.push({
        hour: h,
        label: `${String(h).padStart(2, '0')}:00`,
        slotIndex: (h - DAY_START_HOUR) * (60 / SLOT_MINUTES),
      });
    }
    return labels;
  }, []);

  if (!experts || experts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-slate-400">
        {t('noExpertsAvailable')}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Uzman baslik satirlari */}
      <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10">
        {/* Saat sutunu */}
        <div className="w-12 shrink-0 border-r border-slate-100" />
        {/* Uzman sutunlari */}
        {experts.map((expert, colIndex) => (
          <div
            key={expert.id}
            className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-2 py-2 border-r border-slate-100"
          >
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: expert.color || '#0ea5e9' }}
            />
            <span className="text-[11px] font-medium text-slate-700 truncate">
              {expert.name}
            </span>
          </div>
        ))}
      </div>

      {/* Grid govde */}
      <div ref={gridRef} className="flex-1 overflow-y-auto relative">
        <div className="flex" style={{ minHeight: TOTAL_SLOTS * SLOT_HEIGHT }}>
          {/* Saat etiketi sutunu */}
          <div className="w-12 shrink-0 border-r border-slate-100 relative">
            {timeLabels.map(tl => (
              <div
                key={tl.hour}
                className="absolute left-0 right-0 flex items-start justify-end pr-1.5"
                style={{ top: tl.slotIndex * SLOT_HEIGHT - 6 }}
              >
                <span className="text-[10px] text-slate-400 font-medium tabular-nums">
                  {tl.label}
                </span>
              </div>
            ))}
          </div>

          {/* Uzman sutunlari */}
          {experts.map((expert, colIndex) => (
            <div
              key={expert.id}
              className="flex-1 min-w-[100px] relative border-r border-slate-100"
            >
              {/* Slot satirlari */}
              {Array.from({ length: TOTAL_SLOTS }, (_, slotIndex) => {
                const isHourBoundary = slotIndex % (60 / SLOT_MINUTES) === 0;
                const isHalfHour = slotIndex % (30 / SLOT_MINUTES) === 0 && !isHourBoundary;
                const booked = bookedSlots[`${colIndex}-${slotIndex}`];
                const isNewAppt = newAppointment
                  && newAppointment.colIndex === colIndex
                  && slotIndex >= newAppointment.startSlot
                  && slotIndex < newAppointment.startSlot + slotsNeeded;
                const isNewFirst = isNewAppt && slotIndex === newAppointment.startSlot;

                // Drag highlight
                const dragHighlight = dragState?.targetCol === colIndex
                  && slotIndex >= dragState.targetSlot
                  && slotIndex < dragState.targetSlot + slotsNeeded;
                const dragValid = dragHighlight && dragState.isValid;
                const dragInvalid = dragHighlight && !dragState.isValid;

                return (
                  <div
                    key={slotIndex}
                    data-col={colIndex}
                    data-slot={slotIndex}
                    ref={el => {
                      if (cellRefs?.current) {
                        cellRefs.current[`${colIndex}-${slotIndex}`] = el;
                      }
                    }}
                    onClick={() => {
                      if (!booked && !isNewAppt && service) {
                        if (canFit(colIndex, slotIndex, slotsNeeded)) {
                          onSlotClick(colIndex, slotIndex, expert);
                        }
                      }
                    }}
                    className={cn(
                      'relative',
                      isHourBoundary ? 'border-t border-slate-200' : isHalfHour ? 'border-t border-slate-100' : 'border-t border-slate-50',
                      !booked && !isNewAppt && service && 'cursor-pointer hover:bg-purple-50/30',
                      dragValid && 'bg-emerald-100/60',
                      dragInvalid && 'bg-red-100/60'
                    )}
                    style={{ height: SLOT_HEIGHT }}
                  >
                    {/* Mevcut randevu bloku (gri) */}
                    {booked?.isFirst && (
                      <div
                        className="absolute left-0.5 right-0.5 rounded z-[2] px-1.5 py-0.5 overflow-hidden pointer-events-none"
                        style={{
                          top: 1,
                          height: booked.totalSlots * SLOT_HEIGHT - 2,
                          backgroundColor: `${expert.color || '#94a3b8'}20`,
                          borderLeft: `3px solid ${expert.color || '#94a3b8'}`,
                        }}
                      >
                        <span className="text-[10px] font-medium text-slate-600 truncate block">
                          {booked.appointment.customers?.name || t('unknownCustomer')}
                        </span>
                        <span className="text-[9px] text-slate-400 truncate block">
                          {booked.appointment.company_services?.description || ''}
                        </span>
                      </div>
                    )}

                    {/* Yeni randevu bloku (mor) */}
                    {isNewFirst && (
                      <div
                        className="absolute left-0.5 right-0.5 rounded z-[5] px-1.5 py-0.5 cursor-grab active:cursor-grabbing"
                        style={{
                          top: 1,
                          height: slotsNeeded * SLOT_HEIGHT - 2,
                          backgroundColor: '#7c3aed',
                        }}
                        onMouseDown={(e) => onDragStart?.(e)}
                      >
                        <span className="text-[10px] font-medium text-white truncate block">
                          {service?.description}
                        </span>
                        <span className="text-[9px] text-white/70 truncate block">
                          {slotToTime(newAppointment.startSlot)} - {slotToTime(newAppointment.startSlot + slotsNeeded)}
                          {' · '}{service?.duration}dk
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { slotToTime, timeToSlot, durationToSlots, SLOT_MINUTES, DAY_START_HOUR, DAY_END_HOUR, TOTAL_SLOTS };
