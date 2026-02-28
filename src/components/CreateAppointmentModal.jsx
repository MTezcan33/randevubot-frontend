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
import { Calendar as CalendarIcon, Clock, AlertTriangle, Check } from 'lucide-react';
import { createAdminNotification, sendAppointmentConfirmation } from '@/services/notificationService';

const CreateAppointmentModal = ({ isOpen, onClose, experts, currentDate, onAppointmentCreated }) => {
  const { company } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [customers, setCustomers] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [expertServiceIds, setExpertServiceIds] = useState(new Set());

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [selectedExpert, setSelectedExpert] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(currentDate);
  const [appointmentTime, setAppointmentTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(null);

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

  // Seçili uzmanın yapabildiği hizmetleri filtrele
  const availableServices = useMemo(() => {
    if (!selectedExpert || expertServiceIds.size === 0) return allServices;
    return allServices.filter(s => expertServiceIds.has(s.id));
  }, [allServices, selectedExpert, expertServiceIds]);

  useEffect(() => {
    if (isOpen && company) {
      const fetchDropdownData = async () => {
        const [customerRes, serviceRes] = await Promise.all([
          supabase.from('customers').select('*').eq('company_id', company.id),
          supabase.from('company_services').select('*').eq('company_id', company.id).eq('is_active', true),
        ]);
        if (customerRes.data) setCustomers(customerRes.data);
        if (serviceRes.data) setAllServices(serviceRes.data);
      };
      fetchDropdownData();
      setAppointmentDate(currentDate);
    }
  }, [isOpen, company, currentDate]);

  // Uzman seçildiğinde o uzmanın hizmetlerini çek
  useEffect(() => {
    if (selectedExpert && company) {
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
      };
      fetchExpertServices();
      // Uzman değiştiğinde, o uzmanın yapamadığı hizmetleri seçimden kaldır
      // (expert_services henüz yüklenmediği için bunu aşağıdaki effect'te yapıyoruz)
    } else {
      setExpertServiceIds(new Set());
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
    if (selectedExpert && appointmentTime && totalDuration > 0 && appointmentDate) {
      checkConflict();
    } else {
      setConflictWarning(null);
    }
  }, [selectedExpert, appointmentDate, appointmentTime, totalDuration]);

  const checkConflict = async () => {
    if (!selectedExpert || !appointmentTime || totalDuration <= 0) return;

    const dateStr = appointmentDate.toISOString().split('T')[0];

    // O tarihteki uzmanın tüm randevularını çek
    const { data: existingApps } = await supabase
      .from('appointments')
      .select('time, total_duration, company_services(duration)')
      .eq('expert_id', selectedExpert)
      .eq('date', dateStr)
      .neq('status', 'iptal');

    if (!existingApps || existingApps.length === 0) {
      setConflictWarning(null);
      return;
    }

    const newStart = timeToMinutes(appointmentTime);
    const newEnd = newStart + totalDuration;

    for (const app of existingApps) {
      const appStart = timeToMinutes(app.time);
      const appDuration = app.total_duration || app.company_services?.duration || 60;
      const appEnd = appStart + appDuration;

      // Çakışma kontrolü: iki aralık kesişiyor mu?
      if (newStart < appEnd && newEnd > appStart) {
        setConflictWarning({
          existingTime: `${app.time.substring(0, 5)} - ${formatMinutes(appEnd)}`,
        });
        return;
      }
    }
    setConflictWarning(null);
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

      if (!customerId || selectedServiceIds.length === 0 || !selectedExpert || !appointmentDate || !appointmentTime) {
        toast({ title: t('error'), description: t('allFieldsRequired'), variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      // Ana randevuyu oluştur
      const { data: newAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          company_id: company.id,
          customer_id: customerId,
          service_id: selectedServiceIds[0], // backward compat
          expert_id: selectedExpert,
          date: appointmentDate.toISOString().split('T')[0],
          time: appointmentTime,
          status: 'onaylandı',
          total_duration: totalDuration,
        })
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
          <Select onValueChange={setSelectedExpert} value={selectedExpert}>
            <SelectTrigger>
              <SelectValue placeholder={t('selectExpert')} />
            </SelectTrigger>
            <SelectContent>
              {experts.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

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
                          ? 'bg-pink-50 border border-pink-300 text-pink-800'
                          : 'bg-white border border-slate-200 text-slate-700 hover:border-pink-200'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                          ${isSelected ? 'bg-[#E91E8C] border-[#E91E8C]' : 'border-slate-300'}`}>
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
              <div className="flex items-center justify-between px-3 py-2 bg-pink-50 border border-pink-200 rounded-xl text-sm">
                <span className="text-pink-700 font-medium">
                  {t('selectedServices', { count: selectedServiceIds.length })}
                </span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-pink-600">
                    <Clock className="w-3.5 h-3.5" />
                    {totalDuration} dk
                  </span>
                  {totalPrice > 0 && (
                    <span className="text-pink-600 font-medium">
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
                <p className="text-sm font-medium text-amber-800">{t('conflictWarning')}</p>
                <p className="text-xs text-amber-600">
                  {t('conflictMessage', { time: conflictWarning.existingTime })}
                </p>
              </div>
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
            className="bg-[#E91E8C] hover:bg-[#C91A7A] text-white"
          >
            {isSubmitting ? t('creating') : t('createAppointment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAppointmentModal;
