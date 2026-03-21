// Müşteri profil sistemi servis katmanı
import { supabase } from '../lib/supabase';

/**
 * Müşteri listesini zengin verilerle getir
 * (denormalize alanlar: last_visit_date, total_visits, total_spent)
 */
export const getCustomersWithStats = async (companyId, filters = {}) => {
  let query = supabase
    .from('customers')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (filters.isVip === true) query = query.eq('is_vip', true);
  if (filters.tag) query = query.contains('tags', [filters.tag]);
  if (filters.searchQuery) {
    const q = filters.searchQuery.trim();
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Müşterinin randevu geçmişini getir (detaylı: hizmetler, uzman, ödeme bilgisi)
 */
export const getCustomerAppointments = async (customerId, companyId) => {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, date, time, status, total_duration, notes, created_at,
      payment_status, total_amount, paid_amount, cancel_reason, cancelled_at,
      company_services(id, description, duration, price, category, color),
      company_users!appointments_expert_id_fkey(id, name, color),
      appointment_services(service_id, expert_id, company_services(id, description, duration, price, category, color))
    `)
    .eq('customer_id', customerId)
    .eq('company_id', companyId)
    .order('date', { ascending: false })
    .order('time', { ascending: false });

  if (error) throw error;

  // Her randevu için ödeme bilgisini de çek
  const appointmentIds = (data || []).map(a => a.id);
  let payments = {};
  if (appointmentIds.length > 0) {
    const { data: txData } = await supabase
      .from('transactions')
      .select('appointment_id, amount, payment_method, transaction_date')
      .in('appointment_id', appointmentIds)
      .eq('type', 'income');

    if (txData) {
      txData.forEach(tx => {
        payments[tx.appointment_id] = tx;
      });
    }
  }

  // Randevulara ödeme bilgisini ekle
  return (data || []).map(appt => ({
    ...appt,
    payment: payments[appt.id] || null,
  }));
};

/**
 * Müşterinin geri bildirimlerini getir
 */
export const getCustomerFeedback = async (customerId, companyId) => {
  const { data, error } = await supabase
    .from('customer_feedback')
    .select(`
      id, rating, comment, status, admin_response, created_at,
      appointments(date, time, company_services(description))
    `)
    .eq('customer_id', customerId)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Geri bildirime admin yanıtı kaydet
 */
export const respondToFeedback = async (feedbackId, adminResponse, status = 'resolved') => {
  const { error } = await supabase
    .from('customer_feedback')
    .update({ admin_response: adminResponse, status })
    .eq('id', feedbackId);

  if (error) throw error;
};

/**
 * Müşteri istatistiklerini yeniden hesapla (client-side)
 */
export const recalculateStats = async (customerId, companyId) => {
  try {
    // Tüm randevuları çek (iptal dahil — istatistik için)
    const { data: allAppointments, error: apptErr } = await supabase
      .from('appointments')
      .select('id, date, status, cancel_reason, paid_amount, total_amount, appointment_services(service_id, company_services(price))')
      .eq('customer_id', customerId)
      .eq('company_id', companyId);

    if (apptErr) throw apptErr;

    const completed = (allAppointments || []).filter(a => a.status === 'onaylandı');
    const cancelled = (allAppointments || []).filter(a => a.status === 'iptal');
    const noShows = cancelled.filter(a => a.cancel_reason === 'musteri_gelmedi');

    const totalVisits = completed.length;

    // Harcama: paid_amount (gerçek ödenen) varsa onu kullan, yoksa hizmet fiyatlarından hesapla
    const totalSpent = completed.reduce((sum, appt) => {
      if (parseFloat(appt.paid_amount) > 0) return sum + parseFloat(appt.paid_amount);
      const apptTotal = (appt.appointment_services || []).reduce((s, as) =>
        s + (parseFloat(as.company_services?.price) || 0), 0);
      return sum + apptTotal;
    }, 0);

    // Son ziyaret tarihi
    const lastVisit = completed.length > 0
      ? completed.sort((a, b) => b.date.localeCompare(a.date))[0].date
      : null;

    // Ortalama puanı çek
    const { data: feedback } = await supabase
      .from('customer_feedback')
      .select('rating')
      .eq('customer_id', customerId)
      .eq('company_id', companyId);

    const avgRating = feedback?.length > 0
      ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length
      : null;

    // Müşteri kaydını güncelle
    const { error: updateErr } = await supabase
      .from('customers')
      .update({
        total_visits: totalVisits,
        total_spent: totalSpent,
        last_visit_date: lastVisit,
        average_rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      })
      .eq('id', customerId);

    if (updateErr) throw updateErr;

    // İptal ve no-show sayılarını da döndür (drawer'da kullanılacak)
    return { totalVisits, totalSpent, lastVisit, avgRating, cancelCount: cancelled.length, noShowCount: noShows.length };
  } catch (err) {
    console.error('Stat recalc error:', err);
    return null;
  }
};

/**
 * Müşteri etiketlerini güncelle
 */
export const updateCustomerTags = async (customerId, tags) => {
  const { error } = await supabase
    .from('customers')
    .update({ tags })
    .eq('id', customerId);
  if (error) throw error;
};

/**
 * Müşteri VIP durumunu değiştir
 */
export const toggleVip = async (customerId, isVip) => {
  const { error } = await supabase
    .from('customers')
    .update({ is_vip: isVip })
    .eq('id', customerId);
  if (error) throw error;
};

/**
 * Müşteri profil bilgilerini güncelle (bilgiler tab)
 */
export const updateCustomerProfile = async (customerId, profileData) => {
  const { error } = await supabase
    .from('customers')
    .update(profileData)
    .eq('id', customerId);
  if (error) throw error;
};
