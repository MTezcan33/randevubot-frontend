import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { timeToMinutes, formatMinutes } from '@/services/availabilityService';

const SLOT_MINUTES = 15;
const ROW_H = 20;
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 21;
const TOTAL_SLOTS = ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES; // 52

// Personel renk paleti — her personele 3 ton atanir
const STAFF_COLOR_PALETTE = [
  { dark: '#185FA5', fill: '#378ADD', light: '#E6F1FB' },  // mavi
  { dark: '#854F0B', fill: '#EF9F27', light: '#FAEEDA' },  // amber
  { dark: '#534AB7', fill: '#AFA9EC', light: '#EEEDFE' },  // mor
  { dark: '#0F6E56', fill: '#1D9E75', light: '#E1F5EE' },  // yesil
  { dark: '#791F1F', fill: '#E24B4A', light: '#FDE8E8' },  // kirmizi
  { dark: '#5B3A8C', fill: '#8B5CF6', light: '#EDE9FE' },  // lavanta
];

function getStaffColors(index) {
  return STAFF_COLOR_PALETTE[index % STAFF_COLOR_PALETTE.length];
}

function slotToTime(i) { return formatMinutes(DAY_START_HOUR * 60 + i * SLOT_MINUTES); }
function timeToSlot(t) { return Math.floor((timeToMinutes(t) - DAY_START_HOUR * 60) / SLOT_MINUTES); }
function durationToSlots(d) { return Math.ceil(d / SLOT_MINUTES); }

// Personel doluluk yuzdesini hesapla
function calculateStaffOccupancy(staffId, appointments) {
  const staffAppts = appointments.filter(a =>
    a.expert_id === staffId && a.status !== 'iptal'
  );
  const totalBookedMinutes = staffAppts.reduce((sum, a) => {
    return sum + (a.total_duration || a.company_services?.duration || 60);
  }, 0);
  const totalAvailableMinutes = (DAY_END_HOUR - DAY_START_HOUR) * 60;
  return Math.round((totalBookedMinutes / totalAvailableMinutes) * 100);
}

export default function DayDetailTimeGrid({
  date, experts, appointments, service,
  newAppointment, onSlotClick, onDragStart, dragState, cellRefs,
}) {
  const { t } = useTranslation();
  const slotsNeeded = service ? durationToSlots(service.duration) : 0;

  // Now line pozisyonu
  const [nowLineTop, setNowLineTop] = useState(null);
  const [nowTimeLabel, setNowTimeLabel] = useState('');

  useEffect(() => {
    const updateNowLine = () => {
      const now = new Date();
      const today = date === now.toISOString().split('T')[0];
      if (!today) { setNowLineTop(null); return; }
      const hour = now.getHours();
      const minute = now.getMinutes();
      if (hour < DAY_START_HOUR || hour >= DAY_END_HOUR) { setNowLineTop(null); return; }
      const slotIndex = (hour - DAY_START_HOUR) * 4 + Math.floor(minute / SLOT_MINUTES);
      const offsetInSlot = (minute % SLOT_MINUTES) / SLOT_MINUTES;
      setNowLineTop((slotIndex + offsetInSlot) * ROW_H);
      setNowTimeLabel(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    };
    updateNowLine();
    const interval = setInterval(updateNowLine, 60000);
    return () => clearInterval(interval);
  }, [date]);

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
      {/* Header — uzman isimleri + doluluk bari */}
      <div style={{ display: 'grid', gridTemplateColumns: gtc, borderBottom: '1px solid #d5d5d0' }}>
        <div style={{ padding: '8px 4px', fontSize: 10, color: '#999', fontWeight: 500 }} />
        {experts.map((exp, ci) => {
          const colors = getStaffColors(ci);
          const occ = calculateStaffOccupancy(exp.id, appointments || []);
          return (
            <div key={exp.id} style={{ padding: '6px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: colors.dark }}>{exp.name}</span>
              <div style={{ width: 48, height: 4, borderRadius: 2, overflow: 'hidden', background: colors.light }}>
                <div style={{ height: '100%', borderRadius: 2, background: colors.fill, width: `${Math.min(100, occ)}%`, transition: 'width 0.4s' }} />
              </div>
              <span style={{ fontSize: 9, fontWeight: 500, fontFamily: "'SF Mono','Menlo',monospace", color: colors.dark }}>%{occ}</span>
            </div>
          );
        })}
      </div>

      {/* Grid body */}
      <div style={{ maxHeight: 460, overflowY: 'auto', position: 'relative' }}>
        {/* Now line */}
        {nowLineTop !== null && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: nowLineTop, zIndex: 4, pointerEvents: 'none' }}>
            <div style={{ position: 'relative', height: 2, background: '#E24B4A' }}>
              <div style={{ position: 'absolute', left: -3, top: -3, width: 7, height: 7, borderRadius: '50%', background: '#E24B4A' }} />
              <span style={{ position: 'absolute', right: 3, top: -8, fontSize: 8, fontWeight: 500, color: '#E24B4A', fontFamily: "'SF Mono','Menlo',monospace", background: '#fff', padding: '0 2px' }}>
                {nowTimeLabel}
              </span>
            </div>
          </div>
        )}

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
                background: '#fdfdf9',
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

                // Personel renkleri
                const staffColors = getStaffColors(ci);

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
                    onMouseEnter={e => { if (isFree && service) e.currentTarget.style.background = staffColors.light; }}
                    onMouseLeave={e => { if (isFree && service && !dropOk && !dropNo) e.currentTarget.style.background = ''; }}
                  >
                    {/* Mevcut randevu bloku — personel renkli */}
                    {bk?.isFirst && (
                      <div style={{
                        position: 'absolute', left: 2, right: 2, top: 1,
                        height: bk.totalSlots * ROW_H - 2, borderRadius: 6,
                        padding: '4px 6px', overflow: 'hidden', zIndex: 2, pointerEvents: 'none',
                        background: staffColors.light, borderLeft: `3px solid ${staffColors.fill}`,
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: staffColors.dark, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
