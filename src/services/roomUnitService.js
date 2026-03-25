/**
 * Room Unit Service
 * Oda icindeki birimlerin (yatak, tas, kabin) yonetimi
 */

import { supabase } from '../lib/supabase';

/**
 * Bir sirketin tum birimlerini veya belirli bir odanin birimlerini getirir
 */
export async function getRoomUnits(companyId, spaceId = null) {
  let query = supabase
    .from('room_units')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('sort_order');

  if (spaceId) {
    query = query.eq('space_id', spaceId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('room_units alinamadi:', error);
    return [];
  }
  return data || [];
}

/**
 * Yeni birim olusturur
 */
export async function createRoomUnit(companyId, spaceId, unitData) {
  const { data, error } = await supabase
    .from('room_units')
    .insert({
      company_id: companyId,
      space_id: spaceId,
      name: unitData.name,
      unit_type: unitData.unit_type || 'bed',
      sort_order: unitData.sort_order || 0,
    })
    .select()
    .single();

  if (error) {
    console.error('room_unit olusturulamadi:', error);
    return { data: null, error };
  }
  return { data, error: null };
}

/**
 * Birimi gunceller
 */
export async function updateRoomUnit(unitId, updates) {
  const { data, error } = await supabase
    .from('room_units')
    .update(updates)
    .eq('id', unitId)
    .select()
    .single();

  if (error) {
    console.error('room_unit guncellenemedi:', error);
    return { data: null, error };
  }
  return { data, error: null };
}

/**
 * Birimi soft-delete yapar
 */
export async function deleteRoomUnit(unitId) {
  const { error } = await supabase
    .from('room_units')
    .update({ is_active: false })
    .eq('id', unitId);

  if (error) {
    console.error('room_unit silinemedi:', error);
  }
  return { error };
}

/**
 * Belirli bir gun icin bir odadaki birimlerin musaitlik durumunu dondurur
 */
export async function getUnitAvailability(companyId, spaceId, date) {
  // Odanin tum aktif birimlerini al
  const units = await getRoomUnits(companyId, spaceId);

  // O gundeki bu odaya ait randevulari al
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('id, room_unit_id, time, total_duration, expert_id, status')
    .eq('company_id', companyId)
    .eq('space_id', spaceId)
    .eq('date', date)
    .neq('status', 'iptal');

  if (error) {
    console.error('Randevular alinamadi:', error);
    return units.map(u => ({ ...u, appointments: [], isFullyBooked: false }));
  }

  // Her birim icin o gundeki randevulari eslestir
  return units.map(unit => {
    const unitAppointments = (appointments || []).filter(
      a => a.room_unit_id === unit.id
    );
    return {
      ...unit,
      appointments: unitAppointments,
      appointmentCount: unitAppointments.length,
    };
  });
}
