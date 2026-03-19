import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
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
import { Calendar as CalendarIcon, Clock, AlertTriangle, Check, DoorOpen, Wrench, Info } from 'lucide-react';
import { createAdminNotification, sendAppointmentConfirmation } from '@/services/notificationService';
import { checkSlotAvailability, autoAssignResources } from '@/services/availabilityService';
import { setAppointmentResources } from '@/services/resourceService';

const CreateAppointmentModal = ({ isOpen, onClose, experts, currentDate, onAppointmentCreated }) => {
  const { company } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [customers, setCustomers] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [expertServiceIds, setExpertServiceIds] = useState(new Set());
  const [expertServicesLoaded, setExpertServicesLoaded] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [selectedExpert, setSelectedExpert] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(currentDate);
  const [appointmentTime, setAppointmentTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(null);

  // Kaynak atama state'leri
  const [assignedSpace, setAssignedSpace] = useState(null); // { id, name }
  const [assignedEquipment, setAssignedEquipment] = useState([]); // [{ id, name }]
  const [resourceConflicts, setResourceConflicts] = useState([]); // [{ type, name, message }]
  const [allSpaces, setAllSpaces] = useState([]);
  const [hasResources, setHasResources] = useState(false);

  // Yardımcı fonksiyonlar
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

  // Toplam süre ve fiyat hesapla
  const totalDuration = useMemo(() => {
    return selectedServiceIds.reduce((sum, sId) => {
      const svc = allServices.find(s => s.id === sId);
      return sum + (svc?.duration || 0);
    }, 0);
  }, [selectedServiceIds, allServices]);

  const totalPrice = useMemo(() => {
    return selectedServiceIds.reduce((sum, sId) => {
      const svc = allServices.find(s => s.id === sId);
      return sum + (svc?.price || 0);
    }, 0);
  }, [selectedServiceIds, allServices]);

  // Seçili hizmetlerden herhangi biri uzman gerektiriyor mu?
  const requiresExpert = useMemo(() => {
    if (selectedServiceIds.length === 0) return true; // Varsayılan: uzman gerekli
    return selectedServiceIds.some(sId => {
      const svc = allServices.find(s => s.id === sId);
      return svc?.requires_expert !== false; // requires_expert null veya true ise uzman gerekli
    });
  }, [selectedServiceIds, allServices]);

  // Seçili uzmanın yapabildiği hizmetleri filtrele
  const availableServices = useMemo(() => {
    if (!selectedExpert) return allServices;
    if (!expertServicesLoaded) return []; // Henüz yüklenmedi, boş göster
    if (expertServiceIds.size === 0) return []; // Uzmanın hiç hizmeti yok
    return allServices.filter(s => expertServiceIds.has(s.id));
  }, [allServices, selectedExpert, expertServiceIds, expertServicesLoaded]);

  useEffect(() => {
    if (isOpen && company) {
      const fetchDropdownData = async () => {
        const [customerRes, serviceRes, spacesRes] = await Promise.all([
          supabase.from('customers').select('*').eq('company_id', company.id),
          supabase.from('company_services').select('*').eq('company_id', company.id).eq('is_active', true),
          supabase.from('spaces').select('id, name, color').eq('company_id', company.id).eq('is_active', true).order('sort_order'),
        ]);
        if (customerRes.data) setCustomers(customerRes.data);
        if (serviceRes.data) setAllServices(serviceRes.data);
        if (spacesRes.data) {
          setAllSpaces(spacesRes.data);
          setHasResources(spacesRes.data.length > 0);
        }
      };
      fetchDropdownData();
      setAppointmentDate(currentDate);
    }
  }, [isOpen, company, currentDate]);

  // Uzman seçildiğinde o uzmanın hizmetlerini çek
  useEffect(() => {
    if (selectedExpert && company) {
      setExpertServicesLoaded(false); // Yükleme başladı
      const fetchExpertServices = async () => {
        const { data } = await supabase
          .from('expert_services')
          .select('service_id')
          .eq('expert_id', selectedExpert)
          .eq('company_id', company.id);
        if (data) {
          setExpertServiceIds(new Set(data.map(d => d.service_id)));
        } else {
          setExpertServiceIds(new Set());
        }
        setExpertServicesLoaded(true); // Yükleme bitti
      };
      fetchExpertServices();
    } else {
      setExpertServiceIds(new Set());
      setExpertServicesLoaded(false);
    }
  }, [selectedExpert, company]);

  // expert_services yüklendikten sonra seçili hizmetleri filtrele
  useEffect(() => {
    if (selectedExpert && expertServiceIds.size > 0) {
      setSelectedServiceIds(prev =>
        prev.filter(sId => expertServiceIds.has(sId))
      );
    }
  }, [expertServiceIds, selectedExpert]);

  // Çakışma kontrolü — tarih, saat veya süre değiştiğinde
  useEffect(() => {
    if (appointmentTime && totalDuration > 0 && appointmentDate && (selectedExpert || selectedServiceIds.length > 0)) {
      checkConflict();
    } else {
      setConflictWarning(null);
      setResourceConflicts([]);
      setAssignedSpace(null);
      setAssignedEquipment([]);
    }
  }, [selectedExpert, appointmentDate, appointmentTime, totalDuration, selectedServiceIds]);

  const checkConflict = async () => {
    if (!appointmentTime || totalDuration <= 0) return;

    const dateStr = appointmentDate.toISOString().split('T')[0];
    const newStart = timeToMinutes(appointmentTime);
    const newEnd = newStart + totalDuration;

    // Öğle molası kontrolü
    if (selectedExpert) {
      const expert = experts?.find(e => e.id === selectedExpert);
      if (expert?.general_lunch_start_time && expert?.general_lunch_end_time) {
        const lunchStart = timeToMinutes(expert.general_lunch_start_time);
        const lunchEnd = timeToMinutes(expert.general_lunch_end_time);
        if (newStart < lunchEnd && newEnd > lunchStart) {
          setConflictWarning({
            existingTime: `${expert.general_lunch_start_time.substring(0, 5)} - ${expert.general_lunch_end_time.substring(0, 5)}`,
            isLunchBreak: true,
          });
          return;
        }
      }
    }

    // Uzman çakışma kontrolü (mevcut logic)
    if (selectedExpert) {
      const { data: existingApps } = await supabase
        .from('appointments')
        .select('time, total_duration, company_services(duration)')
        .eq('expert_id', selectedExpert)
        .eq('date', dateStr)
        .neq('status', 'iptal');

      if (existingApps) {
        for (const app of existingApps) {
          const appStart = timeToMinutes(app.time);
          const appDuration = app.total_duration || app.company_services?.duration || 60;
          const appEnd = appStart + appDuration;
          if (newStart < appEnd && newEnd > appStart) {
            setConflictWarning({
              existingTime: `${app.time.substring(0, 5)} - ${formatMinutes(appEnd)}`,
            });
            // Uzman çakışması varsa kaynak kontrolüne devam etme
            return;
          }
        }
      }
    }

    setConflictWarning(null);

    // Kaynak otomatik atama (alanlar tanımlıysa ve hizmet seçiliyse)
    if (hasResources && selectedServiceIds.length > 0 && company) {
      try {
        const serviceId = selectedServiceIds[0]; // İlk hizmetin kaynaklarını kontrol et
        const result = await autoAssignResources(
          company.id, dateStr, appointmentTime, totalDuration,
          selectedExpert || null, serviceId
        );

        if (result.error) {
          setResourceConflicts([{ type: 'space', name: '', message: result.error }]);
          setAssignedSpace(null);
          setAssignedEquipment([]);
        } else {
          setResourceConflicts([]);
          // Atanan alanın adını bul
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
    } else {
      setResourceConflicts([]);
      setAssignedSpace(null);
      setAssignedEquipment([]);
    }
  };

  // Hizmet seçim toggle
  const toggleServiceSelection = (serviceId) => {
    setSelectedServiceIds(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handleCreateAppointment = async () => {
    // Enforcement kontrolü — zorunlu modda alan/ekipman atanmamışsa engelle
    const enforcement = company?.resource_enforcement || 'optional';
    if (enforcement === 'mandatory' && hasResources && !assignedSpace) {
      toast({ title: t('error'), description: t('resourceConflict') + ': ' + t('noAvailableSpace'), variant: 'destructive' });
      return;
    }
    if (enforcement === 'recommended' && hasResources && !assignedSpace) {
      // Sadece uyarı — devam etmesine izin ver (toast ile bilgilendir)
      toast({ title: t('resourceConflict'), description: t('noAvailableSpace'), variant: 'default' });
    }

    setIsSubmitting(true);
    let customerId = selectedCustomer;

    try {
      if (selectedCustomer === 'new') {
        if (!newCustomerName || !newCustomerPhone) {
          toast({ title: t('error'), description: t('newCustomerRequired'), variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            company_id: company.id,
            name: newCustomerName,
            phone: newCustomerPhone,
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // Uzman gerektiren hizmetler seçilmişse uzman zorunlu, değilse opsiyonel
      if (!customerId || selectedServiceIds.length === 0 || !appointmentDate || !appointmentTime) {
        toast({ title: t('error'), description: t('allFieldsRequired'), variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }
      if (requiresExpert && !selectedExpert) {
        toast({ title: t('error'), description: t('allFieldsRequired'), variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      // Ana randevuyu oluştur
      const appointmentPayload = {
        company_id: company.id,
        customer_id: customerId,
        service_id: selectedServiceIds[0], // backward compat
        date: appointmentDate.toISOString().split('T')[0],
        time: appointmentTime,
        status: 'onaylandı',
        total_duration: totalDuration,
      };

      // Uzman seçildiyse ekle (self-service hizmetlerde uzman opsiyonel)
      if (selectedExpert) {
        appointmentPayload.expert_id = selectedExpert;
      }

      // Otomatik atanan alan varsa ekle
      if (assignedSpace?.id) {
        appointmentPayload.space_id = assignedSpace.id;
      }

      const { data: newAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert(appointmentPayload)
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // appointment_services junction kayıtlarını oluştur
      if (selectedServiceIds.length > 0) {
        const junctionInserts = selectedServiceIds.map(sId => ({
          appointment_id: newAppointment.id,
          service_id: sId,
        }));
        await supabase.from('appointment_services').insert(junctionInserts);
      }

      // appointment_resources — alan + ekipman kayıtlarını oluştur
      const resources = [];
      if (assignedSpace?.id) {
        resources.push({ resource_type: 'space', resource_id: assignedSpace.id });
      }
      if (assignedEquipment.length > 0) {
        assignedEquipment.forEach(eqId => {
          resources.push({ resource_type: 'equipment', resource_id: eqId });
        });
      }
      if (resources.length > 0) {
        await setAppointmentResources(newAppointment.id, resources);
      }

      // Bildirim ve WhatsApp
      const customer = customers.find(c => c.id === customerId);
      const serviceNames = selectedServiceIds
        .map(sId => allServices.find(s => s.id === sId)?.description)
        .filter(Boolean)
        .join(', ');
      const expert = experts.find(e => e.id === selectedExpert);
      const dateStr = appointmentDate.toISOString().split('T')[0];

      // Admin bildirimi oluştur
      await createAdminNotification(
        company.id,
        'new_appointment',
        t('notifNewAppointment'),
        `${customer?.name || ''} — ${dateStr} ${appointmentTime} — ${serviceNames}`,
        newAppointment?.id
      );

      // Müşteriye WhatsApp onay mesajı gönder
      if (customer?.phone) {
        await sendAppointmentConfirmation({
          company_id: company.id,
          salon_name: company.name,
          customer_name: customer.name,
          customer_phone: customer.phone,
          date: dateStr,
          time: appointmentTime,
          service_name: serviceNames,
          expert_name: expert?.name || '',
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
    setSelectedServiceIds([]);
    setSelectedExpert('');
    setAppointmentTime('');
    setConflictWarning(null);
    setExpertServiceIds(new Set());
    setExpertServicesLoaded(false);
    setAssignedSpace(null);
    setAssignedEquipment([]);
    setResourceConflicts([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('newAppointment')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Müşteri seçimi */}
          <Select onValueChange={setSelectedCustomer} value={selectedCustomer}>
            <SelectTrigger>
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
            <>
              <Input
                placeholder={t('newCustomerNamePlaceholder')}
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
              />
              <Input
                placeholder={t('newCustomerPhonePlaceholder')}
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
              />
            </>
          )}

          {/* Uzman seçimi */}
          <div>
            <Select onValueChange={(val) => setSelectedExpert(val === 'none' ? '' : val)} value={selectedExpert || 'none'}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectExpert')} />
              </SelectTrigger>
              <SelectContent>
                {!requiresExpert && (
                  <SelectItem value="none">— {t('selfService') || 'Self Servis'} —</SelectItem>
                )}
                {experts.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!requiresExpert && !selectedExpert && (
              <p className="text-xs text-amber-600 mt-1">{t('selfService')}</p>
            )}
          </div>

          {/* Çoklu hizmet seçimi */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">{t('selectServices')}</label>
            <div className="max-h-[200px] overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50/50">
              {availableServices.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-3">
                  {selectedExpert ? t('noServicesYet') : t('selectExpert')}
                </p>
              ) : (
                availableServices.map(service => {
                  const isSelected = selectedServiceIds.includes(service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => toggleServiceSelection(service.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all
                        ${isSelected
                          ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                          : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-200'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                          ${isSelected ? 'bg-emerald-700 border-emerald-700' : 'border-slate-300'}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="font-medium text-left">{service.description}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-xs text-slate-400">{service.duration} dk</span>
                        {service.price != null && (
                          <span className="text-xs text-slate-500">{Number(service.price).toLocaleString('tr-TR')} TL</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Toplam süre ve fiyat özeti */}
            {selectedServiceIds.length > 0 && (
              <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
                <span className="text-emerald-700 font-medium">
                  {t('selectedServices', { count: selectedServiceIds.length })}
                </span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <Clock className="w-3.5 h-3.5" />
                    {totalDuration} dk
                  </span>
                  {totalPrice > 0 && (
                    <span className="text-emerald-600 font-medium">
                      {totalPrice.toLocaleString('tr-TR')} TL
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tarih ve Saat */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                type="date"
                value={appointmentDate.toISOString().split('T')[0]}
                onChange={(e) => setAppointmentDate(new Date(e.target.value))}
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Çakışma uyarısı */}
          {conflictWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {conflictWarning.isLunchBreak ? (t('lunchBreakWarning') || 'Öğle Molası Çakışması') : t('conflictWarning')}
                </p>
                <p className="text-xs text-amber-600">
                  {conflictWarning.isLunchBreak
                    ? (t('lunchBreakMessage', { time: conflictWarning.existingTime }) || `Uzmanın öğle molası: ${conflictWarning.existingTime}`)
                    : t('conflictMessage', { time: conflictWarning.existingTime })}
                </p>
              </div>
            </div>
          )}

          {/* Kaynak çakışma uyarısı */}
          {resourceConflicts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">{t('resourceConflict') || 'Kaynak Çakışması'}</p>
                {resourceConflicts.map((rc, idx) => (
                  <p key={idx} className="text-xs text-red-600">{rc.message}</p>
                ))}
              </div>
            </div>
          )}

          {/* Kaynak Atama bölümü — alanlar tanımlıysa ve çakışma yoksa göster */}
          {hasResources && !conflictWarning && allSpaces.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-2">
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
                  if (val === 'none') {
                    setAssignedSpace(null);
                  } else {
                    const space = allSpaces.find(s => s.id === val);
                    setAssignedSpace(space ? { id: space.id, name: space.name, color: space.color } : null);
                  }
                }}
              >
                <SelectTrigger className="bg-white border-purple-200 text-sm h-9">
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
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">{t('cancel')}</Button>
          </DialogClose>
          <Button
            type="submit"
            onClick={handleCreateAppointment}
            disabled={isSubmitting}
            className="bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            {isSubmitting ? t('creating') : t('createAppointment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAppointmentModal;
