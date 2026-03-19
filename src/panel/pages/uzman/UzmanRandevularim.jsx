import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { usePanelAuth } from '../../contexts/PanelAuthContext';
import { Phone, Filter, CheckCircle, XCircle, Loader2, CalendarDays } from 'lucide-react';

const STATUS_COLORS = {
  beklemede: 'bg-amber-100 text-amber-800',
  onaylandı: 'bg-emerald-100 text-emerald-800',
  iptal: 'bg-red-100 text-red-800',
};

const FILTERS = [
  { key: 'today', label: 'Bugün' },
  { key: 'week', label: 'Bu Hafta' },
  { key: 'all', label: 'Tümü' },
];

export default function UzmanRandevularim() {
  const { t } = useTranslation();
  const { panelUser, company } = usePanelAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('today');
  const [updating, setUpdating] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  // Randevuları getir
  const fetchAppointments = useCallback(async () => {
    if (!panelUser?.id || !company?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from('appointments')
        .select(`
          id, date, time, duration, status, notes,
          customers(id, name, phone),
          appointment_services(company_services(description))
        `)
        .eq('company_id', company.id)
        .eq('expert_id', panelUser.id)
        .gte('date', today)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (filter === 'today') {
        query = query.eq('date', today);
      } else if (filter === 'week') {
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() + 7);
        query = query.lte('date', weekEnd.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error('Randevu getirme hatası:', err);
    } finally {
      setLoading(false);
    }
  }, [panelUser?.id, company?.id, filter, today]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // Durum güncelle
  const updateStatus = async (id, newStatus) => {
    setUpdating(id);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      );
    } catch (err) {
      console.error('Durum güncelleme hatası:', err);
    } finally {
      setUpdating(null);
    }
  };

  // Tarih grupla
  const grouped = appointments.reduce((acc, appt) => {
    const dateKey = appt.date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(appt);
    return acc;
  }, {});

  const formatDateHeader = (dateStr) => {
    if (dateStr === today) return t('today') || 'Bugün';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-6">
      {/* Başlık */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 pt-6 pb-4 text-white">
        <h1 className="text-lg font-bold mb-3">{t('myAppointments') || 'Randevularım'}</h1>
        {/* Filtre */}
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${
                filter === f.key
                  ? 'bg-white text-emerald-700'
                  : 'bg-white/20 text-white active:bg-white/30'
              }`}
            >
              {t(f.key) || f.label}
            </button>
          ))}
        </div>
      </div>

      {/* İçerik */}
      <div className="px-4 mt-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t('noUpcomingAppointments') || 'Yaklaşan randevu yok'}</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, appts]) => (
            <div key={date} className="mb-5">
              <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                {formatDateHeader(date)}
              </h2>
              <div className="space-y-3">
                {appts.map((appt) => {
                  const services = appt.appointment_services?.map(
                    (as) => as.company_services?.description
                  ).filter(Boolean).join(', ') || '-';
                  const isUpdating = updating === appt.id;

                  return (
                    <div key={appt.id} className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="font-semibold text-stone-800">{appt.time?.slice(0, 5)}</span>
                          <span className="text-xs text-stone-400 ml-2">{appt.duration} dk</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[appt.status] || ''}`}>
                          {appt.status}
                        </span>
                      </div>

                      <p className="text-sm font-medium text-stone-700 mb-1">{appt.customers?.name || '-'}</p>
                      <p className="text-xs text-stone-500 mb-3">{services}</p>

                      {/* Telefon + Durum butonları */}
                      <div className="flex items-center gap-2">
                        {appt.customers?.phone && (
                          <a
                            href={`tel:${appt.customers.phone}`}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-stone-100 text-stone-600 text-xs min-h-[44px]"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {t('call') || 'Ara'}
                          </a>
                        )}
                        <div className="flex-1" />
                        {appt.status === 'beklemede' && (
                          <button
                            onClick={() => updateStatus(appt.id, 'onaylandı')}
                            disabled={isUpdating}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs min-h-[44px] active:bg-emerald-700 disabled:opacity-50"
                          >
                            {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            {t('confirm') || 'Onayla'}
                          </button>
                        )}
                        {appt.status === 'onaylandı' && (
                          <button
                            onClick={() => updateStatus(appt.id, 'iptal')}
                            disabled={isUpdating}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500 text-white text-xs min-h-[44px] active:bg-red-600 disabled:opacity-50"
                          >
                            {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                            {t('cancel') || 'İptal'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
