import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchDayAppointments } from '@/services/monthlyCalendarService';
import { useDragAppointment } from '@/hooks/useDragAppointment';
import DayDetailServiceList from './DayDetailServiceList';
import DayDetailTimeGrid, { slotToTime, durationToSlots, TOTAL_SLOTS, SLOT_MINUTES, DAY_START_HOUR } from './DayDetailTimeGrid';
import DayDetailConfirmBar from './DayDetailConfirmBar';

const DAY_NAMES_LONG = {
  tr: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ru: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
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

  // Tarih bilgileri
  const dateObj = new Date(date + 'T00:00:00');
  const dayOfWeek = dateObj.getDay();
  const dayName = (DAY_NAMES_LONG[lang] || DAY_NAMES_LONG.tr)[dayOfWeek];
  const [yearStr, monthStr, dayStr] = date.split('-');
  const formattedDate = `${dayStr} ${dayName}`;

  // O gundeki randevulari yukle
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

  // Uzman-hizmet iliskisini yukle
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

  // Secili hizmeti verebilen uzmanlar
  const filteredExperts = useMemo(() => {
    if (!selectedService) return [];

    // Self-servis hizmetler icin tum uzmanlar
    if (selectedService.requires_expert === false) {
      return allExperts || [];
    }

    // Uzman hizmetleri icin expert_services tablosundan filtrele
    const serviceExperts = expertServicesMap.get(selectedService.id);
    if (!serviceExperts) return allExperts || [];

    return (allExperts || []).filter(e => serviceExperts.has(e.id));
  }, [selectedService, allExperts, expertServicesMap]);

  const slotsNeeded = selectedService ? durationToSlots(selectedService.duration) : 0;

  // Bookedslots hesapla (drag icin)
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
        if (s >= 0 && s < TOTAL_SLOTS) {
          map[`${colIndex}-${s}`] = true;
        }
      }
    });
    return map;
  }, [filteredExperts, dayAppointments]);

  // Drag hook
  const { isDragging, dragState, handleDragStart } = useDragAppointment({
    newAppointment: newAppointment ? {
      ...newAppointment,
      serviceName: selectedService?.description,
    } : null,
    slotsNeeded,
    bookedSlots,
    experts: filteredExperts,
    cellRefs,
    totalSlots: TOTAL_SLOTS,
    onDrop: (col, slot) => {
      const expert = filteredExperts[col];
      if (expert) {
        setNewAppointment({
          colIndex: col,
          startSlot: slot,
          expert,
          startTime: slotToTime(slot),
          endTime: slotToTime(slot + slotsNeeded),
        });
      }
    },
  });

  // Slot tiklama
  const handleSlotClick = useCallback((colIndex, slotIndex, expert) => {
    setNewAppointment({
      colIndex,
      startSlot: slotIndex,
      expert,
      startTime: slotToTime(slotIndex),
      endTime: slotToTime(slotIndex + slotsNeeded),
    });
  }, [slotsNeeded]);

  // Randevu onayla
  const handleConfirm = async () => {
    if (!newAppointment || !selectedService || !company?.id) return;
    setSaving(true);

    try {
      // Randevu olustur
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

      // Uzman atamasi
      if (newAppointment.expert) {
        insertData.expert_id = newAppointment.expert.id;
      }

      // Oda ve birim atamasi
      if (selectedRoom) {
        insertData.space_id = selectedRoom.id;
      }
      if (selectedUnit) {
        insertData.room_unit_id = selectedUnit.id;
      }

      const { data: aptData, error: aptError } = await supabase
        .from('appointments')
        .insert(insertData)
        .select()
        .single();

      if (aptError) throw aptError;

      // appointment_services junction kaydı
      if (aptData) {
        await supabase.from('appointment_services').insert({
          appointment_id: aptData.id,
          service_id: selectedService.id,
          expert_id: newAppointment.expert?.id || null,
        });

        // appointment_resources (oda atamasi)
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

      // State temizle ve yenile
      setNewAppointment(null);
      const refreshed = await fetchDayAppointments(company.id, date);
      setDayAppointments(refreshed);
    } catch (err) {
      console.error('Randevu olusturulamadi:', err);
      toast({
        title: t('appointmentCreateError'),
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Iptal
  const handleCancelNewAppointment = () => {
    setNewAppointment(null);
  };

  // Hizmet secim degistiginde alt secimler sifirla
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
    { label: t('breadcrumbDay'), active: true },
    selectedService && { label: selectedService.description, active: true },
    selectedRoom && { label: selectedRoom.name, active: true },
    selectedUnit && { label: selectedUnit.name, active: true },
    newAppointment && { label: newAppointment.startTime, active: true },
  ].filter(Boolean);

  // Sag panel gosterilecek mi?
  const showTimeGrid = selectedService && (selectedUnit || selectedService.requires_expert === false);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.25 }}
        className="mt-4 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-slate-800">{formattedDate}</h3>
            <span className="text-[11px] text-slate-400">{date}</span>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              {breadcrumbs.map((bc, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight className="w-3 h-3" />}
                  <span className={cn(bc.active ? 'text-slate-600' : 'text-slate-400')}>
                    {bc.label}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Sol + Sag panel layout */}
        <div className="flex" style={{ height: 480 }}>
          {/* Sol panel: Hizmet listesi */}
          <div className="w-[280px] min-w-[280px] border-r border-slate-200 overflow-hidden flex flex-col">
            <DayDetailServiceList
              company={company}
              date={date}
              selectedService={selectedService}
              onSelectService={handleSelectService}
              selectedRoom={selectedRoom}
              onSelectRoom={handleSelectRoom}
              selectedUnit={selectedUnit}
              onSelectUnit={handleSelectUnit}
              spaces={spaces}
              experts={allExperts}
            />
          </div>

          {/* Sag panel: Saat cizelgesi */}
          <div className="flex-1 min-w-0 flex flex-col">
            {showTimeGrid ? (
              <DayDetailTimeGrid
                date={date}
                experts={filteredExperts}
                appointments={dayAppointments}
                service={selectedService}
                room={selectedRoom}
                unit={selectedUnit}
                newAppointment={newAppointment}
                onSlotClick={handleSlotClick}
                onDragStart={handleDragStart}
                dragState={dragState}
                cellRefs={cellRefs}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="text-3xl text-slate-200">
                    {!selectedService ? '🗓️' : '🏠'}
                  </div>
                  <p className="text-xs text-slate-400">
                    {!selectedService
                      ? t('selectServiceFirst')
                      : !selectedRoom
                        ? t('selectRoomFirst')
                        : t('selectUnitFirst')
                    }
                  </p>
                </div>
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
      </motion.div>
    </AnimatePresence>
  );
}
