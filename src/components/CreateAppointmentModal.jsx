import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar as CalendarIcon, Clock, AlertTriangle, Check,
  DoorOpen, Wrench, User, ChevronDown, ChevronRight, Sparkles,
} from 'lucide-react';
import { createAdminNotification, sendAppointmentConfirmation } from '@/services/notificationService';
import { autoAssignResources } from '@/services/availabilityService';
import { setAppointmentResources } from '@/services/resourceService';

// Türkçe gün isimleri — company_working_hours tablosuyla eşleşmeli
const DAY_NAMES_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const CreateAppointmentModal = ({ isOpen, onClose, experts, currentDate, onAppointmentCreated }) => {
  const { company, workingHours } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  // ── Temel State'ler ──
  const [customers, setCustomers] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(currentDate);
  const [appointmentTime, setAppointmentTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Hizmet Bazlı Uzman Seçimleri ──
  // [{ serviceId: 'abc', expertId: 'exp1' | null }]
  const [serviceSelections, setServiceSelections] = useState([]);

  // Tüm uzman-hizmet ilişkileri: Map<serviceId, Set<expertId>>
  const [expertServiceMap, setExpertServiceMap] = useState(new Map());

  // Uzman müsaitlik durumu: Map<expertId, { available: bool, reason: string }>
  const [expertAvailability, setExpertAvailability] = useState(new Map());

  // Çakışma uyarıları (çoklu uzman desteği)
  const [conflictWarnings, setConflictWarnings] = useState([]);

  // Kaynak atama state'leri
  const [assignedSpace, setAssignedSpace] = useState(null);
  const [assignedEquipment, setAssignedEquipment] = useState([]);
  const [resourceConflicts, setResourceConflicts] = useState([]);
  const [allSpaces, setAllSpaces] = useState([]);
  const [hasResources, setHasResources] = useState(false);

  // Kategori açık/kapalı durumları
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());

  // Tatil günleri
  const [holidays, setHolidays] = useState([]);

  // ── Yardımcı Fonksiyonlar ──
  const timeToMinutes = (time) => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatMinutes = (totalMin) => {
    const h = Math.floor(totalMin / 60).toString().padStart(2, '0');
    const m = (totalMin % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  // ── Hesaplanmış Değerler ──
  const totalDuration = useMemo(() => {
    return serviceSelections.reduce((sum, sel) => {
      const svc = allServices.find(s => s.id === sel.serviceId);
      return sum + (svc?.duration || 0);
    }, 0);
  }, [serviceSelections, allServices]);

  const totalPrice = useMemo(() => {
    return serviceSelections.reduce((sum, sel) => {
      const svc = allServices.find(s => s.id === sel.serviceId);
      return sum + (svc?.price || 0);
    }, 0);
  }, [serviceSelections, allServices]);

  // Seçili hizmetlerden en az biri uzman gerektiriyor mu?
  const hasExpertRequiredService = useMemo(() => {
    return serviceSelections.some(sel => {
      const svc = allServices.find(s => s.id === sel.serviceId);
      return svc?.requires_expert !== false;
    });
  }, [serviceSelections, allServices]);

  // Tüm uzman gerektiren hizmetlere uzman atanmış mı?
  const allExpertsAssigned = useMemo(() => {
    return serviceSelections.every(sel => {
      const svc = allServices.find(s => s.id === sel.serviceId);
      if (svc?.requires_expert === false) return true; // self-service, uzman gerekmez
      return !!sel.expertId;
    });
  }, [serviceSelections, allServices]);

  // Hizmetleri grupla: requires_expert true/false + category
  const groupedServices = useMemo(() => {
    const expertServices = allServices.filter(s => s.requires_expert !== false);
    const selfServices = allServices.filter(s => s.requires_expert === false);

    // Kategori bazlı gruplama fonksiyonu
    const groupByCategory = (services) => {
      const groups = new Map();
      services.forEach(svc => {
        const cat = svc.category || t('noCategory');
        if (!groups.has(cat)) groups.set(cat, []);
        groups.get(cat).push(svc);
      });
      return groups;
    };

    return {
      expert: groupByCategory(expertServices),
      selfService: groupByCategory(selfServices),
      hasExpertServices: expertServices.length > 0,
      hasSelfServices: selfServices.length > 0,
    };
  }, [allServices, t]);

  // ── Veri Yükleme ──
  useEffect(() => {
    if (isOpen && company) {
      const fetchData = async () => {
        const [customerRes, serviceRes, spacesRes, expertServicesRes, holidaysRes] = await Promise.all([
          supabase.from('customers').select('*').eq('company_id', company.id),
          supabase.from('company_services').select('*').eq('company_id', company.id).eq('is_active', true),
          supabase.from('spaces').select('id, name, color').eq('company_id', company.id).eq('is_active', true).order('sort_order'),
          // Tüm uzman-hizmet ilişkilerini tek seferde çek
          supabase.from('expert_services').select('expert_id, service_id').eq('company_id', company.id),
          // Tatil günlerini çek
          supabase.from('company_holidays').select('expert_id, date').eq('company_id', company.id),
        ]);

        if (customerRes.data) setCustomers(customerRes.data);
        if (serviceRes.data) setAllServices(serviceRes.data);
        if (spacesRes.data) {
          setAllSpaces(spacesRes.data);
          setHasResources(spacesRes.data.length > 0);
        }
        if (holidaysRes.data) setHolidays(holidaysRes.data);

        // expertServiceMap oluştur: Map<serviceId, Set<expertId>>
        if (expertServicesRes.data) {
          const map = new Map();
          expertServicesRes.data.forEach(({ service_id, expert_id }) => {
            if (!map.has(service_id)) map.set(service_id, new Set());
            map.get(service_id).add(expert_id);
          });
          setExpertServiceMap(map);
        }
      };
      fetchData();
      setAppointmentDate(currentDate);
    }
  }, [isOpen, company, currentDate]);

  // ── Uzman Müsaitlik Kontrolü ──
  // Tarih veya saat değiştiğinde tüm uzmanların müsaitliğini yeniden hesapla
  useEffect(() => {
    if (!appointmentDate || !experts || experts.length === 0) return;

    const dateStr = appointmentDate instanceof Date
      ? appointmentDate.toISOString().split('T')[0]
      : appointmentDate;
    const dateObj = appointmentDate instanceof Date ? appointmentDate : new Date(appointmentDate);
    const dayName = DAY_NAMES_TR[dateObj.getDay()];

    const checkAvailability = async () => {
      const availMap = new Map();

      // O günkü mevcut randevuları çek (çakışma kontrolü için)
      let existingApps = [];
      if (appointmentTime) {
        const { data } = await supabase
          .from('appointments')
          .select('id, expert_id, time, total_duration, company_services(duration, requires_expert), appointment_services(service_id, company_services(duration, requires_expert))')
          .eq('company_id', company.id)
          .eq('date', dateStr)
          .neq('status', 'iptal');
        existingApps = data || [];
      }

      for (const expert of experts) {
        // 1. Tatil kontrolü
        const isHoliday = holidays.some(h =>
          (h.expert_id === expert.id || h.expert_id === null) && h.date === dateStr
        );
        if (isHoliday) {
          availMap.set(expert.id, { available: false, reason: t('expertNotWorking') });
          continue;
        }

        // 2. Çalışma saatleri kontrolü
        const expertHours = workingHours?.filter(wh =>
          wh.expert_id === expert.id && wh.day === dayName && wh.is_open
        ) || [];

        if (expertHours.length === 0) {
          availMap.set(expert.id, { available: false, reason: t('expertNotWorking') });
          continue;
        }

        // 3. Saat belirtilmişse, çalışma saatleri aralığında mı?
        if (appointmentTime) {
          const timeMin = timeToMinutes(appointmentTime);
          const withinHours = expertHours.some(wh => {
            const start = timeToMinutes(wh.start_time);
            const end = timeToMinutes(wh.end_time);
            return timeMin >= start && timeMin < end;
          });
          if (!withinHours) {
            availMap.set(expert.id, { available: false, reason: t('outsideWorkingHours') });
            continue;
          }

          // 4. Öğle molası kontrolü
          if (expert.general_lunch_start_time && expert.general_lunch_end_time) {
            const lunchStart = timeToMinutes(expert.general_lunch_start_time);
            const lunchEnd = timeToMinutes(expert.general_lunch_end_time);
            if (timeMin >= lunchStart && timeMin < lunchEnd) {
              availMap.set(expert.id, {
                available: false,
                reason: `${t('lunchBreakWarning') || 'Öğle molası'}: ${expert.general_lunch_start_time.substring(0,5)}-${expert.general_lunch_end_time.substring(0,5)}`
              });
              continue;
            }
          }

          // 5. Mevcut randevu çakışması kontrolü
          // Bu uzmanın bu saatte meşgul olup olmadığını kontrol et
          const expertApps = existingApps.filter(app => app.expert_id === expert.id);
          let isBusy = false;
          for (const app of expertApps) {
            const appStart = timeToMinutes(app.time);
            // Uzman meşguliyet penceresi hesapla
            let expertEnd = appStart;
            if (app.appointment_services?.length > 0) {
              let currentTime = appStart;
              let hasExpert = false;
              for (const as of app.appointment_services) {
                const dur = as.company_services?.duration || 0;
                const needsExpert = as.company_services?.requires_expert !== false;
                if (needsExpert) {
                  if (!hasExpert) { /* expertStart tracked internally */ }
                  expertEnd = currentTime + dur;
                  hasExpert = true;
                }
                currentTime += dur;
              }
              if (!hasExpert) continue;
            } else {
              if (app.company_services?.requires_expert === false) continue;
              expertEnd = appStart + (app.total_duration || app.company_services?.duration || 60);
            }

            if (timeMin < expertEnd && timeMin >= appStart) {
              isBusy = true;
              availMap.set(expert.id, {
                available: false,
                reason: `${t('expertBusy')}: ${formatMinutes(appStart)}-${formatMinutes(expertEnd)}`
              });
              break;
            }
          }
          if (isBusy) continue;
        }

        availMap.set(expert.id, { available: true, reason: '' });
      }

      setExpertAvailability(availMap);
    };

    checkAvailability();
  }, [appointmentDate, appointmentTime, experts, workingHours, holidays, company, t]);

  // ── Çakışma Kontrolü (çoklu uzman) ──
  useEffect(() => {
    if (!appointmentTime || serviceSelections.length === 0 || !appointmentDate) {
      setConflictWarnings([]);
      return;
    }

    const checkConflicts = async () => {
      const dateStr = appointmentDate instanceof Date
        ? appointmentDate.toISOString().split('T')[0]
        : appointmentDate;
      const warnings = [];

      // Benzersiz uzmanları topla ve her birinin meşguliyet penceresini hesapla
      const expertWindows = new Map(); // Map<expertId, { start, end }>
      let currentTime = timeToMinutes(appointmentTime);

      for (const sel of serviceSelections) {
        const svc = allServices.find(s => s.id === sel.serviceId);
        const duration = svc?.duration || 0;
        const needsExpert = svc?.requires_expert !== false;

        if (needsExpert && sel.expertId) {
          if (!expertWindows.has(sel.expertId)) {
            expertWindows.set(sel.expertId, { start: currentTime, end: currentTime + duration });
          } else {
            const win = expertWindows.get(sel.expertId);
            win.end = currentTime + duration;
          }
        }
        currentTime += duration;
      }

      // Her uzman için mevcut randevularla çakışma kontrolü
      for (const [expertId, window] of expertWindows) {
        const { data: existingApps } = await supabase
          .from('appointments')
          .select('id, time, total_duration, company_services(duration, requires_expert), appointment_services(service_id, company_services(duration, requires_expert))')
          .eq('expert_id', expertId)
          .eq('date', dateStr)
          .neq('status', 'iptal');

        if (!existingApps) continue;

        for (const app of existingApps) {
          const appStart = timeToMinutes(app.time);
          let existingStart = appStart;
          let existingEnd = appStart;

          if (app.appointment_services?.length > 0) {
            let ct = appStart;
            let hasExpert = false;
            for (const as of app.appointment_services) {
              const dur = as.company_services?.duration || 0;
              const needsExp = as.company_services?.requires_expert !== false;
              if (needsExp) {
                if (!hasExpert) existingStart = ct;
                existingEnd = ct + dur;
                hasExpert = true;
              }
              ct += dur;
            }
            if (!hasExpert) continue;
          } else {
            if (app.company_services?.requires_expert === false) continue;
            existingEnd = appStart + (app.total_duration || app.company_services?.duration || 60);
          }

          if (window.start < existingEnd && window.end > existingStart) {
            const expert = experts?.find(e => e.id === expertId);
            warnings.push({
              expertId,
              expertName: expert?.name || '',
              existingTime: `${formatMinutes(existingStart)} - ${formatMinutes(existingEnd)}`,
            });
            break;
          }
        }
      }

      setConflictWarnings(warnings);
    };

    checkConflicts();
  }, [serviceSelections, appointmentDate, appointmentTime, allServices, experts]);

  // ── Kaynak Otomatik Atama ──
  useEffect(() => {
    if (!hasResources || serviceSelections.length === 0 || !appointmentTime || !company || conflictWarnings.length > 0) {
      setAssignedSpace(null);
      setAssignedEquipment([]);
      setResourceConflicts([]);
      return;
    }

    const assignResources = async () => {
      try {
        const dateStr = appointmentDate instanceof Date
          ? appointmentDate.toISOString().split('T')[0]
          : appointmentDate;
        const primaryExpertId = serviceSelections.find(sel => {
          const svc = allServices.find(s => s.id === sel.serviceId);
          return svc?.requires_expert !== false && sel.expertId;
        })?.expertId || null;

        const result = await autoAssignResources(
          company.id, dateStr, appointmentTime, totalDuration,
          primaryExpertId, serviceSelections[0].serviceId
        );

        if (result.error) {
          setResourceConflicts([{ type: 'space', name: '', message: result.error }]);
          setAssignedSpace(null);
          setAssignedEquipment([]);
        } else {
          setResourceConflicts([]);
          if (result.space_id) {
            const space = allSpaces.find(s => s.id === result.space_id);
            setAssignedSpace(space ? { id: space.id, name: space.name, color: space.color } : null);
          } else {
            setAssignedSpace(null);
          }
          setAssignedEquipment(result.equipment_ids || []);
        }
      } catch (err) {
        console.error('Kaynak atama hatası:', err);
        setResourceConflicts([]);
        setAssignedSpace(null);
        setAssignedEquipment([]);
      }
    };

    assignResources();
  }, [serviceSelections, appointmentDate, appointmentTime, totalDuration, hasResources, company, conflictWarnings, allSpaces, allServices]);

  // ── Hizmet Seçim/Kaldırma ──
  const toggleService = useCallback((serviceId) => {
    setServiceSelections(prev => {
      const exists = prev.find(s => s.serviceId === serviceId);
      if (exists) {
        return prev.filter(s => s.serviceId !== serviceId);
      } else {
        const svc = allServices.find(s => s.id === serviceId);
        const needsExpert = svc?.requires_expert !== false;

        // Uzman gerektiriyorsa ve bu hizmeti yapabilen tek uzman varsa otomatik seç
        let autoExpertId = null;
        if (needsExpert) {
          const availableExperts = expertServiceMap.get(serviceId);
          if (availableExperts && availableExperts.size === 1) {
            const singleExpertId = [...availableExperts][0];
            const avail = expertAvailability.get(singleExpertId);
            if (avail?.available) {
              autoExpertId = singleExpertId;
            }
          }
        }

        return [...prev, { serviceId, expertId: autoExpertId }];
      }
    });
  }, [allServices, expertServiceMap, expertAvailability]);

  // Hizmet bazlı uzman ata
  const setExpertForService = useCallback((serviceId, expertId) => {
    setServiceSelections(prev =>
      prev.map(sel => sel.serviceId === serviceId ? { ...sel, expertId } : sel)
    );
  }, []);

  // ── Kategori Aç/Kapat ──
  const toggleCategory = useCallback((catKey) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(catKey)) newSet.delete(catKey);
      else newSet.add(catKey);
      return newSet;
    });
  }, []);

  // ── Randevu Oluştur ──
  const handleCreateAppointment = async () => {
    // Validasyon
    const enforcement = company?.resource_enforcement || 'optional';
    if (enforcement === 'mandatory' && hasResources && !assignedSpace) {
      toast({ title: t('error'), description: t('resourceConflict') + ': ' + t('noAvailableSpace'), variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    let customerId = selectedCustomer;

    try {
      // Müşteri oluştur/seç
      if (selectedCustomer === 'new') {
        if (!newCustomerName || !newCustomerPhone) {
          toast({ title: t('error'), description: t('newCustomerRequired'), variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({ company_id: company.id, name: newCustomerName, phone: newCustomerPhone })
          .select().single();
        if (custErr) throw custErr;
        customerId = newCust.id;
      }

      if (!customerId || serviceSelections.length === 0 || !appointmentDate || !appointmentTime) {
        toast({ title: t('error'), description: t('allFieldsRequired'), variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      // Uzman gerektiren hizmetler için uzman kontrolü
      if (hasExpertRequiredService && !allExpertsAssigned) {
        toast({ title: t('error'), description: t('missingExpertWarning'), variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      // Primary expert (backward compat: ilk expert-requiring hizmetin uzmanı)
      const primaryExpertId = serviceSelections.find(sel => {
        const svc = allServices.find(s => s.id === sel.serviceId);
        return svc?.requires_expert !== false && sel.expertId;
      })?.expertId || null;

      const dateStr = appointmentDate instanceof Date
        ? appointmentDate.toISOString().split('T')[0]
        : appointmentDate;

      // appointments INSERT
      const payload = {
        company_id: company.id,
        customer_id: customerId,
        service_id: serviceSelections[0].serviceId, // backward compat
        date: dateStr,
        time: appointmentTime,
        status: 'onaylandı',
        total_duration: totalDuration,
      };
      if (primaryExpertId) payload.expert_id = primaryExpertId;
      if (assignedSpace?.id) payload.space_id = assignedSpace.id;

      const { data: newAppointment, error: apptErr } = await supabase
        .from('appointments').insert(payload).select().single();
      if (apptErr) throw apptErr;

      // appointment_services INSERT (hizmet bazlı expert_id)
      const junctionInserts = serviceSelections.map(sel => ({
        appointment_id: newAppointment.id,
        service_id: sel.serviceId,
        expert_id: sel.expertId || null,
      }));
      await supabase.from('appointment_services').insert(junctionInserts);

      // appointment_resources
      const resources = [];
      if (assignedSpace?.id) resources.push({ resource_type: 'space', resource_id: assignedSpace.id });
      assignedEquipment.forEach(eqId => resources.push({ resource_type: 'equipment', resource_id: eqId }));
      if (resources.length > 0) await setAppointmentResources(newAppointment.id, resources);

      // Bildirimler
      const customer = customers.find(c => c.id === customerId);
      const serviceNames = serviceSelections
        .map(sel => allServices.find(s => s.id === sel.serviceId)?.description)
        .filter(Boolean).join(', ');
      const expertNames = [...new Set(
        serviceSelections.filter(sel => sel.expertId).map(sel => experts?.find(e => e.id === sel.expertId)?.name).filter(Boolean)
      )].join(', ');

      await createAdminNotification(
        company.id, 'new_appointment', t('notifNewAppointment'),
        `${customer?.name || ''} — ${dateStr} ${appointmentTime} — ${serviceNames}`,
        newAppointment?.id
      );

      if (customer?.phone) {
        await sendAppointmentConfirmation({
          company_id: company.id, salon_name: company.name,
          customer_name: customer.name, customer_phone: customer.phone,
          date: dateStr, time: appointmentTime,
          service_name: serviceNames, expert_name: expertNames,
        });
      }

      toast({ title: t('success'), description: t('appointmentCreatedSuccess') });
      onAppointmentCreated();
      handleClose();
    } catch (error) {
      toast({ title: t('error'), description: `${t('appointmentCreateError')}: ${error.message}`, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedCustomer('');
    setNewCustomerName('');
    setNewCustomerPhone('');
    setServiceSelections([]);
    setAppointmentTime('');
    setConflictWarnings([]);
    setAssignedSpace(null);
    setAssignedEquipment([]);
    setResourceConflicts([]);
    setExpertAvailability(new Map());
    setCollapsedCategories(new Set());
    onClose();
  };

  // ── Hizmet Satırı Render ──
  const renderServiceRow = (service) => {
    const sel = serviceSelections.find(s => s.serviceId === service.id);
    const isSelected = !!sel;
    const needsExpert = service.requires_expert !== false;
    const serviceExperts = expertServiceMap.get(service.id) || new Set();

    return (
      <div key={service.id} className="space-y-0">
        <button
          type="button"
          onClick={() => toggleService(service.id)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all
            ${isSelected
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
              : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/30'
            }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
              ${isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'}`}>
              {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
            </div>
            <span className="font-medium text-left">{service.description}</span>
            {!needsExpert && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                {t('selfServiceBadge')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
            <span className="text-xs text-slate-400">{service.duration} dk</span>
            {service.price != null && (
              <span className="text-xs font-medium text-slate-500">
                {Number(service.price).toLocaleString('tr-TR')} TL
              </span>
            )}
          </div>
        </button>

        {/* Uzman seçici satırı — hizmet seçili ve uzman gerektiriyorsa göster */}
        <AnimatePresence>
          {isSelected && needsExpert && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="ml-8 mt-1 mb-1 flex items-center gap-2 flex-wrap">
                <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-500 mr-1">{t('expertAssignment')}:</span>
                {serviceExperts.size === 0 ? (
                  <span className="text-xs text-red-500">{t('noExpertsAvailable')}</span>
                ) : (
                  [...serviceExperts].map(expId => {
                    const expert = experts?.find(e => e.id === expId);
                    if (!expert) return null;
                    const avail = expertAvailability.get(expId);
                    const isAvailable = avail?.available !== false;
                    const isChosen = sel?.expertId === expId;
                    const isAutoSelected = serviceExperts.size === 1 && isChosen;

                    return (
                      <button
                        key={expId}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setExpertForService(service.id, isChosen ? null : expId)}
                        title={!isAvailable ? avail?.reason : expert.name}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all
                          ${isChosen
                            ? 'text-white shadow-sm'
                            : isAvailable
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                              : 'bg-slate-50 text-slate-400 line-through cursor-not-allowed border border-slate-100'
                          }`}
                        style={isChosen ? { backgroundColor: expert.color || '#059669' } : {}}
                      >
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${!isAvailable ? 'bg-slate-300' : ''}`}
                          style={isAvailable && !isChosen ? { backgroundColor: expert.color || '#059669' } : isChosen ? { backgroundColor: 'rgba(255,255,255,0.5)' } : {}}
                        />
                        {expert.name}
                        {isChosen && <Check className="w-3 h-3" />}
                        {isAutoSelected && (
                          <span className="text-[9px] opacity-80">({t('expertAutoSelected')})</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ── Kategori Grubu Render ──
  const renderCategoryGroup = (categoryName, services, groupKey) => {
    const isCollapsed = collapsedCategories.has(groupKey);
    const selectedCount = services.filter(s => serviceSelections.some(sel => sel.serviceId === s.id)).length;

    return (
      <div key={groupKey} className="space-y-1">
        <button
          type="button"
          onClick={() => toggleCategory(groupKey)}
          className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700"
        >
          <div className="flex items-center gap-1.5">
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {categoryName}
          </div>
          {selectedCount > 0 && (
            <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
              {selectedCount}
            </span>
          )}
        </button>
        {!isCollapsed && (
          <div className="space-y-1">
            {services.map(svc => renderServiceRow(svc))}
          </div>
        )}
      </div>
    );
  };

  // ── Özet: Uzman Atamaları ──
  const expertAssignmentSummary = useMemo(() => {
    const assignments = [];
    serviceSelections.forEach(sel => {
      if (sel.expertId) {
        const expert = experts?.find(e => e.id === sel.expertId);
        const svc = allServices.find(s => s.id === sel.serviceId);
        if (expert && svc) {
          assignments.push({ expertName: expert.name, expertColor: expert.color, serviceName: svc.description });
        }
      }
    });
    return assignments;
  }, [serviceSelections, experts, allServices]);

  // ── Buton aktif mi? ──
  const canSubmit = useMemo(() => {
    if (!selectedCustomer) return false;
    if (selectedCustomer === 'new' && (!newCustomerName || !newCustomerPhone)) return false;
    if (serviceSelections.length === 0) return false;
    if (!appointmentDate || !appointmentTime) return false;
    if (hasExpertRequiredService && !allExpertsAssigned) return false;
    if (conflictWarnings.length > 0) return false;
    return true;
  }, [selectedCustomer, newCustomerName, newCustomerPhone, serviceSelections, appointmentDate, appointmentTime, hasExpertRequiredService, allExpertsAssigned, conflictWarnings]);

  // ── RENDER ──
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[900px] lg:max-w-[1100px] max-h-[95vh] flex flex-col p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <DialogHeader className="flex-shrink-0 border-b border-slate-200 px-6 py-4">
          <DialogTitle className="text-xl font-bold text-slate-800">
            {t('newAppointment')}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Bölüm 1: Müşteri Seçimi ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4" />
              {t('selectCustomer')}
            </h3>
            <Select onValueChange={setSelectedCustomer} value={selectedCustomer}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder={t('selectCustomer')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">{t('addNewCustomer')}</SelectItem>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} - {c.phone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCustomer === 'new' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder={t('newCustomerNamePlaceholder')}
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value.toUpperCase())}
                  className="h-11"
                />
                <Input
                  placeholder={t('newCustomerPhonePlaceholder')}
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="h-11"
                />
              </div>
            )}
          </div>

          {/* ── Bölüm 2: Hizmet Seçimi ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {t('servicesAndExperts')}
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {/* Uzman Hizmetleri */}
              {groupedServices.hasExpertServices && (
                <div className="p-3 space-y-2 bg-white">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                      {t('expertServices')}
                    </span>
                  </div>
                  {[...groupedServices.expert.entries()].map(([cat, services]) =>
                    renderCategoryGroup(cat, services, `expert-${cat}`)
                  )}
                </div>
              )}

              {/* Self Servis Ayırıcı */}
              {groupedServices.hasExpertServices && groupedServices.hasSelfServices && (
                <div className="border-t border-slate-200" />
              )}

              {/* Self Servis Hizmetleri */}
              {groupedServices.hasSelfServices && (
                <div className="p-3 space-y-2 bg-amber-50/30">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                      {t('selfServiceSection')}
                    </span>
                  </div>
                  {[...groupedServices.selfService.entries()].map(([cat, services]) =>
                    renderCategoryGroup(cat, services, `self-${cat}`)
                  )}
                </div>
              )}
            </div>

            {/* Seçim Özeti */}
            {serviceSelections.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
                <span className="text-emerald-700 font-medium">
                  {t('totalServices', { count: serviceSelections.length })}
                </span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <Clock className="w-3.5 h-3.5" />
                    {totalDuration} dk
                  </span>
                  {totalPrice > 0 && (
                    <span className="text-emerald-700 font-semibold">
                      {totalPrice.toLocaleString('tr-TR')} TL
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Bölüm 3: Tarih ve Saat ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {t('dateAndTime') || 'Tarih ve Saat'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  type="date"
                  value={appointmentDate instanceof Date ? appointmentDate.toISOString().split('T')[0] : appointmentDate}
                  onChange={(e) => setAppointmentDate(new Date(e.target.value))}
                  className="pl-10 h-11"
                />
              </div>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  type="time"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>
          </div>

          {/* ── Bölüm 4: Uyarılar ── */}
          {conflictWarnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-amber-800">{t('conflictWarning')}</p>
              </div>
              {conflictWarnings.map((cw, idx) => (
                <p key={idx} className="text-xs text-amber-700 ml-7">
                  {t('expertConflictDetail', { name: cw.expertName, time: cw.existingTime })}
                </p>
              ))}
            </div>
          )}

          {resourceConflicts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-red-800">{t('resourceConflict') || 'Kaynak Çakışması'}</p>
              </div>
              {resourceConflicts.map((rc, idx) => (
                <p key={idx} className="text-xs text-red-600 ml-7">{rc.message}</p>
              ))}
            </div>
          )}

          {/* ── Bölüm 5: Kaynak Atama ── */}
          {hasResources && conflictWarnings.length === 0 && allSpaces.length > 0 && serviceSelections.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <span className="text-sm font-medium text-purple-800">{t('spaceRequired')}</span>
                {assignedSpace && (
                  <span className="text-xs bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded-full ml-auto">
                    {t('autoAssigned')}
                  </span>
                )}
              </div>
              <Select
                value={assignedSpace?.id || 'none'}
                onValueChange={(val) => {
                  if (val === 'none') setAssignedSpace(null);
                  else {
                    const space = allSpaces.find(s => s.id === val);
                    setAssignedSpace(space ? { id: space.id, name: space.name, color: space.color } : null);
                  }
                }}
              >
                <SelectTrigger className="bg-white border-purple-200 text-sm h-10">
                  <SelectValue placeholder={t('selectSpace')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— {t('noSpace') || 'Alan seçme'} —</SelectItem>
                  {allSpaces.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color || '#6366F1' }} />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assignedEquipment.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-purple-600">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>{assignedEquipment.length} {t('equipment').toLowerCase()}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sticky Footer ── */}
        <DialogFooter className="flex-shrink-0 border-t border-slate-200 px-6 py-4 bg-slate-50/80">
          <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Sol: Özet bilgi */}
            <div className="flex-1 min-w-0">
              {serviceSelections.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="font-medium">{t('totalServices', { count: serviceSelections.length })}</span>
                    <span className="text-slate-400">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {totalDuration} dk
                    </span>
                    {totalPrice > 0 && (
                      <>
                        <span className="text-slate-400">·</span>
                        <span className="font-semibold text-slate-700">{totalPrice.toLocaleString('tr-TR')} TL</span>
                      </>
                    )}
                  </div>
                  {expertAssignmentSummary.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {expertAssignmentSummary.map((a, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.expertColor || '#059669' }} />
                          {a.expertName}
                          {i < expertAssignmentSummary.length - 1 && <span className="text-slate-300 ml-0.5">·</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sağ: Butonlar */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button type="button" variant="outline" onClick={handleClose} className="h-10 px-5">
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                onClick={handleCreateAppointment}
                disabled={isSubmitting || !canSubmit}
                className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting ? t('creating') : t('createAppointment')}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAppointmentModal;
