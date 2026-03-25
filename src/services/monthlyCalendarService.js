/**
 * Monthly Calendar Service
 * Aylik doluluk verisi hesaplama ve gun bazli randevu getirme
 */

import { supabase } from '../lib/supabase';
import { timeToMinutes } from './availabilityService';

/**
 * Bir ay boyunca tum randevulari tek sorguda ceker
 */
export async function fetchMonthlyAppointments(companyId, year, month) {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, date, time, total_duration, status, expert_id, space_id,
      company_services ( id, duration, requires_expert, category )
    `)
    .eq('company_id', companyId)
    .gte('date', startDate)
    .lte('date', endDate)
    .neq('status', 'iptal');

  if (error) {
    console.error('Aylik randevular alinamadi:', error);
    return [];
  }
  return data || [];
}

/**
 * Gun bazli doluluk yuzdeleri hesaplar
 * @returns {Object} { "YYYY-MM-DD": { massagePercent, facilityPercent, totalCount, massageCount, facilityCount } }
 */
export function computeDailyOccupancy(appointments, workingHours, experts, spaces) {
  // Gun bazli gruplama
  const byDay = {};

  appointments.forEach(apt => {
    const day = apt.date;
    if (!byDay[day]) {
      byDay[day] = { massage: [], facility: [], total: 0 };
    }

    const isExpertService = apt.company_services?.requires_expert !== false;
    const duration = apt.total_duration || apt.company_services?.duration || 60;

    if (isExpertService) {
      byDay[day].massage.push({ duration, expertId: apt.expert_id });
    } else {
      byDay[day].facility.push({ duration, spaceId: apt.space_id });
    }
    byDay[day].total++;
  });

  // Her gun icin yuzde hesapla
  const result = {};
  const activeExperts = experts.filter(e => e.role === 'Uzman');
  const activeSpaces = spaces.filter(s => s.is_active);

  Object.entries(byDay).forEach(([dateStr, data]) => {
    const dayDate = new Date(dateStr);
    const dayOfWeek = dayDate.getDay(); // 0=Paz, 1=Pzt, ...

    // Uzman kapasitesi: her uzmanin o gunku calisma dakikasi toplami
    let totalExpertMinutes = 0;
    activeExperts.forEach(expert => {
      const wh = workingHours.find(
        h => h.expert_id === expert.id && h.day === dayOfWeek && h.is_open
      );
      if (wh && wh.start_time && wh.end_time) {
        totalExpertMinutes += timeToMinutes(wh.end_time) - timeToMinutes(wh.start_time);
      }
    });

    // Alan kapasitesi: her alanin calisma saati * kapasitesi
    let totalSpaceMinutes = 0;
    activeSpaces.forEach(space => {
      // Basit hesaplama: 08:00-21:00 = 780dk * kapasite
      const dailyMinutes = 780;
      totalSpaceMinutes += dailyMinutes * (space.capacity || 1);
    });

    // Kullanilan dakikalar
    const usedMassageMinutes = data.massage.reduce((sum, a) => sum + a.duration, 0);
    const usedFacilityMinutes = data.facility.reduce((sum, a) => sum + a.duration, 0);

    result[dateStr] = {
      massagePercent: totalExpertMinutes > 0
        ? Math.min(100, Math.round((usedMassageMinutes / totalExpertMinutes) * 100))
        : 0,
      facilityPercent: totalSpaceMinutes > 0
        ? Math.min(100, Math.round((usedFacilityMinutes / totalSpaceMinutes) * 100))
        : 0,
      totalCount: data.total,
      massageCount: data.massage.length,
      facilityCount: data.facility.length,
    };
  });

  return result;
}

/**
 * Tek bir gun icin detayli randevulari getirir
 */
export async function fetchDayAppointments(companyId, date) {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      company_services ( id, description, duration, price, category, requires_expert, color ),
      customers ( id, name, phone ),
      company_users:expert_id ( id, name, color ),
      appointment_services (
        id, service_id, expert_id,
        company_services ( id, description, duration, price, category, color )
      )
    `)
    .eq('company_id', companyId)
    .eq('date', date)
    .neq('status', 'iptal')
    .order('time');

  if (error) {
    console.error('Gun randevulari alinamadi:', error);
    return [];
  }
  return data || [];
}
