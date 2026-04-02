import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
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

function calculateBedOccupancy(unitId, appointments) {
  const unitAppts = appointments.filter(a =>
    a.room_unit_id === unitId && a.status !== 'iptal'
  );
  const totalBookedMinutes = unitAppts.reduce((sum, a) => {
    return sum + (a.total_duration || a.company_services?.duration || 60);
  }, 0);
  const totalAvailableMinutes = (DAY_END_HOUR - DAY_START_HOUR) * 60;
  return Math.round((totalBookedMinutes / totalAvailableMinutes) * 100);
}

export default function DayDetailTimeGrid({
  date, experts, appointments, service,
  newAppointment, onSlotClick, onDragStart, dragState, cellRefs,
  viewMode = 'expert', // 'expert' | 'bed'
  roomUnits = [],      // array of { id, name } for bed mode
  spaces = [],         // array of rooms for looking up room names
  onExistingDragStart, // callback(e, apt) — mevcut randevu surukle
  movingAptId = null,  // suruklenmekte olan mevcut randevunun id'si
  onEditAppointment,   // callback(apt) — randevu duzenleme modalini ac
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

  // Yatak bazli booked slots (bed modu icin)
  const bedBookedSlots = useMemo(() => {
    if (viewMode !== 'bed' || !roomUnits?.length || !appointments?.length) return {};
    const map = {};
    appointments.forEach(apt => {
      if (!apt.time || apt.status === 'iptal' || !apt.room_unit_id) return;
      const ci = roomUnits.findIndex(u => u.id === apt.room_unit_id);
      if (ci === -1) return;
      const startSlot = timeToSlot(apt.time);
      const dur = apt.total_duration || apt.company_services?.duration || 60;
      const slots = durationToSlots(dur);
      // Personel rengini bul
      const expertIdx = experts.findIndex(e => e.id === apt.expert_id);
      for (let k = 0; k < slots; k++) {
        const s = startSlot + k;
        if (s >= 0 && s < TOTAL_SLOTS)
          map[`${ci}-${s}`] = { apt, isFirst: k === 0, totalSlots: slots, ci, expertIdx };
      }
    });
    return map;
  }, [viewMode, roomUnits, experts, appointments]);

  const canFit = useCallback((ci, si, n) => {
    for (let k = 0; k < n; k++) { if (si + k >= TOTAL_SLOTS || bookedSlots[`${ci}-${si + k}`]) return false; }
    return true;
  }, [bookedSlots]);

  const isExpertMode = viewMode === 'expert';
  const columns = isExpertMode ? experts : roomUnits;
  const cols = columns.length;
  const gtc = `48px repeat(${cols}, minmax(0, 1fr))`;

  if (!cols) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, color: '#999', fontSize: 14 }}>
      {isExpertMode ? t('noExpertsAvailable') : 'Yatak bulunamadı'}
    </div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: gtc, borderBottom: '1px solid #e0e0db', background: '#FDFCFA' }}>
        <div style={{ padding: '8px 4px', fontSize: 10, color: '#999', fontWeight: 500 }} />
        {columns.map((col, ci) => {
          if (isExpertMode) {
            const colors = getStaffColors(ci);
            const occ = calculateStaffOccupancy(col.id, appointments || []);
            return (
              <div key={col.id} style={{ padding: '6px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: colors.dark }}>{col.name}</span>
                <div style={{ width: 48, height: 4, borderRadius: 2, overflow: 'hidden', background: colors.light }}>
                  <div style={{ height: '100%', borderRadius: 2, background: colors.fill, width: `${Math.min(100, occ)}%`, transition: 'width 0.4s' }} />
                </div>
                <span style={{ fontSize: 9, fontWeight: 500, fontFamily: "'SF Mono','Menlo',monospace", color: colors.dark }}>%{occ}</span>
              </div>
            );
          } else {
            const occ = calculateBedOccupancy(col.id, appointments || []);
            return (
              <div key={col.id} style={{ padding: '6px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#534AB7' }}>{col.name}</span>
                <div style={{ width: 48, height: 4, borderRadius: 2, overflow: 'hidden', background: '#EEEDFE' }}>
                  <div style={{ height: '100%', borderRadius: 2, background: '#AFA9EC', width: `${Math.min(100, occ)}%`, transition: 'width 0.4s' }} />
                </div>
                <span style={{ fontSize: 9, fontWeight: 500, fontFamily: "'SF Mono','Menlo',monospace", color: '#534AB7' }}>%{occ}</span>
              </div>
            );
          }
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

              {/* Sutunlar (uzman veya yatak) */}
              {columns.map((col, ci) => {
                const activeSlots = isExpertMode ? bookedSlots : bedBookedSlots;
                const bk = activeSlots[`${ci}-${si}`];
                // Yeni randevu: expert modda colIndex eslesmeli, bed modda secili yatak eslesmeli
                const isNewSlot = newAppointment && (
                  isExpertMode
                    ? newAppointment.colIndex === ci
                    : (newAppointment.selectedUnitId && newAppointment.selectedUnitId === col.id)
                ) && si >= newAppointment.startSlot && si < newAppointment.startSlot + slotsNeeded;
                const isNewFirst = isNewSlot && si === newAppointment.startSlot;
                const isFree = !bk && !isNewSlot;

                // Drag highlight (sadece expert modda)
                const dh = isExpertMode && dragState?.targetCol === ci && si >= dragState.targetSlot && si < dragState.targetSlot + slotsNeeded;
                const dropOk = dh && dragState.isValid;
                const dropNo = dh && !dragState.isValid;

                // Blok renkleri
                const blockColors = isExpertMode
                  ? getStaffColors(ci)
                  : bk?.expertIdx >= 0 ? getStaffColors(bk.expertIdx) : { dark: '#534AB7', fill: '#AFA9EC', light: '#EEEDFE' };

                return (
                  <div
                    key={ci}
                    data-col={ci}
                    data-slot={si}
                    ref={el => { if (cellRefs?.current) cellRefs.current[`${ci}-${si}`] = el; }}
                    onClick={() => {
                      if (isExpertMode && isFree && service && canFit(ci, si, slotsNeeded)) {
                        onSlotClick(ci, si, col);
                      }
                    }}
                    style={{
                      minHeight: ROW_H, position: 'relative',
                      borderBottom: `1px solid ${isHour ? '#e8e8e3' : '#f0f0eb'}`,
                      borderRight: ci < cols - 1 ? '1px solid #f0f0eb' : 'none',
                      cursor: isExpertMode && isFree && service ? 'pointer' : 'default',
                      transition: 'background 0.08s',
                      background: dropOk ? 'rgba(29,158,117,0.13)' : dropNo ? 'rgba(226,75,74,0.1)' : undefined,
                    }}
                    onMouseEnter={e => { if (isExpertMode && isFree && service) e.currentTarget.style.background = blockColors.light; }}
                    onMouseLeave={e => { if (isExpertMode && isFree && service && !dropOk && !dropNo) e.currentTarget.style.background = ''; }}
                  >
                    {/* Randevu bloku */}
                    {bk?.isFirst && !(movingAptId && bk.apt.id === movingAptId) && (() => {
                      const unitName = bk.apt.room_unit_id
                        ? (roomUnits.find(u => u.id === bk.apt.room_unit_id)?.name || '')
                        : '';
                      const roomName = bk.apt.space_id
                        ? (spaces.find(s => s.id === bk.apt.space_id)?.name || '')
                        : '';
                      const customerName = bk.apt.customers?.name || '';
                      // Hem uzman hem yatak modunda suruklenebilir
                      const isMovable = onExistingDragStart && bk.apt.status !== 'iptal';
                      return (
                        <div
                          onMouseDown={isMovable ? (e) => {
                            e.stopPropagation();
                            // Sadece mouse hareket ederse surukle (tiklamada tetiklenmesin)
                            const startX = e.clientX, startY = e.clientY;
                            const apt = bk.apt;
                            const onMove = (me) => {
                              if (Math.abs(me.clientX - startX) > 5 || Math.abs(me.clientY - startY) > 5) {
                                document.removeEventListener('mousemove', onMove);
                                document.removeEventListener('mouseup', onUp);
                                onExistingDragStart(e, apt);
                              }
                            };
                            const onUp = () => {
                              document.removeEventListener('mousemove', onMove);
                              document.removeEventListener('mouseup', onUp);
                            };
                            document.addEventListener('mousemove', onMove);
                            document.addEventListener('mouseup', onUp);
                          } : undefined}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute', left: 2, right: 2, top: 1,
                            height: bk.totalSlots * ROW_H - 2, borderRadius: 6,
                            padding: '4px 6px', overflow: 'hidden', zIndex: 2,
                            pointerEvents: 'auto',
                            cursor: isMovable ? 'grab' : 'default',
                            background: blockColors.light, borderLeft: `3px solid ${blockColors.fill}`,
                          }}
                        >
                          {/* Duzenle butonu */}
                          {onEditAppointment && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditAppointment(bk.apt);
                              }}
                              style={{
                                position: 'absolute', top: 3, right: 3,
                                width: 18, height: 18, borderRadius: 4,
                                background: 'rgba(255,255,255,0.9)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                              }}
                              title="Oda/Yatak Değiştir"
                            >
                              <Pencil size={10} color={blockColors.dark} />
                            </div>
                          )}
                          {/* Satir 1: Personel adi */}
                          <div style={{ fontSize: 10, fontWeight: 600, color: blockColors.dark, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: onEditAppointment ? 18 : 0 }}>
                            {isExpertMode ? col.name : (experts.find(e => e.id === bk.apt.expert_id)?.name || '')}
                          </div>
                          {/* Satir 2: Hizmet adi */}
                          <div style={{ fontSize: 9, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {bk.apt.company_services?.description || ''}
                          </div>
                          {/* Satir 3: Musteri adi */}
                          {customerName && (
                            <div style={{ fontSize: 8, color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                              {customerName}
                            </div>
                          )}
                          {/* Satir 4: Oda & Yatak bilgisi */}
                          {(roomName || unitName) && (
                            <div style={{ fontSize: 8, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                              {roomName}{unitName ? ` · ${unitName}` : ''}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Yeni randevu bloku (mor) */}
                    {isNewFirst && (
                      <div
                        onMouseDown={e => { e.stopPropagation(); onDragStart?.(e); }}
                        onClick={e => e.stopPropagation()}
                        style={{
                          position: 'absolute', left: 2, right: 2, top: 1,
                          height: slotsNeeded * ROW_H - 2, borderRadius: 6,
                          background: '#534AB7', zIndex: 5, padding: '5px 8px',
                          cursor: 'grab',
                          pointerEvents: 'auto',
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{service?.description || newAppointment?.serviceName}</div>
                        <div style={{ fontSize: 9, color: '#CECBF6', marginTop: 1 }}>
                          {isExpertMode
                            ? `${newAppointment.expert?.name} · ${newAppointment.startTime}-${newAppointment.endTime}`
                            : `${newAppointment.expert?.name} · ${col.name}`
                          }
                        </div>
                        {isExpertMode && <div style={{ fontSize: 8, color: '#AFA9EC', marginTop: 2 }}>⁂ sürükle taşı</div>}
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
