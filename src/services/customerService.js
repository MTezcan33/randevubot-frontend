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
      company_services(id, description, duration, price, category, color),
      company_users(id, name, color),
      appointment_services(service_id, company_services(id, description, duration, price, category, color))
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
 * Müşteri istatistiklerini yeniden hesapla (RPC)
 */
export const recalculateStats = async (customerId) => {
  const { error } = await supabase.rpc('recalculate_customer_stats', {
    p_customer_id: customerId,
  });
  if (error) console.error('Stat recalc error:', error);
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
