import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Plus, ChevronLeft, ChevronRight, Trash2, GripVertical, Save, X, ArrowRightLeft, Ban, AlertTriangle } from 'lucide-react';
import { createIncomeFromAppointment } from '../../services/accountingService';
import { logAction, AUDIT_ACTIONS } from '../../services/auditService';
import { useTranslation } from 'react-i18next';
import { getSpaces, getAppointmentResourcesByDate } from '../../services/resourceService';
import CalendarViewToggle from '@/components/calendar/CalendarViewToggle';
import RoomCalendarGrid from '@/components/calendar/RoomCalendarGrid';
import MonthlyCalendar from '@/components/calendar/MonthlyCalendar';
import StaffSidebar from '@/components/appointment/StaffSidebar';
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

const ROW_HEIGHT = 13; // px - her 10 dakika için (4 satır/saat)
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

  // Tam renkli kart — referans tasarıma uygun
  const baseColor = expertColor || '#0ea5e9';

  // Rengin açık/koyu olduğunu belirle — yazı rengini ayarlamak için
  const isLightColor = (hex) => {
    if (!hex || hex.length < 7) return false;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
  };

  const textColor = isLightColor(baseColor) ? '#1e293b' : '#ffffff';
  const subTextColor = isLightColor(baseColor) ? '#475569' : 'rgba(255,255,255,0.8)';

  // Ödeme durumu ikonu
  const paymentDot = appointment.payment_status === 'paid' ? '●' :
    appointment.payment_status === 'partial' ? '◐' :
    appointment.payment_status === 'free' ? '○' : null;

  return (
    <div
      className={`rounded-xl text-[10px] ${disableHover ? '' : 'hover:brightness-110 hover:shadow-lg'} cursor-grab active:cursor-grabbing transition-all duration-200 overflow-hidden h-full flex flex-col`}
      style={{
        backgroundColor: baseColor,
        boxShadow: `0 2px 6px ${baseColor}40`,
      }}
    >
      {/* Üst: saat aralığı + hizmet */}
      <div className="px-2 pt-1 flex items-center gap-1">
        <span className="font-bold text-[9px] whitespace-nowrap" style={{ color: textColor }}>{`${displayTime} - ${displayEndTime}`}</span>
        <span className="text-[9px] truncate" style={{ color: subTextColor }}>{serviceNames}</span>
        {paymentDot && (
          <span className="text-[8px] flex-shrink-0 ml-auto" style={{ color: subTextColor }}>{paymentDot}</span>
        )}
      </div>
      {/* Alt: müşteri adı */}
      <div className="px-2 pb-1">
        <p className="font-semibold text-[10px] truncate leading-tight" style={{ color: textColor }}>
          {appointment.customers?.name?.toUpperCase() || t('unknownCustomer')}
        </p>
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

  const indicatorRef = useRef(null);

  // Sayfa yüklendiğinde çizgiyi ekranın ortasına scroll et
  useEffect(() => {
    if (indicatorRef.current) {
      indicatorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []); // Sadece ilk yüklemede

  return (
    <div ref={indicatorRef} className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${topPosition}px` }}>
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
  const { company, staff, user, selectedExpert } = useAuth();
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
  const [cancelReason, setCancelReason] = useState(''); // İptal sebebi
  const [cancelNote, setCancelNote] = useState(''); // İptal açıklaması (Diğer seçildiğinde)
  const [showCancelDialog, setShowCancelDialog] = useState(false); // İptal dialog
  const [expertServicesMap, setExpertServicesMap] = useState(new Map()); // Map<expertId, Set<serviceId>>
  // ── Oda Görünümü State'leri ──
  const [calendarView, setCalendarView] = useState(() => localStorage.getItem('calendarView') || 'expert');
  const [spaces, setSpaces] = useState([]);
  // Drag-drop uzman-oda ataması
  const [dragOverSpaceId, setDragOverSpaceId] = useState(null);
  const [draggingExpert, setDraggingExpert] = useState(null);
  const [appointmentResources, setAppointmentResources] = useState([]);
  // company.timezone "(GMT+03:00) Istanbul" formatında olabilir — IANA'ya çevir
  const companyTimezone = (() => {
    const tz = company?.timezone || 'UTC';
    // Zaten IANA formatındaysa (/ içeriyorsa) direkt kullan
    if (tz.includes('/')) return tz;
    // "(GMT+03:00) Istanbul" gibi formattan şehir adını çıkar ve IANA'ya map et
    const cityMatch = tz.match(/\)\s*(.+)/);
    const city = cityMatch ? cityMatch[1].trim() : '';
    const tzMap = {
      'Istanbul': 'Europe/Istanbul', 'London': 'Europe/London', 'Paris': 'Europe/Paris',
      'Berlin': 'Europe/Berlin', 'Moscow': 'Europe/Moscow', 'Dubai': 'Asia/Dubai',
      'New York': 'America/New_York', 'Los Angeles': 'America/Los_Angeles',
      'Tokyo': 'Asia/Tokyo', 'Shanghai': 'Asia/Shanghai', 'Sydney': 'Australia/Sydney',
      'Cairo': 'Africa/Cairo', 'Riyadh': 'Asia/Riyadh', 'Tehran': 'Asia/Tehran',
    };
    return tzMap[city] || 'Europe/Istanbul'; // Varsayılan: Istanbul
  })();

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
    await Promise.all([fetchAppointments(), fetchServices(), fetchCustomers(), fetchExpertServices(), fetchSpaces()]);
    setLoading(false);
  };

  // Oda görünümü için alanları ve kaynak atamalarını yükle
  const fetchSpaces = async () => {
    if (!company) return;
    try {
      const spacesData = await getSpaces(company.id);
      setSpaces(spacesData || []);
    } catch (err) {
      console.error('Spaces fetch error:', err);
      setSpaces([]);
    }
    // appointment_resources ayrı try-catch — tablo yoksa sayfayı kırmasın
    try {
      const dateString = currentDate.toISOString().split('T')[0];
      const resources = await getAppointmentResourcesByDate(company.id, dateString);
      setAppointmentResources(resources || []);
    } catch (err) {
      // Tablo henüz oluşturulmamış olabilir — sessizce geç
      setAppointmentResources([]);
    }
  };

  // ── Walk-in: Paylaşımlı alana hızlı müşteri girişi ──
  const handleWalkIn = async (spaceId, space) => {
    if (!company) return;
    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      // Varsayılan süre: 30 dk
      const defaultDuration = space.buffer_minutes || 30;

      const { data, error } = await supabase.from('appointments').insert([{
        company_id: company.id,
        customer_id: null, // Walk-in — müşteri kaydı yok
        expert_id: null,   // Uzman gerektirmiyor
        space_id: spaceId,
        date: dateStr,
        time: timeStr,
        total_duration: defaultDuration,
        status: 'onaylandı',
        payment_status: 'unpaid',
        notes: `Walk-in — ${space.name}`,
      }]).select().single();

      if (error) throw error;

      // Local state güncelle
      setAppointments(prev => [...prev, { ...data, customers: { name: 'WALK-IN' } }]);

      toast({
        title: '✓ Giriş',
        description: `${space.name} — ${timeStr} (${defaultDuration} dk)`,
      });
    } catch (err) {
      console.error('Walk-in hatası:', err);
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    }
  };

  const handleWalkOut = async (spaceId, space) => {
    if (!company) return;
    try {
      // Bu alandaki en son aktif walk-in randevuyu bul
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const walkInApps = appointments.filter(app =>
        app.space_id === spaceId &&
        app.status === 'onaylandı' &&
        app.notes?.includes('Walk-in')
      );

      if (walkInApps.length === 0) {
        toast({ title: t('info') || 'Bilgi', description: 'Bu alanda aktif walk-in müşteri yok' });
        return;
      }

      // En son eklenen walk-in'i tamamla
      const lastWalkIn = walkInApps[walkInApps.length - 1];
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'tamamlandı', notes: `${lastWalkIn.notes} — Çıkış: ${timeStr}` })
        .eq('id', lastWalkIn.id);

      if (error) throw error;

      // Local state güncelle
      setAppointments(prev => prev.filter(app => app.id !== lastWalkIn.id));

      toast({
        title: '✓ Çıkış',
        description: `${space.name} — müşteri çıkışı kaydedildi`,
      });
    } catch (err) {
      console.error('Walk-out hatası:', err);
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    }
  };

  // calendarView değiştiğinde localStorage'a kaydet
  const handleViewChange = (view) => {
    setCalendarView(view);
    localStorage.setItem('calendarView', view);
  };

  // ── Uzmanı odaya sürükle-bırak ile ata ──
  const handleExpertDropToRoom = async (expertId, spaceId) => {
    if (!company) return;
    try {
      // expert_spaces'de kayıt var mı kontrol et
      const { data: existing } = await supabase
        .from('expert_spaces')
        .select('id')
        .eq('expert_id', expertId)
        .eq('space_id', spaceId)
        .maybeSingle();

      if (existing) {
        toast({ title: t('info') || 'Bilgi', description: t('expertAlreadyAssigned') || 'Bu uzman zaten bu odaya atanmış' });
        return;
      }

      // Yeni atama oluştur
      const { error } = await supabase.from('expert_spaces').insert([{
        expert_id: expertId,
        space_id: spaceId,
        is_preferred: false,
      }]);

      if (error) throw error;

      const expert = experts.find(e => e.id === expertId);
      const space = spaces.find(s => s.id === spaceId);
      toast({
        title: t('success'),
        description: `${expert?.name || 'Uzman'} → ${space?.name || 'Oda'} atandı`,
      });
    } catch (err) {
      console.error('Uzman-oda atama hatası:', err);
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    }
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
        .select(`*, company_services(duration, description, price), customers(id, name, phone), company_users!appointments_expert_id_fkey(name, color), appointment_services(id, service_id, expert_id, company_services(id, description, duration, price))`)
        .eq('company_id', company.id)
        .eq('date', dateString)
        .neq('status', 'iptal') // İptal edilen randevuları takvimden gizle
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

      // Hizmetler değiştiyse appointment_services güncelle
      if (selectedAppointment._servicesChanged && selectedAppointment.appointment_services?.length > 0) {
        const appServices = selectedAppointment.appointment_services;
        const newTotalDuration = appServices.reduce((sum, as) => sum + (as.company_services?.duration || 0), 0);
        const newTotalAmount = appServices.reduce((sum, as) => sum + (parseFloat(as.company_services?.price) || 0), 0);

        // appointment_services sil ve yeniden ekle
        await supabase.from('appointment_services').delete().eq('appointment_id', id);
        const inserts = appServices.map(as => ({
          appointment_id: id,
          service_id: as.service_id,
          expert_id: as.expert_id || null,
        }));
        await supabase.from('appointment_services').insert(inserts);

        // appointments tablosunu güncelle
        const { error } = await supabase.from('appointments').update({
          service_id: appServices[0]?.service_id || service_id,
          expert_id, date, time, status, customer_id,
          total_duration: newTotalDuration,
          total_amount: newTotalAmount,
        }).eq('id', id);
        if (error) throw error;

        // Local state güncelle — tam re-fetch yerine
        setAppointments(prev => prev.map(app => {
          if (app.id !== id) return app;
          return {
            ...app,
            service_id: appServices[0]?.service_id || service_id,
            expert_id, date, time, status, customer_id,
            total_duration: newTotalDuration,
            total_amount: newTotalAmount,
            appointment_services: appServices.map(as => ({ ...as })),
          };
        }));
      } else {
        // Sadece temel alanları güncelle
        const { error } = await supabase.from('appointments').update({ service_id, expert_id, date, time, status, customer_id }).eq('id', id);
        if (error) throw error;

        // Local state güncelle
        setAppointments(prev => prev.map(app =>
          app.id === id ? { ...app, service_id, expert_id, date, time, status, customer_id } : app
        ));
      }

      // Durum yeni 'onaylandı' olduysa otomatik gelir kaydı oluştur
      if (status === 'onaylandı' && previousStatus !== 'onaylandı') {
        let totalAmount = 0;
        let descriptionText = '';
        if (selectedAppointment.appointment_services?.length > 0) {
          totalAmount = selectedAppointment.appointment_services.reduce((sum, as) =>
            sum + (parseFloat(as.company_services?.price) || 0), 0);
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



  // Randevu İPTAL — silme yerine status='iptal' + audit log
  const handleCancelAppointment = async () => {
    if (!selectedAppointment || !cancelReason) return;
    if (cancelReason === 'diger' && !cancelNote.trim()) return; // Diğer seçiliyse açıklama zorunlu
    try {
      const now = new Date().toISOString();
      const currentUser = staff.find(s => s.id === (selectedExpert?.id || staff[0]?.id)) || { id: null, name: user?.email || 'Admin' };
      const fullReason = cancelReason === 'diger' ? `diger: ${cancelNote.trim()}` : cancelReason;

      const { error } = await supabase.from('appointments').update({
        status: 'iptal',
        cancelled_at: now,
        cancelled_by: currentUser.id,
        cancel_reason: fullReason,
      }).eq('id', selectedAppointment.id);
      if (error) throw error;

      // Takvimden kaldır (local state)
      setAppointments(prev => prev.filter(a => a.id !== selectedAppointment.id));

      // Audit log
      await logAction(company.id, {
        userId: currentUser.id,
        userName: currentUser.name,
        action: AUDIT_ACTIONS.APPOINTMENT_CANCEL,
        entityType: 'appointment',
        entityId: selectedAppointment.id,
        details: {
          customer: customers.find(c => c.id === selectedAppointment.customer_id)?.name,
          date: selectedAppointment.date,
          time: selectedAppointment.time,
          reason: fullReason,
          totalAmount: selectedAppointment.total_amount,
          paymentStatus: selectedAppointment.payment_status,
        },
      });

      toast({ title: t('success'), description: t('appointmentCancelled') || 'Randevu iptal edildi' });
      setIsDetailModalOpen(false);
      setShowCancelDialog(false);
      setSelectedAppointment(null);
      setCancelReason('');
      setCancelNote('');
    } catch (error) {
      toast({ title: t('error'), description: error.message, variant: "destructive" });
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
        {/* Sol Panel - Mini Takvim ve Randevu Oluştur (aylık görünümde gizle) */}
        {calendarView !== 'monthly' && (
        <div className="w-52 flex-shrink-0 space-y-3">
          <MiniCalendar currentDate={currentDate} onDateChange={setCurrentDate} />

          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full bg-gradient-to-r from-emerald-800 to-teal-700 hover:opacity-90 text-white border-0"
            size="lg"
          >
            <Plus className="w-4 h-4 mr-2" /> {t('createAppointment')}
          </Button>

          {/* Takvim Görünüm Toggle */}
          <CalendarViewToggle view={calendarView} onChange={handleViewChange} />

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
        )}

        {/* ═══ AYLIK GÖRÜNÜM ═══ */}
        {calendarView === 'monthly' && (
          <div className="flex-grow flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <CalendarViewToggle view={calendarView} onChange={handleViewChange} />
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-gradient-to-r from-emerald-800 to-teal-700 hover:opacity-90 text-white border-0"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-1" /> {t('createAppointment')}
              </Button>
            </div>
            <div className="flex-1 bg-white rounded-lg shadow-sm border p-4 overflow-auto">
              <MonthlyCalendar />
            </div>
          </div>
        )}

        {/* Sağ Panel - Randevu Takvimi (günlük görünümler) */}
        {calendarView !== 'monthly' && (
        <div className="flex-grow bg-white rounded-lg shadow-sm overflow-hidden border">
          <div className="h-full overflow-auto">

            {/* ═══ ODA GÖRÜNÜMÜ ═══ */}
            {calendarView === 'room' && (
              <div className="flex h-full">
                {/* Sol: Sürüklenebilir Uzman Sidebar */}
                <StaffSidebar
                  experts={experts}
                  onDragStart={(exp) => setDraggingExpert(exp)}
                  onDragEnd={() => { setDraggingExpert(null); setDragOverSpaceId(null); }}
                  compact
                />
                {/* Sağ: Oda Takvimi */}
                <div className="flex-1 overflow-auto">
                  <RoomCalendarGrid
                    spaces={spaces}
                    appointments={appointments}
                    appointmentResources={appointmentResources}
                    timeSlots={timeSlots}
                    experts={experts}
                    onAppointmentClick={(app) => openReorderPanel(app)}
                    ROW_HEIGHT={ROW_HEIGHT}
                    PIXELS_PER_MINUTE={PIXELS_PER_MINUTE}
                    onExpertDrop={handleExpertDropToRoom}
                    dragOverSpaceId={dragOverSpaceId}
                    onDragOver={(spaceId) => setDragOverSpaceId(spaceId)}
                    onDragLeave={() => setDragOverSpaceId(null)}
                    onWalkIn={handleWalkIn}
                    onWalkOut={handleWalkOut}
                  />
                </div>
              </div>
            )}

            {/* ═══ UZMAN GÖRÜNÜMÜ (mevcut) ═══ */}
            {calendarView === 'expert' && (
            <div className="flex">
              {/* Saat Sütunu */}
              <div className="w-14 flex-shrink-0 bg-gray-50 border-r sticky left-0 z-10">
                <div className="h-8 border-b bg-white"></div>
                {timeSlots.map((time, index) => (
                  <div
                    key={time}
                    style={{ height: `${ROW_HEIGHT}px` }}
                    className={`text-right pr-1 text-[10px] text-slate-500 flex items-start pt-0.5 ${index % 6 === 0 ? 'border-t border-slate-200' : ''}`}
                  >
                    {index % 6 === 0 ? time : ''}
                  </div>
                ))}
              </div>

              {/* Uzman Sütunları */}
              <div className="flex-grow grid relative" style={{ gridTemplateColumns: `repeat(${Math.max(experts.length, company?.expert_limit || 6)}, 160px)` }}>
                <TimeIndicator companyTimezone={companyTimezone} />

                {/* Uzman sütunları + boş sütunlar (limit kadar) */}
                {Array.from({ length: Math.max(experts.length, company?.expert_limit || 6) }).map((_, colIdx) => {
                  const expert = experts[colIdx];
                  if (!expert) {
                    // Boş sütun — uzman yok
                    return (
                      <div key={`empty-${colIdx}`} className="border-l relative">
                        <div className="h-8 sticky top-0 z-30 border-b bg-white/95 flex items-center justify-center">
                          <span className="text-[10px] text-slate-300">—</span>
                        </div>
                        <div className="relative" style={{ height: `${19 * 6 * ROW_HEIGHT}px` }}>
                          {timeSlots.map((_, i) => (
                            <div key={i} className="border-b border-gray-100" style={{ height: `${ROW_HEIGHT * 6}px` }} />
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // Mevcut uzman sütunu
                  return (() => {
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

                    {/* Zaman Grid'i — sadece saat başı çizgileri */}
                    <div className="relative" style={{ height: `${timeSlots.length * ROW_HEIGHT}px` }}>
                      {timeSlots.map((time, index) => (
                        <div
                          key={index}
                          style={{ height: `${ROW_HEIGHT}px` }}
                          className={index % 6 === 0 ? 'border-t border-slate-200' : ''}
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
                              className={`absolute left-0 w-[95%] px-0.5 z-10 ${
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
                  })();
                })}
              </div>
            </div>
            )}
            {/* ═══ UZMAN GÖRÜNÜMÜ SONU ═══ */}

          </div>
        </div>
        )}
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

              {/* Hizmet ekleme/çıkarma — düzenlenebilir */}
              <div className="w-full mt-1 rounded-xl border bg-slate-50 overflow-hidden">
                <p className="text-xs font-medium text-slate-500 px-4 pt-2 pb-1">{t('selectServices') || 'Hizmet Seçin (birden fazla seçebilirsiniz)'}</p>
                <div className="max-h-48 overflow-y-auto px-2 pb-2 space-y-1">
                  {services.map(svc => {
                    const isSelected = selectedAppointment.appointment_services?.some(as => as.service_id === svc.id);
                    const assignedExpert = selectedAppointment.appointment_services?.find(as => as.service_id === svc.id);
                    return (
                      <label
                        key={svc.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                          isSelected ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedAppointment(prev => {
                              const currentServices = prev.appointment_services || [];
                              if (isSelected) {
                                // Çıkar
                                return {
                                  ...prev,
                                  appointment_services: currentServices.filter(as => as.service_id !== svc.id),
                                  _servicesChanged: true,
                                };
                              } else {
                                // Ekle
                                return {
                                  ...prev,
                                  appointment_services: [...currentServices, {
                                    service_id: svc.id,
                                    expert_id: prev.expert_id || null,
                                    company_services: { id: svc.id, description: svc.description, duration: svc.duration, price: svc.price },
                                  }],
                                  _servicesChanged: true,
                                };
                              }
                            });
                          }}
                          className="w-4 h-4 rounded accent-emerald-600 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-slate-800">{svc.description}</span>
                          <span className="text-xs text-slate-400 ml-2">{svc.duration} dk</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-600">{parseFloat(svc.price).toFixed(0)} ₺</span>
                        {isSelected && assignedExpert?.expert_id && (() => {
                          const exp = experts.find(e => e.id === assignedExpert.expert_id);
                          return exp ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium text-white" style={{ backgroundColor: exp.color || '#6B7280' }}>
                              {exp.name}
                            </span>
                          ) : null;
                        })()}
                      </label>
                    );
                  })}
                </div>
                {selectedAppointment.appointment_services?.length > 0 && (
                  <div className="px-4 py-1.5 bg-emerald-50 border-t border-emerald-100 flex justify-between text-xs">
                    <span className="text-emerald-700 font-medium">
                      {t('totalDuration') || 'Toplam Süre'}: {selectedAppointment.appointment_services.reduce((sum, as) => sum + (as.company_services?.duration || 0), 0)} dk
                    </span>
                    <span className="text-emerald-700 font-bold">
                      {selectedAppointment.appointment_services.reduce((sum, as) => sum + (parseFloat(as.company_services?.price) || 0), 0).toFixed(0)} ₺
                    </span>
                  </div>
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
              {/* İptal Et butonu — iptal sebebi zorunlu dialog */}
              <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="mr-auto" onClick={() => { setCancelReason(''); setCancelNote(''); setShowCancelDialog(true); }}>
                    <Ban className="w-4 h-4 mr-2" /> {t('cancelAppointment') || 'İptal Et'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('cancelAppointment') || 'Randevu İptal'}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('cancelAppointmentDesc') || 'Bu randevu iptal edilecek. İptal sebebi seçin:'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-white text-sm"
                  >
                    <option value="">{t('selectCancelReason') || '— İptal sebebi seçin —'}</option>
                    <option value="musteri_iptal">{t('cancelReason.customerCancel') || 'Müşteri iptal etti'}</option>
                    <option value="musteri_gelmedi">{t('cancelReason.noShow') || 'Müşteri gelmedi'}</option>
                    <option value="uzman_musait_degil">{t('cancelReason.expertUnavailable') || 'Uzman müsait değil'}</option>
                    <option value="diger">{t('cancelReason.other') || 'Diğer'}</option>
                  </select>
                  {cancelReason === 'diger' && (
                    <textarea
                      value={cancelNote}
                      onChange={(e) => setCancelNote(e.target.value)}
                      placeholder={t('cancelNotePlaceholder') || 'İptal sebebini açıklayın...'}
                      className="w-full px-4 py-2.5 rounded-xl border bg-white text-sm resize-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all"
                      rows={3}
                      maxLength={500}
                    />
                  )}
                  {selectedAppointment?.payment_status === 'paid' && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <p className="text-xs text-amber-700">
                        {t('cancelPaidWarning') || 'Bu randevu ödenmiş! İptal edilirse ödeme iade edilmeli.'}
                      </p>
                    </div>
                  )}
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setShowCancelDialog(false)}>{t('close') || 'Vazgeç'}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelAppointment}
                      disabled={!cancelReason || (cancelReason === 'diger' && !cancelNote.trim())}
                      className={(!cancelReason || (cancelReason === 'diger' && !cancelNote.trim())) ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      {t('confirmCancel') || 'İptal Et'}
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
        currentUserId={selectedExpert?.id || null}
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