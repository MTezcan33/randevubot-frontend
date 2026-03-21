import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { usePanelAuth } from '../../contexts/PanelAuthContext';
import { Users, CheckCircle, UserCheck, Plus, Loader2, CalendarDays, Filter } from 'lucide-react';

const STATUS_COLORS = {
  beklemede: 'bg-amber-100 text-amber-800',
  onaylandı: 'bg-emerald-100 text-emerald-800',
  iptal: 'bg-red-100 text-red-800',
};

export default function ResepsiyonistRandevular() {
  const { t } = useTranslation();
  const { company } = usePanelAuth();
  const [appointments, setAppointments] = useState([]);
  const [experts, setExperts] = useState([]);
  const [selectedExpert, setSelectedExpert] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  // Uzmanları ve randevuları getir
  const fetchData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      // Uzmanları getir
      const { data: staffData } = await supabase
        .from('company_users')
        .select('id, name, color, role')
        .eq('company_id', company.id)
        .eq('role', 'Uzman');
      setExperts(staffData || []);

      // Bugünkü randevuları getir
      let query = supabase
        .from('appointments')
        .select(`
          id, date, time, duration, status, expert_id, notes,
          customers(id, name, phone),
          company_users!appointments_expert_id_fkey(id, name, color),
          appointment_services(company_services(description))
        `)
        .eq('company_id', company.id)
        .eq('date', today)
        .order('time', { ascending: true });

      if (selectedExpert !== 'all') {
        query = query.eq('expert_id', selectedExpert);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error('Veri getirme hatası:', err);
    } finally {
      setLoading(false);
    }
  }, [company?.id, today, selectedExpert]);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  // Özet sayılar
  const total = appointments.length;
  const confirmed = appointments.filter((a) => a.status === 'onaylandı').length;
  const pending = appointments.filter((a) => a.status === 'beklemede').length;

  return (
    <div className="min-h-screen bg-stone-50 pb-6">
      {/* Başlık */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 pt-6 pb-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold">{t('todayAppointments') || 'Bugünkü Randevular'}</h1>
          <a
            href="/dashboard/appointments"
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white/20 text-sm min-h-[44px] active:bg-white/30"
          >
            <Plus className="w-4 h-4" />
            {t('new') || 'Yeni'}
          </a>
        </div>
        {/* Özet */}
        <div className="flex gap-3 text-center">
          <div className="flex-1 bg-white/10 rounded-lg py-2">
            <p className="text-xl font-bold">{total}</p>
            <p className="text-xs text-emerald-100">{t('total') || 'Toplam'}</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-lg py-2">
            <p className="text-xl font-bold">{confirmed}</p>
            <p className="text-xs text-emerald-100">{t('confirmed') || 'Onaylı'}</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-lg py-2">
            <p className="text-xl font-bold">{pending}</p>
            <p className="text-xs text-emerald-100">{t('pending') || 'Bekleyen'}</p>
          </div>
        </div>
      </div>

      {/* Uzman filtresi */}
      <div className="px-4 mt-4 mb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedExpert('all')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium min-h-[44px] border transition-colors ${
              selectedExpert === 'all'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-stone-600 border-stone-200 active:bg-stone-50'
            }`}
          >
            <Users className="w-4 h-4 inline mr-1" />
            {t('allExperts') || 'Tümü'}
          </button>
          {experts.map((exp) => (
            <button
              key={exp.id}
              onClick={() => setSelectedExpert(exp.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium min-h-[44px] border transition-colors ${
                selectedExpert === exp.id
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-stone-600 border-stone-200 active:bg-stone-50'
              }`}
            >
              {exp.color && (
                <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: exp.color }} />
              )}
              {exp.name}
            </button>
          ))}
        </div>
      </div>

      {/* Randevu listesi */}
      <div className="px-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t('noAppointments') || 'Bugün randevu yok'}</p>
          </div>
        ) : (
          appointments.map((appt) => {
            const expertColor = appt.company_users?.color || '#6B7280';
            const services = appt.appointment_services?.map(
              (as) => as.company_services?.description
            ).filter(Boolean).join(', ') || '-';
            const isUpdating = updating === appt.id;

            return (
              <div
                key={appt.id}
                className="bg-white rounded-xl border shadow-sm p-4"
                style={{ borderLeftWidth: '4px', borderLeftColor: expertColor }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-semibold text-stone-800">{appt.time?.slice(0, 5)}</span>
                    <span className="text-xs text-stone-400 ml-2">{appt.company_users?.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[appt.status] || ''}`}>
                    {appt.status}
                  </span>
                </div>

                <p className="text-sm font-medium text-stone-700">{appt.customers?.name || '-'}</p>
                <p className="text-xs text-stone-500 mb-3">{services}</p>

                {/* Aksiyonlar */}
                <div className="flex items-center gap-2">
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
                      onClick={async () => {
                        setUpdating(appt.id);
                        try {
                          const checkInNote = `Geldi: ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
                          await supabase.from('appointments').update({ notes: checkInNote }).eq('id', appt.id);
                          setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, notes: checkInNote } : a));
                        } catch (err) { console.error(err); } finally { setUpdating(null); }
                      }}
                      disabled={isUpdating || appt.notes?.startsWith('Geldi:')}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-white text-xs min-h-[44px] disabled:opacity-50 ${appt.notes?.startsWith('Geldi:') ? 'bg-gray-400' : 'bg-teal-600 active:bg-teal-700'}`}
                    >
                      {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                      {appt.notes?.startsWith('Geldi:') ? appt.notes : (t('checkIn') || 'Geldi')}
                    </button>
                  )}
                  {appt.customers?.phone && (
                    <a
                      href={`tel:${appt.customers.phone}`}
                      className="ml-auto flex items-center gap-1 px-3 py-2 rounded-lg bg-stone-100 text-stone-600 text-xs min-h-[44px]"
                    >
                      {t('call') || 'Ara'}
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
