import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Trash2, Clock } from 'lucide-react';
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

const ROW_HEIGHT = 40; // px
const PIXELS_PER_MINUTE = ROW_HEIGHT / 30;

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
        className="text-center rounded-lg p-2 text-xs shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200 text-slate-800"
        style={{
            backgroundColor: expertColor ? `${expertColor}BF` : '#e0f2fe', // ~75% opacity
            borderLeft: `4px solid ${expertColor || '#0ea5e9'}`,
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
    >
      <p className="font-bold text-sm">{`${displayTime} - ${displayEndTime}`}</p>
      <p className="font-semibold truncate">{appointment.customers?.name?.toUpperCase() || t('unknownCustomer')}</p>
      <p className="text-xs truncate">{appointment.company_services?.description || t('unknownService')}</p>
    </motion.div>
  );
};


const TimeIndicator = ({ companyTimezone }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    const topPosition = useMemo(() => {
        try {
            const now = new Date(currentTime.toLocaleString('en-US', { timeZone: companyTimezone }));
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const totalMinutes = hours * 60 + minutes;
            const startOfDayMinutes = 7 * 60; // 07:00
            const minutesFromStart = totalMinutes - startOfDayMinutes;

            if (minutesFromStart < 0) return -1; // Hide if before 7am

            return minutesFromStart * PIXELS_PER_MINUTE;
        } catch (e) {
            console.error("Invalid timezone for TimeIndicator:", companyTimezone);
            return -1; // Hide indicator on error
        }
    }, [currentTime, companyTimezone]);

    if (topPosition === -1) return null;

    return (
        <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${topPosition}px` }}>
            <div className="flex items-center">
                <div className="w-16 h-16 rounded-full bg-red-500/80 -ml-8 flex items-center justify-center shadow-lg">
                    <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="flex-grow h-0.5 bg-red-500/80 shadow-md"></div>
            </div>
        </div>
    );
};


const AppointmentsPage = () => {
  const { company, staff, refreshCompany } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
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

  useEffect(() => {
    if (company) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [company, currentDate]);
  
  useEffect(() => {
    const handleInserts = (payload) => {
        toast({
            title: `Yeni Randevu: ${payload.new.customers?.name || 'Bilinmeyen'}`,
            description: `${payload.new.date} - ${payload.new.time}`,
        });
        fetchData();
    };

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

  const changeDate = (amount) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + amount);
      return newDate;
    });
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
  
  const timeSlots = Array.from({ length: 29 }, (_, i) => { // 07:00 to 21:00
    const totalMinutes = 7 * 60 + i * 30;
    const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const m = (totalMinutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  });

  const openAppointmentDetails = (appointment) => {
    setSelectedAppointment({ ...appointment, customer_name: appointment.customers.name, customer_phone: appointment.customers.phone });
    setIsDetailModalOpen(true);
  };
  
  if (loading) {
      return <div className="flex justify-center items-center h-[calc(100vh-8rem)]"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div></div>
  }

  return (
    <>
      <Helmet>
        <title>{t('appointmentsTitle')} | RandevuBot</title>
        <meta name="description" content={t('appointmentsSubtitle')} />
      </Helmet>

      <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-lg glass-effect overflow-hidden">
        <header className="flex-shrink-0 p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">{t('appointmentsTitle')}</h1>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}><ChevronLeft className="w-5 h-5" /></Button>
                <Button variant="ghost" className="w-40"><CalendarIcon className="w-4 h-4 mr-2" />{currentDate.toLocaleDateString(t.language, { day: 'numeric', month: 'long', year: 'numeric' })}</Button>
                <Button variant="ghost" size="icon" onClick={() => changeDate(1)}><ChevronRight className="w-5 h-5" /></Button>
              </div>
              <Button variant="outline" onClick={() => setCurrentDate(new Date())}>{t('today')}</Button>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)}><Plus className="w-4 h-4 mr-2" /> {t('createAppointment')}</Button>
          </div>
        </header>

        <div className="flex-grow overflow-auto">
          <div className="flex h-full">
            <div className="w-20 flex-shrink-0">
              <div className="h-10 sticky top-0 bg-white/80 backdrop-blur-sm z-30"></div>
              {timeSlots.map(time => ( <div key={time} style={{height: `${ROW_HEIGHT * 2}px`}} className="text-right pr-2 text-sm text-slate-500 border-t border-slate-200/60 -mt-px pt-1">{time.endsWith(':00') ? time : ''}</div> ))}
            </div>

            <div className="flex-grow grid relative" style={{ gridTemplateColumns: `repeat(${Math.max(1, experts.length)}, minmax(150px, 1fr))` }}>
              <TimeIndicator companyTimezone={companyTimezone} />
              {experts.length > 0 ? experts.map(expert => {
                return (
                  <div key={expert.id} className="border-l border-slate-200/60 relative">
                    <div className="h-10 sticky top-0 bg-white/80 backdrop-blur-sm z-30 p-2 border-b border-slate-200/60 flex items-center justify-center" style={{ borderBottomColor: expert.color || '#e2e8f0' }}>
                      <div className="text-center">
                        <p className="font-semibold truncate" style={{color: expert.color || '#1e293b'}}>{expert.name.toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="relative" style={{height: `${timeSlots.length * ROW_HEIGHT * 2}px`}}>
                      {timeSlots.map((time, index) => (<div key={index} style={{height: `${ROW_HEIGHT * 2}px`}} className="border-t border-slate-200/60" />))}
                      {appointments.filter(app => app.expert_id === expert.id).map(app => (
                        <div key={app.id} className="absolute w-full px-1 z-10" style={{ top: `${((app.time.split(':')[0] * 60 + parseInt(app.time.split(':')[1])) - 7 * 60) * PIXELS_PER_MINUTE}px`, height: `${(app.company_services?.duration || 30) * PIXELS_PER_MINUTE}px` }} onClick={() => openAppointmentDetails(app)}>
                          <AppointmentCard appointment={app} t={t} expertColor={expert.color} />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }) : (
                <div className="absolute inset-0 flex items-center justify-center h-full text-slate-500 p-4 text-center">{t('noExpertToAdd')}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedAppointment && (
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent><DialogHeader><DialogTitle>{t('appointmentDetails')}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <select value={selectedAppointment.customer_id} onChange={(e) => setSelectedAppointment({ ...selectedAppointment, customer_id: e.target.value })} className="w-full mt-1 px-4 py-2 rounded-xl border bg-white">
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>)}
              </select>
              <select value={selectedAppointment.service_id} onChange={(e) => setSelectedAppointment({ ...selectedAppointment, service_id: e.target.value, expert_id: services.find(s => s.id === e.target.value)?.expert_id })} className="w-full mt-1 px-4 py-2 rounded-xl border bg-white">
                {services.map(s => <option key={s.id} value={s.id}>{s.description} ({s.expert?.name})</option>)}
              </select>
              <select value={selectedAppointment.expert_id} onChange={(e) => setSelectedAppointment({ ...selectedAppointment, expert_id: e.target.value })} className="w-full mt-1 px-4 py-2 rounded-xl border bg-white">
                {experts.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" value={selectedAppointment.date} onChange={(e) => setSelectedAppointment({ ...selectedAppointment, date: e.target.value })} className="w-full mt-1 px-4 py-2 rounded-xl border" />
                <input type="time" value={selectedAppointment.time} onChange={(e) => setSelectedAppointment({ ...selectedAppointment, time: e.target.value })} className="w-full mt-1 px-4 py-2 rounded-xl border" />
              </div>
              <select value={selectedAppointment.status} onChange={(e) => setSelectedAppointment({ ...selectedAppointment, status: e.target.value })} className="w-full mt-1 px-4 py-2 rounded-xl border bg-white">
                <option value="onaylandı">{t('status.onaylandı')}</option><option value="beklemede">{t('status.beklemede')}</option><option value="iptal">{t('status.iptal')}</option>
              </select>
            </div>
            <DialogFooter className="flex justify-between w-full">
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="destructive" className="mr-auto"><Trash2 className="w-4 h-4 mr-2" /> {t('delete')}</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle><AlertDialogDescription>{t('deleteAppointmentConfirm')}</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteAppointment}>{t('confirm')}, {t('delete')}</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="flex gap-2"><Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>{t('close')}</Button><Button onClick={handleUpdateAppointment}>{t('save')}</Button></div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent><DialogHeader><DialogTitle>{t('newAppointmentTitle')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <select value={newAppointment.customer_id || "new"} onChange={(e) => handleCustomerSelection(e.target.value)} className="w-full px-4 py-3 rounded-xl border bg-white">
              <option value="" disabled>{t('select')} {t('customers').toLowerCase()}</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>)}
              <option value="new">-- {t('addCustomer')} --</option>
            </select>

            {(!newAppointment.customer_id || newAppointment.customer_id === "new") && (
              <>
                <input type="text" placeholder={`${t('newCustomers')} ${t('customerName')}*`} value={newAppointment.customer_name} onChange={(e) => handleNameInputChange(e, setNewAppointment)} className="w-full px-4 py-3 rounded-xl border" />
                <input type="tel" placeholder={`${t('newCustomers')} ${t('customerPhone')}*`} value={newAppointment.customer_phone} onChange={(e) => setNewAppointment({ ...newAppointment, customer_phone: e.target.value })} className="w-full px-4 py-3 rounded-xl border" />
              </>
            )}

            <select value={newAppointment.service_id} onChange={(e) => handleServiceChange(e.target.value)} className="w-full px-4 py-3 rounded-xl border bg-white">
              <option value="" disabled>{t('select')} {t('services').toLowerCase()}</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.description} ({s.expert?.name})</option>)}
            </select>
            <select value={newAppointment.expert_id} onChange={(e) => setNewAppointment({ ...newAppointment, expert_id: e.target.value })} className="w-full px-4 py-3 rounded-xl border bg-white" disabled={!!services.find(s => s.id === newAppointment.service_id)?.expert_id}>
              <option value="" disabled>{t('select')} {t('staffRoleExpert').toLowerCase()}</option>
              {experts.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-4">
              <input type="date" value={newAppointment.date} onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })} className="w-full px-4 py-3 rounded-xl border" />
              <input type="time" value={newAppointment.time} onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })} className="w-full px-4 py-3 rounded-xl border" />
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>{t('cancel')}</Button><Button onClick={handleCreateAppointment}>{t('createAppointment')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AppointmentsPage;