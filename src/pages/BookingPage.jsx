import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Leaf, ChevronLeft, ChevronRight, Check, Clock, User,
  Phone, Scissors, Calendar, CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react';

// Gün isimleri — company_working_hours tablosundaki Türkçe değerlerle eşleşmeli
const DAY_NAMES_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

// Adım geçiş animasyonu
const stepVariants = {
  enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

const BookingPage = () => {
  const { companySlug } = useParams();
  const { t } = useTranslation();

  // Veri state'leri
  const [company, setCompany] = useState(null);
  const [services, setServices] = useState([]);
  const [experts, setExperts] = useState([]);
  const [workingHours, setWorkingHours] = useState([]);
  const [existingAppointments, setExistingAppointments] = useState([]);

  // UI state'leri
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state'leri
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Takvim state'i
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // --- Veri yükleme ---
  useEffect(() => {
    loadCompanyData();
  }, [companySlug]);

  const loadCompanyData = async () => {
    setLoading(true);
    try {
      // Şirketi slug ile bul
      const { data: comp, error: compErr } = await supabase
        .from('companies')
        .select('id, name, logo_url, timezone, country')
        .eq('slug', companySlug)
        .single();

      if (compErr || !comp) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCompany(comp);

      // Hizmetleri, uzmanları ve çalışma saatlerini paralel yükle
      const [servicesRes, expertsRes, hoursRes] = await Promise.all([
        supabase
          .from('company_services')
          .select('id, description, duration, price, category')
          .eq('company_id', comp.id)
          .eq('is_active', true)
          .order('category'),
        supabase
          .from('company_users')
          .select('id, name, color')
          .eq('company_id', comp.id)
          .eq('role', 'Uzman'),
        supabase
          .from('company_working_hours')
          .select('expert_id, day, start_time, end_time, is_open')
          .eq('company_id', comp.id),
      ]);

      setServices(servicesRes.data || []);
      setExperts(expertsRes.data || []);
      setWorkingHours(hoursRes.data || []);
    } catch (err) {
      console.error('Booking veri yükleme hatası:', err);
      setNotFound(true);
    }
    setLoading(false);
  };

  // Seçilen tarih değiştiğinde mevcut randevuları çek
  useEffect(() => {
    if (!selectedDate || !company) return;
    const dateStr = formatDateStr(selectedDate);
    const fetchAppointments = async () => {
      const query = supabase
        .from('appointments')
        .select('time, total_duration, expert_id, company_services(duration)')
        .eq('company_id', company.id)
        .eq('date', dateStr)
        .neq('status', 'iptal');

      if (selectedExpert) {
        query.eq('expert_id', selectedExpert);
      }
      const { data } = await query;
      setExistingAppointments(data || []);
    };
    fetchAppointments();
  }, [selectedDate, selectedExpert, company]);

  // --- Yardımcı fonksiyonlar ---
  const formatDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const totalDuration = useMemo(() => {
    return selectedServices.reduce((sum, sId) => {
      const svc = services.find((s) => s.id === sId);
      return sum + (svc?.duration || 30);
    }, 0);
  }, [selectedServices, services]);

  // Çalışma saatleri: seçilen tarihteki gün + uzman bazlı
  const dayWorkingHours = useMemo(() => {
    if (!selectedDate) return [];
    const dayName = DAY_NAMES_TR[selectedDate.getDay()];
    let filtered = workingHours.filter((wh) => wh.day === dayName && wh.is_open);
    if (selectedExpert) {
      filtered = filtered.filter((wh) => wh.expert_id === selectedExpert);
    }
    return filtered;
  }, [selectedDate, selectedExpert, workingHours]);

  // Müsait zaman dilimleri (30 dk aralıklar)
  const availableSlots = useMemo(() => {
    if (!dayWorkingHours.length || !selectedDate) return [];

    const slots = [];
    const today = new Date();
    const isToday =
      selectedDate.getFullYear() === today.getFullYear() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getDate() === today.getDate();

    dayWorkingHours.forEach((wh) => {
      const [startH, startM] = wh.start_time.split(':').map(Number);
      const [endH, endM] = wh.end_time.split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;

      for (let m = startMin; m + totalDuration <= endMin; m += 30) {
        // Bugünse geçmiş saatleri atla
        if (isToday) {
          const nowMin = today.getHours() * 60 + today.getMinutes();
          if (m <= nowMin) continue;
        }

        // Mevcut randevularla çakışma kontrolü
        const slotEnd = m + totalDuration;
        const hasConflict = existingAppointments.some((appt) => {
          const [ah, am] = (appt.time || '00:00').split(':').map(Number);
          const apptStart = ah * 60 + am;
          const apptDur = appt.total_duration || appt.company_services?.duration || 60;
          const apptEnd = apptStart + apptDur;
          return m < apptEnd && slotEnd > apptStart;
        });

        if (!hasConflict) {
          const h = Math.floor(m / 60).toString().padStart(2, '0');
          const min = (m % 60).toString().padStart(2, '0');
          slots.push(`${h}:${min}`);
        }
      }
    });

    return slots;
  }, [dayWorkingHours, existingAppointments, totalDuration, selectedDate]);

  // Takvimde gün seçilebilir mi kontrolü
  const isDayAvailable = (date) => {
    const dayName = DAY_NAMES_TR[date.getDay()];
    let filtered = workingHours.filter((wh) => wh.day === dayName && wh.is_open);
    if (selectedExpert) {
      filtered = filtered.filter((wh) => wh.expert_id === selectedExpert);
    }
    return filtered.length > 0;
  };

  // --- Randevu gönderimi ---
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Müşteri bul veya oluştur
      let customerId;
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('company_id', company.id)
        .eq('phone', customerPhone)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({
            company_id: company.id,
            name: customerName.toUpperCase(),
            phone: customerPhone,
          })
          .select('id')
          .single();
        if (custErr) throw custErr;
        customerId = newCust.id;
      }

      // Randevu oluştur
      const primaryServiceId = selectedServices[0];
      const { data: appt, error: apptErr } = await supabase
        .from('appointments')
        .insert({
          company_id: company.id,
          customer_id: customerId,
          expert_id: selectedExpert || (experts.length === 1 ? experts[0].id : null),
          service_id: primaryServiceId,
          date: formatDateStr(selectedDate),
          time: selectedTime + ':00',
          total_duration: totalDuration,
          status: 'beklemede',
          source: 'online_booking',
        })
        .select('id')
        .single();
      if (apptErr) throw apptErr;

      // Çoklu hizmet varsa appointment_services tablosuna ekle
      if (selectedServices.length > 1) {
        const apptServices = selectedServices.map((sId) => ({
          appointment_id: appt.id,
          service_id: sId,
        }));
        await supabase.from('appointment_services').insert(apptServices);
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Randevu oluşturma hatası:', err);
    }
    setSubmitting(false);
  };

  // --- Adım navigasyonu ---
  const goNext = () => {
    setDirection(1);
    setStep((s) => s + 1);
  };
  const goBack = () => {
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const canGoNext = () => {
    if (step === 0) return selectedServices.length > 0;
    if (step === 1) return selectedDate !== null;
    if (step === 2) return selectedTime !== null;
    if (step === 3) return customerName.trim() && customerPhone.trim().length >= 7;
    return false;
  };

  // --- Takvim render ---
  const renderCalendar = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Max 30 gün ileri
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);

    const dayHeaders = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];
    const cells = [];

    // Boş hücreler
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isPast = date < today;
      const isFuture = date > maxDate;
      const isAvailable = !isPast && !isFuture && isDayAvailable(date);
      const isSelected =
        selectedDate &&
        selectedDate.getFullYear() === year &&
        selectedDate.getMonth() === month &&
        selectedDate.getDate() === d;

      cells.push(
        <button
          key={d}
          disabled={!isAvailable}
          onClick={() => {
            setSelectedDate(date);
            setSelectedTime(null);
          }}
          className={`
            w-10 h-10 rounded-lg text-sm font-medium transition-all
            ${isSelected ? 'bg-emerald-600 text-white shadow-md' : ''}
            ${isAvailable && !isSelected ? 'hover:bg-emerald-50 text-stone-700' : ''}
            ${!isAvailable ? 'text-stone-300 cursor-not-allowed' : ''}
          `}
        >
          {d}
        </button>
      );
    }

    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
    ];

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}
            className="p-1 rounded hover:bg-stone-100"
          >
            <ChevronLeft className="w-5 h-5 text-stone-500" />
          </button>
          <span className="font-semibold text-stone-700">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}
            className="p-1 rounded hover:bg-stone-100"
          >
            <ChevronRight className="w-5 h-5 text-stone-500" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {dayHeaders.map((dh) => (
            <div key={dh} className="text-xs font-medium text-stone-400 py-1">
              {dh}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 place-items-center">{cells}</div>
      </div>
    );
  };

  // --- Yükleniyor ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // --- Bulunamadı ---
  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-stone-700 mb-2">Salon bulunamadı</h1>
          <p className="text-stone-500">Bu bağlantı geçersiz veya salon artık aktif değil.</p>
        </div>
      </div>
    );
  }

  // --- Onay ekranı ---
  if (submitted) {
    const expertName = experts.find((e) => e.id === selectedExpert)?.name;
    const serviceNames = selectedServices.map((sId) => services.find((s) => s.id === sId)?.description).filter(Boolean);

    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-800 mb-2">{t('bookingSuccess')}</h2>
          <p className="text-stone-500 mb-6">{t('bookingConfirmNotice')}</p>
          <div className="bg-stone-50 rounded-xl p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">{t('serviceLabel')}</span>
              <span className="font-medium text-stone-700">{serviceNames.join(', ')}</span>
            </div>
            {expertName && (
              <div className="flex justify-between">
                <span className="text-stone-500">{t('expertLabel')}</span>
                <span className="font-medium text-stone-700">{expertName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-stone-500">{t('dateLabel')}</span>
              <span className="font-medium text-stone-700">
                {selectedDate?.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">{t('timeLabel')}</span>
              <span className="font-medium text-stone-700">{selectedTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">{t('durationLabel')}</span>
              <span className="font-medium text-stone-700">{totalDuration} dk</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- Adım başlıkları ---
  const steps = [
    { icon: <Scissors className="w-4 h-4" />, label: t('service') },
    { icon: <Calendar className="w-4 h-4" />, label: t('date') },
    { icon: <Clock className="w-4 h-4" />, label: t('timeLabel') },
    { icon: <User className="w-4 h-4" />, label: t('info') },
  ];

  // --- Ana render ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-stone-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-emerald-600" />
            </div>
          )}
          <div>
            <h1 className="font-bold text-stone-800 text-lg leading-tight">{company.name}</h1>
            <p className="text-xs text-stone-400">{t('onlineBooking')}</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-lg mx-auto px-4 pt-6 pb-2">
        <div className="flex items-center justify-between mb-6">
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all text-sm font-medium ${
                    i < step
                      ? 'bg-emerald-600 text-white'
                      : i === step
                      ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300'
                      : 'bg-stone-100 text-stone-400'
                  }`}
                >
                  {i < step ? <Check className="w-4 h-4" /> : s.icon}
                </div>
                <span className={`text-[10px] ${i <= step ? 'text-emerald-700 font-medium' : 'text-stone-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 rounded ${i < step ? 'bg-emerald-400' : 'bg-stone-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Adım içerikleri */}
      <div className="max-w-lg mx-auto px-4 pb-32">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            {/* ADIM 0: Hizmet seçimi */}
            {step === 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
                <h2 className="text-lg font-bold text-stone-800 mb-1">{t('selectService')}</h2>
                <p className="text-sm text-stone-400 mb-4">{t('selectMultipleServices')}</p>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {services.map((svc) => {
                    const isSelected = selectedServices.includes(svc.id);
                    return (
                      <button
                        key={svc.id}
                        onClick={() =>
                          setSelectedServices((prev) =>
                            isSelected ? prev.filter((id) => id !== svc.id) : [...prev, svc.id]
                          )
                        }
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200'
                            : 'border-stone-100 hover:border-stone-200'
                        }`}
                      >
                        <div className="text-left">
                          <p className="font-medium text-stone-700 text-sm">{svc.description}</p>
                          <p className="text-xs text-stone-400">
                            {svc.duration} dk {svc.category && `· ${svc.category}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {svc.price > 0 && (
                            <span className="text-sm font-semibold text-emerald-700">
                              {svc.price}₺
                            </span>
                          )}
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-stone-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {selectedServices.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-stone-100 flex justify-between text-sm">
                    <span className="text-stone-500">{selectedServices.length} hizmet · {totalDuration} dk</span>
                    <span className="font-semibold text-emerald-700">
                      {selectedServices.reduce((sum, sId) => {
                        const svc = services.find((s) => s.id === sId);
                        return sum + (svc?.price || 0);
                      }, 0)}₺
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ADIM 1: Uzman & Tarih seçimi */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Uzman seçimi (opsiyonel) */}
                {experts.length > 1 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
                    <h2 className="text-lg font-bold text-stone-800 mb-3">{t('expertPreference')}</h2>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setSelectedExpert(null);
                          setSelectedTime(null);
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          !selectedExpert
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {t('noPreference')}
                      </button>
                      {experts.map((exp) => (
                        <button
                          key={exp.id}
                          onClick={() => {
                            setSelectedExpert(exp.id);
                            setSelectedTime(null);
                          }}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            selectedExpert === exp.id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          {exp.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tarih seçimi */}
                <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
                  <h2 className="text-lg font-bold text-stone-800 mb-3">{t('selectDate')}</h2>
                  {renderCalendar()}
                </div>
              </div>
            )}

            {/* ADIM 2: Saat seçimi */}
            {step === 2 && (
              <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
                <h2 className="text-lg font-bold text-stone-800 mb-1">{t('selectTime')}</h2>
                <p className="text-sm text-stone-400 mb-4">
                  {selectedDate?.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
                </p>
                {availableSlots.length === 0 ? (
                  <div className="text-center py-8 text-stone-400">
                    <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('noAvailableTime')}</p>
                    <p className="text-xs mt-1">{t('pleaseSelectAnotherDate')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedTime(slot)}
                        className={`py-3 rounded-xl text-sm font-medium transition-all ${
                          selectedTime === slot
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-stone-50 text-stone-700 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ADIM 3: Müşteri bilgileri */}
            {step === 3 && (
              <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
                <h2 className="text-lg font-bold text-stone-800 mb-1">{t('yourInfo')}</h2>
                <p className="text-sm text-stone-400 mb-5">{t('enterContactInfo')}</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-600 mb-1.5">{t('fullName')}</label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value.toUpperCase())}
                      placeholder={t('fullNamePlaceholder')}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-600 mb-1.5">{t('phone')}</label>
                    <Input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+90 5XX XXX XXXX"
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>

                {/* Özet */}
                <div className="mt-6 bg-stone-50 rounded-xl p-4 space-y-2 text-sm">
                  <p className="font-medium text-stone-700 mb-2">{t('appointmentSummary')}</p>
                  <div className="flex justify-between">
                    <span className="text-stone-500">{t('serviceLabel')}</span>
                    <span className="text-stone-700 text-right max-w-[60%]">
                      {selectedServices.map((sId) => services.find((s) => s.id === sId)?.description).join(', ')}
                    </span>
                  </div>
                  {selectedExpert && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">{t('expertLabel')}</span>
                      <span className="text-stone-700">{experts.find((e) => e.id === selectedExpert)?.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-stone-500">{t('dateLabel')}</span>
                    <span className="text-stone-700">
                      {selectedDate?.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">{t('timeLabel')}</span>
                    <span className="text-stone-700">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">{t('totalDurationLabel')}</span>
                    <span className="text-stone-700">{totalDuration} dk</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Alt butonlar — sabit */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 p-4 z-20">
        <div className="max-w-lg mx-auto flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={goBack} className="flex-1 h-12 rounded-xl">
              <ChevronLeft className="w-4 h-4 mr-1" /> {t('back')}
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={goNext}
              disabled={!canGoNext()}
              className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {t('continue')} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canGoNext() || submitting}
              className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              {submitting ? t('submitting') : t('bookAppointment')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
