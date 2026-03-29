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
 * Belirli bir gun icin bir odadaki birimlerin musaitlik durumunu dondurur.
 * Her birim icin randevu sayisinin yaninda zamana dayali dolu araliklari (busySlots) da doner.
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
    return units.map(u => ({ ...u, appointments: [], busySlots: [], appointmentCount: 0 }));
  }

  // Her birim icin o gundeki randevulari eslestir ve dolu araliklari hesapla
  return units.map(unit => {
    const unitAppointments = (appointments || []).filter(
      a => a.room_unit_id === unit.id
    );

    // Zamana dayali dolu araliklar
    const busySlots = unitAppointments.map(a => {
      const [h, m] = (a.time || '00:00').split(':').map(Number);
      const startMin = h * 60 + m;
      const endMin = startMin + (a.total_duration || 60);
      return { startMin, endMin, appointmentId: a.id, expertId: a.expert_id };
    });

    return {
      ...unit,
      appointments: unitAppointments,
      appointmentCount: unitAppointments.length,
      busySlots,
    };
  });
}

/**
 * Yatak sayisini senkronize eder.
 * Hedef sayi mevcuttan fazlaysa yeni yataklar olusturur,
 * azsa sondakileri soft-delete yapar.
 */
export async function syncRoomUnits(companyId, spaceId, targetCount, existingUnits) {
  const currentCount = existingUnits.length;

  if (targetCount === currentCount) {
    // Degisiklik yok
    return { created: 0, deleted: 0 };
  }

  if (targetCount > currentCount) {
    // Yeni yataklar olustur
    const toCreate = targetCount - currentCount;
    for (let i = 1; i <= toCreate; i++) {
      const newIndex = currentCount + i;
      await createRoomUnit(companyId, spaceId, {
        name: `Yatak ${newIndex}`,
        unit_type: 'bed',
        sort_order: newIndex,
      });
    }
    return { created: toCreate, deleted: 0 };
  }

  // targetCount < currentCount — fazlaliklari sil (sort_order'a gore sondan basla)
  const toDelete = currentCount - targetCount;
  const sorted = [...existingUnits].sort((a, b) => (b.sort_order || 0) - (a.sort_order || 0));
  for (let i = 0; i < toDelete; i++) {
    await deleteRoomUnit(sorted[i].id);
  }
  return { created: 0, deleted: toDelete };
}

/**
 * Bir yatak icin calisma saatlerini getirir.
 * Oncelikle birime ozel saatleri dener, yoksa odanin (space) saatlerine duser.
 */
export async function getUnitWorkingHours(companyId, roomUnitId, spaceId) {
  // Birime ozel saatleri kontrol et
  const { data: unitHours, error: unitError } = await supabase
    .from('room_unit_working_hours')
    .select('*')
    .eq('company_id', companyId)
    .eq('room_unit_id', roomUnitId)
    .order('day');

  if (unitError) {
    console.error('room_unit_working_hours alinamadi:', unitError);
  }

  if (unitHours && unitHours.length > 0) {
    return { hours: unitHours, source: 'unit' };
  }

  // Birime ozel saat yoksa odanin saatlerine dusur
  const { data: spaceHours, error: spaceError } = await supabase
    .from('space_working_hours')
    .select('*')
    .eq('company_id', companyId)
    .eq('space_id', spaceId)
    .order('day');

  if (spaceError) {
    console.error('space_working_hours alinamadi:', spaceError);
    return { hours: [], source: 'space' };
  }

  return { hours: spaceHours || [], source: 'space' };
}

/**
 * Bir yatak icin ozel calisma saatlerini kaydeder.
 * Onceki kayitlari silip yeni 7 gunluk kayitlari ekler.
 */
export async function setUnitWorkingHours(companyId, spaceId, roomUnitId, hours) {
  // Mevcut kayitlari temizle
  const { error: delError } = await supabase
    .from('room_unit_working_hours')
    .delete()
    .eq('company_id', companyId)
    .eq('room_unit_id', roomUnitId);

  if (delError) {
    console.error('room_unit_working_hours silinemedi:', delError);
    return { error: delError };
  }

  // Yeni kayitlari ekle
  const rows = hours.map(h => ({
    company_id: companyId,
    space_id: spaceId,
    room_unit_id: roomUnitId,
    day: h.day,
    start_time: h.start_time,
    end_time: h.end_time,
    is_open: h.is_open !== undefined ? h.is_open : true,
  }));

  const { data, error } = await supabase
    .from('room_unit_working_hours')
    .insert(rows)
    .select();

  if (error) {
    console.error('room_unit_working_hours eklenemedi:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Bir yatagin ozel calisma saatlerini siler, boylece oda saatlerine geri doner.
 */
export async function resetUnitWorkingHours(companyId, roomUnitId) {
  const { error } = await supabase
    .from('room_unit_working_hours')
    .delete()
    .eq('company_id', companyId)
    .eq('room_unit_id', roomUnitId);

  if (error) {
    console.error('room_unit_working_hours sifirlanamiadi:', error);
  }
  return { error };
}

/**
 * Belirli bir gun icin odadaki her yatagin doluluk oranini hesaplar.
 * Her birim icin dolu dakika, toplam dakika (780 = 13 saat) ve yuzde doner.
 */
export async function getBedOccupancy(companyId, spaceId, date) {
  // 13 saatlik calisma gunu varsayimi (ornegin 08:00 - 21:00)
  const TOTAL_MINUTES = 780;

  // Odanin tum aktif birimlerini al
  const units = await getRoomUnits(companyId, spaceId);

  // O gundeki bu odaya ait randevulari al
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('id, room_unit_id, time, total_duration')
    .eq('company_id', companyId)
    .eq('space_id', spaceId)
    .eq('date', date)
    .neq('status', 'iptal');

  if (error) {
    console.error('Doluluk icin randevular alinamadi:', error);
    return units.map(u => ({
      ...u,
      bookedMinutes: 0,
      totalMinutes: TOTAL_MINUTES,
      occupancyPct: 0,
    }));
  }

  return units.map(unit => {
    const unitAppts = (appointments || []).filter(a => a.room_unit_id === unit.id);
    const bookedMinutes = unitAppts.reduce((sum, a) => sum + (a.total_duration || 0), 0);
    const occupancyPct = TOTAL_MINUTES > 0
      ? Math.min(100, Math.round((bookedMinutes / TOTAL_MINUTES) * 100))
      : 0;

    return {
      ...unit,
      bookedMinutes,
      totalMinutes: TOTAL_MINUTES,
      occupancyPct,
    };
  });
}

/**
 * Bir birimin belirli bir saatte musait olup olmadigini kontrol eder.
 * unitData parametresi getUnitAvailability'den donen bir birim objesi olmalidir (busySlots icermeli).
 */
export function isUnitAvailableAt(unitData, time, duration) {
  const [h, m] = (time || '00:00').split(':').map(Number);
  const reqStart = h * 60 + m;
  const reqEnd = reqStart + (duration || 60);

  // busySlots icinde cakisan aralik var mi kontrol et
  const slots = unitData.busySlots || [];
  for (const slot of slots) {
    // Iki aralik cakisiyor mu: biri digerinin icinde basliyor veya bitiyor
    if (reqStart < slot.endMin && reqEnd > slot.startMin) {
      return false;
    }
  }

  return true;
}
