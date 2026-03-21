import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Plus, ChevronLeft, ChevronRight, Trash2, GripVertical, Save, X, ArrowRightLeft } from 'lucide-react';
import { createIncomeFromAppointment } from '../../services/accountingService';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Reorder } from 'framer-motion';
import PaymentCollectionModal from '@/components/PaymentCollectionModal';
import CreateAppointmentModal from '@/components/CreateAppointmentModal';

const ROW_HEIGHT = 20; // px - her 10 dakika için
const PIXELS_PER_MINUTE = ROW_HEIGHT / 10;

const AppointmentCard = ({ appointment, t, expertColor, overrideStartMinutes, overrideDuration, overrideServiceNames, disableHover }) => {
  const timeToMinutes = (time) => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const startMinutes = overrideStartMinutes ?? timeToMinutes(appointment.time);
  const duration = overrideDuration ?? (appointment.total_duration || appointment.company_services?.duration || 60);
  const endMinutes = startMinutes + duration;

  const formatTime = (minutes) => {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const displayTime = formatTime(startMinutes).substring(0, 5);
  const displayEndTime = formatTime(endMinutes).substring(0, 5);

  // Hizmet isimlerini göster (override varsa onu kullan)
  const serviceNames = overrideServiceNames
    || (appointment.appointment_services?.length > 0
      ? appointment.appointment_services.map(as => as.company_services?.description).filter(Boolean).join(', ')
      : appointment.company_services?.description || t('unknownService'));

  // Renk tonlarını hesapla
  const bgColor = expertColor ? `${expertColor}18` : '#e0f2fe';
  const borderColor = expertColor || '#0ea5e9';

  return (
    <div
      className={`rounded-lg text-[10px] shadow-sm ${disableHover ? '' : 'hover:shadow-lg'} cursor-grab active:cursor-grabbing transition-shadow duration-200 text-slate-800 overflow-hidden h-full`}
      style={{
        backgroundColor: bgColor,
        borderLeft: `4px solid ${borderColor}`,
        boxShadow: `0 1px 3px ${borderColor}20`,
      }}
    >
      {/* Üst şerit — saat bilgisi */}
      <div
        className="flex items-center justify-between px-2 py-0.5"
        style={{ backgroundColor: `${borderColor}15` }}
      >
        <p className="font-bold text-[10px] leading-tight text-slate-700">{`${displayTime} - ${displayEndTime}`}</p>
        {appointment.payment_status && appointment.payment_status !== 'unpaid' && (
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            appointment.payment_status === 'paid' ? 'bg-emerald-400' :
            appointment.payment_status === 'partial' ? 'bg-amber-400' :
            appointment.payment_status === 'free' ? 'bg-stone-400' : ''
          }`} title={appointment.payment_status === 'paid' ? t('paid') : appointment.payment_status === 'partial' ? t('partiallyPaid') : ''} />
        )}
      </div>
      {/* İçerik */}
      <div className="px-2 py-1">
        <p className="font-bold text-[11px] truncate leading-tight">{appointment.customers?.name?.toUpperCase() || t('unknownCustomer')}</p>
        <p className="text-[9px] truncate text-slate-500 leading-tight mt-0.5">{serviceNames}</p>
      </div>
    </div>
  );
};

const TimeIndicator = ({ companyTimezone }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const topPosition = useMemo(() => {
    try {
      const now = new Date(currentTime.toLocaleString('en-US', { timeZone: companyTimezone }));
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const totalMinutes = hours * 60 + minutes;
      const startOfDayMinutes = 5 * 60; // 05:00
      const minutesFromStart = totalMinutes - startOfDayMinutes;

      if (minutesFromStart < 0 || minutesFromStart > 19 * 60) return -1; // 05:00 - 24:00

      return minutesFromStart * PIXELS_PER_MINUTE;
    } catch (e) {
      console.error("Invalid timezone:", companyTimezone);
      return -1;
    }
  }, [currentTime, companyTimezone]);

  if (topPosition === -1) return null;

  const currentTimeString = currentTime.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: companyTimezone
  });

  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${topPosition}px` }}>
      <div className="flex items-center">
        <div className="w-14 bg-emerald-600 flex items-center justify-center -ml-0.5">
          <span className="text-white text-[9px] font-semibold">{currentTimeString}</span>
        </div>
        <div className="flex-grow h-[2px] bg-emerald-600 shadow-sm"></div>
      </div>
    </div>
  );
};

const MiniCalendar = ({ currentDate, onDateChange }) => {
  const [viewDate, setViewDate] = useState(new Date(currentDate));
  const { t, i18n } = useTranslation();

  const getLocale = () => {
    if (i18n.language === 'tr') return 'tr-TR';
    if (i18n.language === 'ru') return 'ru-RU';
    return 'en-US';
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(viewDate);
  const days = [];

  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const weekDays = [
    t('sundayShort'),
    t('mondayShort'),
    t('tuesdayShort'),
    t('wednesdayShort'),
    t('thursdayShort'),
    t('fridayShort'),
    t('saturdayShort')
  ];

  const changeMonth = (amount) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + amount);
    setViewDate(newDate);
  };

  const selectDate = (day) => {
    if (!day) return;
    const newDate = new Date(viewDate);
    newDate.setDate(day);
    onDateChange(newDate);
  };

  const isToday = (day) => {
    if (!day) return false;
    const today = new Date();
    return day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();
  };

  const isSelected = (day) => {
    if (!day) return false;
    return day === currentDate.getDate() &&
      month === currentDate.getMonth() &&
      year === currentDate.getFullYear();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-2 border">
      <div className="flex items-center justify-between mb-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => changeMonth(-1)}
        >
          <ChevronLeft className="w-3 h-3" />
        </Button>
        <span className="text-xs font-semibold">
          {viewDate.toLocaleDateString(getLocale(), { month: 'short', year: 'numeric' })}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => changeMonth(1)}
        >
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {weekDays.map(day => (
          <div key={day} className="text-center text-[9px] font-semibold text-gray-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, index) => (
          <button
            key={index}
            onClick={() => selectDate(day)}
            disabled={!day}
            className={`
                            h-6 w-6 text-[10px] rounded flex items-center justify-center
                            ${!day ? 'invisible' : ''}
                            ${isSelected(day) ? 'bg-emerald-600 text-white font-bold' : ''}
                            ${isToday(day) && !isSelected(day) ? 'bg-emerald-100 text-emerald-700 font-semibold' : ''}
                            ${!isSelected(day) && !isToday(day) ? 'hover:bg-gray-100' : ''}
                            transition-colors
                        `}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
};

const AppointmentsPage = () => {
  const { company, staff } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const experts = staff.filter(s => s.role === 'Uzman');
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [previousStatus, setPreviousStatus] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAppointmentId, setPaymentAppointmentId] = useState(null);
  const [reorderApp, setReorderApp] = useState(null); // Sıralama paneli için seçili randevu
  const [reorderServices, setReorderServices] = useState([]); // Sürüklenebilir hizmet listesi
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  // ── Sürükle-Bırak (Expert Taşıma) State'leri ──
  const [dragData, setDragData] = useState(null); // { appointmentId, serviceId, currentExpertId, blockKey }
  const [dragOverExpertId, setDragOverExpertId] = useState(null); // Üzerine gelinen uzman
  const [expertServicesMap, setExpertServicesMap] = useState(new Map()); // Map<expertId, Set<serviceId>>
  const companyTimezone = company?.timezone || 'UTC';

  const getLocale = () => {
    if (i18n.language === 'tr') return 'tr-TR';
    if (i18n.language === 'ru') return 'ru-RU';
    return 'en-US';
  };

  useEffect(() => {
    if (company) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [company, currentDate]);

  useEffect(() => {
    const channel = supabase.channel('public:appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, payload => {
        fetchData();
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel);
    }
  }, [company, currentDate]);


  const fetchData = async () => {
    if (!company) return;
    setLoading(true);
    await Promise.all([fetchAppointments(), fetchServices(), fetchCustomers(), fetchExpertServices()]);
    setLoading(false);
  };

  // Uzman-hizmet ilişkilerini yükle (drag-drop doğrulaması için)
  const fetchExpertServices = async () => {
    if (!company) return;
    try {
      const { data, error } = await supabase
        .from('expert_services')
        .select('expert_id, service_id')
        .eq('company_id', company.id);
      if (error) throw error;
      const map = new Map();
      (data || []).forEach(es => {
        if (!map.has(es.expert_id)) map.set(es.expert_id, new Set());
        map.get(es.expert_id).add(es.service_id);
      });
      setExpertServicesMap(map);
    } catch (err) {
      console.error('Expert services fetch error:', err);
    }
  };

  const fetchAppointments = async () => {
    const dateString = currentDate.toISOString().split('T')[0];
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`*, company_services(duration, description, price), customers(id, name, phone), company_users(name, color), appointment_services(id, service_id, expert_id, company_services(id, description, duration, price))`)
        .eq('company_id', company.id)
        .eq('date', dateString)
        .order('id', { foreignTable: 'appointment_services', ascending: true });

      if (error) throw error;
      // Client-side sıralama — foreignTable ordering güvenilir olmayabilir
      (data || []).forEach(app => {
        if (app.appointment_services) {
          app.appointment_services.sort((a, b) => a.id - b.id);
        }
      });
      setAppointments(data || []);
    } catch (error) {
      toast({ title: t('error'), description: t('fetchAppointmentsError', { error: error.message }), variant: "destructive" });
    }
  };

  const fetchServices = async () => {
    if (!company) return;
    try {
      const { data, error } = await supabase.from('company_services').select('*, expert:expert_id(name)').eq('company_id', company.id).eq('is_active', true);
      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      toast({ title: t('error'), description: t('serviceFetchError'), variant: "destructive" });
    }
  };

  const fetchCustomers = async () => {
    if (!company) return;
    try {
      const { data, error } = await supabase.from('customers').select('id, name, phone').eq('company_id', company.id);
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      toast({ title: t('error'), description: t('customerFetchError'), variant: "destructive" });
    }
  };

  const upsertCustomer = async (name, phone) => {
    if (!name || !phone) return null;
    try {
      const { data, error } = await supabase.from('customers').upsert({ company_id: company.id, phone: phone, name: name.toUpperCase() }, { onConflict: 'company_id, phone' }).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Müşteri ekleme/güncelleme hatası:", error.message);
      toast({ title: t('error'), description: t('customerSaveError', { error: error.message }), variant: "destructive" });
      return null;
    }
  };

  const handleUpdateAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      const { id, service_id, expert_id, date, time, status, customer_id } = selectedAppointment;
      const { error } = await supabase.from('appointments').update({ service_id, expert_id, date, time, status, customer_id }).eq('id', id);
      if (error) throw error;

      // Durum yeni 'onaylandı' olduysa otomatik gelir kaydı oluştur
      if (status === 'onaylandı' && previousStatus !== 'onaylandı') {
        // Çoklu hizmet varsa toplam fiyat, yoksa tek hizmet fiyatı
        let totalAmount = 0;
        let descriptionText = '';
        if (selectedAppointment.appointment_services?.length > 0) {
          totalAmount = selectedAppointment.appointment_services.reduce((sum, as) =>
            sum + (as.company_services?.price || 0), 0);
          descriptionText = selectedAppointment.appointment_services
            .map(as => as.company_services?.description).filter(Boolean).join(' + ');
        } else {
          const service = services.find(s => s.id === service_id);
          totalAmount = service?.price || 0;
          descriptionText = service?.description || '';
        }
        if (totalAmount > 0) {
          await createIncomeFromAppointment({
            companyId: company.id,
            appointmentId: id,
            amount: totalAmount,
            paymentMethod: 'cash',
            description: descriptionText ? `${descriptionText} - Randevu geliri` : 'Randevu geliri',
          });
        }
      }

      toast({ title: t('success'), description: t('updateAppointmentSuccess') });
      setIsDetailModalOpen(false);
      setSelectedAppointment(null);
      setPreviousStatus(null);
    } catch (error) {
      toast({ title: t('error'), description: t('updateAppointmentError', { error: error.message }), variant: "destructive" });
    }
  };



  const handleDeleteAppointment = async () => {
    if (!selectedAppointment) return;
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', selectedAppointment.id);
      if (error) throw error;
      toast({ title: t('success'), description: t('deleteAppointmentSuccess') });
      setIsDetailModalOpen(false);
      setSelectedAppointment(null);
    } catch (error) {
      toast({ title: t('error'), description: t('deleteAppointmentError', { error: error.message }), variant: "destructive" });
    }
  };


  // 05:00 - 24:00 arası, her 10 dakikada bir (114 slot)
  const timeSlots = Array.from({ length: 115 }, (_, i) => {
    const totalMinutes = 5 * 60 + i * 10;
    const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const m = (totalMinutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  });

  // ── Sürükle-Bırak: Uzmanlar Arası Taşıma ──
  const handleDragStart = (e, appointmentId, serviceId, currentExpertId, blockKey) => {
    const data = { appointmentId, serviceId, currentExpertId, blockKey };
    setDragData(data);
    e.dataTransfer.setData('text/plain', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'move';
    // Sürüklenen bloğu yarı saydam yap
    if (e.target) {
      setTimeout(() => { e.target.style.opacity = '0.4'; }, 0);
    }
  };

  const handleDragEnd = (e) => {
    setDragData(null);
    setDragOverExpertId(null);
    if (e.target) e.target.style.opacity = '1';
  };

  const handleDragOver = (e, expertId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverExpertId(expertId);
  };

  const handleDragLeave = (e, expertId) => {
    // Sadece gerçek ayrılma durumunda temizle (child elementlerden ayrılmayı ignore et)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverExpertId(null);
    }
  };

  const handleDrop = async (e, targetExpertId) => {
    e.preventDefault();
    setDragOverExpertId(null);
    setDragData(null);

    let data;
    try {
      data = JSON.parse(e.dataTransfer.getData('text/plain'));
    } catch { return; }

    const { appointmentId, serviceId, currentExpertId } = data;

    // Aynı uzmana bırakıldıysa bir şey yapma
    if (targetExpertId === currentExpertId) return;

    // Hedef uzman bu hizmeti yapabiliyor mu kontrol et
    const targetExpertServices = expertServicesMap.get(targetExpertId);
    if (targetExpertServices && !targetExpertServices.has(serviceId)) {
      const targetExpert = experts.find(ex => ex.id === targetExpertId);
      toast({
        title: t('error'),
        description: t('expertCannotDoService', { expert: targetExpert?.name || 'Uzman' }),
        variant: 'destructive'
      });
      return;
    }

    try {
      // appointment_services tablosunda expert_id güncelle
      const { error } = await supabase
        .from('appointment_services')
        .update({ expert_id: targetExpertId })
        .eq('appointment_id', appointmentId)
        .eq('service_id', serviceId);

      if (error) throw error;

      // Local state güncelle — sadece ilgili hizmetin expert_id'si değişir, sıralama aynı kalır
      setAppointments(prev => prev.map(app => {
        if (app.id !== appointmentId) return app; // Diğer randevulara dokunma

        const updatedServices = app.appointment_services?.map(as =>
          as.service_id === serviceId ? { ...as, expert_id: targetExpertId } : as
        ) || [];

        // İlk expert-requiring hizmetin uzmanını primary expert yap
        const primaryExpert = updatedServices.find(as => as.expert_id)?.expert_id || app.expert_id;

        return {
          ...app,
          expert_id: primaryExpert,
          appointment_services: updatedServices,
        };
      }));

      // Parent appointment expert_id'yi DB'de de güncelle (arka planda)
      const app = appointments.find(a => a.id === appointmentId);
      if (app) {
        const updatedServices = app.appointment_services?.map(as =>
          as.service_id === serviceId ? { ...as, expert_id: targetExpertId } : as
        ) || [];
        const primaryExpert = updatedServices.find(as => as.expert_id)?.expert_id;
        if (primaryExpert) {
          supabase
            .from('appointments')
            .update({ expert_id: primaryExpert })
            .eq('id', appointmentId)
            .then(); // Arka planda çalışsın, UI beklemesin
        }
      }

      const targetExpert = experts.find(ex => ex.id === targetExpertId);
      toast({
        title: t('success'),
        description: t('movedToExpert', { expert: targetExpert?.name || 'Uzman' })
      });
    } catch (err) {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    }
  };

  // Hedef uzman hizmeti yapabilir mi? (drag feedback için)
  const canExpertDoService = (expertId, serviceId) => {
    const services = expertServicesMap.get(expertId);
    if (!services) return true; // expert_services kaydı yoksa izin ver (eski veri)
    return services.has(serviceId);
  };

  // ── Hizmet Sıralama Paneli ──
  const openReorderPanel = (appointment) => {
    if (!appointment.appointment_services?.length || appointment.appointment_services.length < 2) {
      // Tek hizmetli randevularda direkt detay aç
      openAppointmentDetails(appointment);
      return;
    }
    setReorderApp(appointment);
    setReorderServices([...appointment.appointment_services]);
  };

  const closeReorderPanel = () => {
    setReorderApp(null);
    setReorderServices([]);
  };

  const saveServiceOrder = async () => {
    if (!reorderApp || reorderServices.length === 0) return;
    setIsSavingOrder(true);
    try {
      // Mevcut appointment_services kayıtlarını sil ve yeni sırayla ekle
      await supabase.from('appointment_services').delete().eq('appointment_id', reorderApp.id);
      const inserts = reorderServices.map((as) => ({
        appointment_id: reorderApp.id,
        service_id: as.service_id,
        expert_id: as.expert_id || null,
      }));
      const { data: insertedData, error } = await supabase
        .from('appointment_services')
        .insert(inserts)
        .select('id, service_id, expert_id, company_services(id, description, duration, price)');
      if (error) throw error;

      // Local state güncelle — tam re-fetch yerine sadece bu randevunun servislerini güncelle
      setAppointments(prev => prev.map(app => {
        if (app.id !== reorderApp.id) return app;
        return {
          ...app,
          appointment_services: (insertedData || []).sort((a, b) => a.id - b.id)
        };
      }));

      toast({ title: t('success'), description: t('orderSaved') || 'Sıralama kaydedildi' });
      closeReorderPanel();
    } catch (err) {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    } finally {
      setIsSavingOrder(false);
    }
  };

  const openAppointmentDetails = (appointment) => {
    setSelectedAppointment({ ...appointment, customer_name: appointment.customers.name, customer_phone: appointment.customers.phone });
    setPreviousStatus(appointment.status);
    setIsDetailModalOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-[calc(100vh-6rem)]"><div className="w-12 h-12 rounded-full border-4 border-emerald-600/30 border-t-emerald-700 animate-spin"></div></div>
  }

  return (
    <>
      <Helmet>
        <title>{t('appointmentsTitle')} | RandevuBot</title>
        <meta name="description" content={t('appointmentsSubtitle')} />
      </Helmet>

      <div className="flex gap-3 h-[calc(100vh-6rem)]">
        {/* Sol Panel - Mini Takvim ve Randevu Oluştur */}
        <div className="w-52 flex-shrink-0 space-y-3">
          <MiniCalendar currentDate={currentDate} onDateChange={setCurrentDate} />

          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full bg-gradient-to-r from-emerald-800 to-teal-700 hover:opacity-90 text-white border-0"
            size="lg"
          >
            <Plus className="w-4 h-4 mr-2" /> {t('createAppointment')}
          </Button>

          <div className="bg-white rounded-lg shadow-sm p-2 border">
            <h3 className="text-[10px] font-semibold mb-1 text-gray-600">{t('selectedDate')}</h3>
            <p className="text-sm font-bold text-emerald-700 leading-tight">
              {currentDate.toLocaleDateString(getLocale(), {
                day: 'numeric',
                month: 'long'
              })}
            </p>
            <p className="text-[10px] text-gray-500">
              {currentDate.toLocaleDateString(getLocale(), {
                weekday: 'long'
              })}
            </p>
          </div>
        </div>

        {/* Sağ Panel - Randevu Takvimi */}
        <div className="flex-grow bg-white rounded-lg shadow-sm overflow-hidden border">
          <div className="h-full overflow-auto">
            <div className="flex">
              {/* Saat Sütunu */}
              <div className="w-14 flex-shrink-0 bg-gray-50 border-r sticky left-0 z-10">
                <div className="h-8 border-b bg-white"></div>
                {timeSlots.map((time, index) => (
                  <div
                    key={time}
                    style={{ height: `${ROW_HEIGHT}px` }}
                    className="text-right pr-1 text-[10px] text-slate-500 border-t flex items-start pt-0.5"
                  >
                    {index % 6 === 0 ? time : ''}
                  </div>
                ))}
              </div>

              {/* Uzman Sütunları */}
              <div className="flex-grow grid relative" style={{ gridTemplateColumns: `repeat(${Math.max(1, experts.length)}, minmax(120px, 1fr))` }}>
                <TimeIndicator companyTimezone={companyTimezone} />

                {experts.length > 0 ? experts.map(expert => {
                  const isDragTarget = dragOverExpertId === expert.id;
                  const isValidDrop = dragData && dragData.currentExpertId !== expert.id;

                  return (
                  <div
                    key={expert.id}
                    className={`border-l relative transition-all duration-300 ${
                      isDragTarget && isValidDrop
                        ? 'bg-emerald-50/50 ring-2 ring-inset ring-emerald-300/60'
                        : ''
                    }`}
                    onDragOver={(e) => handleDragOver(e, expert.id)}
                    onDragLeave={(e) => handleDragLeave(e, expert.id)}
                    onDrop={(e) => handleDrop(e, expert.id)}
                  >
                    {/* Uzman Başlığı */}
                    <div
                      className={`h-8 sticky top-0 backdrop-blur-sm z-30 px-2 border-b flex items-center justify-center transition-all duration-300 ${
                        isDragTarget && isValidDrop
                          ? 'bg-emerald-500 shadow-md'
                          : 'bg-white/95'
                      }`}
                      style={{ borderBottomColor: isDragTarget && isValidDrop ? '#10b981' : (expert.color || '#e2e8f0') }}
                    >
                      {isDragTarget && isValidDrop ? (
                        <div className="flex items-center gap-1.5">
                          <ArrowRightLeft className="w-3.5 h-3.5 text-white flex-shrink-0 animate-pulse" />
                          <p className="font-semibold text-xs text-white truncate">
                            {expert.name.toUpperCase()}
                          </p>
                        </div>
                      ) : (
                        <p className="font-medium text-xs truncate" style={{ color: expert.color || '#1e293b' }}>
                          {expert.name.toUpperCase()}
                        </p>
                      )}
                    </div>

                    {/* Zaman Grid'i */}
                    <div className="relative" style={{ height: `${timeSlots.length * ROW_HEIGHT}px` }}>
                      {timeSlots.map((time, index) => (
                        <div
                          key={index}
                          style={{ height: `${ROW_HEIGHT}px` }}
                          className={`border-t ${index % 6 === 0 ? 'border-slate-300' : 'border-slate-100'}`}
                        />
                      ))}

                      {/* Drop hedefi göstergesi */}
                      {isDragTarget && isValidDrop && (
                        <div className="absolute inset-0 pointer-events-none z-5">
                          <div className="absolute inset-x-1 inset-y-0 border-2 border-dashed border-emerald-400/60 rounded-xl bg-gradient-to-b from-emerald-50/40 via-transparent to-emerald-50/40" />
                        </div>
                      )}

                      {/* Randevular — her hizmet ayrı blok olarak gösterilir */}
                      {(() => {
                        // Bu uzmanla ilgili randevuları bul
                        const relevantApps = appointments.filter(app => {
                          if (app.expert_id === expert.id) return true;
                          if (app.appointment_services?.some(as => as.expert_id === expert.id)) return true;
                          return false;
                        });

                        // Her randevu için, bu uzmanın hizmetlerini ayrı bloklar olarak oluştur
                        const blocks = [];
                        relevantApps.forEach(app => {
                          const [hours, minutes] = app.time.split(':').map(Number);
                          const appStartMinutes = hours * 60 + minutes;
                          const hasPerServiceExperts = app.appointment_services?.some(as => as.expert_id);

                          if (hasPerServiceExperts && app.appointment_services?.length > 0) {
                            // Kümülatif süre ile her hizmetin gerçek başlangıç zamanını hesapla
                            let cumulative = 0;
                            app.appointment_services.forEach((as, idx) => {
                              const dur = as.company_services?.duration || 0;
                              if (as.expert_id === expert.id) {
                                blocks.push({
                                  app,
                                  startMinutes: appStartMinutes + cumulative,
                                  duration: dur,
                                  serviceName: as.company_services?.description || '',
                                  serviceId: as.service_id,
                                  blockKey: app.id + '-svc-' + idx,
                                });
                              }
                              cumulative += dur;
                            });
                          } else {
                            // Eski tip randevu (tek uzman) — tek blok olarak göster
                            blocks.push({
                              app,
                              startMinutes: appStartMinutes,
                              duration: app.total_duration || app.company_services?.duration || 30,
                              serviceName: null,
                              serviceId: app.service_id,
                              blockKey: app.id,
                            });
                          }
                        });

                        return blocks.map(block => {
                          const topPosition = (block.startMinutes - 5 * 60) * PIXELS_PER_MINUTE;
                          const height = block.duration * PIXELS_PER_MINUTE;
                          const isDragging = dragData?.blockKey === block.blockKey;
                          const isAnyDragging = !!dragData; // Herhangi bir blok sürükleniyor mu?

                          return (
                            <div
                              key={block.blockKey}
                              className={`absolute w-full px-0.5 z-10 ${
                                isDragging
                                  ? 'opacity-30 scale-95 transition-all duration-200'
                                  : isAnyDragging
                                  ? 'pointer-events-none' // Sürükleme sırasında diğer blokları etkisiz yap
                                  : 'hover:z-20 hover:scale-[1.02] transition-all duration-200'
                              }`}
                              style={{
                                top: `${topPosition}px`,
                                height: `${height}px`,
                                cursor: isDragging ? 'grabbing' : 'grab',
                              }}
                              draggable={!isAnyDragging || isDragging}
                              onDragStart={(e) => handleDragStart(e, block.app.id, block.serviceId, expert.id, block.blockKey)}
                              onDragEnd={handleDragEnd}
                              onClick={() => !isAnyDragging && openReorderPanel(block.app)}
                            >
                              <AppointmentCard
                                appointment={block.app}
                                t={t}
                                expertColor={expert.color}
                                overrideStartMinutes={block.startMinutes}
                                overrideDuration={block.duration}
                                overrideServiceNames={block.serviceName}
                                disableHover={isAnyDragging}
                              />
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                  );
                }) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500 p-4 text-center">
                    {t('noExpertToAdd')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Randevu Detay Modal */}
      {selectedAppointment && (
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('appointmentDetails')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <select
                value={selectedAppointment.customer_id}
                onChange={(e) => setSelectedAppointment({ ...selectedAppointment, customer_id: e.target.value })}
                className="w-full mt-1 px-4 py-2 rounded-xl border bg-white"
              >
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>)}
              </select>

              {/* Seçili hizmetler listesi */}
              <div className="w-full mt-1 px-4 py-2 rounded-xl border bg-slate-50">
                <p className="text-xs font-medium text-slate-500 mb-1">{t('selectServices')}</p>
                {selectedAppointment.appointment_services?.length > 0 ? (
                  <div className="space-y-1">
                    {selectedAppointment.appointment_services.map(as => (
                      <p key={as.service_id} className="text-sm text-slate-700">
                        {as.company_services?.description || '—'}
                        {as.company_services?.duration && <span className="text-xs text-slate-400 ml-2">{as.company_services.duration} dk</span>}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-700">
                    {selectedAppointment.company_services?.description || '—'}
                  </p>
                )}
                {selectedAppointment.total_duration && (
                  <p className="text-xs text-emerald-600 font-medium mt-1">
                    {t('totalDuration')}: {selectedAppointment.total_duration} dk
                  </p>
                )}
              </div>

              <select
                value={selectedAppointment.expert_id}
                onChange={(e) => setSelectedAppointment({ ...selectedAppointment, expert_id: e.target.value })}
                className="w-full mt-1 px-4 py-2 rounded-xl border bg-white"
              >
                {experts.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  value={selectedAppointment.date}
                  onChange={(e) => setSelectedAppointment({ ...selectedAppointment, date: e.target.value })}
                  className="w-full mt-1 px-4 py-2 rounded-xl border"
                />
                <input
                  type="time"
                  value={selectedAppointment.time}
                  onChange={(e) => setSelectedAppointment({ ...selectedAppointment, time: e.target.value })}
                  className="w-full mt-1 px-4 py-2 rounded-xl border"
                />
              </div>

              <select
                value={selectedAppointment.status}
                onChange={(e) => setSelectedAppointment({ ...selectedAppointment, status: e.target.value })}
                className="w-full mt-1 px-4 py-2 rounded-xl border bg-white"
              >
                <option value="onaylandı">{t('status.onaylandı')}</option>
                <option value="beklemede">{t('status.beklemede')}</option>
                <option value="iptal">{t('status.iptal')}</option>
              </select>

              {/* Ödeme durumu + hızlı ödeme butonu */}
              {selectedAppointment.payment_status && (
                <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      selectedAppointment.payment_status === 'paid' ? 'bg-emerald-500' :
                      selectedAppointment.payment_status === 'partial' ? 'bg-amber-500' :
                      selectedAppointment.payment_status === 'free' ? 'bg-stone-400' :
                      'bg-red-500'
                    }`} />
                    <span className="text-sm font-medium text-stone-700">
                      {selectedAppointment.payment_status === 'paid' ? (t('paid') || 'Ödendi') :
                       selectedAppointment.payment_status === 'partial' ? (t('partiallyPaid') || 'Kısmi Ödendi') :
                       selectedAppointment.payment_status === 'free' ? (t('freePayment') || 'Ücretsiz') :
                       (t('unpaid') || 'Ödenmedi')}
                    </span>
                    {parseFloat(selectedAppointment.total_amount) > 0 && (
                      <span className="text-xs text-stone-400">
                        {parseFloat(selectedAppointment.paid_amount || 0).toFixed(2)} / {parseFloat(selectedAppointment.total_amount).toFixed(2)}
                      </span>
                    )}
                  </div>
                  {selectedAppointment.payment_status !== 'paid' && selectedAppointment.payment_status !== 'free' && (
                    <button
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        setPaymentAppointmentId(selectedAppointment.id);
                        setPaymentModalOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      {t('collectPayment') || 'Ödeme Al'}
                    </button>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-between w-full">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="mr-auto">
                    <Trash2 className="w-4 h-4 mr-2" /> {t('delete')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('deleteAppointmentConfirm')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAppointment}>
                      {t('confirm')}, {t('delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>{t('close')}</Button>
                <Button onClick={handleUpdateAppointment}>{t('save')}</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}


      {/* Hizmet Sıralama Paneli — Takvimden tıklayınca açılır */}
      {reorderApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={closeReorderPanel}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-emerald-50 border-b">
              <div>
                <h3 className="text-base font-bold text-slate-800">{t('appointmentOrder') || 'Randevu Sırası'}</h3>
                <p className="text-sm text-slate-500">{reorderApp.customers?.name}</p>
              </div>
              <button onClick={closeReorderPanel} className="p-1.5 rounded-lg hover:bg-slate-200 transition">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Sürüklenebilir Liste */}
            <div className="px-2 py-3">
              <p className="text-xs text-slate-400 px-3 mb-2">{t('dragToReorder') || 'Sırayı değiştirmek için sürükleyin'}</p>
              <Reorder.Group
                axis="y"
                values={reorderServices}
                onReorder={setReorderServices}
                className="space-y-1"
              >
                {reorderServices.map((as, idx) => {
                  const svc = as.company_services;
                  const exp = as.expert_id ? experts.find(e => e.id === as.expert_id) : null;
                  // Kümülatif zaman hesapla
                  let cumStart = 0;
                  for (let i = 0; i < idx; i++) {
                    cumStart += reorderServices[i].company_services?.duration || 0;
                  }
                  const [h, m] = (reorderApp.time || '00:00').split(':').map(Number);
                  const baseMin = h * 60 + m;
                  const startMin = baseMin + cumStart;
                  const endMin = startMin + (svc?.duration || 0);
                  const fmt = (min) => `${Math.floor(min/60).toString().padStart(2,'0')}:${(min%60).toString().padStart(2,'0')}`;

                  return (
                    <Reorder.Item
                      key={as.service_id}
                      value={as}
                      className="flex items-center gap-3 px-3 py-3 bg-white border border-slate-200 rounded-xl cursor-grab active:cursor-grabbing active:bg-emerald-50 active:shadow-lg active:border-emerald-300 active:z-20"
                    >
                      <GripVertical className="w-5 h-5 text-slate-300 flex-shrink-0" />
                      <span className="text-sm font-bold text-slate-400 w-6">{idx + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{svc?.description || 'Hizmet'}</p>
                        <p className="text-xs text-slate-400">{svc?.duration} dk · {fmt(startMin)}-{fmt(endMin)}</p>
                      </div>
                      {exp && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: exp.color || '#059669' }}>
                          {exp.name}
                        </span>
                      )}
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t">
              <button
                onClick={() => { closeReorderPanel(); openAppointmentDetails(reorderApp); }}
                className="text-sm text-slate-500 hover:text-slate-700 underline"
              >
                {t('appointmentDetails')}
              </button>
              <div className="flex gap-2">
                <button onClick={closeReorderPanel} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                  {t('cancel')}
                </button>
                <button
                  onClick={saveServiceOrder}
                  disabled={isSavingOrder}
                  className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {isSavingOrder ? '...' : (t('save'))}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Randevu Oluşturma Modal — Yeni tam sayfa modal */}
      <CreateAppointmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        experts={experts}
        currentDate={currentDate}
        onAppointmentCreated={() => fetchAppointments()}
      />

      {/* Ödeme Modal */}
      <PaymentCollectionModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        appointmentId={paymentAppointmentId}
        companyId={company?.id}
        experts={experts}
        onPaymentComplete={(updatedAppt) => {
          // Tam re-fetch yerine local state güncelle — diğer blokların yerini değiştirme
          if (updatedAppt?.id) {
            setAppointments(prev => prev.map(app =>
              app.id === updatedAppt.id
                ? { ...app, payment_status: updatedAppt.payment_status, paid_amount: updatedAppt.paid_amount, total_amount: updatedAppt.total_amount || app.total_amount }
                : app
            ));
          }
        }}
      />
    </>
  );
};

export default AppointmentsPage;