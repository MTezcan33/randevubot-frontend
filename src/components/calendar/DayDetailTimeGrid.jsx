import React, { useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { timeToMinutes, formatMinutes } from '@/services/availabilityService';

const SLOT_MINUTES = 15;
const ROW_H = 20;
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 21;
const TOTAL_SLOTS = ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES; // 52

function slotToTime(i) { return formatMinutes(DAY_START_HOUR * 60 + i * SLOT_MINUTES); }
function timeToSlot(t) { return Math.floor((timeToMinutes(t) - DAY_START_HOUR * 60) / SLOT_MINUTES); }
function durationToSlots(d) { return Math.ceil(d / SLOT_MINUTES); }

export default function DayDetailTimeGrid({
  date, experts, appointments, service,
  newAppointment, onSlotClick, onDragStart, dragState, cellRefs,
}) {
  const { t } = useTranslation();
  const slotsNeeded = service ? durationToSlots(service.duration) : 0;

  // Booked slots
  const bookedSlots = useMemo(() => {
    const map = {};
    if (!experts?.length || !appointments?.length) return map;
    appointments.forEach(apt => {
      if (!apt.time || apt.status === 'iptal') return;
      const ci = experts.findIndex(e => e.id === apt.expert_id);
      if (ci === -1) return;
      const startSlot = timeToSlot(apt.time);
      const dur = apt.total_duration || apt.company_services?.duration || 60;
      const slots = durationToSlots(dur);
      for (let k = 0; k < slots; k++) {
        const s = startSlot + k;
        if (s >= 0 && s < TOTAL_SLOTS)
          map[`${ci}-${s}`] = { apt, isFirst: k === 0, totalSlots: slots, ci };
      }
    });
    return map;
  }, [experts, appointments]);

  const canFit = useCallback((ci, si, n) => {
    for (let k = 0; k < n; k++) { if (si + k >= TOTAL_SLOTS || bookedSlots[`${ci}-${si + k}`]) return false; }
    return true;
  }, [bookedSlots]);

  if (!experts?.length) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, color: '#999', fontSize: 14 }}>{t('noExpertsAvailable')}</div>;
  }

  const cols = experts.length;
  const gtc = `48px repeat(${cols}, minmax(0, 1fr))`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Header — uzman isimleri */}
      <div style={{ display: 'grid', gridTemplateColumns: gtc, borderBottom: '1px solid #d5d5d0' }}>
        <div style={{ padding: '8px 4px', fontSize: 10, color: '#999', fontWeight: 500 }} />
        {experts.map(exp => (
          <div key={exp.id} style={{ padding: '8px 4px', fontSize: 12, fontWeight: 600, textAlign: 'center', color: exp.color || '#666' }}>
            {exp.name}
          </div>
        ))}
      </div>

      {/* Grid body */}
      <div style={{ maxHeight: 460, overflowY: 'auto' }}>
        {Array.from({ length: TOTAL_SLOTS }, (_, si) => {
          const isHour = si % 4 === 0;
          return (
            <div key={si} style={{ display: 'grid', gridTemplateColumns: gtc }}>
              {/* Saat etiketi */}
              <div style={{
                minHeight: ROW_H, borderBottom: `1px solid ${isHour ? '#e8e8e3' : '#f0f0eb'}`,
                borderRight: '1px solid #f0f0eb', display: 'flex', alignItems: 'flex-start',
                justifyContent: 'flex-end', padding: '2px 8px 0 0',
                fontSize: 11, color: '#999', fontFamily: "'SF Mono','Menlo',monospace", fontWeight: 500,
              }}>
                {isHour ? slotToTime(si) : ''}
              </div>

              {/* Uzman sutunlari */}
              {experts.map((exp, ci) => {
                const bk = bookedSlots[`${ci}-${si}`];
                const isNewSlot = newAppointment && newAppointment.colIndex === ci
                  && si >= newAppointment.startSlot && si < newAppointment.startSlot + slotsNeeded;
                const isNewFirst = isNewSlot && si === newAppointment.startSlot;
                const isFree = !bk && !isNewSlot;

                // Drag highlight
                const dh = dragState?.targetCol === ci && si >= dragState.targetSlot && si < dragState.targetSlot + slotsNeeded;
                const dropOk = dh && dragState.isValid;
                const dropNo = dh && !dragState.isValid;

                return (
                  <div
                    key={ci}
                    data-col={ci}
                    data-slot={si}
                    ref={el => { if (cellRefs?.current) cellRefs.current[`${ci}-${si}`] = el; }}
                    onClick={() => {
                      if (isFree && service && canFit(ci, si, slotsNeeded)) {
                        onSlotClick(ci, si, exp);
                      }
                    }}
                    style={{
                      minHeight: ROW_H, position: 'relative',
                      borderBottom: `1px solid ${isHour ? '#e8e8e3' : '#f0f0eb'}`,
                      borderRight: ci < cols - 1 ? '1px solid #f0f0eb' : 'none',
                      cursor: isFree && service ? 'pointer' : 'default',
                      transition: 'background 0.08s',
                      background: dropOk ? 'rgba(29,158,117,0.13)' : dropNo ? 'rgba(226,75,74,0.1)' : undefined,
                    }}
                    onMouseEnter={e => { if (isFree && service) e.currentTarget.style.background = '#EEEDFE'; }}
                    onMouseLeave={e => { if (isFree && service && !dropOk && !dropNo) e.currentTarget.style.background = ''; }}
                  >
                    {/* Mevcut randevu bloku */}
                    {bk?.isFirst && (
                      <div style={{
                        position: 'absolute', left: 2, right: 2, top: 1,
                        height: bk.totalSlots * ROW_H - 2, borderRadius: 6,
                        padding: '4px 6px', overflow: 'hidden', zIndex: 2, pointerEvents: 'none',
                        background: '#f0f0eb', borderLeft: '3px solid #ccc',
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {exp.name}
                        </div>
                        <div style={{ fontSize: 9, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {bk.apt.company_services?.description || ''}
                        </div>
                      </div>
                    )}

                    {/* Yeni randevu bloku (mor, suruklenebilir) */}
                    {isNewFirst && (
                      <div
                        onMouseDown={e => onDragStart?.(e)}
                        style={{
                          position: 'absolute', left: 2, right: 2, top: 1,
                          height: slotsNeeded * ROW_H - 2, borderRadius: 6,
                          background: '#534AB7', zIndex: 5, padding: '5px 8px',
                          cursor: 'grab',
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{service?.description}</div>
                        <div style={{ fontSize: 9, color: '#CECBF6', marginTop: 1 }}>
                          {newAppointment.expert?.name} · {newAppointment.startTime}-{newAppointment.endTime}
                        </div>
                        <div style={{ fontSize: 8, color: '#AFA9EC', marginTop: 2 }}>⁂ sürükle taşı</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { slotToTime, timeToSlot, durationToSlots, SLOT_MINUTES, DAY_START_HOUR, DAY_END_HOUR, TOTAL_SLOTS };
