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
 * massageMax/facilityMax = gun bazli kapasite (uzman sayisi / alan kapasitesi)
 */
export function computeDailyOccupancy(appointments, workingHours, experts, spaces) {
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

  const result = {};
  const activeExperts = experts.filter(e => e.role === 'Uzman');
  const activeSpaces = spaces.filter(s => s.is_active);

  // Her gun icin masaj max = o gun calisan uzman sayisi * ortalama slot sayisi
  // Basitlestirmis kapasite: uzman basina 8 randevu / gun (varsayilan)
  const massageMaxPerExpert = 8;
  const facilityMaxPerSpace = 6;

  Object.entries(byDay).forEach(([dateStr, data]) => {
    const dayDate = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = dayDate.getDay();

    // O gun calisan uzman sayisi
    let workingExpertCount = 0;
    activeExperts.forEach(expert => {
      const wh = workingHours.find(
        h => h.expert_id === expert.id && h.day === dayOfWeek && h.is_open
      );
      if (wh) workingExpertCount++;
    });

    const massageMax = workingExpertCount * massageMaxPerExpert;
    const facilityMax = activeSpaces.length * facilityMaxPerSpace;

    const massageCount = data.massage.length;
    const facilityCount = data.facility.length;

    result[dateStr] = {
      massagePercent: massageMax > 0
        ? Math.min(100, Math.round((massageCount / massageMax) * 100))
        : 0,
      facilityPercent: facilityMax > 0
        ? Math.min(100, Math.round((facilityCount / facilityMax) * 100))
        : 0,
      totalCount: data.total,
      massageCount,
      facilityCount,
      massageMax,
      facilityMax,
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
