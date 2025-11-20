import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Plus, ChevronLeft, ChevronRight, Trash2, Clock } from 'lucide-react';
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
import { motion } from 'framer-motion';

const ROW_HEIGHT = 20; // px - her 10 dakika için
const PIXELS_PER_MINUTE = ROW_HEIGHT / 10;

const AppointmentCard = ({ appointment, t, expertColor }) => {
  const timeToMinutes = (time) => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const startMinutes = timeToMinutes(appointment.time);
  const duration = appointment.company_services?.duration || 60;
  const endMinutes = startMinutes + duration;

  const formatTime = (minutes) => {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const displayTime = appointment.time?.substring(0, 5) || '00:00';
  const displayEndTime = formatTime(endMinutes).substring(0, 5);

  return (
    <motion.div
      className="text-center rounded p-1.5 text-[10px] shadow-md cursor-pointer hover:scale-[1.02] transition-transform duration-200 text-slate-800 overflow-hidden"
      style={{
        backgroundColor: expertColor ? `${expertColor}BF` : '#e0f2fe',
        borderLeft: `3px solid ${expertColor || '#0ea5e9'}`,
      }}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <p className="font-medium text-[10px] leading-tight">{`${displayTime}-${displayEndTime}`}</p>
      <p className="font-medium text-xs truncate leading-tight">{appointment.customers?.name?.toUpperCase() || t('unknownCustomer')}</p>
      <p className="text-[9px] truncate opacity-90 leading-tight">{appointment.company_services?.description || t('unknownService')}</p>
    </motion.div>
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
        <div className="w-14 bg-blue-500 flex items-center justify-center -ml-0.5">
          <span className="text-white text-[9px] font-semibold">{currentTimeString}</span>
        </div>
        <div className="flex-grow h-[2px] bg-blue-500 shadow-sm"></div>
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
                            ${isSelected(day) ? 'bg-blue-500 text-white font-bold' : ''}
                            ${isToday(day) && !isSelected(day) ? 'bg-blue-100 text-blue-700 font-semibold' : ''}
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
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    service_id: '',
    expert_id: '',
    date: currentDate.toISOString().split('T')[0],
    time: ''
  });
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

  useEffect(() => {
    setNewAppointment(prev => ({ ...prev, date: currentDate.toISOString().split('T')[0] }));
  }, [currentDate]);

  const fetchData = async () => {
    if (!company) return;
    setLoading(true);
    await Promise.all([fetchAppointments(), fetchServices(), fetchCustomers()]);
    setLoading(false);
  };

  const fetchAppointments = async () => {
    const dateString = currentDate.toISOString().split('T')[0];
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`*, company_services(duration, description, price), customers(id, name, phone), company_users(name, color)`)
        .eq('company_id', company.id)
        .eq('date', dateString);

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      toast({ title: t('error'), description: t('fetchAppointmentsError', { error: error.message }), variant: "destructive" });
    }
  };

  const fetchServices = async () => {
    if (!company) return;
    try {
      const { data, error } = await supabase.from('company_services').select('*, expert:expert_id(name)').eq('company_id', company.id);
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
      toast({ title: t('success'), description: t('updateAppointmentSuccess') });
      setIsDetailModalOpen(false);
      setSelectedAppointment(null);
    } catch (error) {
      toast({ title: t('error'), description: t('updateAppointmentError', { error: error.message }), variant: "destructive" });
    }
  };

  const handleServiceChange = (serviceId) => {
    const selectedService = services.find(s => s.id === serviceId);
    setNewAppointment({ ...newAppointment, service_id: serviceId, expert_id: selectedService ? selectedService.expert_id : '' });
  };

  const handleCreateAppointment = async () => {
    let customerId = newAppointment.customer_id;
    if (!customerId && (!newAppointment.customer_name || !newAppointment.customer_phone)) {
      toast({ title: t('missingInfo'), description: t('pleaseFillAllFields'), variant: "destructive" });
      return;
    }
    if (!newAppointment.service_id || !newAppointment.date || !newAppointment.time || !newAppointment.expert_id) {
      toast({ title: t('missingInfo'), description: t('pleaseFillAllFields'), variant: "destructive" });
      return;
    }

    const now = new Date();
    const appointmentDateTime = new Date(`${newAppointment.date}T${newAppointment.time}`);
    if (appointmentDateTime < now) {
      toast({ title: t('error'), description: t('invalidDateError'), variant: "destructive" });
      return;
    }

    try {
      if (!customerId) {
        const newCustomer = await upsertCustomer(newAppointment.customer_name, newAppointment.customer_phone);
        if (!newCustomer) return;
        customerId = newCustomer.id;
      }

      const { error } = await supabase.from('appointments').insert([{ customer_id: customerId, service_id: newAppointment.service_id, date: newAppointment.date, time: newAppointment.time, expert_id: newAppointment.expert_id, company_id: company.id, status: 'onaylandı' }]);
      if (error) throw error;

      setIsCreateModalOpen(false);
      setNewAppointment({ customer_id: '', customer_name: '', customer_phone: '', service_id: '', expert_id: '', date: currentDate.toISOString().split('T')[0], time: '' });
      toast({ title: t('success'), description: t('createAppointmentSuccess') });
    } catch (error) {
      toast({ title: t('error'), description: t('createAppointmentError', { error: error.message }), variant: "destructive" });
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

  const handleNameInputChange = (e, setter) => {
    setter(prev => ({ ...prev, customer_name: e.target.value.toUpperCase() }));
  };

  const handleCustomerSelection = (customerId) => {
    if (customerId === "new") {
      setNewAppointment({ ...newAppointment, customer_id: '', customer_name: '', customer_phone: '' });
    } else {
      const selected = customers.find(c => c.id === customerId);
      if (selected) {
        setNewAppointment({ ...newAppointment, customer_id: customerId, customer_name: selected.name, customer_phone: selected.phone });
      }
    }
  };

  // 05:00 - 24:00 arası, her 10 dakikada bir (114 slot)
  const timeSlots = Array.from({ length: 115 }, (_, i) => {
    const totalMinutes = 5 * 60 + i * 10;
    const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const m = (totalMinutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  });

  const openAppointmentDetails = (appointment) => {
    setSelectedAppointment({ ...appointment, customer_name: appointment.customers.name, customer_phone: appointment.customers.phone });
    setIsDetailModalOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-[calc(100vh-6rem)]"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div></div>
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
            className="w-full"
            size="lg"
          >
            <Plus className="w-4 h-4 mr-2" /> {t('createAppointment')}
          </Button>

          <div className="bg-white rounded-lg shadow-sm p-2 border">
            <h3 className="text-[10px] font-semibold mb-1 text-gray-600">{t('selectedDate')}</h3>
            <p className="text-sm font-bold text-blue-600 leading-tight">
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

                {experts.length > 0 ? experts.map(expert => (
                  <div key={expert.id} className="border-l relative">
                    {/* Uzman Başlığı */}
                    <div
                      className="h-8 sticky top-0 bg-white/95 backdrop-blur-sm z-30 px-2 border-b flex items-center justify-center"
                      style={{ borderBottomColor: expert.color || '#e2e8f0' }}
                    >
                      <p className="font-medium text-xs truncate" style={{ color: expert.color || '#1e293b' }}>
                        {expert.name.toUpperCase()}
                      </p>
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

                      {/* Randevular */}
                      {appointments.filter(app => app.expert_id === expert.id).map(app => {
                        const [hours, minutes] = app.time.split(':').map(Number);
                        const startMinutes = hours * 60 + minutes;
                        const topPosition = (startMinutes - 5 * 60) * PIXELS_PER_MINUTE; // 05:00 başlangıç
                        const height = (app.company_services?.duration || 30) * PIXELS_PER_MINUTE;

                        return (
                          <div
                            key={app.id}
                            className="absolute w-full px-0.5 z-10"
                            style={{
                              top: `${topPosition}px`,
                              height: `${height}px`
                            }}
                            onClick={() => openAppointmentDetails(app)}
                          >
                            <AppointmentCard appointment={app} t={t} expertColor={expert.color} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )) : (
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

              <select
                value={selectedAppointment.service_id}
                onChange={(e) => setSelectedAppointment({
                  ...selectedAppointment,
                  service_id: e.target.value,
                  expert_id: services.find(s => s.id === e.target.value)?.expert_id
                })}
                className="w-full mt-1 px-4 py-2 rounded-xl border bg-white"
              >
                {services.map(s => <option key={s.id} value={s.id}>{s.description} ({s.expert?.name})</option>)}
              </select>

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

      {/* Randevu Oluşturma Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('newAppointmentTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <select
              value={newAppointment.customer_id || "new"}
              onChange={(e) => handleCustomerSelection(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border bg-white"
            >
              <option value="" disabled>{t('select')} {t('customers').toLowerCase()}</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>)}
              <option value="new">-- {t('addCustomer')} --</option>
            </select>

            {(!newAppointment.customer_id || newAppointment.customer_id === "new") && (
              <>
                <input
                  type="text"
                  placeholder={`${t('newCustomers')} ${t('customerName')}*`}
                  value={newAppointment.customer_name}
                  onChange={(e) => handleNameInputChange(e, setNewAppointment)}
                  className="w-full px-4 py-3 rounded-xl border"
                />
                <input
                  type="tel"
                  placeholder={`${t('newCustomers')} ${t('customerPhone')}*`}
                  value={newAppointment.customer_phone}
                  onChange={(e) => setNewAppointment({ ...newAppointment, customer_phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border"
                />
              </>
            )}

            <select
              value={newAppointment.service_id}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border bg-white"
            >
              <option value="" disabled>{t('select')} {t('services').toLowerCase()}</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.description} ({s.expert?.name})</option>)}
            </select>

            <select
              value={newAppointment.expert_id}
              onChange={(e) => setNewAppointment({ ...newAppointment, expert_id: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border bg-white"
              disabled={!!services.find(s => s.id === newAppointment.service_id)?.expert_id}
            >
              <option value="" disabled>{t('select')} {t('staffRoleExpert').toLowerCase()}</option>
              {experts.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-4">
              <input
                type="date"
                value={newAppointment.date}
                onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border"
              />
              <input
                type="time"
                value={newAppointment.time}
                onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleCreateAppointment}>{t('createAppointment')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AppointmentsPage;