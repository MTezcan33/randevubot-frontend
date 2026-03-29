import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { fetchDayAppointments } from '@/services/monthlyCalendarService';
import { useDragAppointment } from '@/hooks/useDragAppointment';
import { checkResourceAvailability } from '@/services/resourceService';
import { getRoomUnits } from '@/services/roomUnitService';
import DayDetailServiceList from './DayDetailServiceList';
import DayDetailTimeGrid, { slotToTime, timeToSlot, durationToSlots, TOTAL_SLOTS, SLOT_MINUTES, DAY_START_HOUR } from './DayDetailTimeGrid';

const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const DAYS_FULL = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
function barColor(p) { return p<=30?'#97C459':p<=50?'#C0DD97':p<=70?'#EF9F27':p<=85?'#E24B4A':'#A32D2D'; }
function textColor(p) { return p<=30?'#27500A':p<=50?'#3B6D11':p<=70?'#854F0B':p<=85?'#791F1F':'#501313'; }

export default function DayDetailPanel({ date, onClose, company, experts: allExperts, spaces, workingHours }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const cellRefs = useRef({});

  const [selectedService, setSelectedService] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [newAppointment, setNewAppointment] = useState(null);
  const [dayAppointments, setDayAppointments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [expertServicesMap, setExpertServicesMap] = useState(new Map());
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // 'expert' | 'facility'
  const [gridViewMode, setGridViewMode] = useState('expert'); // 'expert' | 'bed'
  const [selectedRoomUnits, setSelectedRoomUnits] = useState([]);
  const [movingAptId, setMovingAptId] = useState(null); // suruklenmekte olan mevcut randevu id'si

  const dateObj = new Date(date + 'T00:00:00');
  const [y, m, d] = date.split('-');
  const titleDate = `${parseInt(d)} ${MONTHS[parseInt(m)-1]} ${y}, ${DAYS_FULL[dateObj.getDay()]}`;

  const isSelfService = selectedService?.requires_expert === false;

  // Oda secildiginde yataklari yukle
  useEffect(() => {
    if (!selectedRoom?.id || !company?.id || isSelfService) { setSelectedRoomUnits([]); return; }
    getRoomUnits(company.id, selectedRoom.id).then(units => setSelectedRoomUnits(units || []));
  }, [selectedRoom?.id, company?.id, isSelfService]);

  // Randevulari yukle
  useEffect(() => {
    if (!company?.id || !date) return;
    fetchDayAppointments(company.id, date).then(setDayAppointments);
  }, [company?.id, date]);

  // Musterileri yukle
  useEffect(() => {
    if (!company?.id) return;
    supabase.from('customers').select('id, name, phone').eq('company_id', company.id).eq('is_active', true).order('name')
      .then(({ data }) => setCustomers(data || []));
  }, [company?.id]);

  // Expert services
  useEffect(() => {
    if (!company?.id) return;
    supabase.from('expert_services').select('expert_id, service_id').eq('company_id', company.id)
      .then(({ data }) => {
        const map = new Map();
        (data || []).forEach(es => {
          if (!map.has(es.service_id)) map.set(es.service_id, new Set());
          map.get(es.service_id).add(es.expert_id);
        });
        setExpertServicesMap(map);
      });
  }, [company?.id]);

  // Filtrelenmis uzmanlar (sadece uzman hizmetleri icin)
  const filteredExperts = useMemo(() => {
    if (!selectedService || isSelfService) return [];
    const svcExperts = expertServicesMap.get(selectedService.id);
    if (!svcExperts) return allExperts || [];
    return (allExperts || []).filter(e => svcExperts.has(e.id));
  }, [selectedService, allExperts, expertServicesMap, isSelfService]);

  // Aktif uzman listesi — hizmet seciliyse filtrelenmis, degilse tum uzmanlar
  const activeExperts = filteredExperts.length > 0 ? filteredExperts : (allExperts || []);

  const slotsNeeded = selectedService ? durationToSlots(selectedService.duration) : 0;

  // Doluluk
  const dayStats = useMemo(() => {
    const massageAppts = dayAppointments.filter(a => a.company_services?.requires_expert !== false);
    const facilityAppts = dayAppointments.filter(a => a.company_services?.requires_expert === false);
    const mMax = (allExperts || []).length * 8;
    const fMax = (spaces || []).filter(s => s.is_active).length * 6;
    return {
      total: dayAppointments.length,
      mPct: mMax > 0 ? Math.min(100, Math.round((massageAppts.length / mMax) * 100)) : 0,
      fPct: fMax > 0 ? Math.min(100, Math.round((facilityAppts.length / fMax) * 100)) : 0,
    };
  }, [dayAppointments, allExperts, spaces]);

  // Self-servis icin secili tesisin doluluk bilgisi
  const facilityOccupancy = useMemo(() => {
    if (!isSelfService || !selectedRoom) return null;
    const roomAppts = dayAppointments.filter(a => a.space_id === selectedRoom.id && a.status !== 'iptal');
    return { current: roomAppts.length, max: selectedRoom.capacity || 1 };
  }, [isSelfService, selectedRoom, dayAppointments]);

  // Booked slots (uzman hizmetleri icin)
  const bookedSlots = useMemo(() => {
    const map = {};
    if (!activeExperts.length) return map;
    dayAppointments.forEach(apt => {
      if (!apt.time || apt.status === 'iptal') return;
      const ci = activeExperts.findIndex(e => e.id === apt.expert_id);
      if (ci === -1) return;
      const [h, mn] = apt.time.split(':').map(Number);
      const startSlot = Math.floor((h * 60 + mn - DAY_START_HOUR * 60) / SLOT_MINUTES);
      const dur = apt.total_duration || apt.company_services?.duration || 60;
      const slots = durationToSlots(dur);
      for (let k = 0; k < slots; k++) { const s = startSlot + k; if (s >= 0 && s < TOTAL_SLOTS) map[`${ci}-${s}`] = true; }
    });
    return map;
  }, [activeExperts, dayAppointments]);

  // Suruklenen mevcut randevuyu bookedSlots'tan cikar
  const effectiveBookedSlots = useMemo(() => {
    if (!movingAptId) return bookedSlots;
    const filtered = {};
    Object.keys(bookedSlots).forEach(key => {
      if (bookedSlots[key] !== true) {
        // DayDetailTimeGrid formatinda { apt, ... } nesnesi
        if (bookedSlots[key]?.apt?.id !== movingAptId) filtered[key] = bookedSlots[key];
      } else {
        // DayDetailPanel formatinda sadece true
        filtered[key] = bookedSlots[key];
      }
    });
    // DayDetailPanel bookedSlots'u sadece true kullanir, apt bilgisi yok
    // Bu yuzden movingAptId varken slotlari yeniden hesapla (suruklenen haric)
    if (movingAptId && activeExperts.length) {
      const map = {};
      dayAppointments.forEach(apt => {
        if (!apt.time || apt.status === 'iptal' || apt.id === movingAptId) return;
        const ci = activeExperts.findIndex(e => e.id === apt.expert_id);
        if (ci === -1) return;
        const [h, mn] = apt.time.split(':').map(Number);
        const startSlot = Math.floor((h * 60 + mn - DAY_START_HOUR * 60) / SLOT_MINUTES);
        const dur = apt.total_duration || apt.company_services?.duration || 60;
        const slots = durationToSlots(dur);
        for (let k = 0; k < slots; k++) { const s = startSlot + k; if (s >= 0 && s < TOTAL_SLOTS) map[`${ci}-${s}`] = true; }
      });
      return map;
    }
    return bookedSlots;
  }, [bookedSlots, movingAptId, activeExperts, dayAppointments]);

  // Drag (sadece uzman hizmetleri)
  const { dragState, handleDragStart } = useDragAppointment({
    newAppointment: newAppointment ? { ...newAppointment, serviceName: selectedService?.description } : null,
    slotsNeeded, bookedSlots: effectiveBookedSlots, experts: activeExperts, cellRefs, totalSlots: TOTAL_SLOTS,
    onDrop: async (col, slot) => {
      const expert = activeExperts[col];
      if (!expert) return;
      if (movingAptId) {
        // Mevcut randevuyu yeni konuma tasi — DB guncelle
        const newTime = slotToTime(slot);
        try {
          const updateData = { time: newTime };
          // Uzman degistiyse expert_id de guncelle
          const movingApt = dayAppointments.find(a => a.id === movingAptId);
          if (movingApt && expert.id !== movingApt.expert_id) {
            updateData.expert_id = expert.id;
          }
          const { error } = await supabase.from('appointments').update(updateData).eq('id', movingAptId);
          if (error) throw error;
          toast({ title: 'Randevu taşındı', description: `${expert.name} · ${newTime}` });
          setNewAppointment(null);
          setMovingAptId(null);
          fetchDayAppointments(company.id, date).then(setDayAppointments);
        } catch (err) {
          toast({ title: 'Taşıma hatası', description: err.message, variant: 'destructive' });
          setNewAppointment(null);
          setMovingAptId(null);
        }
      } else {
        setNewAppointment({ colIndex: col, startSlot: slot, expert, startTime: slotToTime(slot), endTime: slotToTime(slot + slotsNeeded), selectedUnitId: selectedUnit?.id || null });
      }
    },
  });

  const handleSlotClick = useCallback((colIndex, slotIndex, expert) => {
    setNewAppointment({ colIndex, startSlot: slotIndex, expert, startTime: slotToTime(slotIndex), endTime: slotToTime(slotIndex + slotsNeeded), selectedUnitId: selectedUnit?.id || null });
  }, [slotsNeeded]);

  // Mevcut randevuyu suruklemek icin: bloku "virtual new appointment" a donustur
  const handleExistingDragStart = useCallback((e, apt) => {
    const ci = activeExperts.findIndex(ex => ex.id === apt.expert_id);
    if (ci === -1) return;
    const dur = apt.total_duration || apt.company_services?.duration || 60;
    const startSlot = timeToSlot(apt.time);
    const slotsN = durationToSlots(dur);
    // Hizmeti gecici olarak ayarla (surukle-birak sirasinda slot sayisi icin)
    if (!selectedService && apt.company_services) {
      setSelectedService(apt.company_services);
    }
    setMovingAptId(apt.id);
    setNewAppointment({
      colIndex: ci,
      startSlot,
      expert: activeExperts[ci],
      startTime: slotToTime(startSlot),
      endTime: slotToTime(startSlot + slotsN),
      selectedUnitId: apt.room_unit_id || null,
      serviceName: apt.company_services?.description || '',
    });
    // Drag hook'unu baslat — kucuk gecikme ile state guncellemesi beklenir
    requestAnimationFrame(() => handleDragStart(e));
  }, [activeExperts, selectedService, handleDragStart]);

  // Onayla tiklaninca modal ac
  const handleConfirmClick = (type) => {
    if (type === 'expert' && (!newAppointment || !selectedService || !company?.id)) return;
    if (type === 'facility' && (!selectedService || !selectedRoom || !company?.id)) return;
    if (type === 'facility' && facilityOccupancy && facilityOccupancy.current >= facilityOccupancy.max) {
      toast({ title: 'Kapasite dolu', description: `${selectedRoom.name} maksimum kapasiteye ulaştı.`, variant: 'destructive' });
      return;
    }
    setConfirmTarget(type);
    setShowCustomerModal(true);
  };

  // Modal'dan musteri secildi — randevu kaydet
  const handleCustomerConfirmed = async (customerId) => {
    setShowCustomerModal(false);
    setSelectedCustomerId(customerId);
    if (confirmTarget === 'expert') {
      await saveExpertAppointment(customerId);
    } else {
      await saveFacilityAppointment(customerId);
    }
    setConfirmTarget(null);
  };

  // Randevu kaydet — uzman hizmeti
  const saveExpertAppointment = async (custId) => {
    if (!newAppointment || !selectedService || !company?.id || !custId) return;
    setSaving(true);
    try {
      const ins = {
        company_id: company.id, service_id: selectedService.id, date, time: newAppointment.startTime,
        total_duration: selectedService.duration, total_amount: selectedService.price || 0,
        status: 'onaylandı', payment_status: 'unpaid',
        customer_id: custId,
      };
      if (newAppointment.expert) ins.expert_id = newAppointment.expert.id;
      if (selectedRoom) ins.space_id = selectedRoom.id;
      if (selectedUnit?.id && !String(selectedUnit.id).startsWith('auto-')) ins.room_unit_id = selectedUnit.id;

      // Yatak cakisma kontrolu
      if (selectedUnit?.id && !String(selectedUnit.id).startsWith('auto-')) {
        try {
          const conflictResult = await checkResourceAvailability({
            companyId: company.id,
            date,
            startTime: newAppointment.startTime,
            duration: selectedService.duration,
            spaceId: selectedRoom?.id || null,
            expertId: newAppointment.expert?.id || null,
            roomUnitId: selectedUnit.id,
          });
          if (conflictResult && !conflictResult.available) {
            const messages = (conflictResult.conflicts || []).map(c => c.message).join(', ');
            toast({ title: 'Çakışma!', description: messages, variant: 'destructive' });
            setSaving(false);
            return;
          }
        } catch (checkErr) {
          console.error('Çakışma kontrolü hatası:', checkErr);
        }
      }

      const { data: aptData, error } = await supabase.from('appointments').insert(ins).select().single();
      if (error) throw error;
      if (aptData) {
        // Yan tablolara kayit — hata olursa yutulur, ana randevu zaten olusmustu
        try { await supabase.from('appointment_services').insert({ appointment_id: aptData.id, service_id: selectedService.id, expert_id: newAppointment.expert?.id || null }); } catch (_) {}
        if (selectedRoom) { try { await supabase.from('appointment_resources').insert({ appointment_id: aptData.id, resource_type: 'space', resource_id: selectedRoom.id }); } catch (_) {} }
      }
      toast({ title: t('appointmentCreatedSuccess'), description: `${selectedService.description} · ${newAppointment.expert?.name || ''} · ${newAppointment.startTime}` });
      setNewAppointment(null);
      fetchDayAppointments(company.id, date).then(setDayAppointments);
    } catch (err) {
      toast({ title: t('appointmentCreateError'), description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  // Randevu kaydet — self servis (tesis girisi)
  const saveFacilityAppointment = async (custId) => {
    if (!selectedService || !selectedRoom || !company?.id || !custId) return;
    setSaving(true);
    try {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      const ins = {
        company_id: company.id, service_id: selectedService.id, date, time: currentTime,
        total_duration: selectedService.duration, total_amount: selectedService.price || 0,
        space_id: selectedRoom.id, status: 'onaylandı', payment_status: 'unpaid',
        customer_id: custId,
      };
      const { data: aptData, error } = await supabase.from('appointments').insert(ins).select().single();
      if (error) throw error;
      if (aptData) {
        try { await supabase.from('appointment_services').insert({ appointment_id: aptData.id, service_id: selectedService.id }); } catch (_) {}
        try { await supabase.from('appointment_resources').insert({ appointment_id: aptData.id, resource_type: 'space', resource_id: selectedRoom.id }); } catch (_) {}
      }
      toast({ title: t('appointmentCreatedSuccess'), description: `${selectedService.description} · ${selectedRoom.name}` });
      fetchDayAppointments(company.id, date).then(setDayAppointments);
    } catch (err) {
      toast({ title: t('appointmentCreateError'), description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  // Oda secildiginde yataklari yukle
  useEffect(() => {
    if (!selectedRoom?.id || !company?.id || isSelfService) { setSelectedRoomUnits([]); return; }
    getRoomUnits(company.id, selectedRoom.id).then(units => setSelectedRoomUnits(units || []));
  }, [selectedRoom?.id, company?.id, isSelfService]);

  const handleSelectService = (s) => { setSelectedService(s); setSelectedRoom(null); setSelectedUnit(null); setNewAppointment(null); };
  const handleSelectRoom = (r) => { setSelectedRoom(r); setSelectedUnit(null); setNewAppointment(null); };
  const handleSelectUnit = (u) => { setSelectedUnit(u); setNewAppointment(null); };

  // Breadcrumb
  const crumbs = [{ label: 'Gün' }];
  if (selectedService) crumbs.push({ label: selectedService.description });
  if (selectedRoom) crumbs.push({ label: selectedRoom.name });
  if (!isSelfService) {
    if (selectedUnit) crumbs.push({ label: selectedUnit.name });
    if (newAppointment) crumbs.push({ label: `${newAppointment.expert?.name} ${newAppointment.startTime}` });
  }

  const hint = !selectedService ? 'Hizmet seç'
    : isSelfService && !selectedRoom ? 'Tesis seç'
    : !isSelfService && !selectedRoom ? 'Oda seç'
    : !isSelfService && !selectedUnit ? 'Yatak seç'
    : !isSelfService && !newAppointment ? 'Saat ve personel seç'
    : null;

  // Sag panel icin: uzman hizmeti → time grid, self servis → kapasite paneli
  const showExpertGrid = !isSelfService && selectedService && selectedUnit;
  const showFacilityPanel = isSelfService && selectedRoom;

  return (
    <div style={{ border: '1px solid #B5D0C0', borderRadius: 14, overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ═══ HEADER ═══ */}
      <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #B5D0C0', background: '#E8F1EC' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#0F3D2A' }}>{titleDate}</div>
            <div style={{ fontSize: 11, color: '#1D9E75', marginTop: 2 }}>{dayStats.total} randevu</div>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <MiniBar color="#534AB7" pct={dayStats.mPct} />
            <MiniBar color="#1D9E75" pct={dayStats.fPct} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', border: '1px solid #B5D0C0', background: '#F5F9F7',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1D9E75',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 3.5l-7 7M3.5 3.5l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>
      </div>

      {/* ═══ BREADCRUMB ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 20px', background: '#E0EAE4', borderBottom: '1px solid #B5D0C0', fontSize: 11, flexWrap: 'wrap' }}>
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ color: '#8ABFA2' }}>›</span>}
            <span style={{ color: '#534AB7', fontWeight: 500 }}>{c.label}</span>
          </React.Fragment>
        ))}
        {hint && (<><span style={{ color: '#8ABFA2' }}>›</span><span style={{ color: '#5A8A6E' }}>{hint}</span></>)}
      </div>

      {/* ═══ BODY ═══ */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Sol panel — Jade */}
        <div style={{ width: 240, minWidth: 240, borderRight: '1px solid #B5D0C0', overflowY: 'auto', background: '#E8F1EC' }}>
          <DayDetailServiceList
            company={company} date={date}
            selectedService={selectedService} onSelectService={handleSelectService}
            selectedRoom={selectedRoom} onSelectRoom={handleSelectRoom}
            selectedUnit={selectedUnit} onSelectUnit={handleSelectUnit}
            spaces={spaces} experts={allExperts}
            isSelfServiceMode={isSelfService}
          />
        </div>

        {/* Sag panel */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

          {/* UZMAN HİZMETİ → Saat cizelgesi */}
          {showExpertGrid && (
            <>
              {/* Personel / Yatak toggle */}
              {selectedRoomUnits.length > 0 && (
                <div style={{ display: 'flex', gap: 4, padding: '6px 12px', borderBottom: '1px solid #e8e8e3', background: '#FDFCFA' }}>
                  <button
                    onClick={() => setGridViewMode('expert')}
                    style={{
                      padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      background: gridViewMode === 'expert' ? '#0F3D2A' : '#f0f0eb',
                      color: gridViewMode === 'expert' ? '#fff' : '#666',
                      transition: 'all 0.15s',
                    }}
                  >Personel</button>
                  <button
                    onClick={() => setGridViewMode('bed')}
                    style={{
                      padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      background: gridViewMode === 'bed' ? '#534AB7' : '#f0f0eb',
                      color: gridViewMode === 'bed' ? '#fff' : '#666',
                      transition: 'all 0.15s',
                    }}
                  >Yatak</button>
                </div>
              )}
              <DayDetailTimeGrid
                date={date} experts={activeExperts} appointments={dayAppointments}
                service={selectedService} newAppointment={newAppointment}
                onSlotClick={handleSlotClick} onDragStart={handleDragStart}
                dragState={dragState} cellRefs={cellRefs}
                viewMode={gridViewMode}
                roomUnits={selectedRoomUnits}
                onExistingDragStart={handleExistingDragStart}
                movingAptId={movingAptId}
              />
            </>
          )}

          {/* SELF SERVİS → Kapasite paneli */}
          {showFacilityPanel && (
            <FacilityCapacityPanel
              room={selectedRoom}
              service={selectedService}
              occupancy={facilityOccupancy}
              saving={saving}
              onConfirm={() => handleConfirmClick('facility')}
            />
          )}

          {/* Hicbiri secilmemis — tum personellerin gunluk takvimi */}
          {!showExpertGrid && !showFacilityPanel && (allExperts || []).length > 0 && (
            <DayDetailTimeGrid
              date={date} experts={activeExperts} appointments={dayAppointments}
              service={selectedService} newAppointment={newAppointment}
              onSlotClick={() => {}} onDragStart={handleDragStart}
              dragState={dragState} cellRefs={cellRefs}
              viewMode="expert"
              roomUnits={[]}
              onExistingDragStart={handleExistingDragStart}
              movingAptId={movingAptId}
            />
          )}
          {!showExpertGrid && !showFacilityPanel && (allExperts || []).length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, color: '#999', fontSize: 14 }}>
              Henüz uzman tanımlanmamış
            </div>
          )}
        </div>
      </div>

      {/* ═══ CONFIRM BAR — sadece uzman hizmetleri icin ═══ */}
      {newAppointment && selectedService && !isSelfService && (
        <div style={{ borderTop: '1px solid #B5D0C0', background: '#E8F1EC', flexShrink: 0, position: 'relative', zIndex: 10 }}>
          <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 80 }}>
            <div style={{ fontSize: 11, color: '#0F3D2A' }}>
              <b style={{ fontWeight: 500 }}>{selectedService.description}</b> · {newAppointment.expert?.name} · {newAppointment.startTime} - {newAppointment.endTime} · {selectedService.duration}dk
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: '#5A8A6E' }}>↕↔ Sürükle taşı</span>
              <button onClick={() => setNewAppointment(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #B5D0C0', background: '#fff', color: '#1D9E75', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>İptal</button>
              <button onClick={() => handleConfirmClick('expert')} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1D9E75', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>Onayla</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MÜŞTERİ SEÇİM MODALI ═══ */}
      {showCustomerModal && (
        <CustomerSelectModal
          customers={customers}
          company={company}
          saving={saving}
          toast={toast}
          onConfirm={handleCustomerConfirmed}
          onClose={() => { setShowCustomerModal(false); setConfirmTarget(null); }}
          onCustomerCreated={(c) => setCustomers(prev => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)))}
        />
      )}
    </div>
  );
}

// ═══ SELF SERVİS KAPASİTE PANELİ ═══
function FacilityCapacityPanel({ room, service, occupancy, saving, onConfirm }) {
  if (!room || !occupancy) return null;

  const pct = Math.round((occupancy.current / occupancy.max) * 100);
  const isFull = occupancy.current >= occupancy.max;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 40, gap: 24 }}>
      {/* Tesis bilgisi */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>{room.name}</div>
        {room.description && <div style={{ fontSize: 13, color: '#666', maxWidth: 300 }}>{room.description}</div>}
      </div>

      {/* Kapasite gostergesi */}
      <div style={{ width: 200, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: '#666' }}>Doluluk</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: textColor(pct) }}>{occupancy.current} / {occupancy.max}</span>
        </div>
        <div style={{ height: 12, borderRadius: 6, background: '#eeeee8', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 6, background: barColor(pct), width: `${pct}%`, transition: 'width 0.4s' }} />
        </div>
        <div style={{ marginTop: 4, fontSize: 11, color: textColor(pct), fontWeight: 600 }}>%{pct} {isFull ? '— Kapasite Dolu' : ''}</div>
      </div>

      {/* Kisi ikonlari */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {Array.from({ length: occupancy.max }, (_, i) => (
          <div key={i} style={{
            width: 28, height: 28, borderRadius: '50%',
            background: i < occupancy.current ? '#EF9F27' : '#eeeee8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: i < occupancy.current ? '#fff' : '#ccc',
          }}>
            {i < occupancy.current ? '●' : '○'}
          </div>
        ))}
      </div>

      {/* Hizmet bilgisi */}
      <div style={{ background: '#fafaf8', border: '1px solid #e8e8e3', borderRadius: 10, padding: '12px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{service.description}</div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{service.duration} dk · {service.price ? `${Number(service.price).toLocaleString('tr-TR')} TL` : 'Ücretsiz'}</div>
      </div>

      {/* Onayla butonu */}
      <button
        onClick={onConfirm}
        disabled={isFull || saving}
        style={{
          padding: '12px 32px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 600,
          cursor: isFull ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          background: isFull ? '#d5d5d0' : '#1D9E75', color: '#fff',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? 'Kaydediliyor...' : isFull ? 'Kapasite Dolu' : 'Giriş Onayla'}
      </button>
    </div>
  );
}

// ═══ ÜLKE KODLARI ═══
const COUNTRY_CODES = [
  { code: '+90', flag: '🇹🇷', name: 'Türkiye' },
  { code: '+7',  flag: '🇷🇺', name: 'Rusya' },
  { code: '+380',flag: '🇺🇦', name: 'Ukrayna' },
  { code: '+49', flag: '🇩🇪', name: 'Almanya' },
  { code: '+44', flag: '🇬🇧', name: 'İngiltere' },
  { code: '+963',flag: '🇸🇾', name: 'Suriye' },
  { code: '+994',flag: '🇦🇿', name: 'Azerbaycan' },
  { code: '+995',flag: '🇬🇪', name: 'Gürcistan' },
  { code: '+31', flag: '🇳🇱', name: 'Hollanda' },
  { code: '+33', flag: '🇫🇷', name: 'Fransa' },
  { code: '+966',flag: '🇸🇦', name: 'S. Arabistan' },
  { code: '+971',flag: '🇦🇪', name: 'BAE' },
  { code: '+1',  flag: '🇺🇸', name: 'ABD' },
];

// ═══ MÜŞTERİ SEÇİM MODALI ═══
function CustomerSelectModal({ customers, company, saving, toast, onConfirm, onClose, onCustomerCreated }) {
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+90');
  const [showCodes, setShowCodes] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState(null);

  // Telefon girilince otomatik ara
  const fullPhone = countryCode + phone.replace(/^0+/, '');

  useEffect(() => {
    if (phone.length < 7) { setFoundCustomer(null); return; }
    const timer = setTimeout(() => {
      const match = customers.find(c => c.phone && c.phone === fullPhone);
      setFoundCustomer(match || null);
    }, 300);
    return () => clearTimeout(timer);
  }, [phone, countryCode]);

  // Onayla — mevcut musteri varsa onu, yoksa yeni olustur
  const handleConfirm = async () => {
    // Mevcut musteri bulunduysa direkt onayla
    if (foundCustomer) { onConfirm(foundCustomer.id); return; }
    // Yeni musteri olustur
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const insertData = { company_id: company.id, name: newName.trim().toUpperCase() };
      if (phone.length >= 7) insertData.phone = fullPhone;
      if (newEmail.trim()) insertData.email = newEmail.trim();
      const { data, error } = await supabase.from('customers').insert(insertData).select('id, name, phone').single();
      if (error) {
        if (error.code === '23505') { toast?.({ title: 'Bu telefon zaten kayıtlı', variant: 'destructive' }); return; }
        throw error;
      }
      onCustomerCreated(data);
      onConfirm(data.id);
    } catch (err) {
      console.error('Müşteri oluşturma hatası:', err);
      toast?.({ title: 'Müşteri oluşturulamadı', description: err.message, variant: 'destructive' });
    } finally { setCreating(false); }
  };

  const canConfirm = foundCustomer || newName.trim();
  const btnLabel = creating ? 'Oluşturuluyor...' : saving ? 'Kaydediliyor...' : foundCustomer ? `${foundCustomer.name} ile Onayla` : 'Müşteri Oluştur ve Onayla';
  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e8e8e3', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />

      <div style={{ position: 'relative', background: '#fff', borderRadius: 14, width: 420, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e8e8e3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>Müşteri</div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #e8e8e3', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M10.5 3.5l-7 7M3.5 3.5l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ═══ 1. TELEFON ═══ */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#0F3D2A', display: 'block', marginBottom: 6 }}>Telefon *</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowCodes(!showCodes)} style={{
                  padding: '10px 8px', borderRadius: 10, border: '1px solid #e8e8e3', background: '#fff',
                  fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  minWidth: 85, justifyContent: 'center', whiteSpace: 'nowrap',
                }}>
                  <span>{COUNTRY_CODES.find(c => c.code === countryCode)?.flag}</span>
                  <span style={{ fontWeight: 500 }}>{countryCode}</span>
                  <span style={{ fontSize: 10, color: '#999' }}>▼</span>
                </button>
                {showCodes && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, zIndex: 10, background: '#fff', borderRadius: 10,
                    border: '1px solid #e8e8e3', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4,
                    maxHeight: 220, overflowY: 'auto', minWidth: 200,
                  }}>
                    {COUNTRY_CODES.map(c => (
                      <div key={c.code} onClick={() => { setCountryCode(c.code); setShowCodes(false); }}
                        style={{
                          padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                          fontSize: 13, background: countryCode === c.code ? '#F0EDFF' : undefined,
                        }}
                        onMouseEnter={e => { if (countryCode !== c.code) e.currentTarget.style.background = '#f5f5f0'; }}
                        onMouseLeave={e => { if (countryCode !== c.code) e.currentTarget.style.background = ''; }}
                      >
                        <span>{c.flag}</span>
                        <span style={{ fontWeight: 500 }}>{c.code}</span>
                        <span style={{ color: '#888' }}>{c.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="tel" value={phone} autoFocus
                onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="5XX XXX XX XX"
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
            {/* Mevcut musteri bulunduysa bilgi goster */}
            {foundCustomer && (
              <div style={{ marginTop: 6, background: '#E8F1EC', border: '1px solid #B5D0C0', borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ color: '#1D9E75' }}>✓</span>
                <span style={{ fontWeight: 600, color: '#0F3D2A' }}>{foundCustomer.name}</span>
                <span style={{ color: '#5A8A6E' }}>— kayıtlı müşteri</span>
              </div>
            )}
          </div>

          {/* ═══ 2. AD SOYAD ═══ */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#0F3D2A', display: 'block', marginBottom: 6 }}>Ad Soyad *</label>
            <input
              type="text" value={foundCustomer ? foundCustomer.name : newName}
              onChange={e => { if (!foundCustomer) setNewName(e.target.value.toUpperCase()); }}
              placeholder="MÜŞTERİ ADI"
              disabled={!!foundCustomer}
              style={{ ...inputStyle, background: foundCustomer ? '#f5f5f0' : '#fff', color: foundCustomer ? '#666' : '#1a1a1a' }}
            />
          </div>

          {/* ═══ 3. E-POSTA ═══ */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>E-posta</label>
            <input
              type="email" value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="ornek@mail.com"
              disabled={!!foundCustomer}
              style={{ ...inputStyle, background: foundCustomer ? '#f5f5f0' : '#fff', color: foundCustomer ? '#666' : '#1a1a1a' }}
            />
          </div>

          {/* ═══ ONAYLA BUTONU ═══ */}
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || creating || saving}
            style={{
              width: '100%', padding: '12px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 600,
              cursor: !canConfirm ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              background: !canConfirm ? '#d5d5d0' : '#1D9E75', color: '#fff',
              opacity: (creating || saving) ? 0.7 : 1,
            }}
          >
            {btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniBar({ color, pct }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
      <div style={{ width: 80, height: 6, borderRadius: 3, background: '#C2D8CC', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: barColor(pct) }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 500, fontFamily: "'SF Mono','Menlo',monospace", color: textColor(pct) }}>%{pct}</span>
    </div>
  );
}
