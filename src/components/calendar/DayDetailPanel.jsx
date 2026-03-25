import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { fetchDayAppointments } from '@/services/monthlyCalendarService';
import { useDragAppointment } from '@/hooks/useDragAppointment';
import DayDetailServiceList from './DayDetailServiceList';
import DayDetailTimeGrid, { slotToTime, durationToSlots, TOTAL_SLOTS, SLOT_MINUTES, DAY_START_HOUR } from './DayDetailTimeGrid';
import DayDetailConfirmBar from './DayDetailConfirmBar';

const MONTH_NAMES = {
  tr: ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
};
const DAY_NAMES_LONG = {
  tr: ['Pazar', 'Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ru: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
};

// Basit renk bar icin
const getBarColor = (percent) => {
  if (percent <= 30) return '#86efac';
  if (percent <= 50) return '#a3e635';
  if (percent <= 70) return '#fbbf24';
  if (percent <= 85) return '#f97316';
  return '#ef4444';
};

export default function DayDetailPanel({
  date,
  onClose,
  company,
  experts: allExperts,
  spaces,
  workingHours,
}) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const lang = i18n.language?.substring(0, 2) || 'tr';
  const cellRefs = useRef({});

  // State
  const [selectedService, setSelectedService] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [newAppointment, setNewAppointment] = useState(null);
  const [dayAppointments, setDayAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expertServicesMap, setExpertServicesMap] = useState(new Map());
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);
  const [pendingConfirmData, setPendingConfirmData] = useState(null);

  // Tarih bilgileri
  const dateObj = new Date(date + 'T00:00:00');
  const dayOfWeek = dateObj.getDay();
  const dayName = (DAY_NAMES_LONG[lang] || DAY_NAMES_LONG.tr)[dayOfWeek];
  const monthName = (MONTH_NAMES[lang] || MONTH_NAMES.tr)[dateObj.getMonth()];
  const [yearStr, monthStr, dayStr] = date.split('-');
  const formattedDate = `${parseInt(dayStr)} ${monthName} ${yearStr}, ${dayName}`;

  // Randevulari yukle
  useEffect(() => {
    if (!company?.id || !date) return;
    const load = async () => {
      setLoading(true);
      const data = await fetchDayAppointments(company.id, date);
      setDayAppointments(data);
      setLoading(false);
    };
    load();
  }, [company?.id, date]);

  // expert_services yukle
  useEffect(() => {
    if (!company?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from('expert_services')
        .select('expert_id, service_id')
        .eq('company_id', company.id);
      const map = new Map();
      (data || []).forEach(es => {
        if (!map.has(es.service_id)) map.set(es.service_id, new Set());
        map.get(es.service_id).add(es.expert_id);
      });
      setExpertServicesMap(map);
    };
    load();
  }, [company?.id]);

  // Filtrelenmis uzmanlar
  const filteredExperts = useMemo(() => {
    if (!selectedService) return [];
    if (selectedService.requires_expert === false) return allExperts || [];
    const serviceExperts = expertServicesMap.get(selectedService.id);
    if (!serviceExperts) return allExperts || [];
    return (allExperts || []).filter(e => serviceExperts.has(e.id));
  }, [selectedService, allExperts, expertServicesMap]);

  const slotsNeeded = selectedService ? durationToSlots(selectedService.duration) : 0;

  // Doluluk yuzdeleri
  const dayStats = useMemo(() => {
    const massageAppts = dayAppointments.filter(a => a.company_services?.requires_expert !== false);
    const facilityAppts = dayAppointments.filter(a => a.company_services?.requires_expert === false);
    const massageMax = (allExperts || []).length * 8;
    const facilityMax = (spaces || []).filter(s => s.is_active).length * 6;
    return {
      total: dayAppointments.length,
      massagePercent: massageMax > 0 ? Math.min(100, Math.round((massageAppts.length / massageMax) * 100)) : 0,
      facilityPercent: facilityMax > 0 ? Math.min(100, Math.round((facilityAppts.length / facilityMax) * 100)) : 0,
    };
  }, [dayAppointments, allExperts, spaces]);

  // Bookedslots
  const bookedSlots = useMemo(() => {
    const map = {};
    if (!filteredExperts.length || !dayAppointments.length) return map;
    dayAppointments.forEach(apt => {
      if (!apt.time || apt.status === 'iptal') return;
      const colIndex = filteredExperts.findIndex(e => e.id === apt.expert_id);
      if (colIndex === -1) return;
      const startMins = apt.time.split(':').map(Number);
      const startSlot = Math.floor((startMins[0] * 60 + startMins[1] - DAY_START_HOUR * 60) / SLOT_MINUTES);
      const dur = apt.total_duration || apt.company_services?.duration || 60;
      const slots = durationToSlots(dur);
      for (let k = 0; k < slots; k++) {
        const s = startSlot + k;
        if (s >= 0 && s < TOTAL_SLOTS) map[`${colIndex}-${s}`] = true;
      }
    });
    return map;
  }, [filteredExperts, dayAppointments]);

  // Drag hook
  const { isDragging, dragState, handleDragStart } = useDragAppointment({
    newAppointment: newAppointment ? { ...newAppointment, serviceName: selectedService?.description } : null,
    slotsNeeded,
    bookedSlots,
    experts: filteredExperts,
    cellRefs,
    totalSlots: TOTAL_SLOTS,
    onDrop: (col, slot) => {
      const expert = filteredExperts[col];
      if (expert) {
        setNewAppointment({
          colIndex: col, startSlot: slot, expert,
          startTime: slotToTime(slot), endTime: slotToTime(slot + slotsNeeded),
        });
      }
    },
  });

  const handleSlotClick = useCallback((colIndex, slotIndex, expert) => {
    setNewAppointment({
      colIndex, startSlot: slotIndex, expert,
      startTime: slotToTime(slotIndex), endTime: slotToTime(slotIndex + slotsNeeded),
    });
  }, [slotsNeeded]);

  // Randevu onayla
  const handleConfirm = async () => {
    if (!newAppointment || !selectedService || !company?.id) return;
    setSaving(true);
    try {
      const insertData = {
        company_id: company.id,
        service_id: selectedService.id,
        date: date,
        time: newAppointment.startTime,
        total_duration: selectedService.duration,
        total_amount: selectedService.price || 0,
        status: 'onaylandı',
        payment_status: 'unpaid',
      };
      if (newAppointment.expert) insertData.expert_id = newAppointment.expert.id;
      if (selectedRoom) insertData.space_id = selectedRoom.id;
      if (selectedUnit?.id && !selectedUnit.id.startsWith('session-')) {
        insertData.room_unit_id = selectedUnit.id;
      }

      const { data: aptData, error: aptError } = await supabase
        .from('appointments').insert(insertData).select().single();
      if (aptError) throw aptError;

      if (aptData) {
        await supabase.from('appointment_services').insert({
          appointment_id: aptData.id,
          service_id: selectedService.id,
          expert_id: newAppointment.expert?.id || null,
        });
        if (selectedRoom) {
          await supabase.from('appointment_resources').insert({
            appointment_id: aptData.id,
            resource_type: 'space',
            resource_id: selectedRoom.id,
          });
        }
      }

      toast({
        title: t('appointmentCreatedSuccess'),
        description: `${selectedService.description} · ${newAppointment.expert?.name || ''} · ${newAppointment.startTime}`,
      });

      setNewAppointment(null);
      const refreshed = await fetchDayAppointments(company.id, date);
      setDayAppointments(refreshed);
    } catch (err) {
      console.error('Randevu olusturulamadi:', err);
      toast({ title: t('appointmentCreateError'), description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelNewAppointment = () => setNewAppointment(null);

  const handleSelectService = (svc) => {
    setSelectedService(svc);
    setSelectedRoom(null);
    setSelectedUnit(null);
    setNewAppointment(null);
  };
  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    setSelectedUnit(null);
    setNewAppointment(null);
  };
  const handleSelectUnit = (unit) => {
    setSelectedUnit(unit);
    setNewAppointment(null);
  };

  // Breadcrumb
  const breadcrumbs = [
    { label: t('breadcrumbDay') },
    selectedService && { label: selectedService.description },
    selectedRoom && { label: selectedRoom.name },
    selectedUnit && { label: selectedUnit.name || `Seans ${selectedUnit.sessionTime}` },
    newAppointment && { label: `${newAppointment.expert?.name} ${newAppointment.startTime}` },
  ].filter(Boolean);

  // Sag panel gorunurlugu
  const showTimeGrid = selectedService && (selectedUnit || selectedService.requires_expert === false);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.25 }}
        className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col h-full"
      >
        {/* Header — screenshot formatinda */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex flex-col gap-1">
            {/* Tarih + doluluk barlari */}
            <div className="flex items-center gap-3">
              <h3 className="text-[15px] font-bold text-slate-800">{formattedDate}</h3>
              {/* Mini doluluk barlari */}
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${dayStats.massagePercent}%`, backgroundColor: getBarColor(dayStats.massagePercent) }} />
                </div>
                <span className="text-[10px] font-semibold text-slate-500">%{dayStats.massagePercent}</span>

                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${dayStats.facilityPercent}%`, backgroundColor: getBarColor(dayStats.facilityPercent) }} />
                </div>
                <span className="text-[10px] font-semibold text-slate-500">%{dayStats.facilityPercent}</span>
              </div>
            </div>
            {/* Randevu sayisi + Breadcrumb */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">{dayStats.total} randevu</span>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-0.5 text-[11px]">
                {breadcrumbs.map((bc, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-slate-300 mx-0.5">›</span>}
                    <span className={i === breadcrumbs.length - 1 ? 'text-slate-600 font-medium' : 'text-emerald-600 cursor-pointer hover:underline'}>
                      {bc.label}
                    </span>
                  </React.Fragment>
                ))}
                {!selectedService && <span className="text-slate-400">{t('selectServiceFirst')}</span>}
              </div>
            </div>
          </div>

          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Sol + Sag panel */}
        <div className="flex flex-1 min-h-0">
          {/* Sol panel */}
          <div className="w-[280px] min-w-[280px] border-r border-slate-200 overflow-hidden flex flex-col">
            <DayDetailServiceList
              company={company} date={date}
              selectedService={selectedService} onSelectService={handleSelectService}
              selectedRoom={selectedRoom} onSelectRoom={handleSelectRoom}
              selectedUnit={selectedUnit} onSelectUnit={handleSelectUnit}
              spaces={spaces} experts={allExperts}
            />
          </div>

          {/* Sag panel */}
          <div className="flex-1 min-w-0 flex flex-col">
            {showTimeGrid ? (
              <DayDetailTimeGrid
                date={date} experts={filteredExperts} appointments={dayAppointments}
                service={selectedService} room={selectedRoom} unit={selectedUnit}
                newAppointment={newAppointment} onSlotClick={handleSlotClick}
                onDragStart={handleDragStart} dragState={dragState} cellRefs={cellRefs}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-slate-400">
                  {!selectedService
                    ? 'Soldan hizmet secin'
                    : !selectedRoom
                      ? t('selectRoomFirst')
                      : t('selectUnitFirst')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Onay bari */}
        {newAppointment && selectedService && (
          <DayDetailConfirmBar
            service={selectedService}
            expert={newAppointment.expert}
            startTime={newAppointment.startTime}
            endTime={newAppointment.endTime}
            duration={selectedService.duration}
            room={selectedRoom}
            unit={selectedUnit}
            onConfirm={handleConfirm}
            onCancel={handleCancelNewAppointment}
            loading={saving}
          />
        )}

        {/* Bildirim Sorusu Dialog — randevu degistirildikten sonra kullanilacak */}
        {showNotifyDialog && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-xl p-5 max-w-sm mx-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-2">Bildirim Gonderilsin mi?</h4>
              <p className="text-xs text-slate-500 mb-4">
                Randevu degistirildi. Musteri ve uzman personele bildirim gondermek ister misiniz?
              </p>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => { setShowNotifyDialog(false); setPendingConfirmData(null); }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Hayir
                </button>
                <button
                  onClick={() => {
                    // TODO: Bildirim gonderme islemi — ileride N8N webhook ile entegre edilecek
                    toast({ title: 'Bildirim gonderildi', description: 'Musteri ve uzman bilgilendirildi.' });
                    setShowNotifyDialog(false);
                    setPendingConfirmData(null);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  Evet, Gonder
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
