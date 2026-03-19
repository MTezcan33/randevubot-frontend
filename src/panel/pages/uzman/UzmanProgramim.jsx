import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { usePanelAuth } from '../../contexts/PanelAuthContext';
import { Calendar, Clock, User, RefreshCw, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

// Durum renkleri
const STATUS_COLORS = {
  beklemede: 'bg-amber-100 text-amber-800 border-amber-300',
  onaylandı: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  iptal: 'bg-red-100 text-red-800 border-red-300',
};

export default function UzmanProgramim() {
  const { t } = useTranslation();
  const { panelUser, company } = usePanelAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Randevuları getir
  const fetchAppointments = useCallback(async () => {
    if (!panelUser?.id || !company?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('appointments')
        .select(`
          id, date, time, duration, status, notes,
          customers(id, name, phone),
          appointment_services(company_services(description, price))
        `)
        .eq('company_id', company.id)
        .eq('expert_id', panelUser.id)
        .eq('date', selectedDate)
        .order('time', { ascending: true });

      if (fetchErr) throw fetchErr;
      setAppointments(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [panelUser?.id, company?.id, selectedDate]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // Tarih gezinme
  const changeDate = (offset) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // Tarih formatla
  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-6">
      {/* Başlık */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 pt-6 pb-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold">{t('mySchedule') || 'Programım'}</h1>
          <button
            onClick={fetchAppointments}
            className="p-2 rounded-full bg-white/20 active:bg-white/30 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {/* Tarih seçici */}
        <div className="flex items-center justify-between bg-white/10 rounded-xl px-2 py-1">
          <button onClick={() => changeDate(-1)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white text-center text-sm border-none outline-none [color-scheme:dark]"
            />
            <p className="text-xs text-emerald-100">{isToday ? (t('today') || 'Bugün') : formatDate(selectedDate)}</p>
          </div>
          <button onClick={() => changeDate(1)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* İçerik */}
      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 text-sm">{error}</div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t('noAppointments') || 'Bu tarihte randevu yok'}</p>
          </div>
        ) : (
          appointments.map((appt) => {
            const services = appt.appointment_services?.map(
              (as) => as.company_services?.description
            ).filter(Boolean).join(', ') || '-';

            return (
              <div key={appt.id} className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-stone-800">{appt.time?.slice(0, 5)}</span>
                    <span className="text-xs text-stone-400">{appt.duration} dk</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[appt.status] || 'bg-stone-100 text-stone-600'}`}>
                    {appt.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-stone-400" />
                  <span className="text-sm font-medium text-stone-700">{appt.customers?.name || '-'}</span>
                </div>
                <p className="text-xs text-stone-500 ml-6">{services}</p>
                {appt.notes && (
                  <p className="text-xs text-stone-400 mt-2 italic">{appt.notes}</p>
                )}
              </div>
            );
          })
        )}

        {/* Randevu sayısı */}
        {!loading && appointments.length > 0 && (
          <p className="text-center text-xs text-stone-400 pt-2">
            {appointments.length} {t('appointment') || 'randevu'}
          </p>
        )}
      </div>
    </div>
  );
}
